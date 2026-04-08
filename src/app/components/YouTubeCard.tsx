"use client";

import { Play, ExternalLink } from "lucide-react";

type Props = {
  title: string;
  videoId: string;
  channel?: string;
};

export default function YouTubeCard({ title, videoId, channel }: Props) {
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`;
  // En móvil, intenta abrir la app nativa de YouTube
  // Si no está instalada, cae al navegador automáticamente
  const handleOpen = () => {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Intenta app nativa primero, fallback a web
      window.location.href = `youtube://www.youtube.com/watch?v=${videoId}`;
      setTimeout(() => { window.open(webUrl, "_blank"); }, 1500);
    } else {
      window.open(webUrl, "_blank");
    }
  };

  return (
    <button
      onClick={handleOpen}
      className="w-full flex items-center gap-3 bg-surface-high border border-outline hover:border-secondary-dim transition-colors p-3 text-left group"
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-20 h-14 bg-black overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-secondary-dim flex items-center justify-center">
            <Play size={12} fill="white" className="text-white ml-0.5" />
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display text-xs font-bold text-foreground uppercase tracking-wide leading-tight line-clamp-2">{title}</p>
        {channel && <p className="font-mono text-[10px] text-tertiary mt-0.5">{channel}</p>}
        <p className="font-mono text-[10px] text-secondary-dim mt-0.5 flex items-center gap-1">
          <ExternalLink size={9} /> Abrir en YouTube
        </p>
      </div>
    </button>
  );
}
