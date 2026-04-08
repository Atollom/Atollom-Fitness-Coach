"use client";

import { useEffect, useState } from "react";
import { Dumbbell, RefreshCw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";
import YouTubeCard from "../components/YouTubeCard";

type Ejercicio = { nombre: string; series: number; reps: string; youtube?: string; videoId?: string; channel?: string };
type Dia = { dia: string; tipo: string; duracion: string; ejercicios: Ejercicio[]; nota: string };
type Routine = { plan: { dias: Dia[] }; week_start: string };

const TIPO_COLOR: Record<string, string> = {
  Fuerza: "border-primary text-primary",
  Cardio: "border-secondary-dim text-secondary-dim",
  Descanso: "border-tertiary text-tertiary",
};

export default function Routines() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

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
  const today = new Date().toLocaleDateString("es-MX", { weekday: "long" });
  const todayCapital = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">
      <header className="flex justify-between items-center px-6 py-4 border-b-2 border-surface-low shrink-0">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} className="text-primary" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">Plan Semanal</span>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 text-tertiary hover:text-primary transition-colors font-display text-xs uppercase tracking-widest disabled:opacity-40"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {generating ? "Generando..." : "Nuevo Plan"}
        </button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : dias.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="font-display text-tertiary text-sm uppercase tracking-widest">Sin plan generado</p>
            <button onClick={generate} disabled={generating} className="px-6 py-3 bg-primary text-black font-display font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40">
              {generating ? "Generando..." : "⚡ Generar Plan"}
            </button>
          </div>
        ) : (
          dias.map((d, idx) => {
            const isToday = d.dia.toLowerCase() === todayCapital.toLowerCase();
            const colorClass = TIPO_COLOR[d.tipo] || "border-outline text-tertiary";
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <button
                  onClick={() => setOpen(open === idx ? null : idx)}
                  className={`w-full text-left bg-surface-high border-l-4 p-4 flex justify-between items-start transition-colors ${isToday ? "border-primary" : "border-outline"}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-bold text-foreground text-sm uppercase tracking-wide">{d.dia}</span>
                      {isToday && <span className="text-[9px] bg-primary text-black font-display font-bold px-1.5 py-0.5 uppercase tracking-widest">HOY</span>}
                    </div>
                    <span className={`text-xs font-display font-bold uppercase tracking-widest border px-2 py-0.5 ${colorClass}`}>{d.tipo}</span>
                  </div>
                  <span className="font-mono text-xs text-tertiary mt-1">{d.duracion}</span>
                </button>

                <AnimatePresence>
                  {open === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-surface-low border-l-4 border-surface-high"
                    >
                      <div className="p-4 space-y-3">
                        <p className="font-display text-xs text-primary uppercase tracking-wide font-bold">"{d.nota}"</p>
                        {d.ejercicios?.map((ej, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-outline pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-display text-xs font-bold text-foreground uppercase tracking-wide">{ej.nombre}</p>
                              <p className="font-mono text-xs text-tertiary">{ej.series} series × {ej.reps}</p>
                            </div>
                            {ej.videoId && (
                            <YouTubeCard videoId={ej.videoId} title={ej.nombre} channel={ej.channel} />
                          )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}
