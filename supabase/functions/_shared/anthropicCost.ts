type AnthropicModelPricing = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

const USD_TO_GBP_PENCE = 80;

const MODEL_PRICING_USD_PER_MILLION: Record<string, AnthropicModelPricing> = {
  "claude-haiku-4-5-20251001": {
    inputUsdPerMillion: 1,
    outputUsdPerMillion: 5,
  },
  "claude-sonnet-4-6": {
    inputUsdPerMillion: 3,
    outputUsdPerMillion: 15,
  },
};

export function estimateAnthropicCostPence({
  model,
  inputTokens,
  outputTokens,
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) return 0;

  const usdCost =
    (inputTokens * pricing.inputUsdPerMillion +
      outputTokens * pricing.outputUsdPerMillion) /
    1_000_000;

  return Number((usdCost * USD_TO_GBP_PENCE).toFixed(4));
}
