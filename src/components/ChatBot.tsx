import { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './icons';
import { API_URL } from '../utils/api';
import { supabase } from '../supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

interface PlanContext {
  stops: { name: string; category: string; timeSlot?: string }[];
  city: string;
  timeOfDay: string;
}

const QUICK_PROMPTS = [
  'Best food spots nearby?',
  'What should I do today?',
  'Any hidden gems here?',
  'Budget travel tips',
  'Safety tips for solo travel',
];

const PLAN_QUICK_PROMPTS = [
  'Add dessert nearby',
  'Replace with outdoor activity',
  'What if it rains?',
  'Suggest a dinner spot',
  'What should I skip?',
];

const SESSION_KEY = 'nxstops_chat';

function getInitialMessage(city: string | null): ChatMessage {
  return {
    role: 'assistant',
    content: city
      ? `Welcome to ${city}! I'm here to help you discover the best spots, plan your day, and make every moment count. What are you in the mood for?`
      : `Welcome! Pick a city to explore and I'll help you find the best restaurants, hidden gems, and experiences. Where are you headed?`,
  };
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: (string | React.ReactElement)[] = [];

  lines.forEach((line, li) => {
    const numMatch = line.match(/^\d+\.\s+/);
    const bulletMatch = line.match(/^[-*]\s+/);

    let processed = line;
    if (numMatch) processed = line.slice(numMatch[0].length);
    else if (bulletMatch) processed = line.slice(bulletMatch[0].length);

    // Inline formatting: **bold**, *italic*
    const parts: (string | React.ReactElement)[] = [];
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;
    while ((match = inlineRegex.exec(processed)) !== null) {
      if (match.index > lastIndex) parts.push(processed.slice(lastIndex, match.index));
      if (match[2]) {
        parts.push(<strong key={`${li}-b-${match.index}`}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`${li}-i-${match.index}`}>{match[3]}</em>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < processed.length) parts.push(processed.slice(lastIndex));

    if (numMatch || bulletMatch) {
      elements.push(
        <div key={`line-${li}`} className="flex gap-2 ml-1 mb-0.5">
          <span className="shrink-0 text-accent-amber">{numMatch ? `${line.match(/^\d+/)![0]}.` : '\u2022'}</span>
          <span>{parts}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={`line-${li}`} className="h-2" />);
    } else {
      elements.push(<span key={`line-${li}`}>{parts}{li < lines.length - 1 ? '\n' : ''}</span>);
    }
  });

  return elements;
}

export default function ChatBot({ city, onClose, planContext, onModification }: {
  city: string | null;
  onClose: () => void;
  planContext?: PlanContext;
  onModification?: (mod: { action: string; placeType?: string; targetStop?: string; suggestion?: string }) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { city: string | null; messages: ChatMessage[] };
        if (parsed.city === city && parsed.messages.length > 0) return parsed.messages;
      }
    } catch { /* ignore */ }
    return [getInitialMessage(city)];
  });
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

  // Persist to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ city, messages }));
    } catch { /* ignore */ }
  }, [messages, city]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), userMsg]
        .map(m => ({ role: m.role, content: m.content }));

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: apiMessages, city, planContext }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        // Handle plan modifications from AI
        if (data.modification && onModification) {
          onModification(data.modification);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Sorry, something went wrong. Try again!',
          error: true,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Couldn\'t reach the server. Check your connection and try again.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, city]);

  const retryLastMessage = useCallback(() => {
    const lastUserIdx = messages.map((m, i) => ({ m, i })).filter(x => x.m.role === 'user').pop();
    if (!lastUserIdx) return;
    setMessages(prev => prev.filter((_, i) => i < prev.length - 1));
    sendMessage(lastUserIdx.m.content);
  }, [messages, sendMessage]);

  const lastMessage = messages[messages.length - 1];
  const hasError = lastMessage?.error;

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-bg-modal-overlay z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="modal-sheet bg-bg-surface rounded-t-3xl max-w-[430px] md:max-w-[600px] lg:max-w-[700px] w-full h-[40vh] flex flex-col border border-border-subtle border-b-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — premium branded */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar: glowing compass-sparkle icon */}
            <div className="relative">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #E8940A 0%, #D85A18 50%, #C04810 100%)',
                  boxShadow: '0 2px 12px rgba(232, 148, 10, 0.35)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {/* Sparkle / compass star */}
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.95" />
                  <circle cx="12" cy="12" r="2.5" fill="rgba(232,148,10,0.9)" />
                </svg>
              </div>
              {/* Online pulse dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-green border-2 border-bg-surface" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-text-primary tracking-tight">NxStops</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-[1px] rounded"
                  style={{
                    background: 'linear-gradient(135deg, rgba(232,148,10,0.15), rgba(216,90,24,0.15))',
                    color: 'var(--accent-amber)',
                  }}
                >
                  AI
                </span>
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                {city ? `Exploring ${city}` : 'Your travel concierge'}
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
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="w-6 h-6 rounded-lg shrink-0 mt-1 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #E8940A, #D85A18)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.95" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'rounded-[18px_18px_4px_18px] bg-accent-gradient text-text-on-accent border-none'
                  : `rounded-[18px_18px_18px_4px] bg-bg-elevated text-text-primary border ${msg.error ? 'border-red-tint-border' : 'border-border-subtle'}`
              }`}>
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {/* Retry button on error */}
          {hasError && !loading && (
            <div className="flex justify-start">
              <button
                onClick={retryLastMessage}
                className="px-3.5 py-2.5 rounded-xl bg-red-tint-bg border border-red-tint-border text-status-red text-xs font-semibold cursor-pointer min-h-[44px]"
              >
                {'\u{1F504}'} Retry
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-start gap-2">
              <div
                className="w-6 h-6 rounded-lg shrink-0 mt-1 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #E8940A, #D85A18)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.95" />
                </svg>
              </div>
              <div className="px-5 py-3 rounded-[18px_18px_18px_4px] bg-bg-elevated border border-border-subtle flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-[fadeIn_0.6s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-[fadeIn_0.6s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-[fadeIn_0.6s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (only show when conversation just started) */}
        {messages.length <= 1 && (
          <div className="px-5 pb-2 flex gap-1.5 flex-wrap shrink-0">
            {(planContext ? PLAN_QUICK_PROMPTS : QUICK_PROMPTS).map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="py-2.5 px-3.5 rounded-[20px] bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber text-xs font-medium cursor-pointer whitespace-nowrap min-h-[44px]"
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
