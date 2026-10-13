import { Tensor } from "@huggingface/transformers";
import type { PreTrainedTokenizer } from "@huggingface/transformers";
import { StructuredOutputProcessor } from "@huggingface/transformers-structured-output";
import type { ResponseFormat } from "@huggingface/transformers-structured-output";
import { softmax } from "../utils/scoring";

/** A demo-local adapter. The mask stays in the worker, never in the token-list UI. */
export default class StructuredOutputProcessorGame {
  private readonly processor: StructuredOutputProcessor;
  private allowed = new Uint8Array();
  readonly terminationTokenIds: readonly number[];
  private readonly tokenizerEos: number;

  constructor(
    tokenizer: PreTrainedTokenizer,
    format: ResponseFormat,
    terminationIds: number | readonly number[] = tokenizer.eos_token_id
  ) {
    this.processor = new StructuredOutputProcessor(tokenizer, format);
    this.tokenizerEos = tokenizer.eos_token_id;
    const ids = typeof terminationIds === "number" ? [terminationIds] : terminationIds;
    if (!ids.length || ids.some((id) => !Number.isInteger(id) || id < 0))
      throw new RangeError("Termination IDs must be a non-empty set of non-negative integers.");
    this.terminationTokenIds = [...new Set(ids)];
  }

  inspect(inputIds: bigint[][], logits: Tensor) {
    const vocabSize = logits.dims.at(-1)!;
    const raw = Float32Array.from(logits.data as Float32Array);
    const probe = new Tensor("float32", new Float32Array(vocabSize), [1, vocabSize]);
    // The first call records the prompt boundary; later calls commit only the
    // player-selected suffix. Rejected guesses never change inputIds.
    this.processor(inputIds, probe);
    this.allowed = Uint8Array.from(probe.data as Float32Array, (score) =>
      Number.isFinite(score) ? 1 : 0
    );
    // Temporary compatibility shim: upstream's canonical EOS bit tells us
    // whether the grammar accepts the current response. Mirror that permission
    // onto the model's configured control-token endings, without mutating the
    // upstream mask/cache or renormalizing the original model probabilities.
    const canEnd = this.allowed[this.tokenizerEos] === 1;
    this.allowed[this.tokenizerEos] = 0;
    for (const id of this.terminationTokenIds) {
      if (id >= vocabSize)
        throw new RangeError(`Termination token ${id} is outside the model logits vocabulary.`);
      this.allowed[id] = canEnd ? 1 : 0;
    }
    const order = Uint32Array.from({ length: vocabSize }, (_, id) => id);
    order.sort((a, b) => raw[b] - raw[a] || a - b);
    return { logits: raw, probabilities: softmax(raw), order };
  }

  isAllowed(tokenId: number): boolean {
    return Number.isInteger(tokenId) && tokenId >= 0 && this.allowed[tokenId] === 1;
  }

  isTerminationToken(tokenId: number): boolean {
    return this.terminationTokenIds.includes(tokenId);
  }

  canEndResponse(): boolean {
    return this.terminationTokenIds.some((id) => this.isAllowed(id));
  }
}
