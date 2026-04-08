import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import webpush from "web-push";

const sql = neon(process.env.DATABASE_URL!);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const MOTIVATIONAL_MESSAGES = [
  { title: "⚡ ATLAS OS", body: "Son las 6AM. Tu objetivo no duerme. ¿Tú sí?" },
  { title: "⚡ ATLAS OS", body: "El cuerpo que quieres lo construye alguien que actúa hoy." },
  { title: "⚡ ATLAS OS", body: "Recordatorio de ejecución: ¿Ya entrenaste hoy?" },
  { title: "⚡ ATLAS OS", body: "La consistencia gana. ¿Qué hiciste hoy por tu objetivo?" },
  { title: "⚡ ATLAS OS", body: "Son las 8PM. Reporte de cierre del día pendiente." },
  { title: "⚡ ATLAS OS", body: "No hay excusas válidas. Solo resultados o razones." },
  { title: "⚡ ATLAS OS", body: "Tu rutina de hoy está esperando. Ejecuta." },
];

export async function POST(req: NextRequest) {
  // Verificar cron secret para seguridad
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subs = await sql`SELECT * FROM push_subscriptions`;
    const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: "/" });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    return NextResponse.json({ sent, total: subs.length });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
