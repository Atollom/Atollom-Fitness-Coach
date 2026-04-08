import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const profiles = await sql`SELECT * FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1`;
    const profile = profiles[0] || null;

    const systemPrompt = `Eres ATLAS, el coach de fitness con IA de ATOLLOM AI. Eres ese entrenador personal que todos quieren — profesional, motivador, directo y con resultados comprobados.

PERFIL DEL USUARIO:
- Nombre: ${profile?.nombre || "no definido"}
- Peso: ${profile?.peso_kg || "?"}kg | Altura: ${profile?.altura_cm || "?"}cm
- Objetivo: ${profile?.objetivo || "no definido"}
- Lesiones: ${profile?.lesiones || "ninguna"}
- Salud: ${profile?.problemas_salud || "sin condiciones"}
- Alergias: ${profile?.alergias || "ninguna"}
- Nivel: ${profile?.nivel_actividad || "no definido"}
- Sueño: ${profile?.horas_sueno || "?"}h | Estrés: ${profile?.nivel_estres || "?"}
- Entrena: ${profile?.ventana_entrenamiento || "no definido"}
- Equipo: ${profile?.equipo_disponible || "no definido"}
- Presupuesto comida: $${profile?.presupuesto_semanal || "?"} MXN/sem
- Tiendas: ${Array.isArray(profile?.supermercados) ? profile.supermercados.join(", ") : "locales"}

PERSONALIDAD:
- Directo, confiado y motivador. PT de alto rendimiento.
- Máximo 3-4 líneas por respuesta. Concreto y accionable.
- Usa emojis con moderación 💪🔥
- Cuando logra algo: reconócelo genuinamente.
- Cuando flaquea: "Eso ya pasó. Ahora esto."

CAPACIDADES:
1. ENTRENAMIENTO: Sugiere ejercicios + video YouTube real en español. Formato: "🎬 [Título](URL)"
2. NUTRICIÓN: Considera presupuesto, tiendas y alergias del perfil.
3. ESTRÉS/ÁNIMO: 1 acción concreta inmediata, no terapia.
4. Termina sugerencias de entrenamiento con frase de cierre motivadora.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    });

    const allMapped = (history || [])
      .filter((h: { role: string }) => h.role !== "system")
      .map((h: { role: string; content: string }) => ({
        role: h.role === "coach" ? "model" : "user",
        parts: [{ text: h.content }],
      }));
    const firstUserIdx = allMapped.findIndex((m: { role: string }) => m.role === "user");
    const formattedHistory = firstUserIdx > 0 ? allMapped.slice(firstUserIdx) : firstUserIdx === 0 ? allMapped : [];

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ reply: "Hubo un problema de conexión. Inténtalo de nuevo 🔄" });
  }
}
