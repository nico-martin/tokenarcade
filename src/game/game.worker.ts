import {
  AutoModelForCausalLM,
  AutoTokenizer,
  GenerationConfig,
  InterruptableStoppingCriteria,
  LogitsProcessor,
  LogitsProcessorList,
  PretrainedConfig,
  Tensor,
  TextStreamer,
  env,
} from "@huggingface/transformers";
import type {
  DynamicCache,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressInfo,
} from "@huggingface/transformers";
import { buildDeck } from "../utils/deck";
import { pointsForAttempt } from "../utils/scoring";
import StructuredOutputProcessorGame from "./StructuredOutputProcessorGame";
import { explanationMessages } from "./explanationPrompt";
import { MAX_TOKENS, MODEL_ID } from "./types";
import type { GameSettings, TokenStep, WorkerRequest, WorkerResponsePayload } from "./types";

env.allowLocalModels = false;
const CHAT_TEMPLATE_OPTIONS = {
  tokenize: false,
  add_generation_prompt: true,
  enable_thinking: false,
} as const;

let roundId = 0;
function send(message: WorkerResponsePayload) {
  self.postMessage({ ...message, roundId });
}

class CaptureProcessor extends LogitsProcessor {
  constructor(
    private readonly capture: (ids: bigint[][], logits: Tensor) => void,
    private readonly eos: number
  ) {
    super();
  }

  _call(ids: bigint[][], logits: Tensor) {
    this.capture(ids, logits);
    // generate() needs to sample one token to return its KV cache. This dummy
    // EOS is ignored, never added to game input, and never enters the KV cache:
    // the returned cache contains only the prefix evaluated by the forward pass.
    (logits.data as Float32Array).fill(-Infinity);
    (logits.data as Float32Array)[this.eos] = 0;
    return logits;
  }
}

let model: PreTrainedModel | undefined;
let tokenizer: PreTrainedTokenizer | undefined;
let cache: DynamicCache | undefined;
let processor: StructuredOutputProcessorGame | undefined;
let inputIds: bigint[] = [];
let generated: number[] = [];
let totalPoints = 0;
let tokenCount = 0;
let rejected = new Set<number>();
let ready = false;
let vocabularyIds = new Set<number>();
let settingsForRound: GameSettings | undefined;
const rejectedPreviews = new Map<number, string>();
const explanationRequests = new Map<
  number,
  { stop: InterruptableStoppingCriteria; cancelled: boolean }
>();

async function clearGame() {
  ready = false;
  await cache?.dispose();
  cache = undefined;
  processor = undefined;
  inputIds = [];
  generated = [];
  totalPoints = 0;
  tokenCount = 0;
  rejected = new Set();
  rejectedPreviews.clear();
  settingsForRound = undefined;
}

async function load(settings: GameSettings) {
  send({ type: "status", message: "Loading tokenizer · files are cached for next time" });
  const progress_callback = (event: ProgressInfo) => {
    if (event.status === "progress_total")
      send({
        type: "status",
        message: "Downloading Gemma 4 E2B · total progress across all files",
        progress: event.progress,
      });
  };
  tokenizer ??= await AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback });
  send({ type: "status", message: "Preparing constraints…" });
  // Reject unsupported schemas/regexes before downloading the much larger
  // model weights, and preserve an already-loaded model if validation fails.
  processor = new StructuredOutputProcessorGame(tokenizer, settings.format);
  if (!model) {
    send({ type: "status", message: "Loading Gemma 4 E2B · files are cached for next time" });
    model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      device: "webgpu",
      dtype: "q4f16",
      progress_callback,
    });
  }
  processor = new StructuredOutputProcessorGame(
    tokenizer,
    settings.format,
    model.generation_config?.eos_token_id ?? tokenizer.eos_token_id
  );
  send({ type: "model_loaded" });
}

function responseText() {
  if (generated.length === 0) return "";
  return tokenizer!.decode(generated, { skip_special_tokens: true });
}

function terminationLabel(tokenId: number): string {
  if (tokenId === tokenizer!.eos_token_id) return "[EOS]";
  return vocabularyIds.has(tokenId)
    ? tokenizer!.decode([tokenId], { skip_special_tokens: false })
    : `[token ${tokenId}]`;
}

async function nextStep() {
  ready = false;
  send({ type: "status", message: "Computing next-token probabilities…" });
  let step: TokenStep | undefined;
  const capture = new LogitsProcessorList();
  capture.push(
    new CaptureProcessor((ids, logits) => {
      const inspection = processor!.inspect(ids, logits);
      step = {
        ...inspection,
        deck: buildDeck(inspection.order, (id) => processor!.isAllowed(id)),
        text: responseText(),
        tokenCount,
      };
    }, tokenizer!.eos_token_id)
  );
  const result = await model!.generate({
    input_ids: new Tensor("int64", BigInt64Array.from(inputIds), [1, inputIds.length]),
    attention_mask: new Tensor("int64", new BigInt64Array(inputIds.length).fill(1n), [
      1,
      inputIds.length,
    ]),
    past_key_values: cache ?? null,
    // Use clean defaults rather than model-specific generation penalties. The
    // captured scores are therefore the unwarped full-vocabulary model logits.
    generation_config: new GenerationConfig(
      new PretrainedConfig({
        max_new_tokens: 1,
        do_sample: false,
        return_dict_in_generate: true,
        eos_token_id: tokenizer!.eos_token_id,
        pad_token_id: tokenizer!.pad_token_id,
      })
    ),
    logits_processor: capture,
  });
  if (result instanceof Tensor || !step || !("past_key_values" in result))
    throw new Error("Model did not return a token inspection and KV cache.");
  cache = result.past_key_values as DynamicCache;
  rejected.clear();
  rejectedPreviews.clear();
  ready = true;
  send({ type: "step", step });
}

async function start(settings: GameSettings) {
  await clearGame();
  settingsForRound = settings;
  await load(settings);
  send({ type: "status", message: "Preparing vocabulary…" });
  const prompt = tokenizer!.apply_chat_template(
    [
      {
        role: "system",
        content:
          "Follow the user's request. Respond only with the requested structured output, without explanations or markdown.",
      },
      { role: "user", content: settings.prompt },
    ],
    CHAT_TEMPLATE_OPTIONS
  );
  const encoded = tokenizer!(prompt, { add_special_tokens: false });
  inputIds = Array.from(encoded.input_ids.data as BigInt64Array);
  if (inputIds.length > 2048)
    throw new Error("Prompt is too long. Please keep it below 2,048 tokens.");
  // Include model padding IDs, which may not have tokenizer labels. These are
  // still displayed and can be guessed; the constraint will reject them.
  const vocabulary = tokenizer!.get_vocab();
  vocabularyIds = new Set(vocabulary.values());
  let maxId = 0;
  for (const id of vocabulary.values()) maxId = Math.max(maxId, id);
  const labels = Array.from({ length: maxId + 1 }, (_, id) => `[token ${id}]`);
  for (const [label, id] of vocabulary) labels[id] = label;
  labels[tokenizer!.eos_token_id] = "[EOS]";
  send({
    type: "vocabulary",
    labels,
    eosTokenId: tokenizer!.eos_token_id,
    terminationTokenIds: [...processor!.terminationTokenIds],
  });
  await nextStep();
}

async function guess(tokenId: number) {
  if (!ready || rejected.has(tokenId)) return;
  const correct = processor!.isAllowed(tokenId);
  const eos = processor!.isTerminationToken(tokenId);
  const candidateText = eos
    ? `${responseText()} [end: ${terminationLabel(tokenId)}]`
    : vocabularyIds.has(tokenId)
      ? tokenizer!.decode([...generated, tokenId], { skip_special_tokens: false })
      : `${responseText()} [token ${tokenId}]`;
  const explanation = correct
    ? eos
      ? "The response satisfies the constraint. This termination token can safely end the round!"
      : "This continuation is allowed. The prefix can still satisfy the constraint; it doesn't need to be a complete response yet."
    : eos
      ? "Too early to stop! The response hasn't satisfied the constraint, so this termination token is blocked."
      : "This token is forbidden at this prefix by the constraint processor. The proposed continuation cannot proceed under its grammar or repeated-whitespace policy. Your actual response stays unchanged.";
  const attempts = rejected.size + 1;
  if (!correct) {
    rejected.add(tokenId);
    rejectedPreviews.set(tokenId, candidateText);
  }
  const points = correct ? pointsForAttempt(attempts) : 0;
  const complete = correct && eos;
  if (correct) {
    ready = false;
    totalPoints += points;
    tokenCount++;
    if (!complete) {
      generated.push(tokenId);
      inputIds.push(BigInt(tokenId));
    }
  }
  send({
    type: "guess",
    tokenId,
    correct,
    points,
    attempts,
    totalPoints,
    tokenCount,
    text: responseText(),
    complete,
    candidateText,
    explanation,
  });
  if (!correct) return;
  if (complete) {
    await cache?.dispose();
    cache = undefined;
    return;
  }
  if (tokenCount >= MAX_TOKENS)
    throw new Error(
      `Reached the ${MAX_TOKENS}-token safety limit before EOS. Start a new round with a shorter constraint.`
    );
  await nextStep();
}

async function explain(message: Extract<WorkerRequest, { type: "explain" }>) {
  const control = explanationRequests.get(message.requestId)!;
  let explanationCache: DynamicCache | undefined;
  try {
    if (control.cancelled) return;
    if (
      !ready ||
      !settingsForRound ||
      !rejected.has(message.tokenId) ||
      message.turn !== tokenCount
    )
      throw new Error(
        "This card belongs to a previous turn. Choose a rejected card from the current hand."
      );
    const eos = processor!.isTerminationToken(message.tokenId);
    const token = eos
      ? terminationLabel(message.tokenId)
      : vocabularyIds.has(message.tokenId)
        ? tokenizer!.decode([message.tokenId], {
            skip_special_tokens: false,
            clean_up_tokenization_spaces: false,
          })
        : `[token ${message.tokenId}]`;
    const messages = explanationMessages(
      settingsForRound,
      message.tokenId,
      responseText(),
      token,
      rejectedPreviews.get(message.tokenId)!,
      eos,
      processor!.canEndResponse()
    );
    const prompt = tokenizer!.apply_chat_template(messages, CHAT_TEMPLATE_OPTIONS);
    const inputs = tokenizer!(prompt, { add_special_tokens: false });
    if (inputs.input_ids.dims.at(-1)! > 4096)
      throw new Error(
        "The explanation context is too long for this demo. Use a shorter prompt or constraint."
      );
    let text = "";
    const streamer = new TextStreamer(tokenizer!, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (chunk) => {
        text += chunk;
        if (!control.cancelled)
          send({ type: "explanation", requestId: message.requestId, text, done: false });
      },
    });
    // Reuse model weights, NOT the gameplay cache or grammar processor.
    const output = await model!.generate({
      ...inputs,
      past_key_values: null,
      streamer,
      stopping_criteria: control.stop,
      generation_config: new GenerationConfig(
        new PretrainedConfig({
          max_new_tokens: 192,
          do_sample: false,
          return_dict_in_generate: true,
          eos_token_id: model!.generation_config?.eos_token_id ?? tokenizer!.eos_token_id,
          pad_token_id: tokenizer!.pad_token_id,
        })
      ),
    });
    if (!(output instanceof Tensor) && "past_key_values" in output)
      explanationCache = output.past_key_values as DynamicCache;
    if (!control.cancelled)
      send({
        type: "explanation",
        requestId: message.requestId,
        text: text.trim(),
        done: true,
        ...(!text.trim() ? { error: "The model returned no explanation. You can try again." } : {}),
      });
  } catch (error: unknown) {
    if (!control.cancelled)
      send({
        type: "explanation",
        requestId: message.requestId,
        text: "",
        done: true,
        error: error instanceof Error ? error.message : String(error),
      });
  } finally {
    await explanationCache?.dispose();
    explanationRequests.delete(message.requestId);
  }
}

// Serialize messages so reset/start never dispose a cache during inference.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === "cancel_explanation") {
    const control = explanationRequests.get(message.requestId);
    if (control) {
      control.cancelled = true;
      control.stop.interrupt();
    }
    return;
  }
  if (message.type === "explain")
    explanationRequests.set(message.requestId, {
      stop: new InterruptableStoppingCriteria(),
      cancelled: false,
    });
  if (message.type === "reset" || message.type === "start") {
    for (const control of explanationRequests.values()) {
      control.cancelled = true;
      control.stop.interrupt();
    }
  }
  queue = queue
    .then(async () => {
      if (message.type === "start") {
        roundId = message.roundId;
        await start(message.settings);
      } else if (message.type === "guess") await guess(message.tokenId);
      else if (message.type === "explain") await explain(message);
      else await clearGame();
    })
    .catch(async (error: unknown) => {
      ready = false;
      await cache?.dispose();
      cache = undefined;
      send({ type: "error", message: error instanceof Error ? error.message : String(error) });
    });
};
