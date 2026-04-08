"use client";

import { useEffect, useState } from "react";
import { BarChart2, Plus, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

type CheckIn = { id: string; created_at: string; tipo: string; nota: string | null; peso_kg: string | null; mood: number | null };

const TIPOS = ["Entrenamiento", "Comida limpia", "Comida mala", "Día difícil", "Logro", "Peso"];
const MOOD_LABELS = ["", "😫", "😕", "😐", "😊", "💪"];

export default function Progress() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "Entrenamiento", nota: "", peso_kg: "", mood: 3 });
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch("/api/checkin");
    const data = await res.json();
    setCheckins(data.checkins || []);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

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
    fetch_();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">
      <header className="flex justify-between items-center px-6 py-4 border-b-2 border-surface-low shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-primary" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">Progreso</span>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-primary hover:text-white transition-colors font-display text-xs uppercase tracking-widest font-bold">
          <Plus size={14} /> Registrar
        </button>
      </header>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-background border-t-4 border-primary w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-sm uppercase tracking-widest text-primary">Nuevo Registro</span>
                <button onClick={() => setShowForm(false)}><X size={18} className="text-tertiary" /></button>
              </div>

              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`font-display text-xs font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${form.tipo === t ? "border-primary bg-primary text-black" : "border-outline text-tertiary hover:border-primary"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {form.tipo === "Peso" && (
                <input type="number" placeholder="Peso en kg" value={form.peso_kg}
                  onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))}
                  className="w-full bg-surface-low border-2 border-outline px-4 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none" />
              )}

              <textarea placeholder="Nota opcional..." rows={2} value={form.nota}
                onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                className="w-full bg-surface-low border-2 border-outline px-4 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary resize-none rounded-none placeholder:text-tertiary" />

              <div className="flex items-center gap-3">
                <span className="font-display text-xs text-tertiary uppercase tracking-widest">Estado:</span>
                {[1, 2, 3, 4, 5].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, mood: m }))}
                    className={`text-xl transition-transform ${form.mood === m ? "scale-125" : "opacity-50"}`}>
                    {MOOD_LABELS[m]}
                  </button>
                ))}
              </div>

              <button onClick={save} disabled={saving}
                className="w-full py-3 bg-primary text-black font-display font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40">
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "⚡ Guardar"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-tertiary text-sm uppercase tracking-widest">Sin registros aún</p>
            <p className="font-mono text-xs text-tertiary mt-2">Empieza a rastrear tu progreso</p>
          </div>
        ) : (
          checkins.map((c, idx) => (
            <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
              className="bg-surface-high border-l-4 border-outline p-4 flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold text-primary uppercase tracking-widest">{c.tipo}</span>
                  {c.mood && <span className="text-sm">{MOOD_LABELS[c.mood]}</span>}
                </div>
                {c.peso_kg && <p className="font-mono text-xs text-foreground">{c.peso_kg} kg</p>}
                {c.nota && <p className="font-mono text-xs text-tertiary">{c.nota}</p>}
              </div>
              <span className="font-mono text-[10px] text-tertiary shrink-0 ml-2">{formatDate(c.created_at)}</span>
            </motion.div>
          ))
        )}
      </div>
      <BottomNav />
    </main>
  );
}
