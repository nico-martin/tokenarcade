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

export type WorkerRequest =
  | { type: "start"; settings: GameSettings; roundId: number }
  | { type: "guess"; tokenId: number }
  | { type: "explain"; tokenId: number; turn: number; requestId: number }
  | { type: "cancel_explanation"; requestId: number }
  | { type: "reset" };

export type WorkerResponsePayload =
  | { type: "model_loaded" }
  | { type: "status"; message: string; progress?: number }
  | { type: "vocabulary"; labels: string[]; eosTokenId: number; terminationTokenIds: number[] }
  | { type: "step"; step: TokenStep }
  | { type: "explanation"; requestId: number; text: string; done: boolean; error?: string }
  | {
      type: "guess";
      tokenId: number;
      correct: boolean;
      points: number;
      attempts: number;
      totalPoints: number;
      tokenCount: number;
      text: string;
      complete: boolean;
      candidateText: string;
      explanation: string;
    }
  | { type: "error"; message: string };

export type WorkerResponse = WorkerResponsePayload & { roundId: number };

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
