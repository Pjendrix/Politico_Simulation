/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { GameState } from "../types";
import { STRANY } from "../data";
import {
  Calendar,
  Percent,
  Coins,
  Compass,
  Brain,
  Users,
  Globe,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Smile,
  Frown,
  Meh,
  TrendingUp,
} from "lucide-react";

interface MetricBarProps {
  state: GameState;
}

export default function MetricBar({ state }: MetricBarProps) {
  const currentParty = STRANY[state.stranaId];

  const getPercentageColor = (val: number) => {
    if (val >= 20) return "text-emerald-700 font-extrabold";
    if (val >= 10) return "text-amber-700 font-bold";
    if (val >= 5) return "text-slate-800 font-semibold";
    return "text-red-700 font-bold";
  };

  const getBudgetColor = (val: number) => {
    if (val >= 500000) return "text-emerald-700 font-bold";
    if (val >= 0) return "text-slate-800 font-bold";
    return "text-red-750 font-black animate-pulse bg-red-50 border border-red-200 rounded px-2 py-0.5";
  };

  const getIdeologyLabel = (val: number, left: string, right: string) => {
    if (val < 35) return left;
    if (val > 65) return right;
    return "Syntetický střed";
  };

  return (
    <div className="w-full space-y-4">
      {state.dailyDate && (
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wider uppercase flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 animate-pulse text-slate-950" />
            Denní Výzva — Datum: <span className="font-mono bg-slate-950/20 px-1.5 py-0.5 rounded text-slate-950 font-black">{state.dailyDate}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-950/80">
            Seeded RNG aktivní
          </div>
        </div>
      )}
      {/* Top row primary metrics HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
        {/* Turn indicator */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-sans text-slate-500 uppercase tracking-widest font-bold">
              Postup Kampaně
            </div>
            <div className="text-2xl font-sans font-black text-slate-900 mt-0.5">
              Kolo <span className="text-red-650 font-black">{state.turn}</span> / 25
            </div>
            <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-50">
              <div
                className="h-full bg-red-620 transition-all duration-300"
                style={{ width: `${(state.turn / 25) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Voting share indicator */}
        <div className="bg-white border border-slate-155 rounded-2xl p-5 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-sans text-slate-500 uppercase tracking-widest font-bold">
              Volební Preference
            </div>
            <div className={`text-2xl font-sans mt-0.5 ${getPercentageColor(state.preference)}`}>
              {state.preference.toFixed(1)} %
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              Práh pro vstup do Sněmovny je 5.0 %
            </p>
          </div>
        </div>

        {/* Campaign budget indicator replaced with Preference change / Estimated influence */}
        {(() => {
          const gapE = Math.abs(state.atributy.ekonomika - state.spolecenskyKompas.ekonomika);
          const gapK = Math.abs(state.atributy.kultura - state.spolecenskyKompas.kultura);
          const gapEv = Math.abs(state.atributy.evropa - state.spolecenskyKompas.evropa);
          const gapS = Math.abs(state.atributy.stylPolitiky - state.spolecenskyKompas.stylPolitiky);
          const avgGap = (gapE + gapK + gapEv + gapS) / 4;

          const displayValue = state.lastTurnPrefChange !== undefined ? state.lastTurnPrefChange : 0.0;
          const displayLabel = state.lastTurnPrefChange !== undefined ? "Změna v minulém kole" : "Odhadovaný růst";

          return (
            <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center space-x-4 shadow-sm">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-sans text-slate-500 uppercase tracking-widest font-bold truncate">
                  {displayLabel}
                </div>
                <div className={`text-2xl font-sans font-black mt-0.5 ${
                  displayValue >= 0 ? "text-emerald-600" : "text-rose-650"
                }`}>
                  {displayValue >= 0 ? "+" : ""}{displayValue.toFixed(2)} %
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans mt-1">
                  <span>
                    {displayValue >= 0.5 
                      ? "Rychlý růst" 
                      : displayValue >= 0.1
                      ? "Mírný růst"
                      : displayValue > -0.1
                      ? "Stagnace"
                      : "Pokles (Odklon)"}
                  </span>
                  <span className="text-slate-400 font-mono font-medium">Prům. rozdíl: {avgGap.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Real-time Ideological Alignment Dashboard */}
      <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-5">
          <div className="space-y-0.5 text-left">
            <h3 className="text-xs uppercase font-sans text-slate-800 font-extrabold tracking-widest flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-red-500" />
              <span>Ideové zaměření strany v reálném čase</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-sans">
              Zde vidíte postavení Vaší strany vůči aktuálním náladám české společnosti
            </p>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-sans font-bold">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
              <span className="text-blue-600">My</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-black border border-white" />
              <span className="text-black">Společnost</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(() => {
            const axes = [
              {
                id: "ekonomika",
                label: "Hospodářství",
                leftText: "Levice",
                rightText: "Pravice",
                myVal: state.atributy.ekonomika,
                compVal: state.spolecenskyKompas.ekonomika,
                prevVal: state.prevSpolecenskyKompas?.ekonomika,
              },
              {
                id: "kultura",
                label: "Společnost",
                leftText: "Konzervativní",
                rightText: "Progresivní",
                myVal: state.atributy.kultura,
                compVal: state.spolecenskyKompas.kultura,
                prevVal: state.prevSpolecenskyKompas?.kultura,
              },
              {
                id: "evropa",
                label: "EU",
                leftText: "Euroskeptik",
                rightText: "Proevropský",
                myVal: state.atributy.evropa,
                compVal: state.spolecenskyKompas.evropa,
                prevVal: state.prevSpolecenskyKompas?.evropa,
              },
              {
                id: "styl",
                label: "Metody",
                leftText: "Konstruktivní",
                rightText: "Populismus",
                myVal: state.atributy.stylPolitiky,
                compVal: state.spolecenskyKompas.stylPolitiky,
                prevVal: state.prevSpolecenskyKompas?.stylPolitiky,
              },
            ];

            return axes.map((axis) => {
              const gap = Math.abs(axis.myVal - axis.compVal);
              const gapColorClass =
                gap <= 10
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100/70"
                  : gap <= 25
                  ? "bg-amber-50 text-amber-700 border-amber-100/70"
                  : "bg-rose-50 text-rose-700 border-rose-100/70";

              return (
                <div key={axis.id} className="bg-slate-50/50 p-4 border border-slate-150/45 rounded-2xl flex flex-col justify-between space-y-3.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-sans font-black text-slate-800 uppercase tracking-wider">{axis.label}</span>
                    <div className="flex items-center">
                      <span className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${gapColorClass}`}>
                        Rozdíl: {gap}%
                      </span>
                      {axis.prevVal !== undefined && (
                        (() => {
                          const delta = axis.compVal - axis.prevVal;
                          const formattedDelta = delta >= 0 ? `+${delta.toFixed(1)}` : `${delta.toFixed(1)}`;
                          let arrow = "→";
                          if (delta >= 0.5) arrow = "↑";
                          else if (delta <= -0.5) arrow = "↓";
                          return (
                            <span
                              className="inline-flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-200/50 rounded-md px-1 py-0.5 text-[9px] font-mono leading-none cursor-help ml-1 font-bold whitespace-nowrap"
                              title={`Společnost se v této oblasti minulé kolo posunula o ${formattedDelta} %`}
                            >
                              {arrow}
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <div className="flex justify-between text-[10px] text-slate-450 font-sans font-bold leading-none">
                      <span>{axis.leftText}</span>
                      <span>{axis.rightText}</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200/60 rounded-full relative my-2.5">
                      {/* Connecting Line Segment between My and Společnost */}
                      {(() => {
                        const start = Math.min(axis.myVal, axis.compVal);
                        const end = Math.max(axis.myVal, axis.compVal);
                        return (
                          <div
                            className="absolute h-full bg-slate-400 opacity-40 rounded-full"
                            style={{ left: `${start}%`, width: `${end - start}%` }}
                          />
                        );
                      })()}

                      {/* My Dot Indicator */}
                      <div
                        className="absolute w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm -top-[4px] -translate-x-1/2 transition-all duration-300 z-10"
                        title={`My: ${axis.myVal}%`}
                        style={{ left: `${axis.myVal}%` }}
                      />

                      {/* Společnost Dot Indicator */}
                      <div
                        className="absolute w-3.5 h-3.5 rounded-full bg-black border-2 border-white shadow-sm -top-[4px] -translate-x-1/2 transition-all duration-300 z-10"
                        title={`Společnost: ${axis.compVal}%`}
                        style={{ left: `${axis.compVal}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-semibold pt-1 border-t border-slate-100/60 leading-none">
                    <span>My: <strong className="text-blue-600">{axis.myVal}%</strong></span>
                    <span>Společnost: <strong className="text-black">{axis.compVal}%</strong></span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
