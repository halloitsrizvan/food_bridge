import { ChatRequestSchema } from "@/lib/schemas/chat";
import { AppError } from "@/server/lib/errors";
import { ok, route } from "@/server/lib/route";

const SYSTEM_PROMPT = `You are FoodBridge Assistant, a concise and friendly guide for the FoodBridge food-donation platform in Kozhikode.

FoodBridge connects food givers (restaurants, caterers, households, and event hosts) with takers (charities, institutions, and families). Explain how to post surplus food, request a donation, accept a claim, complete an OTP handover, use points and certificates, report a problem, or contact government administrators. In the actual handover, the giver sees the OTP and the taker enters it to confirm completion. A verification QR belongs to the completed donation certificate; it is not used to post food or perform the handover.

Give cautious, practical food-safety guidance, but do not claim food is safe without enough information and do not invent exact temperature rules. Encourage users to follow local food-safety guidance and discard food that smells unusual, was stored improperly, or may be unsafe. Never ask for passwords, OTPs, API keys, or other secrets. Do not invent buttons, screens, account data, donations, or availability. When live details are needed, tell the user to check their dashboard. Use short plain-text paragraphs or numbered steps without Markdown bold markers. Keep answers under 180 words unless the user asks for more detail.`;

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export const POST = route(
  {
    body: ChatRequestSchema,
    rateLimit: { name: "ai-chat", limit: 20, windowMs: 60_000 },
  },
  async ({ body }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new AppError(503, "INTERNAL", "The AI assistant is not configured yet");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...body.messages],
        temperature: 0.4,
        max_completion_tokens: 400,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => ({}))) as GroqResponse;
    if (!response.ok) {
      console.error("[chat] Groq request failed", response.status, result.error?.message ?? "Unknown upstream error");
      throw new AppError(502, "INTERNAL", "The AI assistant is temporarily unavailable");
    }

    const message = result.choices?.[0]?.message?.content?.trim();
    if (!message) throw new AppError(502, "INTERNAL", "The AI assistant returned an empty response");
    return ok({ message });
  },
);
