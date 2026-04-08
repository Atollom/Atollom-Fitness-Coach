"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Dumbbell, Utensils, BarChart2, User } from "lucide-react";

const NAV = [
  { href: "/", icon: Terminal, label: "ATLAS" },
  { href: "/routines", icon: Dumbbell, label: "Rutinas" },
  { href: "/food", icon: Utensils, label: "Comida" },
  { href: "/progress", icon: BarChart2, label: "Progreso" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface-low border-t-2 border-surface-high z-50">
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                active ? "text-primary" : "text-tertiary hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              <span className="font-display text-[9px] uppercase tracking-widest font-bold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
