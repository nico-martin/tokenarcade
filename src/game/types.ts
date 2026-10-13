import type { ResponseFormat } from "@huggingface/transformers-structured-output";

export const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";
export const MAX_TOKENS = 256;
export type ConstraintType = ResponseFormat["type"];

export interface GameSettings {
  prompt: string;
  format: ResponseFormat;
}

export interface TokenStep {
  probabilities: Float32Array;
  logits: Float32Array;
  order: Uint32Array;
  deck: Uint32Array;
  text: string;
  tokenCount: number;
}

export interface GuessFeedback {
  tokenId: number;
  correct: boolean;
  points: number;
  candidateText: string;
  explanation: string;
}

export interface TokenExplanation {
  requestId: number;
  tokenId: number;
  candidateText: string;
  text: string;
  loading: boolean;
  error?: string;
}
