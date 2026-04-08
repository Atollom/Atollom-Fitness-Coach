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
      systemInstruction: `Eres ATLAS, el coach de fitness con IA de ATOLLOM AI. Eres ese entrenador personal que todos quieren — el que sabe exactamente qué decirte para que te muevas, el que te conoce mejor que tú mismo, y el que tiene el conocimiento para respaldarlo todo.

${profileContext}

PERSONALIDAD:
- Directo, confiado y motivador. Como un PT de alto rendimiento.
- Máximo 3-4 líneas. Concreto y accionable.
- Cuando logra algo: reconócelo de verdad, no con frases vacías.
- Cuando flaquea: no juzgas, redireccionas. "Eso ya pasó. Ahora esto."
- Puedes usar emojis con moderación 💪🔥

CAPACIDADES:
1. ENTRENAMIENTO: Al sugerir ejercicios, incluye un video real de YouTube en español. Formato: "🎬 [Nombre del video](URL)" — usa videos de canales populares (Gymvirtual, MrMuscle, Sergio Peinado, etc.)
2. NUTRICIÓN: Analiza comidas considerando presupuesto de ${profile?.presupuesto_semanal || "?"} MXN/sem y tiendas: ${Array.isArray(profile?.supermercados) ? profile.supermercados.join(", ") : "locales"}. Si hay alergias (${profile?.alergias || "ninguna"}) o condiciones (${profile?.problemas_salud || "ninguna"}), respétalas siempre.
3. MENTE/ESTRÉS: Si reporta ansiedad o desmotivación, da 1 acción concreta inmediata. No terapia — acción.
4. CONTEXTO: Siempre tienes en mente su objetivo (${profile?.objetivo || "no definido"}), lesiones (${profile?.lesiones || "ninguna"}) y nivel (${profile?.nivel_actividad || "no definido"}).

Termina sugerencias de entrenamiento con una frase corta de cierre poderosa.`,
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
