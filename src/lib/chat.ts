import Anthropic from "@anthropic-ai/sdk";

export type ChatMode = "bible" | "anxiety";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const CLAUDE_MODELS = [
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-haiku-4-20250506", label: "Claude Haiku 4" },
  { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const;

export type ClaudeModelId = (typeof CLAUDE_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ClaudeModelId = "claude-sonnet-4-20250514";

function buildBibleStudySystemPrompt(verse: { text: string; reference: string }): string {
  return [
    "You are a warm, pastoral Bible study companion.",
    "The user is reflecting on the following verse today:",
    `"${verse.text}" — ${verse.reference}`,
    "",
    "Help them explore its meaning, historical context, and how it might apply to daily life.",
    "Ground your answers in scripture. You may reference related passages.",
    "Be encouraging and gentle — many users struggle with anxiety.",
    "Keep responses concise (3-6 sentences).",
    "Never diagnose, prescribe, or give medical advice.",
    "If someone describes a crisis or risk of self-harm, encourage them to contact local emergency services or a crisis line right away.",
  ].join("\n");
}

function buildAnxietyHelpSystemPrompt(): string {
  return [
    "You are a warm, supportive companion helping someone navigate anxiety.",
    "You are not a therapist or clinician — just a caring, knowledgeable presence.",
    "Offer practical, non-clinical guidance: breathing exercises, grounding techniques, reframing thoughts, gentle encouragement.",
    "Be validating and concise (3-6 sentences per response).",
    "Never diagnose, prescribe, or give medical advice.",
    "If someone describes a crisis or risk of self-harm, encourage them to contact local emergency services or a crisis line right away.",
  ].join("\n");
}

function getAnthropicClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env.local.",
    );
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function sendChatMessage(
  messages: ChatMessage[],
  mode: ChatMode,
  verse: { text: string; reference: string },
  model: ClaudeModelId = DEFAULT_CHAT_MODEL,
): Promise<string> {
  const client = getAnthropicClient();
  const system =
    mode === "bible"
      ? buildBibleStudySystemPrompt(verse)
      : buildAnxietyHelpSystemPrompt();

  const response = await client.messages.create({
    model,
    max_tokens: 600,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return response.content
    .filter((item): item is Anthropic.TextBlock => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}
