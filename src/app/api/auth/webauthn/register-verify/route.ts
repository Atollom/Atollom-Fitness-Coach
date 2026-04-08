import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const rows = await sql`SELECT challenge FROM webauthn_challenges WHERE user_id = ${session.userId} ORDER BY created_at DESC LIMIT 1`;
  if (!rows[0]) return NextResponse.json({ error: "Sin challenge" }, { status: 400 });

  const rpID = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: rows[0].challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL!,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verificación fallida" }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;
    await sql`
      INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
      VALUES (${session.userId}, ${credential.id}, ${Buffer.from(credential.publicKey).toString("base64")}, ${credential.counter})
      ON CONFLICT (credential_id) DO UPDATE SET counter = ${credential.counter}
    `;
    await sql`DELETE FROM webauthn_challenges WHERE user_id = ${session.userId}`;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("WebAuthn register error:", e);
    return NextResponse.json({ error: "Error al registrar biométrico" }, { status: 500 });
  }
}
