import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1`;
  return NextResponse.json({ profile: rows[0] || null });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { peso_kg, objetivo, horario_trabajo, ventana_entrenamiento, presupuesto_semanal, supermercados } = body;

  const rows = await sql`SELECT id FROM user_profile WHERE perfil_completo = true ORDER BY created_at DESC LIMIT 1`;
  if (!rows[0]) return NextResponse.json({ error: "No hay perfil" }, { status: 404 });

  await sql`
    UPDATE user_profile SET
      peso_kg = COALESCE(${peso_kg}, peso_kg),
      objetivo = COALESCE(${objetivo}, objetivo),
      horario_trabajo = COALESCE(${horario_trabajo}, horario_trabajo),
      ventana_entrenamiento = COALESCE(${ventana_entrenamiento}, ventana_entrenamiento),
      presupuesto_semanal = COALESCE(${presupuesto_semanal}, presupuesto_semanal),
      supermercados = COALESCE(${supermercados}, supermercados)
    WHERE id = ${rows[0].id}
  `;
  return NextResponse.json({ ok: true });
}
