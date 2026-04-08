import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

const SYSTEM_PROMPT = `Eres ATLAS, el coach de fitness con IA de ATOLLOM AI. Eres ese entrenador personal que todos quieren tener: profesional, experimentado, motivador y directo. Hablas como un coach de gimnasio real — con confianza, calidez y autoridad.

ESTILO:
- Cálido pero directo. Frases cortas y poderosas.
- Motiva con hechos: "A tu peso y altura, con este protocolo, en 8 semanas lo vas a notar."
- Emojis con moderación 💪🔥

TAREA — PERFIL COMPLETO:
Entrevista natural (1-2 preguntas a la vez) para obtener:
1. Nombre
2. Edad y género
3. Peso (kg) y altura (cm)
4. Objetivo principal y plazo esperado
5. Lesiones actuales o pasadas
6. Problemas de salud / condiciones médicas
7. Alergias alimentarias o intolerancias
8. Nivel de actividad actual
9. Horas de sueño promedio
10. Nivel de estrés diario
11. Horario de trabajo y ventana para entrenar
12. Acceso a gym, equipo en casa, o solo peso corporal
13. Presupuesto semanal para comida (pesos MXN)
14. Supermercados o tiendas habituales

Al tener TODO haz un resumen motivador y añade al final: ONBOARDING_COMPLETE
NUNCA escribas ONBOARDING_COMPLETE si faltan datos.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ reply: "Error: falta configuración del servidor.", isComplete: false });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
    });

    const allMapped = history
      .filter((h: { role: string }) => h.role !== "system")
      .map((h: { role: string; content: string }) => ({
        role: h.role === "coach" ? "model" : "user",
        parts: [{ text: h.content }],
      }));
    const firstUserIdx = allMapped.findIndex((m: { role: string }) => m.role === "user");
    const formattedHistory = firstUserIdx > 0 ? allMapped.slice(firstUserIdx) : firstUserIdx === 0 ? allMapped : [];

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message);
    const textResponse = result.response.text();
    const isComplete = textResponse.includes("ONBOARDING_COMPLETE");

    if (isComplete) {
      const allText = [...formattedHistory,
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: textResponse }] },
      ].map(m => `${m.role}: ${m.parts[0].text}`).join("\n");

      const extractModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const extractResult = await extractModel.generateContent(
        `Extrae datos del historial. Devuelve SOLO JSON sin markdown:\n{"nombre":null,"edad":null,"genero":null,"peso_kg":null,"altura_cm":null,"objetivo":null,"lesiones":null,"problemas_salud":null,"alergias":null,"nivel_actividad":null,"horas_sueno":null,"nivel_estres":null,"horario_trabajo":null,"ventana_entrenamiento":null,"equipo_disponible":null,"presupuesto_semanal":null,"supermercados":null}\n\nHistorial:\n${allText}`
      );

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
