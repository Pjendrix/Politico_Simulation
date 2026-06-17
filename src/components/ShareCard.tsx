/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { STRANY, PORADCI } from "../data";
import { GameState, EndingTyp } from "../types";
import { Trophy, Users, Award, TrendingUp, Landmark, Star } from "lucide-react";

interface ShareCardProps {
  state: GameState;
  finalEndingTyp: EndingTyp;
  epilogText: string;
  playerSeats: number;
  initialPreference: number;
}

export default function ShareCard({
  state,
  finalEndingTyp,
  epilogText,
  playerSeats,
  initialPreference,
}: ShareCardProps) {
  const playerParty = STRANY[state.stranaId] || Object.values(STRANY)[0];
  const advisor = PORADCI[state.poradceId] || Object.values(PORADCI)[0];

  const finalPreference = state.electionResults && state.electionResults[state.stranaId] !== undefined
    ? state.electionResults[state.stranaId]
    : state.preference;

  const prefChange = finalPreference - initialPreference;

  // Outcome setup
  const endingConfig: Record<EndingTyp, {
    ikona: string;
    nadpis: string;
    description: string;
    sub: string;
    gradient: string;
  }> = {
    premier: {
      ikona: "🏆",
      nadpis: "Premiér České republiky",
      description: "Klín od Strakovy akademie vybojován!",
      sub: "Absolutní úspěch",
      gradient: "from-amber-500 via-amber-600 to-amber-700",
    },
    vicepremier: {
      ikona: "🥈",
      nadpis: "Vicepremiér / Junior vládce",
      description: "Sestavili jsme vládu jako menší partner.",
      sub: "Vládní koalice",
      gradient: "from-blue-550 via-blue-650 to-blue-750",
    },
    koalicni_partner: {
      ikona: "🤝",
      nadpis: "Koaliční partner",
      description: "Přizváni k moci v kuloárech.",
      sub: "Vládní koalice",
      gradient: "from-slate-600 via-slate-700 to-slate-800",
    },
    opozice: {
      ikona: "⚡",
      nadpis: "Opoziční lavičky",
      description: "Vláda vzniká bez nás.",
      sub: "Konstruktivní opozice",
      gradient: "from-red-650 via-red-700 to-red-750",
    },
  };

  const outcome = endingConfig[finalEndingTyp];

  // Slice a clean short sentence from the epilogue as a quote teaser
  const cleanSnippet = React.useMemo(() => {
    if (!epilogText) return "";
    const sentences = epilogText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    // Find first substantive sentence up to 130 characters
    const bestSentence = sentences.find(s => s.length >= 15 && s.length <= 130) || sentences[0] || epilogText;
    return bestSentence.endsWith(".") ? bestSentence : `${bestSentence}.`;
  }, [epilogText]);

  const partyColor = playerParty.barva || "#1e3a8a";

  return (
    <div
      id="politico-share-card"
      style={{
        width: "1200px",
        height: "630px",
        fontFamily: "'Inter', sans-serif",
      }}
      className="bg-slate-950 text-white p-12 flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Dynamic graphic backgrounds */}
      <div 
        className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full blur-[160px] opacity-25"
        style={{ backgroundColor: partyColor }}
      />
      <div 
        className="absolute bottom-[-150px] right-[-150px] w-[600px] h-[500px] rounded-full blur-[180px] opacity-20"
        style={{ backgroundColor: partyColor }}
      />

      {/* Grid Pattern overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.08] pointer-events-none" />

      {/* Decorative frame */}
      <div className="absolute inset-4 border border-white/5 rounded-[28px] pointer-events-none" />
      <div className="absolute inset-6 border border-white/10 rounded-[20px] pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          <div
            className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 animate-pulse"
            style={{ backgroundColor: partyColor }}
          />
          <span className="font-sans text-xs font-black uppercase tracking-widest text-slate-300">
            {playerParty.nazev}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-white/50 text-[11px] font-sans font-bold uppercase tracking-widest">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>Oficiální Volební Výsledek</span>
        </div>
      </div>

      {/* MIDDLE CONTAINER: 2 Column Layout */}
      <div className="grid grid-cols-12 gap-10 items-center my-auto z-10">
        
        {/* LEFT COLUMN: Role Emblem */}
        <div className="col-span-5 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${outcome.gradient} flex items-center justify-center shadow-lg border border-white/20 relative z-10`}>
              <span className="text-7xl">{outcome.ikona}</span>
            </div>
            {/* Pulsing ring */}
            <div className={`absolute inset-[-10px] rounded-full bg-gradient-to-br ${outcome.gradient} opacity-20 blur-md`} />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-sans uppercase font-black tracking-widest text-emerald-400">
              {outcome.sub}
            </div>
            <h1 className="text-3xl font-sans font-black tracking-tight leading-none text-white max-w-[320px]">
              {outcome.nadpis}
            </h1>
            <p className="text-xs text-slate-400 font-sans max-w-[280px]">
              {outcome.description}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Performance indicators */}
        <div className="col-span-7 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            
            {/* Preference Stats */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-inner flex flex-col justify-between">
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 tracking-wider">
                Volební Preference
              </span>
              <div className="mt-3">
                <div className="text-3xl font-sans font-black text-white flex items-end space-x-1.5 leading-none">
                  <span>{finalPreference.toFixed(1)}%</span>
                  <span className={`text-sm font-extrabold pb-0.5 ${prefChange >= 0 ? "text-emerald-450" : "text-rose-450"}`}>
                    {prefChange >= 0 ? "▲" : "▼"}{Math.abs(prefChange).toFixed(1)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1.5">
                  začínali jsme na: {initialPreference.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Seats / Success Metric */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-inner flex flex-col justify-between">
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 tracking-wider">
                Mandáty ve sněmovně
              </span>
              <div className="mt-3">
                <div className="text-3xl font-sans font-black text-amber-400 leading-none">
                  {playerSeats > 0 ? `${playerSeats} / 200` : "Mimo vládní post"}
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-1.5 block">
                  {playerSeats > 0 ? `podíl ${((playerSeats / 200) * 100).toFixed(0)} % křesel` : "odchod do opozičních lavic"}
                </span>
              </div>
            </div>

          </div>

          {/* Epilogue Teaser Quote Block */}
          {cleanSnippet && (
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl relative shadow-sm">
              <div className="absolute top-3 left-4 text-slate-600/30 font-serif text-5xl leading-none">“</div>
              <p className="text-[13.5px] leading-relaxed text-slate-300 italic font-serif font-medium pl-6 pr-4 relative z-10 py-1">
                {cleanSnippet}
              </p>
            </div>
          )}

          {/* Campaign manager badge */}
          <div className="flex items-center space-x-4 bg-white/[0.04] p-3 rounded-xl border border-white/5">
            <span className="text-xl shrink-0">{advisor.emoji}</span>
            <div className="text-xs font-sans">
              <span className="text-slate-500 uppercase font-black text-[9px] tracking-wider block">Hlavní stratég kampaně</span>
              <strong className="text-slate-200 mt-0.5 block">{advisor.jmeno} ({advisor.specialita})</strong>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER BRASS BRANDING */}
      <div className="flex justify-between items-end border-t border-white/5 pt-4 z-10">
        <div className="flex flex-col">
          <span className="text-[14px] font-sans font-black tracking-widest text-white uppercase flex items-center gap-1.5">
            POLITICO <span className="text-[10px] bg-red-650 px-2 py-0.5 rounded font-sans tracking-wide text-white font-extrabold">2026</span>
          </span>
          <span className="text-[10px] text-slate-500 font-sans tracking-wide mt-0.5">
            Prémiová strategická simulace volebního štábu v ČR
          </span>
        </div>

        <div className="text-right text-[10px] text-slate-500 font-sans font-extrabold uppercase tracking-widest">
          Zahraj si na: <b className="text-slate-300">ai.studio/build</b>
        </div>
      </div>
    </div>
  );
}
