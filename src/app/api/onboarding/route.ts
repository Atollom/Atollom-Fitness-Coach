import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        reply: "SISTEMA OFFLINE. Falta GEMINI_API_KEY.",
        isComplete: false,
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const formattedHistory = history
      .filter((h: { role: string }) => h.role !== "system")
      .map((h: { role: string; content: string }) => ({
        role: h.role === "coach" ? "model" : "user",
        parts: [{ text: h.content }],
      }));

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: `Eres ATLAS, un Sistema Operativo de Disciplina de ATOLLOM AI. Tu objetivo es operar como el cerebro de ejecución del usuario.
Reglas de personalidad:
1. Eres frío, directo, brutalmente honesto y no toleras excusas ni 'motivación vacía'. Tu tono es asertivo y corto. Usa frases tácticas.

Tarea actual (ONBOARDING):
Debes entrevistar al usuario uno por uno (o en pares de preguntas muy breves) para obtener este Perfil Inteligente obligatorio:
- Peso actual (kg).
- Horario de trabajo y ventanas posibles de entrenamiento.
- Presupuesto semanal para comida (en pesos MXN).
- Supermercados o tiendas preferidas donde compra (ej. 3B, Aurrera).
- Objetivo físico principal.

Al finalizar TODOS los datos, responde confirmando el perfil y termina tu mensaje con la directiva exacta: ONBOARDING_COMPLETE
¡NUNCA pongas ONBOARDING_COMPLETE si faltan datos!`,
    });

    const result = await chat.sendMessage([{ text: message }]);
    const textResponse = result.response.text();
    const isComplete = textResponse.includes("ONBOARDING_COMPLETE");

    // Si el onboarding está completo, extraer y guardar perfil en DB
    if (isComplete) {
      const allMessages = [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: textResponse }] },
      ];

      const extractModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const extractResult = await extractModel.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Del siguiente historial de chat, extrae los datos del usuario y devuelve SOLO un JSON válido con esta estructura exacta:
{
  "peso_kg": number | null,
  "objetivo": string | null,
  "horario_trabajo": string | null,
  "ventana_entrenamiento": string | null,
  "presupuesto_semanal": number | null,
  "supermercados": string[] | null
}

Historial:
${allMessages.map((m) => `${m.role}: ${m.parts[0].text}`).join("\n")}`,
              },
            ],
          },
        ],
      });

      try {
        const raw = extractResult.response.text().replace(/```json|```/g, "").trim();
        const profileData = JSON.parse(raw);

        await sql`
          INSERT INTO user_profile (
            peso_kg, objetivo, horario_trabajo, ventana_entrenamiento,
            presupuesto_semanal, supermercados, perfil_completo, raw_onboarding
          ) VALUES (
            ${profileData.peso_kg},
            ${profileData.objetivo},
            ${profileData.horario_trabajo},
            ${profileData.ventana_entrenamiento},
            ${profileData.presupuesto_semanal},
            ${profileData.supermercados},
            true,
            ${JSON.stringify(profileData)}
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
    console.error("Gemini API Error:", error);
    return NextResponse.json({
      reply: "ERROR DE CONEXIÓN NEURONAL. REINTENTA LA TRANSMISIÓN.",
      isComplete: false,
    });
  }
}
