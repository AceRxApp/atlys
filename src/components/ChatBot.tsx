import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
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
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);
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
      className="modal-backdrop"
      style={{
        position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="modal-sheet"
        style={{
          background: theme.bg.surface, borderRadius: '24px 24px 0 0',
          maxWidth: '430px', width: '100%', height: '75vh',
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${theme.border.subtle}`, borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${theme.border.subtle}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '12px',
              background: theme.accent.amberGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>
              {'\u{2728}'}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: theme.text.primary }}>NxStops AI</div>
              <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                {city ? `Exploring ${city}` : 'Your travel assistant'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            style={{
              background: 'none', border: 'none', color: theme.text.tertiary,
              cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? theme.accent.amberGradient
                  : theme.bg.elevated,
                color: msg.role === 'user' ? theme.text.onAccent : theme.text.primary,
                fontSize: '14px',
                lineHeight: 1.5,
                border: msg.role === 'user' ? 'none' : `1px solid ${theme.border.subtle}`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 20px', borderRadius: '18px 18px 18px 4px',
                background: theme.bg.elevated, border: `1px solid ${theme.border.subtle}`,
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text.tertiary, animation: 'fadeIn 0.6s ease-in-out infinite alternate', animationDelay: '0s' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text.tertiary, animation: 'fadeIn 0.6s ease-in-out infinite alternate', animationDelay: '0.2s' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text.tertiary, animation: 'fadeIn 0.6s ease-in-out infinite alternate', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (only show when conversation just started) */}
        {messages.length <= 1 && (
          <div style={{
            padding: '0 20px 8px', display: 'flex', gap: '6px',
            flexWrap: 'wrap', flexShrink: 0,
          }}>
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                style={{
                  padding: '8px 14px', borderRadius: '20px',
                  background: theme.amberTint.bg10,
                  border: `1px solid ${theme.amberTint.border20}`,
                  color: theme.accent.amber, fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 20px 28px', borderTop: `1px solid ${theme.border.subtle}`,
          display: 'flex', gap: '8px', flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask me anything about your trip..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
            disabled={loading}
            style={{
              flex: 1, padding: '14px 16px', borderRadius: '14px',
              border: `1px solid ${theme.border.strong}`,
              background: theme.bg.subtle, color: theme.text.primary,
              fontSize: '14px', outline: 'none',
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: input.trim() && !loading ? theme.accent.amberGradient : theme.bg.subtleStrong,
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: input.trim() && !loading ? theme.text.onAccent : theme.text.disabled,
            }}
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
