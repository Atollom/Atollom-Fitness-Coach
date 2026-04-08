import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM routines ORDER BY created_at DESC LIMIT 1`;
  return NextResponse.json({ routine: rows[0] || null });
}

export async function POST() {
  const profiles = await sql`SELECT * FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1`;
  const profile = profiles[0];
  if (!profile) return NextResponse.json({ error: "Sin perfil" }, { status: 400 });

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Eres ATLAS. Genera un plan de entrenamiento semanal para este usuario:
- Peso: ${profile.peso_kg} kg
- Objetivo: ${profile.objetivo}
- Ventana de entrenamiento: ${profile.ventana_entrenamiento}

Responde SOLO con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "dias": [
    {
      "dia": "Lunes",
      "tipo": "Fuerza / Cardio / Descanso / etc",
      "duracion": "30 min",
      "ejercicios": [
        { "nombre": "Sentadilla", "series": 3, "reps": "12", "youtube": "https://www.youtube.com/watch?v=..." }
      ],
      "nota": "Frase táctica corta del coach para este día"
    }
  ]
}

Reglas:
- 5 días de entrenamiento, 2 de descanso activo
- Los videos de YouTube deben ser reales, en español, gratuitos, de canales populares de fitness (MrMuscle, Athlean-X en español, Gymvirtual, etc.)
- Ejercicios sin equipo o con mínimo equipo
- Frases del coach: cortas, directas, sin motivación vacía`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().replace(/```json|```/g, "").trim();

  let plan;
  try {
    plan = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Error generando plan" }, { status: 500 });
  }

  // Enriquecer ejercicios con videos reales de YouTube
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  for (const dia of plan.dias) {
    if (!dia.ejercicios) continue;
    for (const ej of dia.ejercicios) {
      try {
        const res = await fetch(`${baseUrl}/api/youtube?q=${encodeURIComponent(ej.nombre)}`);
        const data = await res.json();
        if (data.videos?.[0]) {
          ej.videoId = data.videos[0].videoId;
          ej.channel = data.videos[0].channel;
          ej.youtube = data.videos[0].url;
        }
      } catch { /* continuar sin video */ }
    }
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStr = weekStart.toISOString().split("T")[0];

  await sql`INSERT INTO routines (week_start, plan) VALUES (${weekStr}, ${JSON.stringify(plan)})`;

  return NextResponse.json({ routine: { plan, week_start: weekStr } });
}
