import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { SpolecenskyKompas } from "../types";

interface CompassGenerationProps {
  initialCompass: SpolecenskyKompas;
  onComplete: () => void;
}

export default function CompassGeneration({ initialCompass, onComplete }: CompassGenerationProps) {
  const [progress, setProgress] = useState(0);
  const [currentDisplayCompass, setCurrentDisplayCompass] = useState<SpolecenskyKompas>({
    ekonomika: 50,
    kultura: 50,
    evropa: 50,
    stylPolitiky: 50,
  });

  const [loadingText, setLoadingText] = useState("Sběr dat z krajských průzkumů...");

  useEffect(() => {
    const duration = 5000; // 5 seconds
    const intervalTime = 50; // Update every 50ms
    const totalSteps = duration / intervalTime;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentProgress = (step / totalSteps) * 100;
      setProgress(Math.min(currentProgress, 100));

      // Update loading status message based on progress
      if (currentProgress < 25) {
        setLoadingText("Sběr dat z krajských měst a venkova...");
      } else if (currentProgress < 50) {
        setLoadingText("Měření kulturně-společenské polarizace v regionech...");
      } else if (currentProgress < 75) {
        setLoadingText("Korelace ekonomických očekávání a inflačního sentimentu...");
      } else if (currentProgress < 90) {
        setLoadingText("Vyhodnocování geopolitických postojů vůči EU...");
      } else {
        setLoadingText("Sestavování celkového obrazu české společnosti...");
      }

      if (step >= totalSteps) {
        clearInterval(timer);
        setTimeout(() => {
          onComplete();
        }, 300); // Small pause at the end for satisfying completion click or auto-move
      } else {
        // Randomize values while generating, gradually narrowing towards initialCompass as we approach 100%
        const ratio = currentProgress / 100;
        const randomizeAxis = (finalVal: number) => {
          if (ratio > 0.85) {
            // Settle on final value
            return finalVal;
          }
          // The closer we are to the end, the closer the random swings are to the true target
          const maxSwing = 35 * (1 - ratio);
          const randomSwing = (Math.random() - 0.5) * 2 * maxSwing;
          return Math.max(0, Math.min(100, Math.round(finalVal + randomSwing)));
        };

        setCurrentDisplayCompass({
          ekonomika: randomizeAxis(initialCompass.ekonomika),
          kultura: randomizeAxis(initialCompass.kultura),
          evropa: randomizeAxis(initialCompass.evropa),
          stylPolitiky: randomizeAxis(initialCompass.stylPolitiky),
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [initialCompass, onComplete]);

  // Labels for rendering the values
  const getLabelAndValues = (axis: keyof SpolecenskyKompas, value: number) => {
    switch (axis) {
      case "ekonomika":
        return {
          left: "Levice",
          right: "Pravice",
          center: "Střed",
          currentText: value < 40 ? "Levicové" : value > 60 ? "Pravicové" : "Středové",
        };
      case "kultura":
        return {
          left: "Konzervativní",
          right: "Progresivní",
          center: "Názorový střed",
          currentText: value < 40 ? "Konzervativní" : value > 60 ? "Progresivní" : "Liberální střed",
        };
      case "evropa":
        return {
          left: "Skeptik",
          right: "Eurohujer",
          center: "Neutrální",
          currentText: value < 40 ? "Euroskeptické" : value > 60 ? "Proevropské" : "Neutrální",
        };
      case "stylPolitiky":
        return {
          left: "Konstruktivní",
          right: "Populismus",
          center: "Vyvážený",
          currentText: value < 40 ? "Konstruktivní" : value > 60 ? "Populistické" : "Pragmatické",
        };
      default:
        return { left: "", right: "", center: "", currentText: "" };
    }
  };

  const axes: Array<{ key: keyof SpolecenskyKompas; title: string; prefixNum: string }> = [
    { key: "ekonomika", title: "HOSPODÁŘSTVÍ", prefixNum: "01" },
    { key: "kultura", title: "SPOLEČNOST", prefixNum: "02" },
    { key: "evropa", title: "EVROPSKÁ UNIE", prefixNum: "03" },
    { key: "stylPolitiky", title: "STYL POLITIKY", prefixNum: "04" },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-8 bg-[#fdfdfd] text-slate-800 font-sans max-w-4xl mx-auto shadow-xs border border-slate-100 rounded-[28px] my-6 select-none animate-fadeIn relative overflow-hidden">
      {/* Absolute faint grid pattern in background */}
      <div className="absolute inset-0 opacity-[0.015] bg-grid-pattern pointer-events-none" />

      <div className="w-full max-w-2xl space-y-8 relative z-10">
        
        {/* Header containing animated logo & titles */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mb-2">
            <span className="text-2xl animate-spin" style={{ animationDuration: "3s" }}>🧭</span>
          </div>
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-indigo-600 uppercase block">
            Analytický a socioekonomický průzkum
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sestavování nálad ve společnosti
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Algoritmus v reálném čase simuluje a sjednocuje názorová spektra, socioekonomická specifika krajů ČR a aktuální veřejný sentiment.
          </p>
        </div>

        {/* Dynamic Display of the 4 Axes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {axes.map(({ key, title, prefixNum }) => {
            const val = currentDisplayCompass[key];
            const meta = getLabelAndValues(key, val);
            return (
              <div key={key} className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-3 relative overflow-hidden">
                {/* Visual pulse grid */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{prefixNum}. {title}</span>
                  <span className="text-[11px] font-mono font-black text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded-md">
                    {val}%
                  </span>
                </div>

                {/* Slider visual */}
                <div className="relative h-1.5 w-full bg-slate-200/80 rounded-full mt-2">
                  {/* Slider middle vertical indicator line */}
                  <div className="absolute left-[50%] top-[-3px] w-0.5 h-3 bg-slate-300" />
                  {/* Slider progress colored fill */}
                  <div 
                    className="absolute h-full bg-indigo-500/10 rounded-full rounded-r-none transition-all duration-75"
                    style={{ width: `${val}%` }}
                  />
                  {/* Live slider handle point bubble */}
                  <div 
                    className="absolute w-3.5 h-3.5 top-[-4.5px] rounded-full bg-indigo-600 border-2 border-white shadow-sm transition-all duration-75"
                    style={{ left: `calc(${val}% - 7px)` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 font-sans">
                  <span>{meta.left}</span>
                  <span className="text-slate-800 font-bold">{meta.currentText}</span>
                  <span>{meta.right}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Huge bottom progression bar */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-sans italic flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              {loadingText}
            </span>
            <span className="text-indigo-600 font-black">{Math.round(progress)} %</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-xs"
              style={{ width: `${progress}%` }}
              layout
            />
          </div>
        </div>

      </div>
    </div>
  );
}
