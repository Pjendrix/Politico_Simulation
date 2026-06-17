/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { STRANY } from "../data";
import { GameState } from "../types";
import { BarChart3, HelpCircle, Award, Landmark, Network } from "lucide-react";
import RelationsMap from "./RelationsMap";

interface PollingResultsProps {
  state: GameState;
  showDismissButton?: boolean;
  onDismiss?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
  buttonTextOverride?: string;
}

function PollingResults({
  state,
  showDismissButton = false,
  onDismiss,
  titleOverride,
  subtitleOverride,
  buttonTextOverride,
}: PollingResultsProps) {
  const [activeTab, setActiveTab] = useState<"preferences" | "relations">("preferences");

  // Collect preferences for all parties
  // The player's current preference is state.preference.
  // The NPC party preferences are stored in state.npcPreferred.
  const pollList = Object.values(STRANY).map((p) => {
    const isPlayer = p.id === state.stranaId;
    const preference = isPlayer ? state.preference : state.npcPreferred[p.id];
    return {
      ...p,
      preference,
      isPlayer,
    };
  });

  // Sort descending by preference score
  pollList.sort((a, b) => b.preference - a.preference);

  // Seat Calculation
  // 200 seats distributed proportionally among parties surpassing 5%
  const passingParties = pollList.filter((p) => p.preference >= 5.0);
  const totalPassingPref = passingParties.reduce((sum, p) => sum + p.preference, 0);

  let distributedSeatsCount = 0;
  const pollWithSeats = pollList.map((p) => {
    if (p.preference < 5.0) {
      return { ...p, seats: 0, perfectSeats: 0 };
    }
    // Proportional calculation
    const perfectSeats = (p.preference / totalPassingPref) * 200;
    const seats = Math.round(perfectSeats);
    distributedSeatsCount += seats;
    return { ...p, seats, perfectSeats };
  });

  // Adjust for rounding issues so it sums up exactly to 200 seats
  const difference = 200 - distributedSeatsCount;
  if (difference !== 0 && passingParties.length > 0) {
    // Distribute difference by sorting remainder
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

  // Calculate current coalition estimate (player + parties with sympathy >= 50 and seats > 0)
  const playerSeats = pollWithSeats.find((p) => p.isPlayer)?.seats || 0;
  const potentialPartners = pollWithSeats.filter(
    (p) => !p.isPlayer && state.trust[p.id] >= 50 && p.seats > 0
  );
  const potentialPartnerSeats = potentialPartners.reduce((sum, p) => sum + p.seats, 0);

  return (
    <div className="bg-white border border-slate-150 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
      {/* Poll Heading */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-red-650 font-sans text-[11px] uppercase tracking-widest font-extrabold">
            <BarChart3 className="w-4 h-4" />
            <span>Exkluzivní průzkum veřejného mínění</span>
          </div>
          <h2 className="text-xl font-sans text-slate-905 font-black tracking-tight mt-1 uppercase">
            {titleOverride || `Volební Průzkum — Kolo ${state.turn}`}
          </h2>
          <p className="text-xs text-slate-500 font-sans italic mt-1 max-w-xl">
            {subtitleOverride || "Zveřejněno nezávislou agenturou Kantar. Sněmovní bariéra je stanovena na 5.0 %."}
          </p>
        </div>

        {/* Quick Seats Stats Summary */}
        <div className="mt-3 sm:mt-0 text-right bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
          <div className="text-[10px] uppercase font-sans text-slate-500 flex items-center justify-end space-x-1 font-bold tracking-wider">
            <Landmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Odhadovaný zisk křesel</span>
          </div>
          <div className="text-xl font-sans font-bold text-amber-600 mt-0.5">
            {playerSeats} <span className="text-slate-500 text-xs font-medium">z 200 mandátů</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center border-b border-slate-100 pb-2">
        <div className="flex space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-150">
          <button
            onClick={() => setActiveTab("preferences")}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase font-sans tracking-wider transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "preferences"
                ? "bg-white text-slate-800 border border-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Politické preference</span>
          </button>
          
          <button
            onClick={() => setActiveTab("relations")}
            className={`px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase font-sans tracking-wider transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "relations"
                ? "bg-white text-slate-800 border border-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Kuloáry (Vztahy stran)</span>
          </button>
        </div>
      </div>

      {activeTab === "preferences" ? (
        <>
          {/* Main visual list */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 select-none">
            {pollWithSeats.map((p, index) => {
              const isPlayer = p.isPlayer;
              const isSaborLimitPassed = p.preference >= 5.0;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between sm:space-x-4 ${
                    isPlayer
                      ? "bg-amber-50/70 border-amber-400/90 shadow-sm"
                      : isSaborLimitPassed
                      ? "bg-slate-50/50 border-slate-110 hover:bg-slate-50"
                      : "bg-white border-slate-100 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center space-x-3 sm:w-1/4 shrink-0">
                    <span className="font-sans text-sm font-semibold text-slate-400 w-5 text-right">
                      {index + 1}.
                    </span>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.barva || "#7f8c8d" }}
                    />
                    <div className="flex flex-col">
                      <span className="font-sans text-sm uppercase font-extrabold text-slate-800 tracking-wide flex items-center">
                        {p.zkratka}
                        {isPlayer && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-amber-500 text-white rounded-md font-sans uppercase tracking-widest font-extrabold shrink-0">
                            VY
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans truncate w-28">
                        {p.lidr}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 my-2 sm:my-0 flex items-center space-x-3">
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-50">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${p.preference}%`,
                          backgroundColor: p.barva || "#7f8c8d",
                        }}
                      />
                      {/* 5% threshold indicator line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/80"
                        style={{ left: "5%" }}
                        title="Vstup-5%"
                      />
                    </div>
                    <span className="font-sans text-xs font-extrabold text-slate-705 w-12 text-right">
                      {p.preference.toFixed(1)} %
                    </span>
                  </div>

                  {/* Seats and barrier tag */}
                  <div className="sm:w-1/5 text-right flex items-center justify-between sm:justify-end space-x-3 border-t border-slate-100 sm:border-t-0 pt-2 sm:pt-0">
                    <span className="sm:hidden text-[10px] text-slate-400 uppercase font-sans font-bold">Mandáty</span>
                    <div className="flex items-center space-x-2">
                      {isSaborLimitPassed ? (
                        <span className="font-sans text-sm font-bold text-slate-800 bg-white border border-slate-205 px-2.5 py-0.5 rounded-lg shadow-sm">
                          {p.seats} křesel
                        </span>
                      ) : (
                        <span className="text-[9px] text-red-700 bg-red-50 border border-red-151 px-2.5 py-0.5 rounded-lg tracking-wider uppercase font-sans font-bold">
                          Pod bariérou
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coalition status alert */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div className="space-y-1">
              <h4 className="font-sans text-xs uppercase tracking-wider text-slate-700 font-extrabold flex items-center space-x-1.5">
                <Landmark className="w-4 h-4 text-amber-500" />
                <span>Odhad možnosti sestavení většinové koalice</span>
              </h4>
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Strany s kladným vztahem vůči vám (&ge; 50 % sympatie):{" "}
                {potentialPartners.length > 0 ? (
                  <span className="text-slate-800 uppercase font-sans font-extrabold">
                    {potentialPartners.map((p) => p.zkratka).join(", ")}
                  </span>
                ) : (
                  <span className="text-red-700 italic font-bold">Žádné spolehlivé formace</span>
                )}
              </p>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">Potenciální síla dohody</div>
              <div
                className={`text-lg font-sans font-black mt-0.5 ${
                  playerSeats + potentialPartnerSeats >= 101 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {playerSeats + potentialPartnerSeats} / 200 křesel
              </div>
            </div>
          </div>
        </>
      ) : (
        <RelationsMap state={state} />
      )}

      {showDismissButton && onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full py-4 bg-blue-800 hover:bg-blue-900 text-white font-sans text-sm uppercase tracking-widest font-bold rounded-xl shadow-md shadow-blue-100 transition-colors duration-150 cursor-pointer text-center"
        >
          {buttonTextOverride || "Rozumím a pokračovat v kampani \u2192"}
        </button>
      )}
    </div>
  );
}

export default React.memo(PollingResults);
