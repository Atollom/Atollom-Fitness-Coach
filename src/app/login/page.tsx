"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Eye, EyeOff, Fingerprint } from "lucide-react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email, password } : { email, password, name };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error desconocido"); setLoading(false); return; }
      router.push("/");
    } catch {
      setError("Problema de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!email) { setError("Ingresa tu correo primero"); return; }
    setError("");
    setBiometricLoading(true);

    try {
      const challengeRes = await fetch("/api/auth/webauthn/login-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!challengeRes.ok) {
        const d = await challengeRes.json();
        setError(d.error || "No hay biométrico registrado para este correo");
        setBiometricLoading(false);
        return;
      }

      const options = await challengeRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...assertion, email }),
      });

      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        setError(d.error || "Verificación fallida");
        setBiometricLoading(false);
        return;
      }

      router.push("/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("cancelled") || msg.includes("NotAllowed")) {
        setError("Autenticación cancelada.");
      } else {
        setError("Error biométrico. Usa correo y contraseña.");
      }
      setBiometricLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto">

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <div className="rounded-2xl overflow-hidden shadow-xl shadow-primary/10 inline-block">
          <Image src="/logo.png" alt="ATOLLOM AI" width={130} height={130} className="object-contain" priority />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground uppercase tracking-widest">ATOLLOM AI</h1>
        <p className="font-display text-xs text-primary uppercase tracking-widest mt-1">Personal Coach System</p>
      </motion.div>

      {/* Tab toggle */}
      <div className="flex w-full mb-6 border-2 border-outline">
        {(["login", "register"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(""); }}
            className={`flex-1 py-3 font-display font-bold text-xs uppercase tracking-widest transition-colors ${mode === m ? "bg-primary text-black" : "text-tertiary hover:text-foreground"}`}>
            {m === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
          </button>
        ))}
      </div>

      {/* Form */}
      <motion.form key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        onSubmit={handleSubmit} className="w-full space-y-4">

        <AnimatePresence>
          {mode === "register" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <label className="font-display text-xs text-tertiary uppercase tracking-widest block mb-1">Nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Tu nombre"
                className="w-full bg-surface-low border-2 border-outline px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none placeholder:text-tertiary" />
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="font-display text-xs text-tertiary uppercase tracking-widest block mb-1">Correo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="tu@correo.com"
            className="w-full bg-surface-low border-2 border-outline px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none placeholder:text-tertiary" />
        </div>

        <div>
          <label className="font-display text-xs text-tertiary uppercase tracking-widest block mb-1">Contraseña</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-surface-low border-2 border-outline px-4 py-3 pr-12 font-mono text-sm text-foreground focus:outline-none focus:border-primary rounded-none placeholder:text-tertiary" />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-foreground">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="font-mono text-xs text-secondary-dim border border-secondary-dim px-3 py-2">
            {error}
          </motion.p>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 bg-primary text-black font-display font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : mode === "login" ? "Entrar" : "Crear Cuenta"}
        </button>
      </motion.form>

      {/* Face ID / Biometric */}
      {mode === "login" && (
        <div className="w-full mt-4">
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-outline" />
            <span className="font-mono text-xs text-tertiary">o</span>
            <div className="flex-1 h-px bg-outline" />
          </div>
          <button onClick={handleBiometric} disabled={biometricLoading}
            className="w-full py-4 border-2 border-outline text-tertiary hover:border-primary hover:text-primary transition-colors font-display font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-40">
            {biometricLoading ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={18} />}
            {biometricLoading ? "Verificando..." : "Entrar con Face ID / Huella"}
          </button>
        </div>
      )}

      <p className="font-mono text-xs text-tertiary mt-8 text-center">
        ATOLLOM AI · Sistema protegido
      </p>
    </main>
  );
}
