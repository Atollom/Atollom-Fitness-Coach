import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ reply: "Error: falta configuración del servidor.", isComplete: false });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Gemini requiere que el historial empiece con "user" — omitir mensajes iniciales del coach
    const allMapped = history
      .filter((h: { role: string }) => h.role !== "system")
      .map((h: { role: string; content: string }) => ({
        role: h.role === "coach" ? "model" : "user",
        parts: [{ text: h.content }],
      }));
    const firstUserIdx = allMapped.findIndex((m: { role: string }) => m.role === "user");
    const formattedHistory = firstUserIdx > 0 ? allMapped.slice(firstUserIdx) : firstUserIdx === 0 ? allMapped : [];

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: `Eres ATLAS, el coach de fitness con IA de ATOLLOM AI. Eres como ese entrenador personal que todos quieren tener: profesional, experimentado, motivador y directo. Hablas como un coach de gimnasio real — con confianza, calidez y autoridad. No eres un robot ni un sistema, eres un experto que sabe que va a conseguirte resultados.

ESTILO DE COMUNICACIÓN:
- Cálido pero directo. Como un PT que cobra $500/hora y sabe lo que hace.
- Frases cortas y poderosas. Nada de parrafos largos.
- Motiva con hechos, no con frases vacías. "A tu peso y altura, con este protocolo, en 8 semanas vas a notar la diferencia" — ese tipo de confianza.
- Usa emojis con moderación y solo cuando refuercen el mensaje (💪🔥✅).

TAREA: PERFIL INICIAL COMPLETO
Entrevista al usuario de forma natural (1-2 preguntas a la vez, conversacional) para obtener TODA esta información antes de activar el sistema. Hazlo sentir que estás construyendo su plan personalizado:

DATOS OBLIGATORIOS:
1. Nombre
2. Edad y género
3. Peso actual (kg) y altura (cm)
4. Objetivo principal (bajar peso / ganar músculo / tonificar / rendimiento / salud general)
5. Plazo que tiene en mente para ver resultados
6. Lesiones actuales o pasadas que debamos respetar
7. Problemas de salud o condiciones médicas (diabetes, hipertensión, rodillas, etc.)
8. Alergias alimentarias o intolerancias
9. Nivel de actividad actual (sedentario / algo activo / activo / muy activo)
10. Horas de sueño promedio por noche
11. Nivel de estrés diario (bajo / medio / alto / muy alto)
12. Horario de trabajo y cuándo puede entrenar
13. Si tiene acceso a gym, equipo en casa, o solo peso corporal
14. Presupuesto semanal para comida (en pesos MXN)
15. Supermercados o tiendas donde compra habitualmente

FLUJO:
- Empieza presentándote brevemente y pidiendo nombre + objetivo.
- Agrupa preguntas relacionadas naturalmente (ej: peso+altura juntos, lesiones+salud juntos).
- Adapta el tono a lo que dice el usuario — si es alguien sedentario, sé más alentador; si ya entrena, sé más técnico.
- Cuando tengas TODO, haz un resumen motivador del plan que vas a construirle y termina con la directiva oculta: ONBOARDING_COMPLETE
- NUNCA escribas ONBOARDING_COMPLETE si faltan datos.`,
    });

    const result = await chat.sendMessage([{ text: message }]);
    const textResponse = result.response.text();
    const isComplete = textResponse.includes("ONBOARDING_COMPLETE");

    if (isComplete) {
      const allText = [...formattedHistory,
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: textResponse }] }
      ].map(m => `${m.role}: ${m.parts[0].text}`).join("\n");

      const extractModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const extractResult = await extractModel.generateContent(`Del siguiente historial extrae los datos y devuelve SOLO JSON válido:
{
  "nombre": string|null,
  "edad": number|null,
  "genero": string|null,
  "peso_kg": number|null,
  "altura_cm": number|null,
  "objetivo": string|null,
  "lesiones": string|null,
  "problemas_salud": string|null,
  "alergias": string|null,
  "nivel_actividad": string|null,
  "horas_sueno": number|null,
  "nivel_estres": string|null,
  "horario_trabajo": string|null,
  "ventana_entrenamiento": string|null,
  "equipo_disponible": string|null,
  "presupuesto_semanal": number|null,
  "supermercados": string[]|null
}

Historial:
${allText}`);

      try {
        const raw = extractResult.response.text().replace(/```json|```/g, "").trim();
        const p = JSON.parse(raw);
        await sql`
          INSERT INTO user_profile (
            nombre, edad, genero, peso_kg, altura_cm, objetivo, lesiones,
            problemas_salud, alergias, nivel_actividad, horas_sueno, nivel_estres,
            horario_trabajo, ventana_entrenamiento, equipo_disponible,
            presupuesto_semanal, supermercados, perfil_completo, raw_onboarding
          ) VALUES (
            ${p.nombre}, ${p.edad}, ${p.genero}, ${p.peso_kg}, ${p.altura_cm},
            ${p.objetivo}, ${p.lesiones}, ${p.problemas_salud}, ${p.alergias},
            ${p.nivel_actividad}, ${p.horas_sueno}, ${p.nivel_estres},
            ${p.horario_trabajo}, ${p.ventana_entrenamiento}, ${p.equipo_disponible},
            ${p.presupuesto_semanal}, ${p.supermercados},
            true, ${JSON.stringify(p)}
          )
        `;
      } catch (dbErr) {
        console.error("Error guardando perfil:", dbErr);
      }
    }

    return NextResponse.json({
      reply: textResponse.replace("ONBOARDING_COMPLETE", "").trim(),
      isComplete,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ reply: "Hubo un problema de conexión. Inténtalo de nuevo 🔄", isComplete: false });
  }
}
