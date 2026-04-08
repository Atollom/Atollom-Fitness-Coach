import { NextRequest, NextResponse } from "next/server";

// Videos curados reales como fallback garantizado
const CURATED: Record<string, { title: string; videoId: string; channel: string }[]> = {
  sentadilla: [
    { title: "Sentadilla perfecta paso a paso", videoId: "YaXPRqUwItQ", channel: "Gymvirtual" },
    { title: "Cómo hacer sentadillas correctamente", videoId: "U3HlEF_E9fo", channel: "Sergio Peinado" },
  ],
  "peso muerto": [
    { title: "Peso muerto técnica correcta", videoId: "op9kVnSso6Q", channel: "Gymvirtual" },
  ],
  flexiones: [
    { title: "Flexiones para principiantes", videoId: "IODxDxX7oi4", channel: "Gymvirtual" },
    { title: "Cómo hacer flexiones perfectas", videoId: "0pkjOk0EiAk", channel: "Sergio Peinado" },
  ],
  dominadas: [
    { title: "Dominadas desde cero", videoId: "eGo4IYlbE5g", channel: "Gymvirtual" },
  ],
  cardio: [
    { title: "Cardio en casa 20 minutos", videoId: "ml6cT4AZdqI", channel: "Gymvirtual" },
    { title: "HIIT 15 minutos para bajar de peso", videoId: "M0uO8X3_tEA", channel: "Sergio Peinado" },
  ],
  abdominales: [
    { title: "Abdominales para principiantes", videoId: "DHD1-2K4LKo", channel: "Gymvirtual" },
    { title: "Rutina abdominales 10 minutos", videoId: "1f8yoFFdkcY", channel: "Sergio Peinado" },
  ],
  "press banca": [
    { title: "Press de banca técnica", videoId: "4Y2ZsPeXYxk", channel: "Gymvirtual" },
  ],
  "peso corporal": [
    { title: "Rutina cuerpo completo sin equipo", videoId: "UItWltVZZmE", channel: "Gymvirtual" },
  ],
  estiramiento: [
    { title: "Estiramientos post-entreno", videoId: "g_tea8ZNk5A", channel: "Gymvirtual" },
  ],
  default: [
    { title: "Rutina completa principiantes", videoId: "UItWltVZZmE", channel: "Gymvirtual" },
    { title: "Entrenamiento en casa 30 min", videoId: "ml6cT4AZdqI", channel: "Gymvirtual" },
  ],
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;

  // Intentar YouTube Data API v3
  if (apiKey) {
    try {
      const query = encodeURIComponent(`${q} ejercicio tutorial español`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&relevanceLanguage=es&videoCategoryId=17&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.items?.length > 0) {
        const videos = data.items.map((item: {
          id: { videoId: string };
          snippet: { title: string; channelTitle: string };
        }) => ({
          title: item.snippet.title,
          videoId: item.id.videoId,
          channel: item.snippet.channelTitle,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          appUrl: `youtube://www.youtube.com/watch?v=${item.id.videoId}`,
        }));
        return NextResponse.json({ videos, source: "api" });
      }
    } catch (e) {
      console.error("YouTube API error:", e);
    }
  }

  // Fallback: curated list
  const key = Object.keys(CURATED).find(k => q.toLowerCase().includes(k)) || "default";
  const videos = CURATED[key].map(v => ({
    ...v,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    appUrl: `youtube://www.youtube.com/watch?v=${v.videoId}`,
  }));
  return NextResponse.json({ videos, source: "curated" });
}
