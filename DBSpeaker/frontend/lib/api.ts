import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4300/api',
});

export interface Learner {
  id: number;
  name: string;
  level_score: number;
  cefr: string;
  messages_count: number;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  category: string;
}

export interface VocabSuggestion {
  word: string;
  pt: string;
  example: string;
  level: string;
}

export interface WalletInfo {
  balance: number; // centavos
  charged: number; // centavos
}

export interface ChatResponse {
  reply: string;
  corrections: Correction[];
  level: { score: number; cefr: string; leveledUp: boolean };
  vocabSuggestion: VocabSuggestion | null;
  engine: string;
  wallet?: WalletInfo;
}

export interface WalletStatement {
  balance: number;
  prices: { message: number; pronunciation: number };
  enabled: boolean;
  transactions: { amount_cents: number; kind: string; description: string; created_at: string }[];
}

export function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface PronunciationWord {
  word: string;
  heard: string | null;
  similarity: number;
  ok: boolean;
  close: boolean;
}

export interface PronunciationResult {
  score: number;
  words: PronunciationWord[];
  tips: { id: string; label: string; tip: string; practiceWords: string[] }[];
  verdict: string;
  wallet?: WalletInfo;
}

export interface PronunciationExercise {
  text: string;
  level: string;
  focusSounds: { id: string; label: string; tip: string }[];
}

export const dbspeaker = {
  learner: (name: string) => api.post<Learner>('/learner', { name }).then((r) => r.data),
  profile: (id: number) => api.get(`/learner/${id}/profile`).then((r) => r.data),
  correctionsLog: (id: number) => api.get(`/learner/${id}/corrections`).then((r) => r.data),
  chatStart: (learnerId: number) =>
    api.post('/chat/start', { learnerId }).then((r) => r.data as { sessionId: number; message: string; cefr: string; levelScore: number }),
  chatMessage: (learnerId: number, sessionId: number, text: string) =>
    api.post<ChatResponse>('/chat/message', { learnerId, sessionId, text }).then((r) => r.data),
  pronunciationExercise: (learnerId: number) =>
    api.get<PronunciationExercise>('/pronunciation/exercise', { params: { learnerId } }).then((r) => r.data),
  pronunciationAttempt: (learnerId: number, target: string, transcript: string) =>
    api.post<PronunciationResult>('/pronunciation/attempt', { learnerId, target, transcript }).then((r) => r.data),
  vocabulary: (learnerId: number) => api.get(`/vocabulary/${learnerId}`).then((r) => r.data),
  engine: () => api.get('/engine').then((r) => r.data as { engine: string; model: string }),
  wallet: (learnerId: number) => api.get<WalletStatement>(`/wallet/${learnerId}`).then((r) => r.data),
  topup: (learnerId: number, amountCents: number) =>
    api.post<{ balance: number }>('/wallet/topup', { learnerId, amountCents }).then((r) => r.data),
};

export default dbspeaker;
