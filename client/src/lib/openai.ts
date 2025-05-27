export interface OpenAIModel {
  id: string;
  name: string;
  description: string;
  costPer1kTokens: number;
}

export const OPENAI_MODELS: OpenAIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most advanced model with best ad copy quality",
    costPer1kTokens: 0.03,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "Fast and capable, good balance of quality and cost",
    costPer1kTokens: 0.01,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Most economical option for basic ad copy",
    costPer1kTokens: 0.002,
  },
];

export function estimateCost(model: string, tokens: number): number {
  const modelInfo = OPENAI_MODELS.find(m => m.id === model);
  if (!modelInfo) return 0;
  
  return (tokens / 1000) * modelInfo.costPer1kTokens;
}

export function validateApiKey(apiKey: string): boolean {
  return apiKey.startsWith("sk-") && apiKey.length > 20;
}
