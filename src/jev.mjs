import './env.mjs';
import { experimental_evaluate as evaluate } from 'ai';

const MODEL = process.env.JEV_MODEL ?? 'typesafe-ai/jev';

export async function jev(state, questions) {
  const r = await evaluate({ model: MODEL, state, questions, abortSignal: AbortSignal.timeout(90000) });
  return { answers: r.answers, inputTokens: r.usage?.inputTokens ?? 0 };
}

export function choiceAnswer(a) {
  const key = a.choice ?? a.index ?? null;
  const p = a.probabilities?.[key] ?? a.probability ?? null;
  return { choice: key, p };
}

export function boolAnswer(a) {
  return a?.probability ?? 0;
}

export function scoreAnswer(a) {
  return a?.score ?? 0;
}
