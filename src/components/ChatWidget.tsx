import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

type Role = 'user' | 'assistant';
type Msg = { role: Role; content: string };
type Provider = 'gemini' | 'groq';

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm Andrew's AI assistant. Ask me anything about his skills, projects, or experience.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('gemini');
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    // Append the streamed answer into the last assistant bubble as tokens arrive.
    const setAnswer = (content: string) =>
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: 'assistant', content };
        return copy;
      });

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the conversation (minus the local greeting) plus the chosen provider.
        body: JSON.stringify({
          provider,
          messages: next.filter((m) => m !== GREETING),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              data?.error ??
              "Sorry — I couldn't reach the assistant just now. Please try again in a moment.",
          },
        ]);
        return;
      }

      // Stream the plain-text token response.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acc += chunk;
        if (!started) {
          started = true;
          setLoading(false); // first token arrived — swap typing dots for text
          setMessages((m) => [...m, { role: 'assistant', content: acc }]);
        } else {
          setAnswer(acc);
        }
      }

      if (!started) {
        setLoading(false);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: "Sorry — I couldn't generate a reply. Please try again.",
          },
        ]);
      }
    } catch {
      setLoading(false);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Network error — please try again.' },
      ]);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-[#0b0d10] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--brand-bright)]"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-40 right-5 z-50 flex h-[32rem] max-h-[calc(100vh-12rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--brand-bright)]" />
              <span className="text-sm font-medium text-[var(--text)]">
                Ask about Andrew
              </span>
            </div>
            {/* Provider toggle */}
            <div className="flex overflow-hidden rounded-full border border-[var(--border)] text-[10px]">
              {(['gemini', 'groq'] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-2 py-1 capitalize transition-colors ${
                    provider === p
                      ? 'bg-[var(--brand)] text-[#0b0d10]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--brand)] text-[#0b0d10]'
                      : 'bg-[var(--bg-soft)] text-[var(--text)]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--muted)]">
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask about a project, skill…"
                className="max-h-24 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-[#0b0d10] transition-colors hover:bg-[var(--brand-bright)] disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Dot({ delay = '0s' }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]"
      style={{ animationDelay: delay }}
    />
  );
}
