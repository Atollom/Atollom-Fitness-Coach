import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const users = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  if (!users[0]) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const userId = users[0].id;
  const creds = await sql`SELECT credential_id FROM webauthn_credentials WHERE user_id = ${userId}`;
  if (!creds.length) return NextResponse.json({ error: "Sin biométrico registrado" }, { status: 404 });

  const options = await generateAuthenticationOptions({
    rpID: new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname,
    allowCredentials: creds.map(c => ({ id: c.credential_id, type: "public-key" as const })),
    userVerification: "required",
  });

  await sql`DELETE FROM webauthn_challenges WHERE user_id = ${userId}`;
  await sql`INSERT INTO webauthn_challenges (user_id, email, challenge) VALUES (${userId}, ${email.toLowerCase()}, ${options.challenge})`;

  return NextResponse.json(options);
}
