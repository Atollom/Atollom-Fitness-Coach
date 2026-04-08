"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, X, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

type CheckIn = { id: string; created_at: string; tipo: string; nota: string | null; peso_kg: string | null; mood: number | null };

const TIPOS = ["Entrenamiento", "Comida limpia", "Comida mala", "Día difícil", "Logro", "Peso"];
const MOOD_LABELS = ["", "😫", "😕", "😐", "😊", "💪"];
const TIPO_COLOR: Record<string, string> = {
  "Entrenamiento": "text-primary border-primary",
  "Logro": "text-primary border-primary",
  "Comida limpia": "text-cyan border-cyan",
  "Comida mala": "text-secondary-dim border-secondary-dim",
  "Día difícil": "text-secondary-dim border-secondary-dim",
  "Peso": "text-tertiary border-tertiary",
};

export default function Progress() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "Entrenamiento", nota: "", peso_kg: "", mood: 3 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/checkin");
    const data = await res.json();
    setCheckins(data.checkins || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: form.tipo,
        nota: form.nota || null,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        mood: form.mood,
      }),
    });
    setShowForm(false);
    setForm({ tipo: "Entrenamiento", nota: "", peso_kg: "", mood: 3 });
    setSaving(false);
    fetchData();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // Weight chart data
  const weightData = checkins
    .filter(c => c.tipo === "Peso" && c.peso_kg)
    .slice(0, 10)
    .reverse();

  // Stats
  const totalWorkouts = checkins.filter(c => c.tipo === "Entrenamiento").length;
  const totalLogros = checkins.filter(c => c.tipo === "Logro").length;
  const avgMood = checkins.filter(c => c.mood).length
    ? (checkins.filter(c => c.mood).reduce((a, c) => a + (c.mood || 0), 0) / checkins.filter(c => c.mood).length).toFixed(1)
    : null;

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">

      {/* Header */}
      <header className="flex justify-between items-center px-5 py-3 border-b border-outline shrink-0">
        <div>
          <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">{">"}_</p>
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">MISSION PROGRESS</span>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-primary hover:text-white transition-colors font-display text-xs uppercase tracking-widest font-bold border border-primary px-3 py-1.5">
          <Plus size={12} /> LOG
        </button>
      </header>

      {/* Log form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center">
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="bg-background border-t-2 border-primary w-full max-w-md p-5 space-y-4">

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-mono text-[10px] text-primary uppercase tracking-widest">{">"}_</p>
                  <span className="font-display font-bold text-sm uppercase tracking-widest text-primary">NUEVO REGISTRO</span>
                </div>
                <button onClick={() => setShowForm(false)}><X size={18} className="text-tertiary" /></button>
              </div>

              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`font-display text-xs font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                      form.tipo === t ? "border-primary bg-primary text-black" : "border-outline text-tertiary hover:border-primary"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>

              {form.tipo === "Peso" && (
                <input type="number" step="0.1" placeholder="Peso en kg" value={form.peso_kg}
                  onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))}
                  className="w-full bg-surface-low border border-outline px-4 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none" />
              )}

              <textarea placeholder="Nota (opcional)..." rows={2} value={form.nota}
                onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                className="w-full bg-surface-low border border-outline px-4 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary resize-none rounded-none placeholder:text-tertiary/50" />

              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">ESTADO:</span>
                {[1, 2, 3, 4, 5].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, mood: m }))}
                    className={`text-xl transition-transform ${form.mood === m ? "scale-125" : "opacity-40"}`}>
                    {MOOD_LABELS[m]}
                  </button>
                ))}
              </div>

              <button onClick={save} disabled={saving}
                className="w-full py-3 bg-primary text-black font-display font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={15} className="animate-spin" /> : "⚡ GUARDAR REGISTRO"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="animate-spin text-primary" size={28} />
          <p className="font-mono text-xs text-tertiary uppercase tracking-widest">Cargando misión...</p>
        </div>
      ) : (
        <div className="flex-1 px-5 py-5 space-y-5">

          {/* Stats grid */}
          {checkins.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "ENTRENOS", value: totalWorkouts, color: "text-primary" },
                { label: "LOGROS", value: totalLogros, color: "text-cyan" },
                { label: "ÁNIMO AVG", value: avgMood ? `${avgMood}/5` : "—", color: "text-foreground" },
              ].map((s, i) => (
                <div key={i} className="bg-surface-high border border-outline p-3 text-center">
                  <p className={`font-display font-extrabold text-xl ${s.color}`}>{s.value}</p>
                  <p className="font-mono text-[9px] text-tertiary uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Weight chart */}
          {weightData.length >= 2 && (
            <div className="bg-surface-high border border-outline p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-primary" />
                <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">STRENGTH PROGRESS — PESO CORPORAL</p>
              </div>
              <div className="flex items-end gap-1 h-20">
                {weightData.map((w, i) => {
                  const allW = weightData.map(x => parseFloat(x.peso_kg!));
                  const min = Math.min(...allW);
                  const max = Math.max(...allW);
                  const range = max - min || 1;
                  const val = parseFloat(w.peso_kg!);
                  const h = Math.max(20, Math.round(((val - min) / range) * 60) + 20);
                  const isLast = i === weightData.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="font-mono text-[8px] text-primary">{isLast ? val : ""}</span>
                      <div
                        style={{ height: h }}
                        className={`w-full transition-all ${isLast ? "bg-primary neon-progress-fill" : "bg-primary/30"}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[9px] text-tertiary">{weightData[0]?.peso_kg} kg</span>
                <span className="font-mono text-[9px] text-primary">{weightData[weightData.length - 1]?.peso_kg} kg actual</span>
              </div>
            </div>
          )}

          {/* Mission reports */}
          {checkins.length === 0 ? (
            <div className="text-center py-16 border border-outline bg-surface-high">
              <p className="font-display text-tertiary text-sm uppercase tracking-widest mb-2">Sin registros aún</p>
              <p className="font-mono text-xs text-tertiary/60 mb-4">Empieza a rastrear tu misión</p>
              <button onClick={() => setShowForm(true)}
                className="px-6 py-2 border border-primary text-primary font-display text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors">
                + PRIMER REGISTRO
              </button>
            </div>
          ) : (
            <>
              <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">MISSION REPORTS</p>
              <div className="space-y-2">
                {checkins.map((c, idx) => {
                  const style = TIPO_COLOR[c.tipo] || "text-tertiary border-tertiary";
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                      className="bg-surface-high border border-outline p-4 flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-display text-[10px] font-bold uppercase tracking-widest border px-2 py-0 ${style}`}>{c.tipo}</span>
                          {c.mood && <span className="text-base">{MOOD_LABELS[c.mood]}</span>}
                        </div>
                        {c.peso_kg && <p className="font-mono text-xs text-foreground">⚖ {c.peso_kg} kg</p>}
                        {c.nota && <p className="font-mono text-xs text-tertiary">{c.nota}</p>}
                      </div>
                      <span className="font-mono text-[10px] text-tertiary shrink-0 ml-2">{formatDate(c.created_at)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
