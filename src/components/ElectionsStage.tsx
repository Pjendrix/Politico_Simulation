/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { STRANY } from "../data";
import { GameState, CoalitionDetails } from "../types";
import { Landmark, Vote, Trophy, AlertTriangle, ChevronRight, BarChart2, ShieldAlert } from "lucide-react";

interface ElectionsStageProps {
  state: GameState;
  onProceedToCoalition: () => void;
  onProceedToEnding: (success: boolean, customCoalitionDetails?: CoalitionDetails | null) => void;
}

// Box-Muller transform for Gaussian (normal) distribution
export function randomGaussian(mean: number, stdDev: number, rng: () => number = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

// Calculate final election results with Gaussian deviation
export function calculateElectionResults(state: GameState, rng: () => number = Math.random): Record<string, number> {
  const finalResults: Record<string, number> = {};
  const prevPrefs: Record<string, number> = {};
  
  // 1. Collect current raw preferences
  Object.keys(STRANY).forEach((id) => {
    const isPlayer = id === state.stranaId;
    prevPrefs[id] = isPlayer ? state.preference : (state.npcPreferred[id] || 0);
  });

  const rawResults: Record<string, number> = {};
  
  // 2. Compute maximum possible deviation and Gaussian random deviation
  Object.entries(prevPrefs).forEach(([id, pref]) => {
    // Odchylka = 0.5 * odmocnina(Preference)
    const maxDeviation = 0.5 * Math.sqrt(pref);
    
    // Choose standard deviation so that ~95% of random values will fall into [-maxDeviation, +maxDeviation]
    const stdDev = maxDeviation / 2.0;
    const deviation = randomGaussian(0, stdDev, rng);
    const clampedDev = Math.max(-maxDeviation, Math.min(maxDeviation, deviation));
    
    // 3. Preliminary result
    let preliminary = pref + clampedDev;
    
    // 4. Set to 0 if below 0%
    if (preliminary < 0) {
      preliminary = 0;
    }
    
    rawResults[id] = preliminary;
  });

  // 5. Normalization to exactly 100%
  const totalRaw = Object.values(rawResults).reduce((sum, val) => sum + val, 0);
  
  Object.keys(rawResults).forEach((id) => {
    if (totalRaw > 0) {
      finalResults[id] = (rawResults[id] / totalRaw) * 100;
    } else {
      finalResults[id] = 0;
    }
  });

  return finalResults;
}

// Seats allocation function exactly identical to App/CoalitionStage standard PR calculation
export function calculatePartySeats(electionResults: Record<string, number>, playerPartyId: string): Record<string, number> {
  const partyList = Object.entries(STRANY).map(([id, p]) => {
    const preference = electionResults[id] || 0;
    return { ...p, preference, isPlayer: id === playerPartyId };
  });

  const passingParties = partyList.filter((p) => p.preference >= 5.0);
  const totalPassingPref = passingParties.reduce((sum, p) => sum + p.preference, 0);

  let distributedSeatsCount = 0;
  const pollWithSeats = partyList.map((p) => {
    if (p.preference < 5.0) {
      return { ...p, seats: 0, perfectSeats: 0 };
    }
    const perfectSeats = (p.preference / totalPassingPref) * 200;
    const seats = Math.round(perfectSeats);
    distributedSeatsCount += seats;
    return { ...p, seats, perfectSeats };
  });

  const difference = 200 - distributedSeatsCount;
  if (difference !== 0 && passingParties.length > 0) {
    const sortedByRemainder = [...pollWithSeats]
      .filter((p) => p.preference >= 5.0)
      .sort((a, b) => {
        const remA = (a.perfectSeats || 0) % 1;
        const remB = (b.perfectSeats || 0) % 1;
        return remB - remA;
      });

    const adjustmentSign = difference > 0 ? 1 : -1;
    let adjustmentLeft = Math.abs(difference);

    for (let i = 0; i < adjustmentLeft; i++) {
      const idx = i % sortedByRemainder.length;
      const targetParty = sortedByRemainder[idx];
      const match = pollWithSeats.find((p) => p.id === targetParty.id);
      if (match) {
        match.seats += adjustmentSign;
      }
    }
  }

  const seatMap: Record<string, number> = {};
  pollWithSeats.forEach((p) => {
    seatMap[p.id] = p.seats;
  });

  return seatMap;
}

function ElectionsStage({ state, onProceedToCoalition, onProceedToEnding }: ElectionsStageProps) {
  const [countingProgress, setCountingProgress] = useState(0);
  const [countingComplete, setCountingComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const results = state.electionResults || {};
  const seatMap = calculatePartySeats(results, state.stranaId);
  const playerHasPassed = (results[state.stranaId] || 0) >= 5.0;
  const playerSeats = seatMap[state.stranaId] || 0;
  const absoluteMajorityPartyId = Object.keys(seatMap).find(id => (seatMap[id] || 0) >= 101);
  const playerHasAbsoluteMajority = playerSeats >= 101;
  const npcHasAbsoluteMajority = absoluteMajorityPartyId !== undefined && absoluteMajorityPartyId !== state.stranaId;

  // Render variables sorted by percentage descend
  const sortedParties = Object.values(STRANY).map((p) => {
    const finalPercent = results[p.id] || 0;
    const seats = seatMap[p.id] || 0;
    const isPlayer = p.id === state.stranaId;
    return {
      ...p,
      finalPercent,
      seats,
      isPlayer,
    };
  }).sort((a, b) => b.finalPercent - a.finalPercent);

  useEffect(() => {
    const duration = 8000; // 8 seconds count animations

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing out cubic curve
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      setCountingProgress(easedProgress * 100);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCountingComplete(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* Television broadcast styled top bar */}
      <div className="bg-red-700 text-white uppercase text-[10px] font-extrabold tracking-widest px-6 py-2.5 flex items-center justify-between border-b border-red-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>VOLEBNÍ STUDIO — ŽIVÉ VYSÍLÁNÍ</span>
        </div>
        <div className="opacity-80">
          Česká Republika, Volby 2026
        </div>
      </div>

      {/* Hero header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/10 mix-blend-color-dodge pointer-events-none" />
        <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight uppercase bg-gradient-to-r from-blue-400 via-indigo-200 to-red-400 bg-clip-text text-transparent">
          Rozhodnutí Voličů
        </h1>
        <p className="text-xs text-slate-400 max-w-xl mx-auto mt-2 font-medium">
          Okresní volební komise dokončily sčítání hlasů. Volební preference byly přetaveny v reálné hlasy pod vlivem statistické odchylky.
        </p>

        {/* Live count stats panel */}
        <div className="mt-6 inline-flex flex-col items-center justify-center px-8 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl w-full max-w-xs sm:max-w-md mx-auto shadow-xl">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center mb-1">
            <Landmark className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
            <span>SČÍTÁNÍ OKRSKŮ</span>
          </div>
          <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 tracking-tight">
            {countingProgress.toFixed(2)} %
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
            <motion.div
              className="h-full bg-emerald-400"
              style={{ width: `${countingProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.1 }}
            />
          </div>
        </div>
      </div>

      {/* Main chart container - 12 vertical bars */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-8 flex-1 flex flex-col">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-2xl flex-1 flex flex-col justify-between">
          
          {/* Controls & toggle Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Finální rozdělení hlasů
              </h2>
            </div>
            <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setActiveTab("chart")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${
                  activeTab === "chart"
                    ? "bg-blue-600/20 border border-blue-500/50 text-blue-300"
                    : "text-slate-505 hover:text-slate-300"
                }`}
              >
                Sloupcový Graf
              </button>
              <button
                onClick={() => setActiveTab("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${
                  activeTab === "table"
                    ? "bg-blue-600/20 border border-blue-500/50 text-blue-300"
                    : "text-slate-505 hover:text-slate-300"
                }`}
              >
                Tabulka Mandátů
              </button>
            </div>
          </div>

          {activeTab === "chart" ? (
            /* Vertical Bar Graph Visual */
            <div className="relative h-64 sm:h-80 border-b border-slate-800 flex items-end justify-between px-2 sm:px-4 pb-1 select-none">
              
              {/* 5% barrier threshold horizontal marker line */}
              <div 
                className="absolute left-0 right-0 border-t border-dashed border-red-500/80 z-10 opacity-70"
                style={{ bottom: `${(5 / 40) * 100}%` }}
              >
                <span className="absolute right-0 -top-5 text-[9px] uppercase font-bold text-red-400 bg-slate-950 px-2 py-0.5 border border-red-900/30 rounded-md">
                  Sněmovní Bariéra (5.0 %)
                </span>
              </div>

              {/* Grid guide markings */}
              {[10, 20, 30, 40].map((level) => (
                <div
                  key={level}
                  className="absolute left-0 right-0 border-b border-slate-800/30 pointer-events-none"
                  style={{ bottom: `${(level / 40) * 100}%` }}
                >
                  <span className="absolute left-0 text-[8px] font-mono text-slate-650 -top-2">
                    {level} %
                  </span>
                </div>
              ))}

              {/* Rendering columns */}
              {sortedParties.map((p) => {
                const isPassing = p.finalPercent >= 5.0;
                // Calculate interpolated animated percentage based on counting progress
                const animatedPercent = (countingProgress / 100) * p.finalPercent;
                const columnHeightPercent = (animatedPercent / 40) * 100; // max limit of 40% on chart height

                return (
                  <div key={p.id} className="group flex-1 flex flex-col items-center max-w-[56px] mx-0.5 sm:mx-1 h-full justify-end relative">
                    
                    {/* Tooltip showing percent and seats */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20 bg-slate-900 border border-slate-700/80 p-2 rounded-xl text-center shadow-xl w-24">
                      <div className="text-[10px] font-extrabold" style={{ color: p.barva || "#7f8c8d" }}>
                        {p.zkratka}
                      </div>
                      <div className="text-xs font-bold mt-0.5">{p.finalPercent.toFixed(1)} %</div>
                      {isPassing && countingComplete && (
                        <div className="text-[9px] text-emerald-400 mt-0.5">{p.seats} křesel</div>
                      )}
                    </div>

                    {/* Voted percent indicator static badge inside columns */}
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-350 mb-1">
                      {animatedPercent.toFixed(1)}%
                    </div>

                    {/* Colored visual column bar */}
                    <div className="w-full px-0.5 sm:px-1 flex-1 flex flex-col justify-end">
                      <div
                        className={`w-full rounded-t-lg cursor-pointer ${
                          p.isPlayer ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950" : ""
                        }`}
                        style={{
                          height: `${Math.max(2, columnHeightPercent)}%`,
                          backgroundColor: p.barva || "#7f8c8d",
                          opacity: isPassing ? 1 : 0.35,
                        }}
                      />
                    </div>

                    {/* Party abbreviation label under column */}
                    <div className="mt-2 text-center">
                      <div className={`text-[10px] sm:text-xs font-black uppercase flex items-center justify-center ${
                        p.isPlayer ? "text-amber-400 font-extrabold" : "text-slate-400"
                      }`}>
                        {p.zkratka}
                        {p.isPlayer && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-405 ml-1 inline-block shrink-0 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table of Seats and Mandates */
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
              <table className="w-full text-left font-sans text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] font-extrabold tracking-widest border-b border-slate-800">
                    <th className="py-3 px-4">Pořadí</th>
                    <th className="py-3 px-4">Strana</th>
                    <th className="py-3 px-4">Lídr</th>
                    <th className="py-3 px-4 text-right">Získané Hlasy</th>
                    <th className="py-3 px-4 text-right">Mandáty (Sněmovna)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sortedParties.map((p, idx) => {
                    const isPassing = p.finalPercent >= 5.0;
                    return (
                      <tr 
                        key={p.id}
                        className={`${p.isPlayer ? "bg-amber-500/10" : "hover:bg-slate-900/40"} transition-colors duration-100`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-500">{idx + 1}.</td>
                        <td className="py-3 px-4 flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.barva }} />
                          <span className="font-extrabold uppercase">{p.zkratka}</span>
                          {p.isPlayer && (
                            <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded font-extrabold inline-block">VY</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs">{p.lidr}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">{p.finalPercent.toFixed(2)} %</td>
                        <td className="py-3 px-4 text-right">
                          {isPassing ? (
                            <span className="text-slate-100 font-bold bg-slate-800 px-2.5 py-1 rounded-md border border-slate-705">
                              {p.seats} mandátů
                            </span>
                          ) : (
                            <span className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                              Pod 5 % (0 mandátů)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Post-count evaluation summary text */}
          <div className="mt-8">
            <AnimatePresence>
              {countingComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`p-5 rounded-3xl border ${
                    playerHasAbsoluteMajority
                      ? "bg-amber-950/30 border-amber-900/40 text-amber-100"
                      : npcHasAbsoluteMajority
                      ? "bg-red-950/30 border-red-900/40 text-red-200"
                      : playerHasPassed
                      ? "bg-slate-900/60 border-slate-800 text-slate-200"
                      : "bg-red-950/40 border-red-900/40 text-red-200"
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    {playerHasAbsoluteMajority ? (
                      <div className="p-2 sm:p-2.5 bg-amber-900/65 border border-amber-500/30 rounded-2xl flex-shrink-0 animate-bounce">
                        <Trophy className="w-5 h-5 text-amber-400" />
                      </div>
                    ) : npcHasAbsoluteMajority ? (
                      <div className="p-2 sm:p-2.5 bg-red-900/60 border border-red-500/30 rounded-2xl flex-shrink-0 animate-pulse">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      </div>
                    ) : playerHasPassed ? (
                      <div className="p-2 sm:p-2.5 bg-indigo-900/65 border border-indigo-500/30 rounded-2xl flex-shrink-0">
                        <Trophy className="w-5 h-5 text-indigo-400" />
                      </div>
                    ) : (
                      <div className="p-2 sm:p-2.5 bg-red-900/60 border border-red-500/30 rounded-2xl flex-shrink-0 animate-pulse">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <h3 className="font-sans text-sm font-extrabold uppercase tracking-wide">
                        {playerHasAbsoluteMajority
                          ? "Absolutní většina a jednobarevná vláda!"
                          : npcHasAbsoluteMajority
                          ? "Jednobarevná většina konkurence"
                          : playerHasPassed
                          ? "Volební úspěch!"
                          : "Konec cesty před branami Sněmovny"}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-normal">
                        {playerHasAbsoluteMajority
                          ? `Vaše strana získala dechberoucích ${playerSeats} mandátů! To znamená absolutní většinu v Poslanecké sněmovně. Nepotřebujete žádné koaliční partnery ani vyjednávání – můžete rovnou sestavit jednobarevnou většinovou vládu a jmenovat svého předsedu premiérem.`
                          : npcHasAbsoluteMajority
                          ? `Strana ${STRANY[absoluteMajorityPartyId!].zkratka} (${STRANY[absoluteMajorityPartyId!].lidr}) získala ${seatMap[absoluteMajorityPartyId!]} mandátů a má tak absolutní většinu v Poslanecké sněmovně. Okamžitě sestavuje vlastní jednobarevnou vládu a odmítá jakákoliv koaliční vyjednávání s kýmkoliv dalším.`
                          : playerHasPassed
                          ? `Vaše strana překročila pětiprocentní práh s konečným výsledkem ${results[state.stranaId]?.toFixed(1)} % hlasů a úspěšně získává ${seatMap[state.stranaId]} mandátů. Nyní vstupujete do intenzivního vyjednávaní s ostatními partnery. Máte dostatek mandátů na to, abyste sestavili stabilní vládu?`
                          : `Se ziskem pouhých ${results[state.stranaId]?.toFixed(1)} % hlasů jste nepřekročili 5% klauzuli potřebnou k zisku mandátů. Váš volební štáb pociťuje hluboké zklamání. Hra končí porážkou.`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Navigation Buttons */}
          <div className="mt-8 border-t border-slate-800/60 pt-5 flex items-center justify-end">
            {countingComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full sm:w-auto"
              >
                {playerHasAbsoluteMajority ? (
                  <button
                    onClick={() => {
                      const dummyCoalition: CoalitionDetails = {
                        playerSeats,
                        invitedPartyIds: [],
                        acceptedPartyIds: [],
                        totalSeats: playerSeats,
                        rolls: {},
                        parliamentSeats: seatMap,
                        prijatePodminky: [],
                        atributyPoVyjednavani: state.atributy,
                      };
                      onProceedToEnding(true, dummyCoalition);
                    }}
                    className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold bg-amber-600 hover:bg-amber-750 text-white font-sans text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center animate-pulse"
                  >
                    <span>Sestavit jednobarevnou vládu</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : npcHasAbsoluteMajority ? (
                  <button
                    onClick={() => onProceedToEnding(false, null)}
                    className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold bg-red-650 hover:bg-red-750 text-white font-sans text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center"
                  >
                    <span>Zobrazit celkové vyhodnocení voleb</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : playerHasPassed ? (
                  <button
                    onClick={onProceedToCoalition}
                    className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center"
                  >
                    <span>Přejít ke koaličnímu vyjednávání</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={() => onProceedToEnding(false, null)}
                    className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold bg-red-650 hover:bg-red-750 text-white font-sans text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center animate-pulse"
                  >
                    <span>Zobrazit celkové vyhodnocení voleb</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default React.memo(ElectionsStage);
