"use client";

import { useEffect, useState } from "react";
import { User, Save, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

type Profile = {
  peso_kg: string; objetivo: string; horario_trabajo: string;
  ventana_entrenamiento: string; presupuesto_semanal: string; supermercados: string[];
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      setProfile(d.profile);
      setForm(d.profile || {});
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const body = { ...form };
    if (typeof body.supermercados === "string") {
      body.supermercados = (body.supermercados as unknown as string).split(",").map((s: string) => s.trim());
    }
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (key: keyof Profile, label: string, type = "text", placeholder = "") => (
    <div className="space-y-1">
      <label className="font-display text-xs text-tertiary uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={(form[key] as string) || ""}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-surface-low border-2 border-outline px-4 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none placeholder:text-tertiary"
      />
    </div>
  );

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">
      <header className="flex justify-between items-center px-6 py-4 border-b-2 border-surface-low shrink-0">
        <div className="flex items-center gap-2">
          <User size={16} className="text-primary" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">Perfil</span>
        </div>
        <button onClick={() => router.push("/onboarding")}
          className="flex items-center gap-1.5 text-tertiary hover:text-primary transition-colors font-display text-xs uppercase tracking-widest">
          <RefreshCw size={13} /> Re-onboarding
        </button>
      </header>

      <div className="flex-1 px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : !profile ? (
          <div className="text-center py-20 space-y-4">
            <p className="font-display text-tertiary text-sm uppercase tracking-widest">Sin perfil configurado</p>
            <button onClick={() => router.push("/onboarding")}
              className="px-6 py-3 bg-primary text-black font-display font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">
              Iniciar Onboarding
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {field("peso_kg", "Peso actual (kg)", "number", "75")}
            {field("objetivo", "Objetivo principal", "text", "Bajar de peso, ganar músculo...")}
            {field("horario_trabajo", "Horario de trabajo", "text", "9am-6pm")}
            {field("ventana_entrenamiento", "Ventana de entrenamiento", "text", "6am-7am o 7pm-8pm")}
            {field("presupuesto_semanal", "Presupuesto semanal comida (MXN)", "number", "500")}

            <div className="space-y-1">
              <label className="font-display text-xs text-tertiary uppercase tracking-widest">Supermercados (separados por coma)</label>
              <input
                type="text"
                value={Array.isArray(form.supermercados) ? form.supermercados.join(", ") : (form.supermercados || "")}
                onChange={e => setForm(f => ({ ...f, supermercados: e.target.value as unknown as string[] }))}
                placeholder="3B, Aurrera, Chedraui..."
                className="w-full bg-surface-low border-2 border-outline px-4 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none placeholder:text-tertiary"
              />
            </div>

            <button onClick={save} disabled={saving}
              className="w-full py-4 bg-primary text-black font-display font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? "✓ GUARDADO" : <><Save size={16} /> Guardar Cambios</>}
            </button>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
