import { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'Best food spots nearby?',
  'What should I do today?',
  'Any hidden gems here?',
  'Budget travel tips',
  'Safety tips for solo travel',
];

export default function ChatBot({ city, onClose }: { city: string | null; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: city
      ? `Hey! I'm your NxStops travel assistant. You're exploring ${city} — ask me anything about the city, restaurants, things to do, or trip planning!`
      : `Hey! I'm your NxStops travel assistant. Pick a city first, then ask me anything about dining, activities, hidden gems, or trip planning!`
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), userMsg]
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, city }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Sorry, something went wrong. Try again!',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Couldn\'t reach the server. Check your connection and try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, city]);

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-bg-modal-overlay z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="modal-sheet bg-bg-surface rounded-t-3xl max-w-[430px] w-full h-[75vh] flex flex-col border border-border-subtle border-b-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-gradient flex items-center justify-center text-lg">
              {'\u{2728}'}
            </div>
            <div>
              <div className="text-[15px] font-bold text-text-primary">NxStops AI</div>
              <div className="text-[11px] text-text-tertiary">
                {city ? `Exploring ${city}` : 'Your travel assistant'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="bg-transparent border-none text-text-tertiary cursor-pointer p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'rounded-[18px_18px_4px_18px] bg-accent-gradient text-text-on-accent border-none'
                  : 'rounded-[18px_18px_18px_4px] bg-bg-elevated text-text-primary border border-border-subtle'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-5 py-3 rounded-[18px_18px_18px_4px] bg-bg-elevated border border-border-subtle flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-[fadeIn_0.6s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-[fadeIn_0.6s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-[fadeIn_0.6s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (only show when conversation just started) */}
        {messages.length <= 1 && (
          <div className="px-5 pb-2 flex gap-1.5 flex-wrap shrink-0">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="py-2 px-3.5 rounded-[20px] bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-5 pt-3 pb-7 border-t border-border-subtle flex gap-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask me anything about your trip..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
            disabled={loading}
            className={`flex-1 px-4 py-3.5 rounded-[14px] border border-border-strong bg-bg-subtle text-text-primary text-sm outline-none ${loading ? 'opacity-60' : 'opacity-100'}`}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className={`w-12 h-12 rounded-[14px] border-none flex items-center justify-center shrink-0 ${
              input.trim() && !loading
                ? 'bg-accent-gradient cursor-pointer text-text-on-accent'
                : 'bg-bg-subtle-strong cursor-default text-text-disabled'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
