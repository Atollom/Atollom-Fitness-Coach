import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { createSession, sessionCookie } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  if (!rows[0]) return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });

  const user = rows[0];
  const token = await createSession({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  res.cookies.set(sessionCookie(token));
  return res;
}
