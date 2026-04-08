"use client";

import { useState, useRef } from "react";
import { Terminal, Camera, Type, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

export default function FoodAnalysis() {
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [textInput, setTextInput] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const analyze = async () => {
    if (loading) return;
    if (mode === "text" && !textInput.trim()) return;
    if (mode === "photo" && !imageFile) return;

    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      if (mode === "text") fd.append("text", textInput.trim());
      else if (imageFile) fd.append("image", imageFile);

      const res = await fetch("/api/food", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data.analysis || data.error || "Error desconocido");
    } catch {
      setResult("ERROR DE CONEXIÓN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">

      <header className="flex items-center gap-3 px-6 py-4 border-b-2 border-surface-low shrink-0">
        <Terminal size={16} className="text-primary" />
        <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">Análisis de Comida</span>
      </header>

      <div className="flex-1 px-6 py-6 space-y-6">

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["text", "photo"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 font-display text-xs uppercase tracking-widest font-bold transition-colors ${
                mode === m
                  ? "border-primary bg-primary text-black"
                  : "border-outline text-tertiary hover:border-primary hover:text-primary"
              }`}
            >
              {m === "text" ? <><Type size={14} /> Describir</> : <><Camera size={14} /> Foto</>}
            </button>
          ))}
        </div>

        {/* Input */}
        {mode === "text" ? (
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Ej: 2 tacos de canasta con frijoles y salsa verde..."
            rows={4}
            className="w-full bg-surface-low border-2 border-outline px-4 py-3 text-foreground focus:outline-none focus:border-primary font-mono text-sm resize-none placeholder:text-tertiary rounded-none"
          />
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-outline hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center py-10 gap-3"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="max-h-48 object-contain" />
            ) : (
              <>
                <Camera size={32} className="text-tertiary" />
                <span className="font-display text-xs text-tertiary uppercase tracking-widest">Toca para tomar foto o subir imagen</span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={loading || (mode === "text" ? !textInput.trim() : !imageFile)}
          className="w-full py-4 bg-primary text-black font-display font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Analizando...
            </span>
          ) : "⚡ Analizar"}
        </button>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-high border-l-4 border-primary p-5 space-y-1"
            >
              {result.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className="font-display text-sm font-bold text-foreground uppercase tracking-wide leading-relaxed">
                  {line}
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </main>
  );
}
