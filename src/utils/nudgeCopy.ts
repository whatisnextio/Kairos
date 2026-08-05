import type { AiNudge } from '@/types';

const DAY_COMPLETION_PATTERN =
  /\b(?:day\s+\d+\s+(?:is\s+)?(?:done|complete(?:d)?)|today(?:'s|\s+is)?\s+(?:done|complete(?:d)?))\b/i;

export function hasPrematureDayCompletionCopy(title: string, body = ''): boolean {
  return DAY_COMPLETION_PATTERN.test(`${title} ${body}`);
}

export function normalisePrematureDayCompletionNudge(
  nudge: AiNudge,
  fallbackNudge: AiNudge,
): AiNudge {
  if (!hasPrematureDayCompletionCopy(nudge.title, nudge.body)) return nudge;

  return {
    ...nudge,
    title: fallbackNudge.title,
    body: fallbackNudge.body,
    domainType: fallbackNudge.domainType ?? nudge.domainType,
    cta: fallbackNudge.cta ?? nudge.cta,
  };
}
