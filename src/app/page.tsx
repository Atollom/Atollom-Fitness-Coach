"use client";

import { useState } from "react";
import { Send, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [chatMessage, setChatMessage] = useState("");

  const quickActions = [
    { label: "YA ENTRENÉ", type: "success" },
    { label: "TENGO ANSIEDAD", type: "danger" },
    { label: "NO QUIERO HACER NADA", type: "neutral" },
  ];

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground border-x-4 border-l-primary-inverse border-r-transparent max-w-md mx-auto sm:border-x-0 relative">
      
      {/* Header - System Status */}
      <header className="flex justify-between items-center p-6 pb-2 border-b-2 border-surface-low">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-primary" />
          <span className="font-display font-bold text-sm tracking-widest text-primary uppercase">ATOLLOM OS</span>
        </div>
        <div className="w-3 h-3 bg-secondary-dim animate-[pulse_2s_ease-in-out_infinite]" />
      </header>

      {/* Main Signal Area */}
      <section className="flex-1 px-6 py-10 flex flex-col justify-start">
        <div className="space-y-2 mb-12 relative z-10">
          <p className="text-tertiary font-display text-sm uppercase tracking-widest">Estado Actual</p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase leading-[0.9] text-foreground">
            18:45 <br />
            <span className="text-primary">Ejercicio</span> <br />
            15 Min. <br />
            <span className="text-secondary-dim underline decoration-4 underline-offset-4">Hazlo ahora.</span>
          </h1>
        </div>

        {/* Coach Dynamic Message */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-surface-high border-l-4 border-primary p-6 mb-8 shadow-2xl"
        >
          <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
            "Son las 6:45. Empieza. 15 minutos. No negocies."
          </p>
        </motion.div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-3 mt-auto mb-6">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className={`font-display font-bold py-4 px-6 text-left uppercase text-sm tracking-widest border-2 transition-colors duration-100 ${
                action.type === 'success' 
                  ? 'bg-transparent border-primary text-primary hover:bg-primary hover:text-black' 
                  : action.type === 'danger'
                  ? 'bg-secondary-dim border-secondary-dim text-white hover:bg-transparent hover:text-secondary-dim'
                  : 'bg-transparent border-tertiary text-tertiary hover:bg-tertiary hover:text-black'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      {/* Chat Interface */}
      <footer className="p-4 bg-surface-low border-t-2 border-surface-high sticky bottom-0">
        <form 
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); /* submit chat */ }}
        >
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Reportar estado al sistema..."
            className="flex-1 bg-background border-b-2 border-outline px-4 py-3 text-foreground focus:outline-none focus:border-primary-inverse font-mono text-sm transition-colors rounded-none placeholder:text-tertiary"
          />
          <button 
            type="submit" 
            className="p-3 bg-foreground text-background hover:bg-primary-inverse hover:text-white transition-colors duration-100 uppercase font-display text-sm font-bold"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </main>
  );
}
