import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { neon } from "@neondatabase/serverless";
import { createSession, sessionCookie } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body;

  const challengeRows = await sql`
    SELECT wc.challenge, wc.user_id FROM webauthn_challenges wc
    WHERE wc.email = ${email?.toLowerCase()}
    ORDER BY wc.created_at DESC LIMIT 1
  `;
  if (!challengeRows[0]) return NextResponse.json({ error: "Sin challenge" }, { status: 400 });

  const { challenge, user_id } = challengeRows[0];
  const credRows = await sql`SELECT * FROM webauthn_credentials WHERE user_id = ${user_id} AND credential_id = ${body.id}`;
  if (!credRows[0]) return NextResponse.json({ error: "Credencial no encontrada" }, { status: 404 });

  const cred = credRows[0];
  const rpID = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL!,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: Buffer.from(cred.public_key, "base64"),
        counter: Number(cred.counter),
      },
    });

    if (!verification.verified) return NextResponse.json({ error: "Verificación fallida" }, { status: 401 });

    await sql`UPDATE webauthn_credentials SET counter = ${verification.authenticationInfo.newCounter} WHERE id = ${cred.id}`;
    await sql`DELETE FROM webauthn_challenges WHERE user_id = ${user_id}`;

    const userRows = await sql`SELECT * FROM users WHERE id = ${user_id}`;
    const user = userRows[0];
    const token = await createSession({ userId: user.id, email: user.email, name: user.name });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (e) {
    console.error("WebAuthn login error:", e);
    return NextResponse.json({ error: "Error de autenticación biométrica" }, { status: 500 });
  }
}
