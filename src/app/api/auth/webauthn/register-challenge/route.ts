import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const existing = await sql`SELECT credential_id FROM webauthn_credentials WHERE user_id = ${session.userId}`;
  const excludeCredentials = existing.map(c => ({ id: c.credential_id, type: "public-key" as const }));

  const options = await generateRegistrationOptions({
    rpName: "ATOLLOM AI",
    rpID: new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname,
    userName: session.email,
    userDisplayName: session.name,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
  });

  await sql`DELETE FROM webauthn_challenges WHERE user_id = ${session.userId}`;
  await sql`INSERT INTO webauthn_challenges (user_id, challenge) VALUES (${session.userId}, ${options.challenge})`;

  return NextResponse.json(options);
}
