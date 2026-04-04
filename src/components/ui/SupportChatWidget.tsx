'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = { role: 'user' | 'assistant'; content: string };

const STARTER_CHIPS = [
    'How does Auto-Approval work?',
    'What is TurboCore Pro?',
    'How do I connect Tastytrade?',
    'How does the shadow ledger work?',
];

export function SupportChatWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 150);
    }, [open]);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isStreaming) return;

        const userMsg: Message = { role: 'user', content: trimmed };
        const nextHistory = [...messages, userMsg];
        setMessages(nextHistory);
        setInput('');
        setIsStreaming(true);

        try {
            const response = await fetch('/api/support/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed, history: messages }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.status === 401
                        ? 'Please log in to use the support chat.'
                        : `Sorry, something went wrong: ${err.error || response.statusText}`,
                }]);
                return;
            }

            if (!response.body) throw new Error('No response stream');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            // Add the placeholder assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    const raw = line.replace(/^data: /, '');
                    if (raw === '[DONE]') continue;
                    try {
                        const data = JSON.parse(raw);
                        const delta = data.choices?.[0]?.delta?.content;
                        if (delta) {
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.role === 'assistant') last.content += delta;
                                return updated;
                            });
                        }
                    } catch { /* ignore parse errors on non-JSON lines */ }
                }
            }
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I had trouble connecting. Please try again.',
            }]);
        } finally {
            setIsStreaming(false);
        }
    }, [messages, isStreaming]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                    open
                        ? 'bg-tm-surface border border-white/10 text-tm-muted'
                        : 'bg-gradient-to-br from-blue-500 to-tm-purple text-white shadow-lg shadow-tm-purple/40 hover:scale-110'
                }`}
                aria-label="TradeMind Support Chat"
            >
                {open
                    ? <X className="w-5 h-5" />
                    : <MessageCircle className="w-6 h-6" />
                }
            </button>

            {/* Chat panel */}
            <div
                className={`fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] sm:w-[400px] transition-all duration-300 origin-bottom-right ${
                    open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'
                }`}
                style={{ marginBottom: '4.5rem' }}
            >
                <div className="glass-card flex flex-col shadow-2xl border-tm-purple/30 overflow-hidden" style={{ height: '520px' }}>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-gradient-to-r from-tm-purple/15 to-transparent shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-tm-purple flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold">TradeMind Support</h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-tm-green">
                                <span className="w-1.5 h-1.5 rounded-full bg-tm-green animate-pulse" />
                                Online — ask me anything
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1.5 text-tm-muted hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center text-center pt-4 space-y-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-tm-purple/20 border border-tm-purple/30 flex items-center justify-center">
                                    <Bot className="w-7 h-7 text-tm-purple" />
                                </div>
                                <p className="text-sm text-tm-muted leading-relaxed max-w-xs">
                                    Hi! I can answer questions about TradeMind features, strategies, and settings.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {STARTER_CHIPS.map(chip => (
                                        <button
                                            key={chip}
                                            onClick={() => sendMessage(chip)}
                                            className="px-3 py-1.5 rounded-full bg-tm-surface border border-white/10 text-xs text-zinc-300 hover:border-tm-purple/40 hover:text-white transition-colors text-left"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => {
                            const isAI = msg.role === 'assistant';
                            const isLast = i === messages.length - 1;
                            return (
                                <div key={i} className={`flex gap-2 ${isAI ? '' : 'flex-row-reverse'}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                        isAI ? 'bg-gradient-to-br from-blue-500/30 to-tm-purple/30 text-tm-purple' : 'bg-tm-surface border border-white/10 text-tm-muted'
                                    }`}>
                                        {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                                        isAI
                                            ? 'bg-tm-surface border border-white/5 text-gray-200 rounded-tl-sm prose prose-invert prose-xs max-w-none'
                                            : 'bg-gradient-to-br from-blue-600 to-tm-purple text-white rounded-tr-sm'
                                    }`}>
                                        {isAI ? (
                                            <>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                                {isLast && isStreaming && (
                                                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-tm-purple animate-pulse align-middle rounded-sm" />
                                                )}
                                            </>
                                        ) : msg.content}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 pb-3 shrink-0 border-t border-white/5 pt-3">
                        <div className="flex items-end gap-2 bg-tm-surface/80 rounded-xl border border-white/10 focus-within:border-tm-purple/50 transition-colors p-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question..."
                                className="flex-1 bg-transparent text-xs text-white placeholder:text-tm-muted/50 resize-none max-h-28 min-h-[36px] py-2 px-1 border-none focus:outline-none focus:ring-0"
                                rows={1}
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={isStreaming || !input.trim()}
                                className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-tm-purple flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            >
                                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-tm-muted mt-2">
                            Or email <a href="mailto:support@trademind.bot" className="text-blue-400 hover:underline">support@trademind.bot</a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
