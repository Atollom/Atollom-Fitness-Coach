"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Play, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";
import YouTubeCard from "../components/YouTubeCard";

type Ejercicio = { nombre: string; series: number; reps: string; youtube?: string; videoId?: string; channel?: string };
type Dia = { dia: string; tipo: string; duracion: string; ejercicios?: Ejercicio[]; nota: string };
type Routine = { plan: { dias: Dia[] }; week_start: string };

const TIPO_STYLE: Record<string, string> = {
  Fuerza: "border-primary text-primary",
  Cardio: "border-cyan text-cyan",
  Descanso: "border-tertiary text-tertiary",
};

export default function Routines() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const fetchRoutine = async () => {
    setLoading(true);
    const res = await fetch("/api/routines");
    const data = await res.json();
    setRoutine(data.routine);
    setLoading(false);
  };

  const generate = async () => {
    setGenerating(true);
    const res = await fetch("/api/routines", { method: "POST" });
    const data = await res.json();
    if (data.routine) setRoutine(data.routine);
    setGenerating(false);
  };

  useEffect(() => { fetchRoutine(); }, []);

  const dias: Dia[] = routine?.plan?.dias || [];
  const todayEs = new Date().toLocaleDateString("es-MX", { weekday: "long" })
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const todayIdx = dias.findIndex(d =>
    d.dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === todayEs
  );

  const todayDia = todayIdx >= 0 ? dias[todayIdx] : null;
  const tipoStyle = TIPO_STYLE[todayDia?.tipo || ""] || "border-outline text-tertiary";

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">

      {/* Header */}
      <header className="flex justify-between items-center px-5 py-3 border-b border-outline shrink-0">
        <div>
          <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">{">"}_</p>
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">TRAINING PROTOCOL</span>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 text-tertiary hover:text-primary transition-colors font-display text-xs uppercase tracking-widest disabled:opacity-40"
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {generating ? "Generando..." : "Nuevo Plan"}
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="animate-spin text-primary" size={28} />
          <p className="font-mono text-xs text-tertiary uppercase tracking-widest">Cargando protocolo...</p>
        </div>
      ) : dias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-5 px-8 text-center">
          <div className="w-16 h-16 border-2 border-outline flex items-center justify-center">
            <RefreshCw size={24} className="text-tertiary" />
          </div>
          <p className="font-display text-tertiary text-sm uppercase tracking-widest">Sin plan generado</p>
          <p className="font-mono text-xs text-tertiary/60">ATLAS necesita tu perfil para generar un protocolo personalizado</p>
          <button onClick={generate} disabled={generating}
            className="px-8 py-3 bg-primary text-black font-display font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 neon-box">
            {generating
              ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Generando...</span>
              : "⚡ GENERAR PROTOCOLO"}
          </button>
        </div>
      ) : (
        <div className="flex-1 px-4 py-4 space-y-3">

          {/* Today's hero card */}
          {todayDia && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="neon-box neon-corner bg-surface-high p-5 mb-2">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">HOY — {todayDia.dia.toUpperCase()}</p>
                  <h2 className="font-display font-extrabold text-xl text-foreground uppercase">{todayDia.tipo}</h2>
                </div>
                <span className="font-mono text-xs text-tertiary">{todayDia.duracion}</span>
              </div>

              <p className="font-display text-xs text-primary font-bold uppercase tracking-wide border-l-2 border-primary pl-3 mb-4 italic">
                "{todayDia.nota}"
              </p>

              {/* Exercise list */}
              {todayDia.ejercicios && todayDia.ejercicios.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">EXERCISE PROTOCOL</p>
                  {todayDia.ejercicios.map((ej, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-outline last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-tertiary w-4">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <p className="font-display text-xs font-bold text-foreground uppercase tracking-wide">{ej.nombre}</p>
                          <p className="font-mono text-[10px] text-tertiary">{ej.series} series × {ej.reps}</p>
                        </div>
                      </div>
                      {ej.videoId && (
                        <YouTubeCard videoId={ej.videoId} title={ej.nombre} channel={ej.channel} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setCompleted(prev => { const s = new Set(prev); s.has(todayIdx) ? s.delete(todayIdx) : s.add(todayIdx); return s; })}
                className={`w-full py-3 flex items-center justify-center gap-2 font-display font-bold text-xs uppercase tracking-widest transition-colors ${
                  completed.has(todayIdx)
                    ? "bg-primary/20 border border-primary text-primary"
                    : "bg-primary text-black hover:bg-white"
                }`}
              >
                <CheckCircle2 size={14} />
                {completed.has(todayIdx) ? "✓ ENTRENAMIENTO COMPLETADO" : "MARCAR COMO COMPLETO"}
              </button>
            </motion.div>
          )}

          {/* Week overview */}
          <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest px-1">SEMANA COMPLETA</p>
          {dias.map((d, idx) => {
            const isToday = idx === todayIdx;
            const isOpen = open === idx;
            const style = TIPO_STYLE[d.tipo] || "border-outline text-tertiary";
            const isDone = completed.has(idx);

            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <button
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className={`w-full text-left bg-surface-high border p-4 flex justify-between items-center transition-colors ${
                    isToday ? "border-primary" : isDone ? "border-primary/40" : "border-outline"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDone && <CheckCircle2 size={13} className="text-primary shrink-0" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-foreground text-sm uppercase tracking-wide">{d.dia}</span>
                        {isToday && <span className="text-[9px] bg-primary text-black font-display font-bold px-1.5 py-0.5 uppercase tracking-widest">HOY</span>}
                      </div>
                      <span className={`text-[10px] font-display font-bold uppercase tracking-widest border px-2 py-0 ${style}`}>{d.tipo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-tertiary">{d.duracion}</span>
                    {isOpen ? <ChevronUp size={13} className="text-tertiary" /> : <ChevronDown size={13} className="text-tertiary" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-surface-low border-x border-b border-outline"
                    >
                      <div className="p-4 space-y-3">
                        <p className="font-display text-xs text-primary font-bold uppercase tracking-wide border-l-2 border-primary pl-3 italic">"{d.nota}"</p>
                        {d.ejercicios?.map((ej, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-outline pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-display text-xs font-bold text-foreground uppercase tracking-wide">{ej.nombre}</p>
                              <p className="font-mono text-[10px] text-tertiary">{ej.series} series × {ej.reps}</p>
                            </div>
                            {ej.videoId && (
                              <YouTubeCard videoId={ej.videoId} title={ej.nombre} channel={ej.channel} />
                            )}
                          </div>
                        ))}
                        {(!d.ejercicios || d.ejercicios.length === 0) && (
                          <p className="font-mono text-xs text-tertiary">Día de descanso activo. Camina, estira, recupera.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
