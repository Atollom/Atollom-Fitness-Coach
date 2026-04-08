import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const text = formData.get("text") as string | null;
    const image = formData.get("image") as File | null;

    const profiles = await sql`SELECT * FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1`;
    const profile = profiles[0] || null;

    const profileCtx = profile
      ? `Perfil: objetivo=${profile.objetivo}, presupuesto=$${profile.presupuesto_semanal} MXN/semana, tiendas=${Array.isArray(profile.supermercados) ? profile.supermercados.join(", ") : "local"}`
      : "";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `Eres ATLAS analizando la ingesta del usuario. ${profileCtx}

Analiza el alimento y responde en este formato exacto (3 secciones, sin markdown extra):
⚡ VEREDICTO: [ÓPTIMO / ACEPTABLE / SUBÓPTIMO] — una línea brutal y directa.
📊 MACRO ESTIMADO: Proteína Xg | Carbs Xg | Grasa Xg | ~X kcal
🔧 CORRECCIÓN: [qué cambiar o agregar para alinearlo al objetivo. Si está bien, di "Sin ajustes necesarios."]`;

    let result;

    if (image) {
      const bytes = await image.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      result = await model.generateContent([
        { inlineData: { mimeType: image.type, data: base64 } },
        { text: `${systemPrompt}\n\nAnaliza esta comida de la imagen.` },
      ]);
    } else if (text) {
      result = await model.generateContent(`${systemPrompt}\n\nComida reportada: "${text}"`);
    } else {
      return NextResponse.json({ error: "Sin datos" }, { status: 400 });
    }

    return NextResponse.json({ analysis: result.response.text() });
  } catch (error) {
    console.error("Food analysis error:", error);
    return NextResponse.json({ error: "Error de análisis" }, { status: 500 });
  }
}
