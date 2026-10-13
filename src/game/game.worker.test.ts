import { AutoModelForCausalLM, AutoTokenizer, Tensor } from "@huggingface/transformers";
import type {
  DynamicCache,
  PreTrainedModel,
  PreTrainedTokenizer,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";
import { afterEach, expect, it, vi } from "vitest";
import { MODEL_ID } from "./types";
import type { WorkerRequest, WorkerResponse } from "./types";

type GenerationOptions = Parameters<PreTrainedModel["generate"]>[0];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("runs WebGPU-only turns, reports aggregate downloads, and never commits dummy EOS", async () => {
  const messages: WorkerResponse[] = [];
  const workerScope = {
    postMessage: (message: WorkerResponse) => messages.push(message),
    onmessage: undefined as ((event: MessageEvent<WorkerRequest>) => void) | undefined,
  };
  vi.stubGlobal("self", workerScope);
  const fakeTokenizer = Object.assign(
    () => ({
      input_ids: new Tensor("int64", [0n], [1, 1]),
    }),
    {
      tokens: [...Array.from({ length: 256 }, (_, id) => [id]), []],
      special_token_ids: [256],
      all_special_ids: [256],
      eos_token_id: 256,
      pad_token_id: 256,
      apply_chat_template: () => "prompt",
      get_vocab: () =>
        new Map(Array.from({ length: 257 }, (_, id) => [String.fromCharCode(id), id])),
      decode: (ids: number[]) => {
        if (ids.length === 0) throw new Error("token_ids must be a non-empty array of integers.");
        return String.fromCharCode(...ids);
      },
    }
  ) as unknown as PreTrainedTokenizer;
  const fakeCache = { dispose: vi.fn(async () => {}) } as unknown as DynamicCache;
  const explanationCache = { dispose: vi.fn(async () => {}) } as unknown as DynamicCache;
  let holdExplanation = false;
  let releaseExplanation: (() => void) | undefined;
  let explanationStop: InterruptableStoppingCriteria | undefined;
  const generate = vi.fn(async (options: GenerationOptions) => {
    if (options.streamer) {
      expect(options.past_key_values).toBeNull();
      expect(options.logits_processor).toBeUndefined();
      expect(options.generation_config?.eos_token_id).toEqual([256, 254]);
      if (holdExplanation) {
        explanationStop = options.stopping_criteria as InterruptableStoppingCriteria;
        await new Promise<void>((resolve) => {
          releaseExplanation = resolve;
        });
      }
      (options.streamer as TextStreamer).on_finalized_text(
        "The first token must be a, not b.",
        true
      );
      return { past_key_values: explanationCache };
    }
    const ids = Array.from((options.input_ids as Tensor).data as BigInt64Array);
    const logits = new Tensor(
      "float32",
      Float32Array.from({ length: 260 }, (_, id) => id / 10),
      [1, 260]
    );
    options.logits_processor!([ids], logits);
    // The capture processor forces only the temporary token, not grammar state.
    expect((logits.data as Float32Array)[256]).toBe(0);
    expect((logits.data as Float32Array)[97]).toBe(-Infinity);
    return { past_key_values: fakeCache };
  });
  const gameCalls = () => generate.mock.calls.filter(([options]) => options.logits_processor);
  const fromTokenizer = vi.spyOn(AutoTokenizer, "from_pretrained").mockResolvedValue(fakeTokenizer);
  const fromModel = vi
    .spyOn(AutoModelForCausalLM, "from_pretrained")
    .mockImplementation(async (_id, options) => {
      options?.progress_callback?.({
        status: "progress",
        name: MODEL_ID,
        file: "model_q4.onnx",
        progress: 90,
        loaded: 90,
        total: 100,
      });
      options?.progress_callback?.({
        status: "progress_total",
        name: MODEL_ID,
        progress: 42,
        loaded: 42,
        total: 100,
        files: {},
      });
      return {
        generate,
        generation_config: { eos_token_id: [256, 254] },
      } as unknown as PreTrainedModel;
    });
  await import("./game.worker");
  const send = (data: WorkerRequest) =>
    workerScope.onmessage!({ data } as MessageEvent<WorkerRequest>);
  const waitForSteps = (count: number) =>
    vi.waitFor(() =>
      expect(messages.filter((message) => message.type === "step")).toHaveLength(count)
    );
  send({
    type: "start",
    roundId: 1,
    settings: { prompt: "Say ab", format: { type: "regex", regex: "ab" } },
  });
  await waitForSteps(1);
  expect(fromTokenizer).toHaveBeenCalledWith(MODEL_ID, expect.any(Object));
  expect(fromModel).toHaveBeenCalledWith(
    MODEL_ID,
    expect.objectContaining({ device: "webgpu", dtype: "q4f16" })
  );
  const progress = messages.filter(
    (message) => message.type === "status" && message.progress !== undefined
  );
  expect(progress).toEqual([
    {
      type: "status",
      message: "Downloading Gemma 4 E2B · total progress across all files",
      progress: 42,
      roundId: 1,
    },
  ]);
  expect(messages.find((message) => message.type === "step")).not.toHaveProperty("allowed");

  send({ type: "guess", tokenId: 98 }); // Incorrect initial b.
  await vi.waitFor(() =>
    expect(messages.filter((message) => message.type === "guess")).toHaveLength(1)
  );
  expect(messages.at(-1)).toMatchObject({
    type: "guess",
    correct: false,
    candidateText: "b",
    text: "",
    totalPoints: 0,
    tokenCount: 0,
  });
  const rejection = messages.at(-1);
  if (rejection?.type === "guess")
    expect(rejection.explanation).toContain("forbidden at this prefix");
  send({ type: "explain", requestId: 1, turn: 0, tokenId: 98 });
  await vi.waitFor(() =>
    expect(
      messages.some(
        (message) => message.type === "explanation" && message.requestId === 1 && message.done
      )
    ).toBe(true)
  );
  expect(messages.filter((message) => message.type === "explanation").at(-1)).toMatchObject({
    text: "The first token must be a, not b.",
    done: true,
  });
  expect(explanationCache.dispose).toHaveBeenCalledOnce();
  expect(fakeCache.dispose).not.toHaveBeenCalled();
  expect(fromModel).toHaveBeenCalledOnce();
  send({ type: "explain", requestId: 2, turn: 0, tokenId: 97 });
  await vi.waitFor(() =>
    expect(
      messages.some(
        (message) => message.type === "explanation" && message.requestId === 2 && !!message.error
      )
    ).toBe(true)
  );
  holdExplanation = true;
  send({ type: "explain", requestId: 3, turn: 0, tokenId: 98 });
  await vi.waitFor(() => expect(releaseExplanation).toBeTypeOf("function"));
  send({ type: "cancel_explanation", requestId: 3 });
  expect(explanationStop?.interrupted).toBe(true);
  releaseExplanation!();
  await vi.waitFor(() => expect(explanationCache.dispose).toHaveBeenCalledTimes(2));
  expect(
    messages.some((message) => message.type === "explanation" && message.requestId === 3)
  ).toBe(false);
  expect(fakeCache.dispose).not.toHaveBeenCalled();
  send({ type: "guess", tokenId: 98 }); // Duplicate rejected guess is ignored.
  send({ type: "guess", tokenId: 97 }); // a is now worth 50.
  await waitForSteps(2);
  expect(gameCalls()).toHaveLength(2);
  expect(Array.from((gameCalls()[1][0].input_ids as Tensor).data)).toEqual([0n, 97n]);
  expect(gameCalls()[1][0].past_key_values).toBe(fakeCache);
  send({ type: "guess", tokenId: 98 });
  await waitForSteps(3);
  expect(Array.from((gameCalls()[2][0].input_ids as Tensor).data)).toEqual([0n, 97n, 98n]);
  send({ type: "guess", tokenId: 254 }); // Model-specific end token, not tokenizer EOS.
  await vi.waitFor(() =>
    expect(messages.at(-1)).toMatchObject({
      type: "guess",
      correct: true,
      complete: true,
      totalPoints: 250,
      tokenCount: 3,
      text: "ab",
    })
  );
  expect(gameCalls()).toHaveLength(3);
  expect(generate).toHaveBeenCalledTimes(5);
  expect(fakeCache.dispose).toHaveBeenCalledOnce();
  send({ type: "reset" });
  send({
    type: "start",
    roundId: 2,
    settings: { prompt: "Say a", format: { type: "regex", regex: "a" } },
  });
  await waitForSteps(4);
  expect(fromModel).toHaveBeenCalledOnce();
  expect(messages.filter((message) => message.type === "model_loaded").at(-1)).toMatchObject({
    roundId: 2,
  });
  expect(messages.filter((message) => message.type === "step").at(-1)).toMatchObject({
    roundId: 2,
    step: { text: "", tokenCount: 0 },
  });
  send({ type: "guess", tokenId: 97 });
  await waitForSteps(5);
  expect(messages.filter((message) => message.type === "guess").at(-1)).toMatchObject({
    roundId: 2,
    points: 100,
    totalPoints: 100,
    tokenCount: 1,
    text: "a",
  });
  send({ type: "reset" });
  await vi.waitFor(() => expect(fakeCache.dispose).toHaveBeenCalledTimes(2));
});
