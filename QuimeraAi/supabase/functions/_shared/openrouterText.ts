const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

function mapModelToOpenRouter(model: string): string {
  const MODEL_MAP: Record<string, string> = {
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite-preview",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
    "gemini-2.0-flash": "google/gemini-2.0-flash-001",
  };
  return MODEL_MAP[model] || "google/gemini-2.5-flash";
}

export interface GenerateTextOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function generateTextViaOpenRouter(
  prompt: string,
  opts: GenerateTextOptions = {},
): Promise<{ text: string; provider: "openrouter" }> {
  const model = opts.model || "gemini-2.5-flash";
  const temperature = Math.min(Math.max(opts.temperature ?? 0.7, 0), 2);
  const maxTokens = Math.min(opts.maxOutputTokens || 8192, 32000);

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterKey}`,
      "HTTP-Referer": "https://quimera.ai",
      "X-Title": "Quimera AI",
    },
    body: JSON.stringify({
      model: mapModelToOpenRouter(model),
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { text, provider: "openrouter" };
}
