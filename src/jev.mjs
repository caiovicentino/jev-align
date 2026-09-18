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

const TIE_RETRY = ' If two options are tied in probability, choose the first option listed.';
export async function jevSafe(input, questions, tiebreak = TIE_RETRY) {
  try {
    return await jev(input, questions);
  } catch (e) {
    if (!String(e?.message ?? e).includes('did not select a highest-probability')) throw e;
    const q2 = Object.fromEntries(
      Object.entries(questions).map(([k, q]) => [k, q.type === 'choice' ? { ...q, instructions: (q.instructions ?? '') + tiebreak } : q]),
    );
    return await jev(input, q2);
  }
}
