"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Type, Loader2, Zap, ShoppingCart, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

// ─── Types ───────────────────────────────────────────────────
type MealItem = { comida: string; kcal: number; proteina_g?: number; tiempo?: string };
type DayPlan = {
  dia: string;
  desayuno: MealItem;
  almuerzo: MealItem;
  cena: MealItem;
  snack?: MealItem;
  total_kcal: number;
};
type ShopItem = { item: string; cantidad: string; tienda: string; precio_est: number; categoria: string };
type MealPlan = {
  dias: DayPlan[];
  lista_compras: ShopItem[];
  presupuesto_total_est: number;
  tip_atlas?: string;
};

// ─── Scanner helpers ──────────────────────────────────────────
type MacroLine = { label: string; value: string; unit: string; pct: number; color: string };

function parseMacros(text: string): MacroLine[] | null {
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

function verdictBorderColor(text: string) {
  if (/ÓPTIMO/i.test(text)) return "border-primary";
  if (/SUBÓPTIMO/i.test(text)) return "border-secondary-dim";
  return "border-cyan";
}

function verdictTextColor(text: string) {
  if (/ÓPTIMO/i.test(text)) return "text-primary";
  if (/SUBÓPTIMO/i.test(text)) return "text-secondary-dim";
  return "text-cyan";
}

// ─── Meal plan components ─────────────────────────────────────
const MEAL_LABELS: Record<string, string> = {
  desayuno: "DESAYUNO",
  almuerzo: "ALMUERZO",
  cena: "CENA",
  snack: "SNACK",
};

function DayCard({ day }: { day: DayPlan }) {
  const [open, setOpen] = useState(false);
  const meals = [
    { key: "desayuno", data: day.desayuno },
    { key: "almuerzo", data: day.almuerzo },
    { key: "cena", data: day.cena },
    ...(day.snack ? [{ key: "snack", data: day.snack }] : []),
  ];

  return (
    <div className="border border-outline bg-surface-high">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-4 py-3">
        <div>
          <span className="font-display font-bold text-sm text-foreground uppercase tracking-wide">{day.dia}</span>
          <span className="font-mono text-[10px] text-tertiary ml-3">{day.total_kcal} kcal</span>
        </div>
        {open ? <ChevronUp size={13} className="text-tertiary" /> : <ChevronDown size={13} className="text-tertiary" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-outline">
            <div className="p-4 space-y-3">
              {meals.map(({ key, data }) => (
                <div key={key} className="flex gap-3">
                  <span className="font-mono text-[9px] text-primary uppercase tracking-widest w-16 shrink-0 pt-0.5">{MEAL_LABELS[key]}</span>
                  <div className="flex-1">
                    <p className="font-display text-xs font-bold text-foreground uppercase tracking-wide leading-tight">{data.comida}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="font-mono text-[10px] text-tertiary">{data.kcal} kcal</span>
                      {data.proteina_g && <span className="font-mono text-[10px] text-primary">{data.proteina_g}g prot</span>}
                      {data.tiempo && <span className="font-mono text-[10px] text-tertiary">{data.tiempo}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShoppingList({ items, total }: { items: ShopItem[]; total: number }) {
  const grouped = items.reduce<Record<string, ShopItem[]>>((acc, item) => {
    const cat = item.categoria || "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const storeColors: Record<string, string> = {};
  const stores = [...new Set(items.map(i => i.tienda))];
  const colors = ["text-primary", "text-cyan", "text-secondary-dim", "text-tertiary"];
  stores.forEach((s, i) => { storeColors[s] = colors[i % colors.length]; });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">LISTA DE COMPRAS</p>
        <span className="font-display font-bold text-primary text-sm">~${total} MXN</span>
      </div>

      {/* Store legend */}
      <div className="flex flex-wrap gap-2">
        {stores.map(s => (
          <span key={s} className={`font-mono text-[10px] border px-2 py-0.5 ${storeColors[s]} border-current`}>{s}</span>
        ))}
      </div>

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-2 border-b border-outline pb-1">{cat}</p>
          <div className="space-y-1.5">
            {catItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-outline shrink-0 mt-0.5" />
                <div className="flex-1 flex justify-between items-start">
                  <div>
                    <span className="font-display text-xs font-bold text-foreground uppercase tracking-wide">{item.item}</span>
                    <span className="font-mono text-[10px] text-tertiary ml-2">{item.cantidad}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-mono text-[10px] text-foreground">${item.precio_est}</span>
                    <span className={`font-mono text-[9px] ml-1.5 ${storeColors[item.tienda] || "text-tertiary"}`}>{item.tienda}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
type Tab = "scanner" | "plan" | "compras";

export default function FoodPage() {
  const [tab, setTab] = useState<Tab>("scanner");

  // Scanner state
  const [scanMode, setScanMode] = useState<"text" | "photo">("text");
  const [textInput, setTextInput] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Meal plan state
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // Load meal plan when tab opened
  useEffect(() => {
    if ((tab === "plan" || tab === "compras") && !mealPlan && !loadingPlan) {
      setLoadingPlan(true);
      fetch("/api/meal-plan").then(r => r.json()).then(d => {
        if (d.meal_plan?.plan) setMealPlan(d.meal_plan.plan);
        setLoadingPlan(false);
      }).catch(() => setLoadingPlan(false));
    }
  }, [tab, mealPlan, loadingPlan]);

  const generatePlan = async () => {
    setGeneratingPlan(true);
    const res = await fetch("/api/meal-plan", { method: "POST" });
    const data = await res.json();
    if (data.meal_plan?.plan) setMealPlan(data.meal_plan.plan);
    setGeneratingPlan(false);
  };

  // Scanner
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setScanResult(null);
  };

  const analyze = async () => {
    if (scanning) return;
    if (scanMode === "text" && !textInput.trim()) return;
    if (scanMode === "photo" && !imageFile) return;
    setScanning(true);
    setScanResult(null);
    try {
      const fd = new FormData();
      if (scanMode === "text") fd.append("text", textInput.trim());
      else if (imageFile) fd.append("image", imageFile);
      const res = await fetch("/api/food", { method: "POST", body: fd });
      const data = await res.json();
      setScanResult(data.analysis || data.error || "Error desconocido");
    } catch {
      setScanResult("ERROR DE CONEXIÓN.");
    } finally {
      setScanning(false);
    }
  };

  const scanLines = scanResult ? scanResult.split("\n").filter(Boolean) : [];
  const verdictLine = scanLines.find(l => /VEREDICTO/i.test(l));
  const macroLine = scanLines.find(l => /MACRO/i.test(l));
  const corrLine = scanLines.find(l => /CORRECCIÓN/i.test(l));
  const macros = scanResult ? parseMacros(scanResult) : null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "scanner", label: "ESCÁNER" },
    { key: "plan", label: "PLAN SEMANAL" },
    { key: "compras", label: "COMPRAS" },
  ];

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto pb-24">

      <header className="flex items-start gap-3 px-5 py-3 border-b border-outline shrink-0">
        <div>
          <p className="font-mono text-[10px] text-tertiary">{">"}_</p>
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">BIO-FUEL SYSTEM</span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-outline shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors border-b-2 ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-tertiary hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── ESCÁNER ── */}
        {tab === "scanner" && (
          <>
            <div className="flex gap-2">
              {(["text", "photo"] as const).map(m => (
                <button key={m} onClick={() => { setScanMode(m); setScanResult(null); setPreview(null); setImageFile(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border font-display text-xs uppercase tracking-widest font-bold transition-colors ${
                    scanMode === m ? "border-primary bg-primary/10 text-primary" : "border-outline text-tertiary hover:border-primary"
                  }`}>
                  {m === "text" ? <><Type size={13} /> DESCRIBIR</> : <><Camera size={13} /> FOTO</>}
                </button>
              ))}
            </div>

            {scanMode === "text" ? (
              <div className="border border-outline bg-surface-high p-1">
                <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest px-3 pt-2 pb-1">¿QUÉ COMISTE?</p>
                <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder="Ej: 2 tacos de canasta con frijoles y salsa verde..." rows={3}
                  className="w-full bg-transparent px-3 py-2 text-foreground focus:outline-none font-mono text-sm resize-none placeholder:text-tertiary/50" />
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                className="border border-dashed border-outline hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center py-10 gap-3 bg-surface-high">
                {preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={preview} alt="preview" className="max-h-44 object-contain" />
                  : <><Camera size={28} className="text-tertiary" /><span className="font-mono text-xs text-tertiary uppercase tracking-widest">TOCA PARA ESCANEAR</span></>
                }
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
              </div>
            )}

            <button onClick={analyze} disabled={scanning || (scanMode === "text" ? !textInput.trim() : !imageFile)}
              className="w-full py-4 bg-primary text-black font-display font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2 neon-box">
              {scanning ? <><Loader2 size={15} className="animate-spin" /> ANALIZANDO...</> : <><Zap size={15} /> ESCANEAR</>}
            </button>

            <AnimatePresence>
              {scanResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {verdictLine && (
                    <div className={`border-l-4 bg-surface-high px-4 py-3 ${verdictBorderColor(verdictLine)}`}>
                      <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">VEREDICTO ATLAS</p>
                      <p className={`font-display font-extrabold text-base uppercase tracking-wide ${verdictTextColor(verdictLine)}`}>
                        {verdictLine.replace(/.*VEREDICTO:\s*/i, "")}
                      </p>
                    </div>
                  )}
                  {macros && (
                    <div className="bg-surface-high border border-outline p-4 space-y-3">
                      <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">MACROS ESTIMADOS</p>
                      {macros.map((m, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-display text-xs font-bold text-foreground uppercase tracking-wide">{m.label}</span>
                            <span className="font-mono text-xs text-primary">{m.value} {m.unit} {m.unit !== "kcal" && <span className="text-tertiary">({m.pct}%)</span>}</span>
                          </div>
                          {m.unit !== "kcal" && (
                            <div className="neon-progress h-2">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className={`h-full neon-progress-fill ${m.color}`} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!macros && macroLine && (
                    <div className="bg-surface-high border border-outline px-4 py-3">
                      <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">MACROS</p>
                      <p className="font-display text-sm font-bold text-foreground uppercase tracking-wide">{macroLine.replace(/.*MACRO ESTIMADO:\s*/i, "")}</p>
                    </div>
                  )}
                  {corrLine && (
                    <div className="border-l-4 border-cyan bg-surface-high px-4 py-3">
                      <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest mb-1">CORRECCIÓN ATLAS</p>
                      <p className="font-display text-sm font-bold text-foreground uppercase tracking-wide leading-relaxed">{corrLine.replace(/.*CORRECCIÓN:\s*/i, "")}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── PLAN SEMANAL ── */}
        {tab === "plan" && (
          <>
            {loadingPlan ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="animate-spin text-primary" size={28} />
                <p className="font-mono text-xs text-tertiary uppercase tracking-widest">Cargando plan...</p>
              </div>
            ) : !mealPlan ? (
              <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                <p className="font-display text-tertiary text-sm uppercase tracking-widest">Sin plan generado</p>
                <p className="font-mono text-xs text-tertiary/60">ATLAS creará un plan basado en tu presupuesto y tiendas</p>
                <button onClick={generatePlan} disabled={generatingPlan}
                  className="px-8 py-3 bg-primary text-black font-display font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 neon-box flex items-center gap-2">
                  {generatingPlan ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : "⚡ GENERAR PLAN SEMANAL"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="font-mono text-[10px] text-tertiary uppercase tracking-widest">PLAN DE COMIDAS</p>
                  <button onClick={generatePlan} disabled={generatingPlan}
                    className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors font-display text-xs uppercase tracking-widest disabled:opacity-40">
                    {generatingPlan ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Nuevo
                  </button>
                </div>

                {mealPlan.tip_atlas && (
                  <div className="border-l-4 border-primary bg-surface-high px-4 py-3">
                    <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">ATLAS</p>
                    <p className="font-display text-sm font-bold text-foreground uppercase leading-relaxed">"{mealPlan.tip_atlas}"</p>
                  </div>
                )}

                <div className="space-y-2">
                  {mealPlan.dias?.map((day, i) => <DayCard key={i} day={day} />)}
                </div>
              </>
            )}
          </>
        )}

        {/* ── COMPRAS ── */}
        {tab === "compras" && (
          <>
            {loadingPlan ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="animate-spin text-primary" size={28} />
                <p className="font-mono text-xs text-tertiary uppercase tracking-widest">Cargando lista...</p>
              </div>
            ) : !mealPlan ? (
              <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                <ShoppingCart size={32} className="text-tertiary" />
                <p className="font-display text-tertiary text-sm uppercase tracking-widest">Genera primero tu plan semanal</p>
                <button onClick={() => setTab("plan")}
                  className="px-6 py-2 border border-primary text-primary font-display text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors">
                  IR A PLAN SEMANAL
                </button>
              </div>
            ) : (
              <ShoppingList
                items={mealPlan.lista_compras || []}
                total={mealPlan.presupuesto_total_est || 0}
              />
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
