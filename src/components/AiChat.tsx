import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import {
  CLAUDE_MODELS,
  type ClaudeModelId,
  DEFAULT_CHAT_MODEL,
  type ChatMessage,
  type ChatMode,
  sendChatMessage,
} from "../lib/chat";

interface AiChatProps {
  verse: { text: string; reference: string };
  onClose: () => void;
}

export default function AiChat({ verse, onClose }: AiChatProps) {
  const [mode, setMode] = useState<ChatMode>("bible");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`ai-chat-${mode}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(DEFAULT_CHAT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    const key = `ai-chat-${mode}`;
    if (messages.length > 0) {
      localStorage.setItem(key, JSON.stringify(messages));
    } else {
      localStorage.removeItem(key);
    }
  }, [messages, mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function switchMode(newMode: ChatMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setError(null);
    try {
      const saved = localStorage.getItem(`ai-chat-${newMode}`);
      setMessages(saved ? JSON.parse(saved) : []);
    } catch {
      setMessages([]);
    }
  }

  function deleteChat() {
    setMessages([]);
    localStorage.removeItem(`ai-chat-${mode}`);
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(updated, mode, verse, selectedModel);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 grid gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#b97344]" />
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
            AI Chat
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={deleteChat}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            title="Delete chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode pills */}
      <div className="flex gap-2">
        {([
          { key: "bible" as const, label: "Bible Study" },
          { key: "anxiety" as const, label: "Anxiety Help" },
        ]).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => switchMode(opt.key)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border transition-all cursor-pointer",
              mode === opt.key
                ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white border-transparent shadow-md"
                : "bg-white/70 border-zinc-200 text-zinc-800 hover:border-zinc-300",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400 font-medium">Model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ClaudeModelId)}
          className="rounded-lg border border-zinc-200 bg-white/80 px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#b97344]/40 cursor-pointer"
        >
          {CLAUDE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Context hint */}
      <p className="text-xs text-zinc-500 m-0">
        {mode === "bible"
          ? `Discussing: ${verse.reference}`
          : "Supportive, non-clinical guidance"}
      </p>

      {/* Message thread */}
      <div ref={scrollRef} className="max-h-72 overflow-y-auto grid gap-2">
        {messages.length === 0 && !isLoading && (
          <p className="text-sm text-zinc-400 text-center py-6 m-0">
            {mode === "bible"
              ? "Ask a question about today's verse..."
              : "Ask anything about managing anxiety..."}
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
              msg.role === "user"
                ? "ml-auto bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white"
                : "mr-auto bg-zinc-100 text-zinc-800",
            )}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto bg-zinc-100 text-zinc-500 rounded-2xl px-3 py-2 text-sm">
            Thinking...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-2 text-xs">
          {error}
        </div>
      )}

      {/* Crisis disclaimer */}
      <p className="text-[10px] text-zinc-400 m-0 leading-tight">
        This is not emergency support or medical advice. If you feel unsafe, contact local
        emergency services or a crisis line.
      </p>

      {/* Input row */}
      <div className="flex gap-2">
        <Input
          placeholder={
            mode === "bible" ? "Ask about the verse..." : "Ask about anxiety..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
