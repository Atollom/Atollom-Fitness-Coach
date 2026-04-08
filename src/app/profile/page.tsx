"use client";

import { useEffect, useState } from "react";
import { User, Save, Loader2, RefreshCw, Fingerprint, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
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
  const [biometricMsg, setBiometricMsg] = useState("");
  const [biometricLoading, setBiometricLoading] = useState(false);

  const enableBiometric = async () => {
    setBiometricLoading(true);
    setBiometricMsg("");
    try {
      const challengeRes = await fetch("/api/auth/webauthn/register-challenge", { method: "POST" });
      if (!challengeRes.ok) { setBiometricMsg("Error al iniciar registro"); setBiometricLoading(false); return; }
      const options = await challengeRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (verifyRes.ok) setBiometricMsg("✓ Face ID / Huella activado correctamente");
      else setBiometricMsg("Error al verificar biométrico");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setBiometricMsg(msg.includes("cancel") ? "Cancelado." : "Error al registrar biométrico.");
    }
    setBiometricLoading(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

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
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/onboarding")}
            className="text-tertiary hover:text-primary transition-colors" title="Re-onboarding">
            <RefreshCw size={14} />
          </button>
          <button onClick={logout} className="text-tertiary hover:text-secondary-dim transition-colors" title="Cerrar sesión">
            <LogOut size={14} />
          </button>
        </div>
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

            {/* Biometric */}
            <div className="space-y-2">
              <button onClick={enableBiometric} disabled={biometricLoading}
                className="w-full py-3 border-2 border-outline text-tertiary hover:border-primary hover:text-primary transition-colors font-display font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40">
                {biometricLoading ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                {biometricLoading ? "Registrando..." : "Activar Face ID / Huella"}
              </button>
              {biometricMsg && <p className="font-mono text-xs text-primary text-center">{biometricMsg}</p>}
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
