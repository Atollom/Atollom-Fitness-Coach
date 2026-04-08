"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Dumbbell, Utensils, BarChart2, User } from "lucide-react";

const NAV = [
  { href: "/", icon: Terminal, label: "ATLAS" },
  { href: "/routines", icon: Dumbbell, label: "RUTINAS" },
  { href: "/food", icon: Utensils, label: "COMIDA" },
  { href: "/progress", icon: BarChart2, label: "MISIÓN" },
  { href: "/profile", icon: User, label: "PERFIL" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface-low border-t border-outline z-50">
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors relative ${
                active ? "text-primary" : "text-tertiary hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary" />
              )}
              <Icon size={17} strokeWidth={active ? 2.5 : 1.5} />
              <span className="font-mono text-[8px] uppercase tracking-widest">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
