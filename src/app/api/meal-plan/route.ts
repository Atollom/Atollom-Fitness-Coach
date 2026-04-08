import { NextResponse } from "next/server";
export const maxDuration = 60;
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

// Ensure table exists
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      plan JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await sql`SELECT * FROM meal_plans ORDER BY created_at DESC LIMIT 1`;
    return NextResponse.json({ meal_plan: rows[0] || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ meal_plan: null });
  }
}

export async function POST() {
  await ensureTable();

  const profiles = await sql`SELECT * FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1`;
  const profile = profiles[0];
  if (!profile) return NextResponse.json({ error: "Sin perfil" }, { status: 400 });

  const tiendas = Array.isArray(profile.supermercados) && profile.supermercados.length > 0
    ? profile.supermercados.join(", ")
    : "tiendas locales";

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `Eres ATLAS, nutricionista deportivo. Genera un plan de comidas semanal para:
- Objetivo: ${profile.objetivo}
- Presupuesto: $${profile.presupuesto_semanal || 600} MXN/semana
- Tiendas disponibles: ${tiendas}
- Alergias: ${profile.alergias || "ninguna"}
- Peso: ${profile.peso_kg} kg

Responde SOLO con JSON válido sin markdown:
{
  "dias": [
    {
      "dia": "Lunes",
      "desayuno": { "comida": "Avena con plátano", "kcal": 350, "proteina_g": 12, "tiempo": "5 min" },
      "almuerzo": { "comida": "Arroz con pollo y verduras", "kcal": 550, "proteina_g": 35, "tiempo": "20 min" },
      "cena": { "comida": "Huevo revuelto con frijoles", "kcal": 400, "proteina_g": 22, "tiempo": "10 min" },
      "snack": { "comida": "Manzana con cacahuate", "kcal": 200, "proteina_g": 6 },
      "total_kcal": 1500
    }
  ],
  "lista_compras": [
    { "item": "Pollo pechuga", "cantidad": "1 kg", "tienda": "${tiendas.split(",")[0].trim()}", "precio_est": 90, "categoria": "Proteínas" }
  ],
  "presupuesto_total_est": 450,
  "tip_atlas": "Frase motivacional corta sobre esta semana de nutrición"
}

Reglas:
- 7 días completos
- Comidas accesibles, sin equipo especial, ingredientes de ${tiendas}
- La lista de compras debe cubrir TODO el plan, agrupar por categoría (Proteínas, Verduras, Carbohidratos, Lácteos, Otros)
- Precios realistas en MXN para México`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().replace(/```json|```/g, "").trim();

  let plan;
  try {
    plan = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Error generando plan" }, { status: 500 });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStr = weekStart.toISOString().split("T")[0];

  await sql`INSERT INTO meal_plans (week_start, plan) VALUES (${weekStr}, ${JSON.stringify(plan)})`;

  return NextResponse.json({ meal_plan: { plan, week_start: weekStr } });
}
