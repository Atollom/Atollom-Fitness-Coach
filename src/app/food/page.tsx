"use client";

import { useState, useRef } from "react";
import { Camera, Type, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

type MacroLine = { label: string; value: string; unit: string; pct: number; color: string };

function parseMacros(text: string): MacroLine[] | null {
  // Parse: Proteína Xg | Carbs Xg | Grasa Xg | ~X kcal
  const p = text.match(/Prote[íi]na\s+(\d+)g/i);
  const c = text.match(/Carbs?\s+(\d+)g/i);
  const g = text.match(/Grasa\s+(\d+)g/i);
  const k = text.match(/~?(\d+)\s*kcal/i);
  if (!p && !c && !g) return null;
  const pv = p ? parseInt(p[1]) : 0;
  const cv = c ? parseInt(c[1]) : 0;
  const gv = g ? parseInt(g[1]) : 0;
  const total = pv + cv + gv || 1;
  return [
    { label: "PROTEÍNA", value: String(pv), unit: "g", pct: Math.round((pv / total) * 100), color: "bg-primary" },
    { label: "CARBOS", value: String(cv), unit: "g", pct: Math.round((cv / total) * 100), color: "bg-cyan" },
    { label: "GRASA", value: String(gv), unit: "g", pct: Math.round((gv / total) * 100), color: "bg-secondary-dim" },
    ...(k ? [{ label: "CALORÍAS", value: k[1], unit: "kcal", pct: 100, color: "bg-tertiary" }] : []),
  ];
}

function verdictColor(text: string) {
  if (/ÓPTIMO/i.test(text)) return "text-primary border-primary";
  if (/SUBÓPTIMO/i.test(text)) return "text-secondary-dim border-secondary-dim";
  return "text-cyan border-cyan";
}

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

  const macros = result ? parseMacros(result) : null;

  const lines = result ? result.split("\n").filter(Boolean) : [];
  const verdictLine = lines.find(l => /VEREDICTO/i.test(l));
  const macroLine = lines.find(l => /MACRO/i.test(l));
  const corrLine = lines.find(l => /CORRECCIÓN/i.test(l));

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">

      {/* Header */}
      <header className="flex items-start gap-3 px-5 py-3 border-b border-outline shrink-0">
        <div>
          <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">{">"}_</p>
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">BIO-FUEL SCAN</span>
        </div>
      </header>

      <div className="flex-1 px-5 py-5 space-y-5">

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["text", "photo"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setPreview(null); setImageFile(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border font-display text-xs uppercase tracking-widest font-bold transition-colors ${
                mode === m
                  ? "border-primary bg-primary/10 text-primary neon-box"
                  : "border-outline text-tertiary hover:border-primary hover:text-primary"
              }`}
            >
              {m === "text" ? <><Type size={13} /> DESCRIBIR</> : <><Camera size={13} /> FOTO</>}
            </button>
          ))}
        </div>

        {/* Input */}
        {mode === "text" ? (
          <div className="border border-outline bg-surface-high p-1">
            <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest px-3 pt-2 pb-1">INGRESA TU COMIDA</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ej: 2 tacos de canasta con frijoles y salsa verde..."
              rows={4}
              className="w-full bg-transparent px-3 py-2 text-foreground focus:outline-none font-mono text-sm resize-none placeholder:text-tertiary/50"
            />
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="border border-dashed border-outline hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center py-10 gap-3 bg-surface-high"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="max-h-48 object-contain" />
            ) : (
              <>
                <Camera size={32} className="text-tertiary" />
                <span className="font-mono text-xs text-tertiary uppercase tracking-widest">TOCA PARA ESCANEAR</span>
                <span className="font-mono text-[10px] text-tertiary/60">Foto o galería</span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={loading || (mode === "text" ? !textInput.trim() : !imageFile)}
          className="w-full py-4 bg-primary text-black font-display font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2 neon-box"
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> ANALIZANDO...</>
          ) : (
            <><Zap size={15} /> ESCANEAR BIO-COMBUSTIBLE</>
          )}
        </button>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

              {/* Verdict */}
              {verdictLine && (
                <div className={`border-l-4 bg-surface-high px-4 py-3 ${verdictColor(verdictLine).split(" ").map(c => c.startsWith("border") ? c : "").join(" ") || "border-primary"}`}>
                  <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">VEREDICTO ATLAS</p>
                  <p className={`font-display font-extrabold text-base uppercase tracking-wide ${verdictColor(verdictLine).split(" ").filter(c => c.startsWith("text")).join(" ")}`}>
                    {verdictLine.replace(/.*VEREDICTO:\s*/i, "")}
                  </p>
                </div>
              )}

              {/* Macro bars */}
              {macros && (
                <div className="bg-surface-high border border-outline p-4 space-y-3">
                  <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">DAILY FUEL REQUIREMENTS</p>
                  {macros.map((m, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-display text-xs font-bold text-foreground uppercase tracking-wide">{m.label}</span>
                        <span className="font-mono text-xs text-primary">{m.value} {m.unit} {m.unit !== "kcal" && <span className="text-tertiary">({m.pct}%)</span>}</span>
                      </div>
                      {m.unit !== "kcal" && (
                        <div className="neon-progress h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className={`h-full neon-progress-fill ${m.color}`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Raw macro line if no bars */}
              {!macros && macroLine && (
                <div className="bg-surface-high border border-outline px-4 py-3">
                  <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">MACROS</p>
                  <p className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                    {macroLine.replace(/.*MACRO ESTIMADO:\s*/i, "")}
                  </p>
                </div>
              )}

              {/* Correction */}
              {corrLine && (
                <div className="border-l-4 border-cyan bg-surface-high px-4 py-3">
                  <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">CORRECCIÓN ATLAS</p>
                  <p className="font-display text-sm font-bold text-foreground uppercase tracking-wide leading-relaxed">
                    {corrLine.replace(/.*CORRECCIÓN:\s*/i, "")}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </main>
  );
}
