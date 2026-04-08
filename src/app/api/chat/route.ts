import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    // Obtener perfil del usuario más reciente
    const profiles = await sql`
      SELECT * FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1
    `;
    const profile = profiles[0] || null;

    const profileContext = profile
      ? `Perfil del usuario:
- Peso actual: ${profile.peso_kg} kg
- Objetivo: ${profile.objetivo}
- Horario de trabajo: ${profile.horario_trabajo}
- Ventana de entrenamiento: ${profile.ventana_entrenamiento}
- Presupuesto semanal: $${profile.presupuesto_semanal} MXN
- Supermercados: ${Array.isArray(profile.supermercados) ? profile.supermercados.join(", ") : profile.supermercados}`
      : "Perfil no configurado aún.";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const formattedHistory = (history || [])
      .filter((h: { role: string }) => h.role !== "system")
      .map((h: { role: string; content: string }) => ({
        role: h.role === "coach" ? "model" : "user",
        parts: [{ text: h.content }],
      }));

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: `Eres ATLAS, el Sistema Operativo de Disciplina de ATOLLOM AI. Operas 24/7 como el cerebro de ejecución del usuario.

${profileContext}

PERSONALIDAD:
- Frío, directo, brutalmente honesto. Sin excusas, sin motivación vacía.
- Frases cortas y tácticas. Máximo 3-4 líneas por respuesta.
- Cuando el usuario flaquea: presión directa. Cuando logra algo: reconocimiento seco pero real.
- Ocasionalmente lanza frases de motivación táctica (no cursilería, sino órdenes de ejecución).

CAPACIDADES:
1. ENTRENAMIENTO: Si el usuario pide rutina o ejercicio, sugiere ejercicios específicos Y busca un video de YouTube relevante gratuito. Formato: "🎬 [Nombre del video](URL_YOUTUBE)" — usa URLs reales de YouTube con videos populares de fitness en español.
2. COMIDA: Analiza lo que el usuario come, da feedback nutritivo directo considerando su presupuesto (${profile?.presupuesto_semanal || "?"} MXN/semana) y sus tiendas (${Array.isArray(profile?.supermercados) ? profile.supermercados.join(", ") : "tiendas locales"}).
3. ESTADO EMOCIONAL: Si el usuario reporta ansiedad, desmotivación o estrés, responde con protocolo de acción inmediata. No terapia, acción.
4. SEGUIMIENTO: Recuerda el objetivo del usuario (${profile?.objetivo || "no definido"}) en cada respuesta relevante.

FORMATO DE RESPUESTA:
- Sin saludos largos. Directo al punto.
- Si incluyes un link de YouTube, que sea real y relevante.
- Termina respuestas de entrenamiento con: "⚡ EJECUTA. AHORA."`,
    });

    const result = await chat.sendMessage([{ text: message }]);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({
      reply: "ERROR NEURONAL. REINTENTA.",
    });
  }
}
