"use client";

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Bot, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMessage = { role: 'user' as const, content: input.trim() };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages, // send previous context
          sessionId: 'client-temp-session' // in production, tie to actual session ID
        })
      });

      if (response.status === 402) {
         setMessages(prev => [...prev, { role: 'assistant', content: 'You have exhausted your AI message limit for the month. Upgrade to Pro for more messages.' }]);
         setIsStreaming(false);
         return;
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      // Add a placeholder assistant message we will mutate
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.replace(/^data: /, '') === '[DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace(/^data: /, ''));
              if (data.choices?.[0]?.delta?.content) {
                const delta = data.choices[0].delta.content;
                setMessages(prev => {
                   const updated = [...prev];
                   const last = updated[updated.length - 1];
                   if (last.role === 'assistant') {
                      last.content += delta;
                   }
                   return updated;
                });
              }
            } catch (e) {
               // ignore chunk parse errors
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-tm-bg max-w-lg mx-auto flex flex-col h-screen">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-tm-border/50 bg-tm-surface/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-tm-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold flex items-center gap-2">
          <Bot className="w-5 h-5 text-tm-purple" />
          TradeMind AI
        </h1>
        <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-tm-purple bg-tm-purple/10 px-2 py-1 rounded-full border border-tm-purple/20">
          <div className="w-1.5 h-1.5 rounded-full bg-tm-purple animate-pulse" />
          Connected
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
         {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 text-tm-muted space-y-4">
               <div className="w-16 h-16 rounded-full bg-tm-surface border border-tm-border flex items-center justify-center">
                  <Bot className="w-8 h-8 text-tm-purple/50" />
               </div>
               <p className="text-sm">I'm your trading copilot.<br/>Ask me about market conditions, specific tickers, or TurboCore alignment.</p>
            </div>
         )}
         
         {messages.map((msg, i) => {
            const isAI = msg.role === 'assistant';
            const isLast = i === messages.length - 1;
            
            return (
               <div key={i} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAI ? 'bg-tm-purple/20 text-tm-purple' : 'bg-tm-surface border border-tm-border text-tm-muted'}`}>
                     {isAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${isAI ? 'bg-tm-surface border border-tm-border text-gray-200 rounded-tl-sm' : 'bg-tm-purple text-white rounded-tr-sm'}`}>
                     {msg.content}
                     {isAI && isLast && isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-tm-purple animate-pulse align-middle" />}
                  </div>
               </div>
            );
         })}
         <div ref={bottomRef} className="h-4" />
      </div>

      <div className="p-4 bg-tm-bg border-t border-tm-border/50 pb-safe">
         <div className="relative flex items-end gap-2 bg-tm-surface p-2 rounded-2xl border border-tm-border focus-within:border-tm-purple/50 transition-colors">
            <textarea 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSend();
                  }
               }}
               placeholder="Ask TradeMind AI..."
               className="flex-1 bg-transparent text-sm text-white placeholder:text-tm-muted/50 resize-none max-h-32 min-h-[44px] py-3 px-2 border-none focus:ring-0"
               rows={1}
            />
            <button 
               onClick={handleSend}
               disabled={isStreaming || !input.trim()}
               className="w-11 h-11 rounded-xl bg-tm-purple flex items-center justify-center text-white shrink-0 mb-0.5 disabled:opacity-50 disabled:bg-tm-surface transition-colors"
            >
               {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
         </div>
      </div>
    </div>
  );
}
