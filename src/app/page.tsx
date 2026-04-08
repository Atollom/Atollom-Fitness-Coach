"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Zap, AlertTriangle, Battery, Bell, BellOff, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { useRouter } from "next/navigation";
import BottomNav from "./components/BottomNav";
import { usePushNotifications } from "./hooks/usePushNotifications";

type Message = {
  role: "user" | "coach" | "system";
  content: string;
};

type Ejercicio = { nombre: string; series: number; reps: string; videoId?: string };
type Dia = { dia: string; tipo: string; duracion: string; ejercicios?: Ejercicio[]; nota: string };

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miércoles: "Mié", jueves: "Jue",
  viernes: "Vie", sábado: "Sáb", domingo: "Dom",
};

const QUICK_ACTIONS = [
  { label: "YA ENTRENÉ", icon: Zap, type: "success", prompt: "Acabo de terminar mi entrenamiento. Dame feedback y qué sigue." },
  { label: "TENGO ANSIEDAD", icon: AlertTriangle, type: "danger", prompt: "Tengo ansiedad ahora mismo. Dame el protocolo de acción inmediata." },
  { label: "SIN ENERGÍA", icon: Battery, type: "neutral", prompt: "No tengo energía ni ganas de hacer nada. Activa el protocolo de emergencia." },
];

function formatMessage(text: string) {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const parts: (string | React.ReactElement)[] = [];
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
  const [userName, setUserName] = useState<string | null>(null);
  const [todayDia, setTodayDia] = useState<Dia | null>(null);
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { subscribed, subscribe } = usePushNotifications();

  // Redirect if no profile
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/profile").then(r => r.json()).then(d => {
        if (!d.profile) router.replace("/onboarding");
        else setUserName(d.profile.nombre || null);
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [router]);

  // Fetch today's routine
  useEffect(() => {
    fetch("/api/routines").then(r => r.json()).then(d => {
      if (d.routine?.plan?.dias) {
        const now = new Date();
        const todayEs = now.toLocaleDateString("es-MX", { weekday: "long" }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const match = d.routine.plan.dias.find((dia: Dia) => {
          const diaLow = dia.dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return diaLow === todayEs;
        });
        if (match) setTodayDia(match);
      }
    }).catch(() => {});
  }, []);

  // Clock
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
    setShowChat(true);
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

  // Week strip
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      label: DAYS_ES[d.getDay()],
      num: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
    };
  });

  const tipoBadge = todayDia?.tipo === "Descanso"
    ? "border-tertiary text-tertiary"
    : todayDia?.tipo === "Cardio"
    ? "border-cyan text-cyan"
    : "border-primary text-primary";

  return (
    <main className="flex flex-col h-screen bg-background text-foreground max-w-md mx-auto overflow-hidden pb-16">

      {/* Header */}
      <header className="flex justify-between items-center px-5 py-3 border-b border-outline shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-primary tracking-widest">{">"}_</span>
          <span className="font-display font-bold text-xs tracking-widest text-primary uppercase">ATOLLOM OS V1.0</span>
          <span className="font-mono text-[10px] text-tertiary ml-1">— SYSTEM ONLINE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-tertiary">{time}</span>
          <button onClick={subscribe} title={subscribed ? "Alertas activas" : "Activar alertas"}>
            {subscribed
              ? <Bell size={13} className="text-primary" />
              : <BellOff size={13} className="text-tertiary hover:text-primary transition-colors" />
            }
          </button>
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_2s_ease-in-out_infinite]" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* Hero block */}
        {!showChat && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-5 pb-4">
            <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">SISTEMA ACTIVO</p>
            <h1 className="font-display font-extrabold text-2xl uppercase leading-tight text-foreground mb-1">
              LISTO PARA ENTRENAR,
            </h1>
            <h1 className="font-display font-extrabold text-3xl uppercase leading-tight neon-text text-primary mb-5">
              {userName ? userName.split(" ")[0].toUpperCase() : "ATLETA"}?
            </h1>

            {/* Week strip */}
            <div className="flex gap-1.5 mb-5">
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  className={`flex-1 flex flex-col items-center py-2 border transition-colors ${
                    d.isToday
                      ? "border-primary bg-primary/10 neon-box"
                      : "border-outline bg-surface-high"
                  }`}
                >
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${d.isToday ? "text-primary" : "text-tertiary"}`}>
                    {d.label}
                  </span>
                  <span className={`font-display font-bold text-sm ${d.isToday ? "text-primary" : "text-foreground/60"}`}>
                    {d.num}
                  </span>
                </div>
              ))}
            </div>

            {/* Today's workout */}
            {todayDia ? (
              <div className="neon-box neon-corner bg-surface-high p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">ENTRENAMIENTO HOY</p>
                    <p className="font-display font-bold text-lg text-foreground uppercase">{todayDia.dia}</p>
                    <span className={`text-[10px] font-display font-bold uppercase tracking-widest border px-2 py-0.5 ${tipoBadge}`}>
                      {todayDia.tipo}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-tertiary">{todayDia.duracion}</span>
                </div>

                {todayDia.ejercicios && todayDia.ejercicios.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {todayDia.ejercicios.slice(0, 3).map((ej, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="font-display text-xs text-foreground uppercase tracking-wide">{ej.nombre}</span>
                        <span className="font-mono text-[10px] text-tertiary">{ej.series}×{ej.reps}</span>
                      </div>
                    ))}
                    {todayDia.ejercicios.length > 3 && (
                      <p className="font-mono text-[10px] text-tertiary">+{todayDia.ejercicios.length - 3} ejercicios más</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <a href="/routines" className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-primary text-primary font-display text-xs uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors">
                    <Play size={12} /> VER PLAN
                  </a>
                  <button
                    onClick={() => sendMessage("Acabo de terminar mi entrenamiento de hoy. Dame feedback.")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-black font-display text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
                  >
                    <CheckCircle2 size={12} /> TERMINÉ
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-outline bg-surface-high p-4 mb-4 text-center">
                <p className="font-mono text-xs text-tertiary uppercase tracking-widest mb-2">Sin rutina generada</p>
                <a href="/routines" className="font-display text-xs text-primary uppercase tracking-widest font-bold flex items-center justify-center gap-1">
                  Generar plan semanal <ChevronRight size={12} />
                </a>
              </div>
            )}

            {/* ATLAS prompt */}
            <div className="border-l-4 border-primary bg-surface-high px-4 py-3 mb-2">
              <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">ATLAS COACH</p>
              <p className="font-display text-sm font-bold text-foreground uppercase leading-relaxed">
                "Sistema cargado. Tu objetivo no espera. ¿Qué reportas hoy?"
              </p>
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        {showChat && (
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
                      <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1.5">ATLAS</p>
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
                    <Loader2 className="animate-spin text-primary" size={14} />
                    <span className="font-mono text-xs text-tertiary uppercase tracking-widest">ATLAS procesando...</span>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </AnimatePresence>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-4 pb-4 flex flex-col gap-2">
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
                <Icon size={13} />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Input */}
      <footer className="px-3 py-3 bg-surface-low border-t border-outline shrink-0">
        <form
          className="flex items-center gap-2 w-full"
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        >
          <span className="font-mono text-xs text-primary shrink-0">{">"}_</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Habla con ATLAS..."
            className="flex-1 min-w-0 bg-transparent border-b border-outline px-2 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-sm transition-colors placeholder:text-tertiary/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="shrink-0 w-9 h-9 flex items-center justify-center bg-primary text-black hover:bg-white transition-colors duration-100 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </form>
      </footer>
      <BottomNav />
    </main>
  );
}
