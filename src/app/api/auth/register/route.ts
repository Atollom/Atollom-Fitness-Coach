import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { createSession, sessionCookie } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Mínimo 6 caracteres" }, { status: 400 });

  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  if (existing.length > 0) return NextResponse.json({ error: "Este correo ya está registrado" }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const rows = await sql`INSERT INTO users (email, password_hash, name) VALUES (${email.toLowerCase()}, ${hash}, ${name}) RETURNING id, email, name`;
  const user = rows[0];

  const token = await createSession({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  res.cookies.set(sessionCookie(token));
  return res;
}
