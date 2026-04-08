"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, X, Flame, Target, TrendingUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

type CheckIn = { id: string; created_at: string; tipo: string; nota: string | null; peso_kg: string | null; mood: number | null };
type Profile = { nombre: string; objetivo: string; peso_kg: number; presupuesto_semanal: number };

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

const MOTIVATIONAL: Record<string, string[]> = {
  default: [
    "Cada entrenamiento registrado es una versión tuya que nunca va a existir si no te mueves hoy.",
    "La constancia te hará imbatible. El resultado ya está calculado.",
    "No hay días malos, hay datos que usamos para mejorar el protocolo.",
    "El sistema no falla. Las personas que lo siguen, ganan.",
  ],
};

function getMotive(objetivo: string) {
  if (/baj|grasa|peso/i.test(objetivo)) return "Cada kilo es una decisión, no un accidente.";
  if (/músculo|masa|volumen/i.test(objetivo)) return "La masa se construye en el plato y en la barra. Sin excusas.";
  if (/tonil|defin/i.test(objetivo)) return "Definición es consistencia convertida en resultados visibles.";
  const msgs = MOTIVATIONAL.default;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export default function Progress() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "Entrenamiento", nota: "", peso_kg: "", mood: 3 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [ciRes, profRes] = await Promise.all([
      fetch("/api/checkin"),
      fetch("/api/profile"),
    ]);
    const ciData = await ciRes.json();
    const profData = await profRes.json();
    setCheckins(ciData.checkins || []);
    setProfile(profData.profile || null);
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

  // Computed stats
  const totalWorkouts = checkins.filter(c => c.tipo === "Entrenamiento").length;
  const totalLogros = checkins.filter(c => c.tipo === "Logro").length;
  const cleanDays = checkins.filter(c => c.tipo === "Comida limpia").length;

  // Streak: consecutive days with any check-in
  const checkDates = [...new Set(checkins.map(c => c.created_at.split("T")[0]))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < checkDates.length; i++) {
    const d = new Date(checkDates[i]);
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diffDays === i || diffDays === i + 1) streak++;
    else break;
  }

  // Weight progress
  const weightData = checkins
    .filter(c => c.tipo === "Peso" && c.peso_kg)
    .slice(0, 8)
    .reverse();

  const latestWeight = weightData[weightData.length - 1]?.peso_kg;
  const firstWeight = weightData[0]?.peso_kg;
  const weightDelta = latestWeight && firstWeight
    ? (parseFloat(latestWeight) - parseFloat(firstWeight)).toFixed(1)
    : null;

  const motivMsg = profile ? getMotive(profile.objetivo || "") : MOTIVATIONAL.default[0];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">

      <header className="flex justify-between items-center px-5 py-3 border-b border-outline shrink-0">
        <div>
          <p className="font-mono text-[10px] text-tertiary">{">"}_</p>
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">MISSION STATUS</span>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-primary border border-primary px-3 py-1.5 font-display text-xs uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors">
          <Plus size={12} /> LOG
        </button>
      </header>

      {/* Log modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center">
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="bg-background border-t-2 border-primary w-full max-w-md p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-sm uppercase tracking-widest text-primary">REGISTRAR LOGRO</span>
                <button onClick={() => setShowForm(false)}><X size={18} className="text-tertiary" /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`font-display text-xs font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                      form.tipo === t ? "border-primary bg-primary text-black" : "border-outline text-tertiary hover:border-primary"
                    }`}>{t}</button>
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
                <span className="font-mono text-[10px] text-tertiary uppercase">ESTADO:</span>
                {[1, 2, 3, 4, 5].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, mood: m }))}
                    className={`text-xl ${form.mood === m ? "scale-125" : "opacity-40"}`}>{MOOD_LABELS[m]}</button>
                ))}
              </div>
              <button onClick={save} disabled={saving}
                className="w-full py-3 bg-primary text-black font-display font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={15} className="animate-spin" /> : "⚡ GUARDAR"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : (
        <div className="flex-1 px-5 py-5 space-y-5">

          {/* Objetivo */}
          {profile && (
            <div className="neon-box bg-surface-high p-4">
              <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">OBJETIVO ACTIVO</p>
              <div className="flex items-center gap-3">
                <Target size={20} className="text-primary shrink-0" />
                <p className="font-display font-bold text-sm text-foreground uppercase tracking-wide leading-tight">
                  {profile.objetivo || "Define tu objetivo en perfil"}
                </p>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-high border border-outline p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={14} className="text-primary" />
                <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">RACHA</span>
              </div>
              <p className="font-display font-extrabold text-3xl text-primary neon-text">{streak}</p>
              <p className="font-mono text-[10px] text-tertiary">días consecutivos</p>
            </div>
            <div className="bg-surface-high border border-outline p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-cyan" />
                <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">ENTRENOS</span>
              </div>
              <p className="font-display font-extrabold text-3xl text-cyan">{totalWorkouts}</p>
              <p className="font-mono text-[10px] text-tertiary">total registrados</p>
            </div>
            <div className="bg-surface-high border border-outline p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-primary" />
                <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">LOGROS</span>
              </div>
              <p className="font-display font-extrabold text-3xl text-primary">{totalLogros}</p>
              <p className="font-mono text-[10px] text-tertiary">desbloqueados</p>
            </div>
            <div className="bg-surface-high border border-outline p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🥦</span>
                <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">NUTRICIÓN</span>
              </div>
              <p className="font-display font-extrabold text-3xl text-foreground">{cleanDays}</p>
              <p className="font-mono text-[10px] text-tertiary">días de comida limpia</p>
            </div>
          </div>

          {/* Weight chart */}
          {weightData.length >= 2 && (
            <div className="bg-surface-high border border-outline p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">CURVA DE PESO</p>
                {weightDelta && (
                  <span className={`font-display font-bold text-xs ${parseFloat(weightDelta) < 0 ? "text-primary" : "text-secondary-dim"}`}>
                    {parseFloat(weightDelta) > 0 ? "+" : ""}{weightDelta} kg
                  </span>
                )}
              </div>
              <div className="flex items-end gap-1 h-16">
                {weightData.map((w, i) => {
                  const allW = weightData.map(x => parseFloat(x.peso_kg!));
                  const min = Math.min(...allW);
                  const max = Math.max(...allW);
                  const range = max - min || 1;
                  const val = parseFloat(w.peso_kg!);
                  const h = Math.max(8, Math.round(((val - min) / range) * 48) + 8);
                  const isLast = i === weightData.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      {isLast && <span className="font-mono text-[8px] text-primary">{val}</span>}
                      <div style={{ height: h }} className={`w-full ${isLast ? "bg-primary" : "bg-primary/30"}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[9px] text-tertiary">Inicio: {firstWeight} kg</span>
                <span className="font-mono text-[9px] text-primary">Actual: {latestWeight} kg</span>
              </div>
            </div>
          )}

          {/* ATLAS motivational */}
          <div className="border-l-4 border-primary bg-surface-high px-4 py-3">
            <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">ATLAS DICE</p>
            <p className="font-display text-sm font-bold text-foreground uppercase leading-relaxed">"{motivMsg}"</p>
          </div>

          {/* Mission log */}
          {checkins.length > 0 && (
            <>
              <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">MISSION LOG</p>
              <div className="space-y-2">
                {checkins.slice(0, 15).map((c, idx) => {
                  const style = TIPO_COLOR[c.tipo] || "text-tertiary border-tertiary";
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                      className="bg-surface-high border border-outline px-4 py-3 flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-display text-[10px] font-bold uppercase tracking-widest border px-2 py-0 ${style}`}>{c.tipo}</span>
                          {c.mood && <span className="text-base leading-none">{MOOD_LABELS[c.mood]}</span>}
                        </div>
                        {c.peso_kg && <p className="font-mono text-xs text-foreground">⚖ {c.peso_kg} kg</p>}
                        {c.nota && <p className="font-mono text-xs text-tertiary">{c.nota}</p>}
                      </div>
                      <span className="font-mono text-[10px] text-tertiary shrink-0 ml-3">{formatDate(c.created_at)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {checkins.length === 0 && (
            <div className="text-center py-12 border border-outline bg-surface-high">
              <p className="font-display text-tertiary text-sm uppercase tracking-widest mb-2">Misión sin registros</p>
              <p className="font-mono text-xs text-tertiary/60 mb-4">Cada log es un paso hacia tu objetivo</p>
              <button onClick={() => setShowForm(true)}
                className="px-6 py-2 border border-primary text-primary font-display text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors">
                + PRIMER REGISTRO
              </button>
            </div>
          )}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
