"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Terminal, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Message = {
  role: "system" | "user" | "coach";
  content: string;
};

export default function Onboarding() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "ATOLLOM AI — Personal Coach System activado" },
    { role: "coach", content: "¡Hola! Soy ATLAS, tu coach personal con IA 💪 Estoy aquí para construirte un plan 100% personalizado que realmente funcione. Para hacerlo bien necesito conocerte primero. ¿Cómo te llamas y cuál es tu objetivo principal — bajar peso, ganar músculo, tonificar?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history: messages }),
      });

      const data = await response.json();
      setIsTyping(false);
      
      setMessages(prev => [...prev, { role: "coach", content: data.reply }]);

      if (data.isComplete) {
        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: "system", content: "ERROR: CONEXIÓN INTERRUMPIDA." }]);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-background text-foreground max-w-md mx-auto overflow-hidden">
      
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b-2 border-surface-low bg-background z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-primary text-xl" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">PERFIL INTELIGENTE</span>
        </div>
        <div className="w-3 h-3 bg-secondary-dim animate-[pulse_2s_ease-in-out_infinite]" />
      </header>

      {/* Chat Area */}
      <section className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'system' && (
                <div className="w-full text-center">
                  <span className="text-xs font-mono text-tertiary tracking-widest">{msg.content}</span>
                </div>
              )}
              {msg.role === 'coach' && (
                <div className="bg-surface-high border-l-4 border-primary p-4 shadow-xl max-w-[90%]">
                  <p className="font-display text-sm sm:text-base font-bold text-foreground uppercase tracking-wide leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="bg-primary/10 border-r-4 border-primary p-4 max-w-[85%] text-right">
                  <p className="font-mono text-sm text-foreground">
                    {msg.content}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
          {isTyping && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
               <div className="bg-surface-high border-l-4 border-tertiary p-3 flex items-center gap-2">
                  <Loader2 className="animate-spin text-tertiary" size={16} />
                  <span className="font-display text-xs text-tertiary uppercase">Analizando...</span>
               </div>
             </motion.div>
          )}
          <div ref={bottomRef} />
        </AnimatePresence>
      </section>

      {/* Input Form */}
      <footer className="shrink-0 px-3 py-3 bg-background border-t-2 border-surface-low">
        <form onSubmit={handleSend} className="flex gap-2 w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Responde a tu coach..."
            className="flex-1 min-w-0 bg-surface-low border-2 border-outline px-3 py-2.5 text-foreground focus:outline-none focus:border-primary font-mono text-sm transition-colors rounded-none placeholder:text-tertiary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-black hover:bg-white transition-colors duration-100 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </main>
  );
}
