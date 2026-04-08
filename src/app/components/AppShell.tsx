"use client";

import { useState, useEffect } from "react";
import SplashScreen from "./SplashScreen";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Solo mostrar splash en primera carga, no en navegación
    const shown = sessionStorage.getItem("splash_shown");
    if (!shown) {
      sessionStorage.setItem("splash_shown", "1");
      const t = setTimeout(() => setReady(true), 2400);
      return () => clearTimeout(t);
    } else {
      setReady(true);
    }
  }, []);

  return (
    <>
      <SplashScreen />
      <div className={ready ? "opacity-100 transition-opacity duration-300" : "opacity-0"}>
        {children}
      </div>
    </>
  );
}
