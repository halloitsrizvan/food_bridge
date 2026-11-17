import { ChatRequestSchema } from "@/lib/schemas/chat";
import { AppError } from "@/server/lib/errors";
import { ok, route } from "@/server/lib/route";
import { formatContext, retrieve } from "@/server/rag/retrieve";

const SYSTEM_PROMPT = `You are FoodBridge Assistant, a concise and friendly guide for the FoodBridge food-donation platform in Kozhikode.

You answer using retrieved CONTEXT: website knowledge (how the platform works, rules, numbers) and live database records (current food posts, open requests, totals, leaderboard). Rules:
- Ground every factual claim in the CONTEXT. If the CONTEXT does not contain the answer, say you do not have that information and suggest checking the dashboard or the public feed. Never invent posts, quantities, times, places, people, points or rules.
- For live food or requests, quote the title, area, meals, diet and time left exactly as in the CONTEXT, and say it is a live snapshot that can change. Do not recommend a post whose time left is "expired".
- Never reveal or guess exact addresses, phone numbers or emails; only the area is public.
- Explain the handover accurately: the giver sees the OTP and the receiver enters it to complete the donation. The verification QR belongs to the finished certificate.
- Give cautious food-safety guidance, do not claim food is safe without enough information, and do not invent temperature rules.
- Never ask for passwords, OTPs, API keys or other secrets. You cannot post, claim or change anything for the user.
- Use short plain-text paragraphs or numbered steps without Markdown bold markers or citation numbers. Keep answers under 180 words unless asked for more detail.`;

const REPLY_LANGUAGE = {
  en: "English",
  ml: "Malayalam (use Malayalam script)",
  hi: "Hindi (use Devanagari script)",
} as const;

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const MODEL = "openai/gpt-oss-20b";

async function groq(apiKey: string, messages: GroqMessage[], extra: Record<string, unknown>, timeoutMs: number): Promise<{ ok: boolean; status: number; result: GroqResponse }> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, ...extra }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as GroqResponse;
  return { ok: response.ok, status: response.status, result };
}

/**
 * Turns the latest message (any language, maybe a follow-up like "and non-veg?") into a short English
 * search query for the retriever. Falls back to the raw message if the model is unavailable.
 */
async function toSearchQuery(apiKey: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const last = messages[messages.length - 1].content;
  try {
    const recent = messages.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");
    const { ok: good, result } = await groq(
      apiKey,
      [
        {
          role: "system",
          content:
            "Rewrite the user's latest message as a short English search query (max 12 words) of key terms for searching a food-donation platform's documentation and live listings. Resolve follow-up references using the conversation. Translate Malayalam or Hindi into English, transliterating food and place names. Output only the query, nothing else.",
        },
        { role: "user", content: recent },
      ],
      { temperature: 0, max_completion_tokens: 120, reasoning_effort: "low" },
      6_000,
    );
    const q = result.choices?.[0]?.message?.content?.trim();
    return good && q ? `${q} ${last}` : last;
  } catch {
    return last;
  }
}

export const POST = route(
  {
    body: ChatRequestSchema,
    rateLimit: { name: "ai-chat", limit: 20, windowMs: 60_000 },
  },
  async ({ body }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new AppError(503, "INTERNAL", "The AI assistant is not configured yet");

    // 1) retrieve: website knowledge + live database records relevant to the question
    const query = await toSearchQuery(apiKey, body.messages);
    const { docs, sources } = await retrieve(query);

    // 2) generate: answer from the retrieved context only
    const nowIst = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    const system = `${SYSTEM_PROMPT}\n\nCurrent time in Kozhikode: ${nowIst}.\nReply in ${REPLY_LANGUAGE[body.lang ?? "en"]}. Keep product names such as FoodBridge and OTP in Latin letters.\n\nCONTEXT:\n${formatContext(docs)}`;

    const { ok: good, status, result } = await groq(apiKey, [{ role: "system", content: system }, ...body.messages], { temperature: 0.3, max_completion_tokens: 900 }, 25_000);
    if (!good) {
      console.error("[chat] Groq request failed", status, result.error?.message ?? "Unknown upstream error");
      throw new AppError(502, "INTERNAL", "The AI assistant is temporarily unavailable");
    }

    const message = result.choices?.[0]?.message?.content?.trim();
    if (!message) throw new AppError(502, "INTERNAL", "The AI assistant returned an empty response");
    return ok({ message, sources });
  },
);
