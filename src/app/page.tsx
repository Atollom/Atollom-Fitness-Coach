"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Terminal, Loader2, Zap, AlertTriangle, Battery, Bell, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNav from "./components/BottomNav";
import { usePushNotifications } from "./hooks/usePushNotifications";

type Message = {
  role: "user" | "coach" | "system";
  content: string;
};

const QUICK_ACTIONS = [
  { label: "YA ENTRENÉ", icon: Zap, type: "success", prompt: "Acabo de terminar mi entrenamiento. Dame feedback y qué sigue." },
  { label: "TENGO ANSIEDAD", icon: AlertTriangle, type: "danger", prompt: "Tengo ansiedad ahora mismo. Dame el protocolo de acción inmediata." },
  { label: "NO QUIERO HACER NADA", icon: Battery, type: "neutral", prompt: "No tengo energía ni ganas de hacer nada. Activa el protocolo de emergencia." },
];

function formatMessage(text: string) {
  // Render markdown links as clickable
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const parts: (string | JSX.Element)[] = [];
  let last = 0;
  let match;
  let key = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-white transition-colors">
        {match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [time, setTime] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { subscribed, subscribe } = usePushNotifications();

  // Redirect if no profile
  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (!d.profile) router.replace("/onboarding");
    });
  }, [router]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history: messages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "coach", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "system", content: "ERROR: CONEXIÓN INTERRUMPIDA." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <main className="flex flex-col h-screen bg-background text-foreground max-w-md mx-auto overflow-hidden pb-16">

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b-2 border-surface-low shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-primary" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">ATOLLOM OS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-tertiary">{time}</span>
          <button onClick={subscribe} title={subscribed ? "Alertas activas" : "Activar alertas"}>
            {subscribed
              ? <Bell size={14} className="text-primary" />
              : <BellOff size={14} className="text-tertiary hover:text-primary transition-colors" />
            }
          </button>
          <div className="w-2 h-2 bg-primary animate-[pulse_2s_ease-in-out_infinite]" />
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero — solo si no hay mensajes */}
        <AnimatePresence>
          {!hasMessages && (
            <motion.section
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pt-8 pb-4"
            >
              <p className="text-tertiary font-display text-xs uppercase tracking-widest mb-2">Sistema activo</p>
              <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.9] text-foreground mb-6">
                {time} <br />
                <span className="text-primary">ATLAS</span> <br />
                <span className="text-secondary-dim">En línea.</span>
              </h1>
              <div className="bg-surface-high border-l-4 border-primary p-4 mb-6">
                <p className="font-display text-base font-bold text-foreground uppercase tracking-wide leading-relaxed">
                  "Sistema operativo cargado. Tu objetivo no espera. ¿Qué reportas?"
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Chat messages */}
        {hasMessages && (
          <div className="px-4 pt-4 pb-2 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {msg.role === "system" && (
                    <span className="text-xs font-mono text-tertiary tracking-widest w-full text-center">{msg.content}</span>
                  )}
                  {msg.role === "coach" && (
                    <div className="bg-surface-high border-l-4 border-primary p-4 max-w-[92%]">
                      <p className="font-display text-sm font-bold text-foreground uppercase tracking-wide leading-relaxed whitespace-pre-wrap">
                        {formatMessage(msg.content)}
                      </p>
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
                    <span className="font-display text-xs text-tertiary uppercase tracking-widest">Analizando...</span>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </AnimatePresence>
          </div>
        )}

        {/* Quick Actions */}
        <div className={`px-4 pb-4 flex flex-col gap-2 ${hasMessages ? "mt-2" : ""}`}>
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => sendMessage(action.prompt)}
                disabled={isTyping}
                className={`font-display font-bold py-3 px-5 text-left uppercase text-xs tracking-widest border-2 transition-colors duration-100 flex items-center gap-3 disabled:opacity-40 ${
                  action.type === "success"
                    ? "bg-transparent border-primary text-primary hover:bg-primary hover:text-black"
                    : action.type === "danger"
                    ? "bg-secondary-dim/20 border-secondary-dim text-secondary-dim hover:bg-secondary-dim hover:text-white"
                    : "bg-transparent border-tertiary text-tertiary hover:bg-tertiary hover:text-black"
                }`}
              >
                <Icon size={14} />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Input */}
      <footer className="px-4 py-3 bg-surface-low border-t-2 border-surface-high shrink-0">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Reportar estado al sistema..."
            className="flex-1 bg-background border-b-2 border-outline px-3 py-2.5 text-foreground focus:outline-none focus:border-primary font-mono text-sm transition-colors rounded-none placeholder:text-tertiary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="p-2.5 bg-primary text-black hover:bg-white transition-colors duration-100 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
      <BottomNav />
    </main>
  );
}
