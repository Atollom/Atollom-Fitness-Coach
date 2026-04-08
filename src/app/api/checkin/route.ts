import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM check_ins ORDER BY created_at DESC LIMIT 30`;
  return NextResponse.json({ checkins: rows });
}

export async function POST(req: NextRequest) {
  const { tipo, nota, peso_kg, mood } = await req.json();
  const row = await sql`
    INSERT INTO check_ins (tipo, nota, peso_kg, mood)
    VALUES (${tipo}, ${nota || null}, ${peso_kg || null}, ${mood || null})
    RETURNING *
  `;
  return NextResponse.json({ checkin: row[0] });
}
