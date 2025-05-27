import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateAdCopy(
  apiKey: string,
  model: string,
  prompt: {
    businessDescription: string;
    landingPageUrl?: string;
    targetKeywords: string[];
    tone: string;
    focus: string;
    variations: number;
  }
): Promise<{ ads: Array<{ headline: string; description: string; displayUrl: string }>, cost: number, tokens: number }> {
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert Google Ads copywriter. Generate high-performing ad copy that follows Google Ads guidelines. 

Rules:
- Headlines must be 30 characters or less
- Descriptions must be 90 characters or less
- Include target keywords naturally
- Make ads compelling and action-oriented
- Ensure compliance with Google Ads policies

Return your response as a JSON object with this exact structure:
{
  "ads": [
    {
      "headline": "string (max 30 chars)",
      "description": "string (max 90 chars)", 
      "displayUrl": "string"
    }
  ]
}`;

  const landingPageInfo = prompt.landingPageUrl ? `\nLanding Page: ${prompt.landingPageUrl}\n(Analyze this URL to understand the product/service and create ad copy that aligns with the landing page content)` : '';

  const userPrompt = `Create ${prompt.variations} Google Ads variations for:

Business: ${prompt.businessDescription}
Keywords: ${prompt.targetKeywords.join(", ")}
Tone: ${prompt.tone}
Focus: ${prompt.focus}${landingPageInfo}

Generate compelling ad copy that will drive clicks and conversions. If a landing page URL is provided, ensure the ad copy aligns with what users will find on that page to improve relevance and quality score.`;

  try {
    const response = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Calculate cost (rough estimate - actual costs vary)
    const tokensUsed = response.usage?.total_tokens || 0;
    const costPerToken = model.includes("gpt-4") ? 0.00003 : 0.000002; // Rough estimates
    const estimatedCost = tokensUsed * costPerToken;

    return {
      ads: result.ads || [],
      cost: estimatedCost,
      tokens: tokensUsed
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate ad copy: ${error.message}`);
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    await openai.models.list();
    return true;
  } catch (error) {
    return false;
  }
}
