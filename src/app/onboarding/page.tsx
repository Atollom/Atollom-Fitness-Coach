"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Terminal, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Message = {
  role: "system" | "user" | "coach";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  { role: "system", content: "ATOLLOM AI — Personal Coach System activado" },
  { role: "coach", content: "¡Hola! Soy ATLAS, tu coach personal con IA 💪 Estoy aquí para construirte un plan 100% personalizado que realmente funcione. Para empezar, ¿cómo te llamas y cuál es tu objetivo principal — bajar peso, ganar músculo, tonificar?" },
];

const STORAGE_KEY = "atollom_onboarding_chat";

export default function Onboarding() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_MESSAGES;
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Persistir mensajes en sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

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
        setCompleted(true);
        sessionStorage.removeItem(STORAGE_KEY);
        setTimeout(() => router.push("/"), 3500);
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: "system", content: "Problema de conexión. Vuelve a intentarlo." }]);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-background text-foreground max-w-md mx-auto overflow-hidden">

      <header className="flex justify-between items-center px-5 py-4 border-b-2 border-surface-low shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-primary" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">Perfil Inteligente</span>
        </div>
        <div className="w-2.5 h-2.5 bg-primary animate-[pulse_2s_ease-in-out_infinite]" />
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {msg.role === "system" && (
                <div className="w-full text-center">
                  <span className="text-xs font-mono text-tertiary tracking-widest">{msg.content}</span>
                </div>
              )}
              {msg.role === "coach" && (
                <div className="bg-surface-high border-l-4 border-primary p-4 max-w-[92%]">
                  <p className="font-sans text-sm text-foreground leading-relaxed">{msg.content}</p>
                </div>
              )}
              {msg.role === "user" && (
                <div className="bg-primary/10 border-r-4 border-primary p-3 max-w-[85%]">
                  <p className="font-mono text-sm text-foreground">{msg.content}</p>
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
              <div className="bg-surface-high border-l-4 border-tertiary p-3 flex items-center gap-2">
                <Loader2 className="animate-spin text-tertiary" size={14} />
                <span className="font-mono text-xs text-tertiary">ATLAS está escribiendo...</span>
              </div>
            </motion.div>
          )}

          {completed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full text-center py-4">
              <span className="font-display text-xs text-primary uppercase tracking-widest">✓ Perfil guardado — cargando tu dashboard...</span>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </AnimatePresence>
      </section>

      <footer className="shrink-0 px-3 py-3 bg-background border-t-2 border-surface-low">
        <form onSubmit={handleSend} className="flex gap-2 w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping || completed}
            placeholder="Responde a ATLAS..."
            className="flex-1 min-w-0 bg-surface-low border-2 border-outline px-3 py-2.5 text-foreground focus:outline-none focus:border-primary font-mono text-sm rounded-none placeholder:text-tertiary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim() || completed}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-black hover:bg-white transition-colors disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </main>
  );
}
