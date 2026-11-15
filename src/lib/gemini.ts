// Thin Gemini REST client. The API key comes from .env (VITE_GEMINI_API_KEY)
// and is only sent in the x-goog-api-key header of requests to Google.

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";

export type ErrorCode =
  | "no-key" | "bad-key" | "bad-model" | "quota" | "unavailable" | "http"
  | "timeout" | "network" | "blocked" | "empty" | "parse"
  | "few" | "nothing" | "gone";

export class AppError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export async function getSettings(): Promise<{ model: string; apiKey: string }> {
  // The key lives only in .env (not committed to version control).
  return { model: DEFAULT_MODEL, apiKey: (import.meta.env.VITE_GEMINI_API_KEY ?? "").trim() };
}

// Tried in order. Overloaded (503) / rate-limited models are retried, then we fall back.
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isTransient = (e: AppError) => ["unavailable", "quota", "timeout", "network"].includes(e.code);

export interface GeminiRequest {
  system: string;
  prompt: string;
  schema: object;
  timeoutMs?: number;
}

export async function callGemini<T = unknown>(opts: GeminiRequest): Promise<T> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new AppError("no-key", "No Gemini API key configured. Add VITE_GEMINI_API_KEY to .env and rebuild.");
  const models = [...new Set([model || DEFAULT_MODEL, ...FALLBACK_MODELS])];
  let lastErr: unknown;
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await requestOnce<T>(apiKey, m, opts);
      } catch (e) {
        lastErr = e;
        if (!(e instanceof AppError) || !isTransient(e)) throw e; // bad key, bad request, etc: retrying won't help
        if (e.code === "timeout") break; // slow model: move on to the next one
        if (attempt === 0) await sleep(1500);
      }
    }
  }
  throw lastErr;
}

interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function requestOnce<T>(apiKey: string, model: string, { system, prompt, schema, timeoutMs = 20000 }: GeminiRequest): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new AppError("timeout", "Gemini took too long to respond. Try again.");
    throw new AppError("network", "Couldn't reach Gemini. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: { message?: string } })?.error?.message || "";
    } catch {
      /* no body */
    }
    if (res.status === 400 && /api key/i.test(detail)) throw new AppError("bad-key", "Your Gemini API key looks invalid. Check VITE_GEMINI_API_KEY in .env and rebuild.");
    if (res.status === 401 || res.status === 403) throw new AppError("bad-key", "Gemini rejected the API key (permission denied). Check VITE_GEMINI_API_KEY in .env and rebuild.");
    if (res.status === 404) throw new AppError("bad-model", `Model "${model}" was not found. Update DEFAULT_MODEL in src/lib/gemini.ts.`);
    if (res.status === 429) throw new AppError("quota", "Gemini rate limit or quota reached. Wait a bit and try again.");
    if (res.status >= 500) throw new AppError("unavailable", `Gemini is temporarily unavailable (${res.status}${detail ? ": " + detail.slice(0, 120) : ""}). Try again shortly.`);
    throw new AppError("http", `Gemini error ${res.status}${detail ? ": " + detail.slice(0, 160) : ""}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) throw new AppError("blocked", "Gemini declined to process this request.");
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("");
  if (!text) throw new AppError("empty", "Gemini returned an empty response. Try again.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError("parse", "Gemini returned an unreadable response. Try again.");
  }
}

export async function testKey(): Promise<boolean> {
  const out = await callGemini<{ ok: boolean }>({
    system: "Reply with JSON only.",
    prompt: 'Return {"ok": true}.',
    schema: { type: "OBJECT", properties: { ok: { type: "BOOLEAN" } }, required: ["ok"] },
    timeoutMs: 20000,
  });
  return !!out;
}
