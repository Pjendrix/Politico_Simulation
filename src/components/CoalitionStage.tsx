/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { STRANY, PORADCI } from "../data";
import { GameState, Party, DiploAkce, DiploAkceTyp, CoalitionDetails } from "../types";
import { KOALICNI_PODMINKY, KoalicniPodminka } from "../koalicniPodminky";
import { calculatePartySeats } from "./ElectionsStage";
import { useRng } from "../rngContext";
import {
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  Phone,
  Gift,
  Zap,
  ArrowRight,
  Info,
  RefreshCw,
  HelpCircle,
  Shield,
  Activity,
  Award,
  Lock,
  Plus,
  AlertCircle
} from "lucide-react";

interface CoalitionStageProps {
  state: GameState;
  onFinishGame: (success: boolean, coalitionDetails: CoalitionDetails) => void;
}

type CoalitionPhase =
  | "prieskum"     // Fáze 1: přehled výsledků a postojů stran, žádné akce
  | "akce"         // Fáze 2: hráč provede max 2 diplomatické akce
  | "navrh"        // Fáze 2.5: odeslání koaličního návrhu (volba partnerů)
  | "hlasovani"    // Fáze 3: animované postupné odhalování výsledků
  | "vysledek";    // Fáze 4: koalice sestavena nebo ne

function CoalitionStage({ state, onFinishGame }: CoalitionStageProps) {
  const rng = useRng();
  const [phase, setPhase] = useState<CoalitionPhase>("prieskum");
  const [zbyleAkce, setZbyleAkce] = useState(() => 2 + (PORADCI[state.poradceId]?.effects?.extraDiploActions || 0));                        // 3 pro Koláře (Diplomat), jinak 2 akce celkem
  const [trustState, setTrustState] = useState<Record<string, number>>({ ...state.trust });
  const [atributyState, setAtributyState] = useState({ ...state.atributy });
  const [prijatePodminky, setPrijatePodminky] = useState<string[]>([]);  // ID přijatých podmínek
  const [provedeneAkce, setProvedeneAkce] = useState<DiploAkce[]>([]);
  const [posledniAkceInfo, setPosledniAkceInfo] = useState<Record<string, string>>({});  // Inline zpráva po akci
  const [revealIndex, setRevealIndex] = useState(0);                     // Pro animaci hlasování
  const [finalResults, setFinalResults] = useState<CoalitionDetails | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]); // Seznam ID vybraných koaličních partnerů

  // Voting stage pre-calculated outcome states
  const [rollsState, setRollsState] = useState<Record<string, { roll: number; success: boolean; chance: number; motive: string }>>({});

  const playerParty = STRANY[state.stranaId];

  // 1. Recreate the seat distribution among parties >= 5%
  const partyList = Object.values(STRANY).map((p) => {
    const isPlayer = p.id === state.stranaId;
    const preference = state.electionResults && state.electionResults[p.id] !== undefined
      ? state.electionResults[p.id]
      : (isPlayer ? state.preference : (state.npcPreferred[p.id] || 0));
    return { ...p, preference, isPlayer };
  });

  const electionResults: Record<string, number> = {};
  partyList.forEach((p) => {
    electionResults[p.id] = p.preference;
  });

  const seatMap = calculatePartySeats(electionResults, state.stranaId);

  const playerSeats = seatMap[state.stranaId] || 0;

  // Retrieve passing NPC partners (exclude player party and only those in parliament)
  const potentialPartnersInParliament = Object.values(STRANY)
    .filter((p) => p.id !== state.stranaId && (seatMap[p.id] || 0) > 0)
    .map((p) => {
      const seats = seatMap[p.id] || 0;
      return {
        ...p,
        seats,
      };
    });

  const getSympatie = (fromId: string, toId: string) => {
    if (fromId === toId) return 100;
    if (fromId === state.stranaId) {
      return trustState[toId] !== undefined ? trustState[toId] : 50;
    }
    if (toId === state.stranaId) {
      return trustState[fromId] !== undefined ? trustState[fromId] : 50;
    }
    const row = state.npcTrust[fromId];
    if (!row) return 50;
    const val = row[toId] as any;
    if (val === "x") return 100;
    return typeof val === "number" ? val : 50;
  };

  const getAtributy = (partyId: string) => {
    if (partyId === state.stranaId) {
      return atributyState;
    }
    return state.npcAtributy[partyId] || { ekonomika: 50, kultura: 50, evropa: 50, stylPolitiky: 50 };
  };

  // 2. Coalition Chance Calculation function
  const calculateFinalChance = (partnerId: string): number => {
    // Schopnost Václava Klause a dalších: nucené přijetí nebo odmítnutí
    const advisor = PORADCI[state.poradceId];
    if (advisor?.effects?.coalitionForcedReject?.includes(partnerId)) {
      return 0;
    }
    if (advisor?.effects?.coalitionForcedAccept?.includes(partnerId)) {
      return 100;
    }

    const trust = trustState[partnerId] ?? 50;
    if (trust <= 30) return 0;

    const hracAtributy = atributyState;
    const partnerAtributy = state.npcAtributy[partnerId] || { ekonomika: 50, kultura: 50, evropa: 50, stylPolitiky: 50 };

    const diffs = {
      ekonomika: Math.abs(hracAtributy.ekonomika - partnerAtributy.ekonomika),
      kultura: Math.abs(hracAtributy.kultura - partnerAtributy.kultura),
      evropa: Math.abs(hracAtributy.evropa - partnerAtributy.evropa),
      stylPolitiky: Math.abs(hracAtributy.stylPolitiky - partnerAtributy.stylPolitiky),
    };
    const maxDiff = Math.max(...Object.values(diffs));
    const avgDiff = Object.values(diffs).reduce((a, b) => a + b, 0) / 4;

    if (maxDiff > 50 || avgDiff > 30) return 0;

    const metricScore = 100 - avgDiff * 2;
    return Math.round(metricScore * 0.5 + trust * 0.5);
  };

  const getVetoReasons = (partnerId: string): string[] => {
    const reasons: string[] = [];
    const advisor = PORADCI[state.poradceId];
    if (advisor?.effects?.coalitionForcedReject?.includes(partnerId)) {
      reasons.push(advisor.jmeno);
    }

    const trust = trustState[partnerId] ?? 50;
    if (trust <= 30) {
      reasons.push("Vzájemný Trust");
    }

    const hracAtributy = atributyState;
    const partnerAtributy = state.npcAtributy[partnerId] || { ekonomika: 50, kultura: 50, evropa: 50, stylPolitiky: 50 };

    const diffs = {
      ekonomika: Math.abs(hracAtributy.ekonomika - partnerAtributy.ekonomika),
      kultura: Math.abs(hracAtributy.kultura - partnerAtributy.kultura),
      evropa: Math.abs(hracAtributy.evropa - partnerAtributy.evropa),
      stylPolitiky: Math.abs(hracAtributy.stylPolitiky - partnerAtributy.stylPolitiky),
    };

    if (diffs.ekonomika > 50) reasons.push("Názorový rozdíl u Ekonomiky");
    if (diffs.kultura > 50) reasons.push("Názorový rozdíl u Kultury");
    if (diffs.evropa > 50) reasons.push("Názorový rozdíl u EU");
    if (diffs.stylPolitiky > 50) reasons.push("Názorový rozdíl u Stylu politiky");

    const avgDiff = (diffs.ekonomika + diffs.kultura + diffs.evropa + diffs.stylPolitiky) / 4;
    if (avgDiff > 30) {
      reasons.push("Moc velký rozdíl napříč tématy");
    }

    if (reasons.length === 0) {
      reasons.push("Veto");
    }

    return reasons;
  };

  // Logic for performing a diplomatic action
  const provedeAkci = (typ: DiploAkceTyp, targetId: string, podminka?: KoalicniPodminka) => {
    if (zbyleAkce <= 0) return;

    const newTrust = { ...trustState };
    let zprava = "";
    let vysledek: DiploAkce["vysledek"] = undefined;

    if (typ === "kontakt") {
      const roll = rng();
      const bonus = roll < 0.80 ? 10 : 5;
      newTrust[targetId] = Math.min(100, (newTrust[targetId] || 50) + bonus);
      zprava = bonus === 10
        ? `✅ Kontakt úspěšný — +${bonus} trust`
        : `🟡 Kontakt chladný — +${bonus} trust`;
      vysledek = bonus === 10 ? "uspech" : "castecny";
    }

    if (typ === "podminka" && podminka) {
      if (prijatePodminky.includes(podminka.id)) return;
      newTrust[targetId] = Math.min(100, (newTrust[targetId] || 50) + podminka.trustBonus);
      if (podminka.penaltyTargets) {
        podminka.penaltyTargets.forEach(pid => {
          if (newTrust[pid] !== undefined) {
            newTrust[pid] = Math.max(0, newTrust[pid] - 20);
          }
        });
      }
      if (podminka.atributDrift) {
        setAtributyState(prev => ({
          ekonomika: Math.min(100, Math.max(0, prev.ekonomika + (podminka.atributDrift?.ekonomika || 0))),
          kultura: Math.min(100, Math.max(0, prev.kultura + (podminka.atributDrift?.kultura || 0))),
          evropa: Math.min(100, Math.max(0, prev.evropa + (podminka.atributDrift?.evropa || 0))),
          stylPolitiky: Math.min(100, Math.max(0, prev.stylPolitiky + (podminka.atributDrift?.stylPolitiky || 0))),
        }));
      }
      setPrijatePodminky(prev => [...prev, podminka.id]);
      zprava = `📄 Podmínka přijata — +${podminka.trustBonus} trust`;
    }

    if (typ === "zakulisni") {
      const roll = rng();
      if (roll < 0.40) {
        newTrust[targetId] = Math.min(100, (newTrust[targetId] || 50) + 20);
        zprava = `✅ Zákulisní dohoda uspěla — +20 trust`;
        vysledek = "uspech";
      } else if (roll < 0.80) {
        newTrust[targetId] = Math.min(100, (newTrust[targetId] || 50) + 10);
        zprava = `🟡 Částečná dohoda — +10 trust`;
        vysledek = "castecny";
      } else {
        newTrust[targetId] = Math.max(0, (newTrust[targetId] || 50) - 15);
        zprava = `❌ Dohoda praskla — −15 trust`;
        vysledek = "neuspech";
      }
    }

    if (typ === "poslat_turka") {
      newTrust[targetId] = 0;
      zprava = `🏎️ Poslal jsi vyjednávat Turka — Sympatie klesly na 0!`;
      vysledek = "neuspech";
    }

    setTrustState(newTrust);
    setZbyleAkce(prev => prev - 1);
    setProvedeneAkce(prev => [...prev, { typ, targetId, podminka: podminka?.id, vysledek }]);
    setPosledniAkceInfo(prev => ({ ...prev, [targetId]: zprava }));
  };

  // Pre-calculate rolls and start the automated voting sequence
  const startVoting = () => {
    const rolls: Record<string, { roll: number; success: boolean; chance: number; motive: string }> = {};

    potentialPartnersInParliament.forEach((p) => {
      const isInvited = selectedPartners.includes(p.id);
      if (!isInvited) {
        rolls[p.id] = {
          roll: 0,
          success: false,
          chance: 0,
          motive: `Tato strana nebyla přizvána k vládnímu návrhu koalice. Jako opoziční formace nepodpoří vaše vládní prohlášení.`
        };
      } else {
        const chance = calculateFinalChance(p.id);
        let roll = Math.floor(rng() * 101);
        const rollBonus = PORADCI[state.poradceId]?.effects?.coalitionRollBonusPct ?? 0;
        if (rollBonus !== 0) {
          roll = Math.max(0, Math.round(roll * (1 + rollBonus / 100)));
        }
        const success = roll <= chance;
        let motive = "";

        if (chance <= 0) {
          motive = `Poslanecký klub strany ${p.zkratka} rezolutně odmítl jakoukoliv spolupráci z důvodu vážné názorové propasti nebo vetování důvěry.`;
        } else if (success) {
          motive = `Poslanecký klub ${p.zkratka} po intenzivním interním hlasování schválil podporu vládního prohlášení a vstupuje do vládní aliance.`;
        } else {
          motive = `Klub ${p.zkratka} po bouřlivé noční debatě nakonec podepsání koaliční smlouvy odmítl (chyběla shoda či záruky).`;
        }

        rolls[p.id] = { roll, success, chance, motive };
      }
    });

    setRollsState(rolls);
    setRevealIndex(0);
    setPhase("hlasovani");
  };

  // Voting automated progressive reveal interval handler
  useEffect(() => {
    if (phase !== "hlasovani") return;

    if (revealIndex < potentialPartnersInParliament.length) {
      const timer = setTimeout(() => {
        setRevealIndex((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, revealIndex, potentialPartnersInParliament.length]);

  // Compute live accepted seats for transition
  const getAcceptedSeatsSum = (limitIdx: number) => {
    let sum = playerSeats;
    potentialPartnersInParliament.forEach((p, idx) => {
      if (idx < limitIdx) {
        const r = rollsState[p.id];
        if (r && r.success) {
          sum += p.seats;
        }
      }
    });
    return sum;
  };

  const liveAcceptedSeatsSum = getAcceptedSeatsSum(revealIndex);
  const fullRevealedSeatsSum = getAcceptedSeatsSum(potentialPartnersInParliament.length);

  // Finalize stats and shift to results overview
  const handleGoToResultPhase = () => {
    const acceptedIds = potentialPartnersInParliament
      .filter((p) => rollsState[p.id]?.success)
      .map((p) => p.id);

    const rejectCount = potentialPartnersInParliament
      .filter((p) => selectedPartners.includes(p.id) && !rollsState[p.id]?.success)
      .length;

    const results: CoalitionDetails = {
      playerSeats,
      invitedPartyIds: selectedPartners,
      acceptedPartyIds: acceptedIds,
      totalSeats: fullRevealedSeatsSum,
      rolls: rollsState,
      parliamentSeats: seatMap,
      prijatePodminky,
      atributyPoVyjednavani: {
        ekonomika: atributyState.ekonomika,
        kultura: atributyState.kultura,
        evropa: atributyState.evropa,
        stylPolitiky: atributyState.stylPolitiky
      },
      pouziteAkceCount: provedeneAkce.length,
      provedeneAkce: provedeneAkce,
      rejectCount
    };

    setFinalResults(results);
    setPhase("vysledek");
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in text-slate-800">
      
      {/* HEADER BAR FOR COALITION PROCESSES */}
      <div className="bg-white border border-slate-150 rounded-[32px] p-6.5 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-4.5 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm shrink-0">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 block">Po-volební vyjednávání</span>
            <h2 className="text-xl sm:text-2xl font-sans font-black tracking-tight text-slate-900 uppercase">
              {phase === "prieskum" && "Volební průzkum & Postoje"}
              {phase === "akce" && "Diplomatická jednání"}
              {phase === "navrh" && "Koaliční návrh"}
              {phase === "hlasovani" && "Hlasování o důvěře"}
              {phase === "vysledek" && "Koaliční rozuzlení"}
            </h2>
          </div>
        </div>

        {/* Mandáty vaší strany Widget */}
        <div className="flex items-center space-x-3 bg-slate-50 border border-dashed border-slate-200 rounded-[20px] p-2.5 px-4.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Award className="w-5 h-5 pointer-events-none" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block leading-tight mb-0.5 select-none">
              Mandáty vaší strany ({playerParty.zkratka})
            </span>
            <div className="text-xl font-mono font-black text-slate-900 leading-none select-none">
              {playerSeats} <span className="text-xs font-sans text-slate-400 font-normal">/ 200</span>
            </div>
          </div>
        </div>

        {/* Navigation Indicator Status Pill */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5">
          <span className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase font-bold transition-all ${phase === 'prieskum' ? 'bg-blue-800 text-white shadow' : 'text-slate-450'}`}>Průzkum</span>
          <span className="text-slate-300 font-mono text-[10px]">&rarr;</span>
          <span className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase font-bold transition-all ${phase === 'akce' ? 'bg-blue-800 text-white shadow' : 'text-slate-450'}`}>Diplomacie</span>
          <span className="text-slate-300 font-mono text-[10px]">&rarr;</span>
          <span className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase font-bold transition-all ${phase === 'navrh' ? 'bg-blue-800 text-white shadow' : 'text-slate-450'}`}>Návrh</span>
          <span className="text-slate-300 font-mono text-[10px]">&rarr;</span>
          <span className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase font-bold transition-all ${phase === 'hlasovani' ? 'bg-blue-800 text-white shadow' : 'text-slate-450'}`}>Hlasování</span>
          <span className="text-slate-300 font-mono text-[10px]">&rarr;</span>
          <span className={`px-2.5 py-1.5 rounded-xl text-[10px] uppercase font-bold transition-all ${phase === 'vysledek' ? 'bg-blue-800 text-white shadow' : 'text-slate-450'}`}>Konec</span>
        </div>
      </div>

      {/* PHASE 1: PRŮZKUM (phase === "prieskum") */}
      {phase === "prieskum" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Seat details overview chart box */}
          <div className="bg-white border border-slate-150 p-6 sm:p-8 rounded-[32px] space-y-6 shadow-sm">
            <h3 className="font-sans text-base text-slate-900 font-bold border-l-4 border-amber-500 pl-3 uppercase tracking-tight">
              Složení Poslanecké sněmovny Parlamentu ČR
            </h3>

            {/* Simulated hemicircle visual seat blocks bar */}
            <div className="space-y-2">
              <div className="flex bg-slate-100 rounded-2xl overflow-hidden h-7 border border-slate-200">
                {partyList
                  .filter((p) => (seatMap[p.id] || 0) > 0)
                  .map((p) => {
                    const pct = ((seatMap[p.id] || 0) / 200) * 100;
                    return (
                      <div
                        key={p.id}
                        style={{ width: `${pct}%`, backgroundColor: p.barva || "#ccc" }}
                        className="h-full flex items-center justify-center text-[10px] font-sans font-black text-white hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden px-1 pointer-events-none"
                        title={`${p.nazev}: ${seatMap[p.id]} křesel (${pct.toFixed(1)}%)`}
                      >
                        {p.zkratka}
                      </div>
                    );
                  })}
              </div>
              <div className="flex justify-between items-center text-[10.5px] text-slate-400 font-sans tracking-tight font-medium">
                <span>0 křesel</span>
                <span className="text-red-500 font-bold">101 křesel (vládní většina)</span>
                <span>200 křesel</span>
              </div>
            </div>

            {/* List breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-2">
              {partyList
                .filter((p) => (seatMap[p.id] || 0) > 0)
                .map((p) => {
                  const seats = seatMap[p.id] || 0;
                  const pct = (seats / 200) * 100;
                  const isPlayer = p.id === state.stranaId;

                  return (
                    <div
                      key={p.id}
                      className={`p-4 bg-slate-50 border rounded-2xl flex flex-col justify-between text-center space-y-2 ${
                        isPlayer ? "bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/10" : "border-slate-150"
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.barva }} />
                        <span className="font-sans font-black uppercase text-xs text-slate-800">{p.zkratka}</span>
                      </div>
                      <div>
                        <div className="text-xl font-mono font-black text-slate-900 leading-none">{seats}</div>
                        <span className="text-[10px] text-slate-450 uppercase font-sans font-bold">poslanců ({pct.toFixed(0)}%)</span>
                      </div>
                      {isPlayer ? (
                        <span className="text-[8.5px] uppercase font-sans font-black text-indigo-700 bg-indigo-100 border border-indigo-200 py-0.5 rounded-md inline-block">Hráč</span>
                      ) : (
                        <div className="text-[9.5px] text-slate-500 font-sans truncate font-medium">{p.lidr}</div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Core Postoje & Sympathy Matice */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6.5">
            {/* Attitude List Block */}
            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-[32px] p-6 sm:p-8 space-y-5 shadow-sm">
              <h3 className="font-sans text-base text-slate-900 font-bold border-l-4 border-amber-500 pl-3 uppercase tracking-tight">
                Vztah parlamentních klubů k naší straně
              </h3>

              <div className="space-y-3">
                {potentialPartnersInParliament.map((p) => {
                  const trustVal = trustState[p.id] ?? 50;
                  const finalChance = calculateFinalChance(p.id);

                  // MOOD badge
                  let label = "Váhavá";
                  let bgBorderCls = "bg-yellow-50 border-yellow-200 text-yellow-800";
                  let tagDot = "bg-yellow-500";
                  if (trustVal >= 65) {
                    label = "Vstřícná";
                    bgBorderCls = "bg-emerald-50 border-emerald-200 text-emerald-800";
                    tagDot = "bg-emerald-500";
                  } else if (trustVal < 35) {
                    label = "Odmítavá";
                    bgBorderCls = "bg-rose-50 border-rose-200 text-rose-850";
                    tagDot = "bg-rose-500";
                  }

                  return (
                    <div
                      key={p.id}
                      className="p-4.5 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3.5 text-center sm:text-left">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.barva }} />
                        <div>
                          <h4 className="font-sans font-black uppercase text-xs text-slate-800">
                            {p.zkratka} ({p.lidr})
                          </h4>
                          <p className="text-[11px] text-slate-450 uppercase tracking-tight font-sans font-bold mt-0.5">
                            Křesla ve sněmovně: <strong className="text-slate-800">{p.seats} mandátů</strong>
                          </p>
                        </div>
                      </div>

                      {/* Display Mood and compatibility stats */}
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {/* mood badge */}
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10.5px] uppercase font-bold rounded-lg border ${bgBorderCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tagDot} mr-1.5 shrink-0`} />
                          {label} ({trustVal} % Trust)
                        </span>

                        {/* compatibility percentage */}
                        <div className="bg-white border border-slate-200 p-1.5 px-3 rounded-lg text-center shrink-0">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Šance na podporu</span>
                          <span className={`font-mono font-black text-xs ${finalChance > 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                            {finalChance > 0 ? `${finalChance} %` : "Veto 🛑"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sympathy Matrix & Explanation */}
            <div className="bg-white border border-slate-150 rounded-[32px] p-6 sm:p-8 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-sans text-sm uppercase text-slate-500 font-extrabold tracking-wider border-b border-slate-150 pb-2">
                  Rozbor diplomatického pole
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                  Sněmovna sestává ze stran, které mají odlišné prioritní pohledy a vlastní ideové linie. 
                  Pokud má klesnout důvěra jedné formace, může naopak posílit druhou.
                </p>
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <span className="inline-flex items-center text-[10px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                    <Sparkles className="w-3 h-3 mr-1" /> Pravidla vyjednávání
                  </span>
                  <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
                    Máte k dispozici přesně <strong>{state.poradceId === "diplomat" ? 3 : 2} diplomatické akce</strong> celkem. Můžete je rozdělit libovolně. 
                    Můžete kontaktovat poslance, přijmout programové požadavky nebo započít zákulisní tajné vyjednávání.
                  </p>
                </div>
              </div>

              {/* Start vyjednavani redirect handle */}
              <div className="pt-4">
                <button
                  onClick={() => setPhase("akce")}
                  className="w-full py-3.5 bg-blue-800 hover:bg-blue-900 border border-blue-800 text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl transition-all shadow shadow-blue-100 flex items-center justify-center space-x-2.5 cursor-pointer"
                >
                  <span>Zahájit vyjednávání</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PHASE 2: AKCE (phase === "akce") */}
      {phase === "akce" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6.5 animate-fade-in">
          
          {/* Main Action Panels Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header / counter control panel info */}
            <div className="bg-slate-900 text-white rounded-[32px] p-6.5 sm:p-8 flex items-center justify-between shadow-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 opacity-40" />
              
              <div className="relative z-10 space-y-1.5">
                <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-500/25 border border-amber-500/10 text-amber-300 rounded font-sans text-[9px] uppercase font-black tracking-widest leading-none">
                  Fáze diplomatických zásahů
                </span>
                <p className="text-slate-400 text-[11px] font-medium max-w-sm sm:max-w-md hidden sm:block">
                  Vyberte parlamentní unii a využijte akce pro posílení sympatií nebo vyhlazení ideologických třecích ploch.
                </p>
              </div>

              <div className="relative z-10 shrink-0 text-center bg-slate-800 border border-slate-700/80 p-3 sm:p-4 rounded-2xl">
                <div className="text-[9px] uppercase font-sans text-slate-400 tracking-wider font-extrabold leading-tight">Zbývá akcí</div>
                <div className="text-2xl sm:text-3.5xl font-mono font-black text-amber-400">{zbyleAkce}</div>
              </div>
            </div>

            {/* List of parliamentary parties as interactive items */}
            <div className="space-y-5">
              {potentialPartnersInParliament.map((p) => {
                const trustVal = trustState[p.id] ?? 50;
                const finalChance = calculateFinalChance(p.id);
                const inlineMsg = posledniAkceInfo[p.id];

                // Retrieve conditions for this specific party
                const activeConditionsObj = KOALICNI_PODMINKY.find((o) => o.partyId === p.id);
                const conditionsList = activeConditionsObj ? activeConditionsObj.podminky : [];

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-150 rounded-[32px] p-6 sm:p-8 space-y-5 shadow-xs"
                  >
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center space-x-3 text-center sm:text-left">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: p.barva }} />
                        <div>
                          <h3 className="font-sans font-black uppercase text-sm text-slate-800">
                            {p.zkratka} ({p.lidr})
                          </h3>
                          <p className="text-[11px] text-slate-450 uppercase tracking-tight font-bold mt-0.5">
                            {p.nazev} — <strong className="text-slate-800">{p.seats} mandátů</strong>
                          </p>
                        </div>
                      </div>

                      {/* Display direct trust bar indicator */}
                      <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0 justify-center">
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-sans tracking-wide uppercase font-extrabold leading-none block">Vztah k vám</span>
                          <span className="font-mono font-black text-xs text-slate-800">{trustVal} / 100</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              trustVal >= 65 ? "bg-emerald-500" : trustVal < 35 ? "bg-red-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${trustVal}%` }}
                          />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded p-1 text-center shrink-0">
                          <span className="text-[8px] uppercase font-extrabold text-slate-400 block leading-tight">Šance</span>
                          <strong className={`font-mono text-xs ${finalChance > 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                            {finalChance > 0 ? `${finalChance}%` : "Veto 🛑"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Conditions box list */}
                    {conditionsList.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Programové požadavky strany:</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {conditionsList.map((cond) => {
                            const isAccepted = prijatePodminky.includes(cond.id);
                            return (
                              <button
                                key={cond.id}
                                disabled={isAccepted || zbyleAkce <= 0}
                                onClick={() => provedeAkci("podminka", p.id, cond)}
                                className={`text-left p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                                  isAccepted
                                    ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-100/40"
                                    : zbyleAkce <= 0
                                    ? "bg-slate-50 border-slate-150/70 opacity-60 cursor-not-allowed"
                                    : "bg-white border-slate-180 hover:bg-slate-50/50 hover:border-slate-350 cursor-pointer"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-serif font-black italic text-slate-900 leading-snug">„{cond.text}“</span>
                                    <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase shrink-0 ${
                                      isAccepted ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-650"
                                    }`}>
                                      {isAccepted ? "Přijato" : `+${cond.trustBonus} Trust`}
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed mt-1">{cond.popis}</p>
                                </div>

                                {cond.penaltyTargets && cond.penaltyTargets.length > 0 && (
                                  <div className="mt-3.5 pt-1.5 border-t border-slate-100 text-[9px] text-red-650 font-bold flex items-center flex-wrap gap-1">
                                    <span>⚠️ Sníží trust o 20 u:</span>
                                    <span className="uppercase text-[8.5px] bg-red-50 border border-red-100 font-extrabold px-1 py-0.2 rounded">
                                      {cond.penaltyTargets.map(pid => STRANY[pid]?.zkratka || pid).join(", ")}
                                    </span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom row button list for contacts */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                      <div className="flex items-center space-x-1.5">
                        <button
                          disabled={zbyleAkce <= 0}
                          onClick={() => provedeAkci("kontakt", p.id)}
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-sans text-xs uppercase font-extrabold rounded-xl transition-all shadow-xs disabled:opacity-45 cursor-pointer flex items-center space-x-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Přímý kontakt</span>
                        </button>

                        <button
                          disabled={zbyleAkce <= 0}
                          onClick={() => provedeAkci("zakulisni", p.id)}
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-sans text-xs uppercase font-extrabold rounded-xl transition-all shadow-xs disabled:opacity-45 cursor-pointer flex items-center space-x-1.5"
                        >
                          <Zap className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Zákulisní dohoda</span>
                        </button>

                        {PORADCI[state.poradceId]?.effects?.canSendTurek && (
                          <button
                            disabled={zbyleAkce <= 0}
                            onClick={() => provedeAkci("poslat_turka", p.id)}
                            className="px-3.5 py-2.5 bg-red-50 border border-red-250 hover:bg-red-100 text-red-700 font-sans text-xs uppercase font-extrabold rounded-xl transition-all shadow-xs disabled:opacity-45 cursor-pointer flex items-center space-x-1.5"
                          >
                            <span>🏎️</span>
                            <span>Poslat Turka</span>
                          </button>
                        )}
                      </div>

                      {/* Display veto reason or interactive report msg */}
                      <div className="flex flex-col items-center sm:items-end gap-1.5">
                        {finalChance === 0 && (
                          <div className="flex flex-wrap gap-1 justify-center sm:justify-end max-w-full sm:max-w-[340px] md:max-w-[480px]">
                            {getVetoReasons(p.id).map((reason, rIdx) => (
                              <span 
                                key={rIdx} 
                                className="text-[8.5px] font-sans font-extrabold bg-rose-50 border border-rose-150 text-rose-700 py-1 px-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-2xs leading-none shrink-0"
                              >
                                <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-600" />
                                <span>{reason}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {inlineMsg && (
                          <span className="text-[11px] font-sans font-bold bg-indigo-50 text-indigo-800 border border-indigo-150 p-2.5 px-4 rounded-xl leading-none animate-bounce">
                            {inlineMsg}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

          {/* Sidebar block column */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="font-sans text-base text-slate-900 font-bold border-l-4 border-indigo-500 pl-3 uppercase tracking-tight">
              Státní správa &amp; Podmínky
            </h3>

            {/* General state constraints attributes */}
            <div className="bg-white border border-slate-150 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs">
              <h4 className="font-sans text-xs uppercase font-extrabold text-indigo-900 tracking-wide flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Activity className="w-4 h-4 text-indigo-650" />
                <span>Atributy vaší strany</span>
              </h4>

              <div className="space-y-3.5 text-xs font-sans">
                {/* ekonomika */}
                <div>
                  <div className="flex justify-between mb-1 font-semibold text-slate-650">
                    <span>Ekonomika (Levice vs Pravice)</span>
                    <span className="font-mono">{atributyState.ekonomika} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-[width] duration-300" style={{ width: `${atributyState.ekonomika}%` }} />
                  </div>
                </div>

                {/* kultura */}
                <div>
                  <div className="flex justify-between mb-1 font-semibold text-slate-650">
                    <span>Kultura (Konzervativní vs Liberální)</span>
                    <span className="font-mono">{atributyState.kultura} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-[width] duration-300" style={{ width: `${Math.min(100, atributyState.kultura)}%` }} />
                  </div>
                </div>

                {/* evropa */}
                <div>
                  <div className="flex justify-between mb-1 font-semibold text-slate-650">
                    <span>Evropský kurz (Euroskeptický vs Pro-EU)</span>
                    <span className="font-mono">{atributyState.evropa} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-[width] duration-300" style={{ width: `${atributyState.evropa}%` }} />
                  </div>
                </div>

                {/* stylPolitiky */}
                <div>
                  <div className="flex justify-between mb-1 font-semibold text-slate-650">
                    <span>Styl politiky (Konstruktivní vs Populistický)</span>
                    <span className="font-mono">{atributyState.stylPolitiky} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-[width] duration-300" style={{ width: `${atributyState.stylPolitiky}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Diplomacie & Info Box */}
            <div className="bg-white border border-slate-150 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs animate-fade-in">
              <h4 className="font-sans text-xs uppercase font-extrabold text-slate-850 tracking-wide flex items-center space-x-2 border-b border-slate-100 pb-2">
                <HelpCircle className="w-4 h-4 text-indigo-650" />
                <span>Průvodce vyjednáváním</span>
              </h4>
              
              <div className="space-y-3 px-0.5 text-[11px] font-sans text-slate-600 leading-relaxed font-semibold">
                <div className="flex items-start space-x-2.5">
                  <Phone className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-850 font-bold">Přímý kontakt:</strong> Zvýší trust se stranou o <span className="text-indigo-700 font-extrabold">+10</span> (80% šance) nebo o <span className="text-indigo-500 font-extrabold">+5</span> (20% šance při chladném přijetí). Bezpečný způsob budování sympatií.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 border-t border-slate-100 pt-2.5">
                  <Zap className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-850 font-bold">Zákulisní dohoda:</strong> Vysoce riskantní pakt. Má <span className="text-emerald-700 font-extrabold">40% šanci</span> na plný úspěch (<span className="text-emerald-700 font-extrabold">+20 trust</span>) and <span className="text-amber-700 font-extrabold">40% šanci</span> na částečný pakt (<span className="text-amber-700 font-extrabold">+10 trust</span>), ale ve <span className="text-rose-700 font-extrabold">20% případů</span> praskne, což vyvolá propad o <span className="text-rose-700 font-extrabold">−15 trustu</span>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 border-t border-slate-150 pt-3 bg-red-50/50 p-2.5 rounded-2.5xl border border-red-100/50">
                  <XCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-red-950 font-extrabold block mb-0.5">Kdy nastane koaliční VETO?</strong>
                    Šance na schválení koalice klesne na <span className="text-red-700 font-black">0 % (Veto) 🛑</span>, pokud:
                    <ul className="list-disc list-inside space-y-1 mt-1 text-[10px] font-bold text-red-900/90 pl-1">
                      <li>Vzájemný trust (sympatie) se stranou klesne na <span className="text-red-700 font-extrabold">30 % nebo méně</span>.</li>
                      <li>Názorový rozdíl v kterémkoli ze 4 programových témat přesáhne <span className="text-red-700 font-extrabold">50 %</span>.</li>
                      <li>Průměrný názorový rozdíl napříč všemi 4 tématy přesáhne <span className="text-red-700 font-extrabold">30 %</span>.</li>
                      <li>Vaším poradcem je <span className="text-red-700 font-extrabold">Václav Klaus</span> a pokoušíte se vyjednávat partnerství s <span className="text-red-700 font-extrabold">ODS</span>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Signed Conditions List Box */}
            <div className="bg-white border border-slate-150 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs">
              <h4 className="font-sans text-xs uppercase font-extrabold text-slate-850 tracking-wide">
                Přijatá ujednání ({prijatePodminky.length})
              </h4>

              {prijatePodminky.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Zatím jste nepřijali žádné programové podmínky vládních partnerů.
                </p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {prijatePodminky.map((pid) => {
                    let match: KoalicniPodminka | null = null;
                    let shortcut = "";
                    let barva = "#ccc";

                    for (const prof of KOALICNI_PODMINKY) {
                      const tgt = prof.podminky.find((c) => c.id === pid);
                      if (tgt) {
                        match = tgt;
                        shortcut = STRANY[prof.partyId]?.zkratka || "";
                        barva = STRANY[prof.partyId]?.barva || "#ccc";
                        break;
                      }
                    }

                    if (!match) return null;

                    return (
                      <div key={pid} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif italic font-black text-slate-900 truncate">„{match.text}“</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] text-white font-extrabold leading-none" style={{ backgroundColor: barva }}>
                            {shortcut}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal font-semibold">{match.popis}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History logs card */}
            <div className="bg-white border border-slate-150 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs">
              <h4 className="font-sans text-xs uppercase font-extrabold text-slate-450 tracking-wider">
                Diplomatická kronika ({provedeneAkce.length})
              </h4>

              {provedeneAkce.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">Ticho. Dosud nepadla žádná diplomatická ohlášení.</p>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto font-sans text-[11px] leading-relaxed">
                  {provedeneAkce.map((ak, idx) => {
                    const party = STRANY[ak.targetId];
                    return (
                      <div key={idx} className="flex items-center space-x-1.5 text-slate-550 border-b border-slate-100 pb-1 shrink-0">
                        <span className="text-emerald-500 text-[10px]">●</span>
                        <span>
                          {ak.typ === "kontakt" && `📞 Kontakt s ${party.zkratka} (${ak.vysledek === 'uspech' ? 'úspěch' : 'částečný'})`}
                          {ak.typ === "podminka" && `🤝 Podmínka od ${party.zkratka}`}
                          {ak.typ === "poslat_turka" && `🏎️ Vyjednávání Filipa Turka s ${party.zkratka} (Snížení sympatií na 0 %!)`}
                          {ak.typ === "zakulisni" && (
                            <span>
                              🤫 Zákulisní pakt s {party.zkratka} —{" "}
                              <strong className={ak.vysledek === "uspech" ? "text-emerald-700" : ak.vysledek === "castecny" ? "text-amber-800" : "text-rose-800"}>
                                {ak.vysledek === "uspech" ? "Úspěch" : ak.vysledek === "castecny" ? "Částečná dohoda" : "Prasklo to"}
                              </strong>
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action transition redirect handle block */}
            <div className="pt-3">
              <button
                onClick={() => setPhase("navrh")}
                className="w-full py-4 bg-blue-800 hover:bg-blue-900 border border-blue-800 text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl transition-all shadow shadow-blue-100 flex items-center justify-center space-x-2 px-4 cursor-pointer"
              >
                <span>Sestavit koaliční návrh</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* PHASE 2.5: NÁVRH (phase === "navrh") */}
      {phase === "navrh" && (
        <div className="space-y-6 animate-fade-in animate-[fade-in_0.4s_ease-out]">
          
          {/* Main overview banner with dynamic stats */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6.5 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 opacity-40" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-500/25 border border-amber-500/10 text-amber-300 rounded font-sans text-[9px] uppercase font-black tracking-widest leading-none">
                  Sestavení koaličního návrhu
                </span>
                <h3 className="text-xl sm:text-2xl font-sans font-black uppercase text-white tracking-tight">
                  Oficiální složení vládního bloku
                </h3>
                <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                  Zvolte formace, se kterými si přejete vytvořit parlamentní koalici. 
                  Ostatní nezvolené strany se stanou tvrdou opozicí a v nadcházejícím hlasování o důvěře budou hlasovat automaticky PROTI kabinetu.
                </p>
              </div>

              {/* Dynamic cumulative stats */}
              <div className="shrink-0 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl text-center space-y-1.5 md:w-56">
                <span className="text-[9px] uppercase font-sans text-slate-400 tracking-wider font-extrabold leading-tight block">
                  Síla navrženého bloku
                </span>
                <div className="text-3xl font-mono font-black text-amber-400">
                  {playerSeats + potentialPartnersInParliament.filter(p => selectedPartners.includes(p.id)).reduce((sum, p) => sum + p.seats, 0)}
                  <span className="text-sm font-sans text-slate-400 font-normal"> / 200 mandátů</span>
                </div>
                
                {/* Visual indicator badge */}
                {(playerSeats + potentialPartnersInParliament.filter(p => selectedPartners.includes(p.id)).reduce((sum, p) => sum + p.seats, 0)) >= 101 ? (
                  <span className="inline-flex items-center px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-md text-[9px] uppercase font-bold tracking-wider">
                    Sněmovní většina zajištěna 👍
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-md text-[9px] uppercase font-bold tracking-wider">
                    Bez většiny (potřeba 101+) ⚠️
                  </span>
                )}
              </div>
            </div>

            {/* Simulated hemicircle visual seat blocks bar for our proposed alliance */}
            <div className="relative z-10 pt-4 border-t border-slate-800 space-y-2">
              <div className="flex bg-slate-800/80 rounded-2xl overflow-hidden h-6 border border-slate-700">
                {/* Player portion */}
                <div
                  style={{ width: `${(playerSeats / 200) * 100}%`, backgroundColor: playerParty.barva }}
                  className="h-full flex items-center justify-center text-[10px] font-sans font-black text-white hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden px-1"
                  title={`${playerParty.nazev} (vy): ${playerSeats} křesel`}
                >
                  {playerParty.zkratka} (vy)
                </div>
                {/* Invited partners portion */}
                {potentialPartnersInParliament
                  .filter((p) => selectedPartners.includes(p.id))
                  .map((p) => {
                    const pct = (p.seats / 200) * 100;
                    return (
                      <div
                        key={p.id}
                        style={{ width: `${pct}%`, backgroundColor: p.barva || "#ccc" }}
                        className="h-full flex items-center justify-center text-[10px] font-sans font-black text-white hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden px-1 border-l border-slate-800"
                        title={`${p.nazev}: ${p.seats} křesel`}
                      >
                        {p.zkratka}
                      </div>
                    );
                  })}
                {/* Opposition / uninvited portion */}
                {(() => {
                  const occupiedPct = ((playerSeats + potentialPartnersInParliament.filter(p => selectedPartners.includes(p.id)).reduce((sum, p) => sum + p.seats, 0)) / 200) * 100;
                  const remainingPct = 100 - occupiedPct;
                  if (remainingPct <= 0) return null;
                  return (
                    <div
                      style={{ width: `${remainingPct}%` }}
                      className="h-full bg-slate-850/30 flex items-center justify-end text-[10px] font-sans text-slate-500 whitespace-nowrap overflow-hidden px-2 border-l border-slate-800"
                    >
                      Opozice ({200 - (playerSeats + potentialPartnersInParliament.filter(p => selectedPartners.includes(p.id)).reduce((sum, p) => sum + p.seats, 0))} křesel)
                    </div>
                  );
                })()}
              </div>
              <div className="flex justify-between items-center text-[9.5px] text-slate-500 font-sans font-medium">
                <span>Váš blok: {playerSeats + potentialPartnersInParliament.filter(p => selectedPartners.includes(p.id)).reduce((sum, p) => sum + p.seats, 0)} křesel</span>
                <span className="text-red-400 font-bold">Limitní práh důvěry: 101 křesel</span>
                <span>Celkem 200 křesel</span>
              </div>
            </div>
          </div>

          {/* Quick preset triggers help controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-150 p-4 rounded-2xl shadow-xs">
            <span className="text-[11px] font-sans font-bold text-slate-500 uppercase tracking-tight">Rychlý návrh složení:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedPartners([])}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-sans text-[10.5px] font-black uppercase rounded-lg transition-all cursor-pointer"
              >
                Vládnout sám (Jednobarevná vláda)
              </button>
              <button
                onClick={() => setSelectedPartners(potentialPartnersInParliament.map(p => p.id).filter(id => !PORADCI[state.poradceId]?.effects?.coalitionForcedReject?.includes(id)))}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-850 font-sans text-[10.5px] font-black uppercase rounded-lg transition-all cursor-pointer"
              >
                Složit Duhovou Koalici (Přizvat všechny)
              </button>
              <button
                onClick={() => {
                  const viable = potentialPartnersInParliament.filter(p => calculateFinalChance(p.id) > 0).map(p => p.id);
                  setSelectedPartners(viable);
                }}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-800 font-sans text-[10.5px] font-black uppercase rounded-lg transition-all cursor-pointer"
              >
                Jen názorově kompatibilní (Bez veta 🛑)
              </button>
            </div>
          </div>

          {/* Cards collection of parliamentary parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {potentialPartnersInParliament.map((partner) => {
              const trustVal = trustState[partner.id] ?? 50;
              const chance = calculateFinalChance(partner.id);
              const isSelected = selectedPartners.includes(partner.id);

              return (
                <div
                  key={partner.id}
                  onClick={() => {
                    if (PORADCI[state.poradceId]?.effects?.coalitionForcedReject?.includes(partner.id)) {
                      // Advisor blocks any coalition with this partner
                      return;
                    }
                    if (isSelected) {
                      setSelectedPartners(prev => prev.filter(id => id !== partner.id));
                    } else {
                      setSelectedPartners(prev => [...prev, partner.id]);
                    }
                  }}
                  className={`p-6 rounded-[28px] border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 select-none ${
                    isSelected
                      ? "bg-emerald-50/15 border-emerald-500 shadow-sm"
                      : "bg-white border-slate-150 hover:border-slate-250 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header item */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ backgroundColor: partner.barva }} />
                        <h4 className="font-sans font-black uppercase text-slate-800 text-sm">
                          {partner.zkratka}
                        </h4>
                      </div>
                      
                      {/* Interactive toggle pill indicator */}
                      <span className={`px-2.5 py-1 text-[9px] uppercase tracking-wider rounded-lg border leading-none font-sans font-black ${
                        isSelected
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}>
                        {isSelected ? "PŘIZVÁN DO KOALICE" : "OPONECO / OPOZICE"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Strana <strong className="text-slate-850">{partner.nazev}</strong> vedená <strong className="text-slate-850">{partner.lidr}</strong> disponuje se silou <strong className="text-slate-900 font-mono text-xs">{partner.seats} křesel</strong> ve sněmovně.
                    </p>

                    {/* Specific details on sympathy values */}
                    <div className="grid grid-cols-2 gap-3.5 pt-1 text-xs">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block leading-tight">Vztah k vám</span>
                        <span className="font-mono font-black text-[11px] text-slate-800">{trustVal} % Trust</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block leading-tight">Šance na podporu</span>
                        <span className={`font-mono font-black text-[11px] ${chance > 0 ? "text-indigo-700" : "text-rose-600"}`}>
                          {chance > 0 ? `${chance} %` : "Veto 🛑"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual warning on Vetos if selected */}
                  {isSelected && chance <= 0 && (
                    <div className="p-3 bg-red-50 border border-red-150 text-rose-850 text-[10.5px] rounded-xl font-semibold flex items-start space-x-1.5 animate-pulse">
                      <span>⚠️ Tato strana má k vaší formaci ideologické VETO, nebo je váš vztah příliš chladný. V nadcházejícím hlasování koaliční smlouvu s jistotou ODMÍTNE!</span>
                    </div>
                  )}
                  {isSelected && chance > 0 && chance < 40 && (
                    <div className="p-3 bg-amber-50 border border-amber-150 text-amber-800 text-[10.5px] rounded-xl font-semibold flex items-start space-x-1.5">
                      <span>⚠️ Šance na schválení je u této strany poměrně nízká ({chance}%). Vstup do vlády visí na vlásku.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action bottom panel buttons */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-[32px] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => setPhase("akce")}
              className="px-6 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-sans text-xs uppercase font-extrabold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <span>&larr; Vrátit se k vyjednávání</span>
            </button>

            <button
              onClick={startVoting}
              className="px-8 py-3.5 bg-blue-800 hover:bg-blue-900 border border-blue-800 text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <span>Předložit návrh k hlasování o důvěře</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* PHASE 3: HLASOVÁNÍ (phase === "hlasovani") */}
      {phase === "hlasovani" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header suspense stats */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6.5 sm:p-8 text-center space-y-4 shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 opacity-40" />
            
            <div className="relative z-10 space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/25 text-amber-300 rounded-full border border-amber-500/10 text-[9.5px] uppercase font-black tracking-widest leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block mr-1.5 animate-ping" />
                Probíhá vyhodnocení podpory kabinetu
              </span>

              <h3 className="text-sm uppercase font-sans font-extrabold text-slate-350">
                Počet získaných poslanců ve sněmovně:
              </h3>

              <div className="text-4.5xl sm:text-5xl font-mono font-black py-1">
                <span className={liveAcceptedSeatsSum >= 101 ? "text-emerald-400 animate-pulse" : "text-amber-400"}>
                  {liveAcceptedSeatsSum}
                </span>{" "}
                <span className="text-sm font-sans text-slate-450 font-normal">/ 200 mandátů</span>
              </div>

              {/* Progress dynamic line indicator */}
              <div className="w-full max-w-xl mx-auto space-y-1">
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-750 ${
                      liveAcceptedSeatsSum >= 101 ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(100, (liveAcceptedSeatsSum / 200) * 100)}%` }}
                  />
                  <div className="absolute left-[50.5%] top-0 h-full w-0.5 bg-red-600 z-10 animate-pulse" title="Většina 101 hlasů" />
                </div>
                <div className="flex justify-between items-center text-[9.5px] text-slate-500">
                  <span>0 křesel</span>
                  <span className="text-red-400 font-bold">101 křesel (vládní většina)</span>
                  <span>200 křesel</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed font-semibold">
                Poslanecké kluby postupně odevzdávají hlasy na základě programového souladu a sympatií. Sledujeme sčítání v přímém přenosu.
              </p>
            </div>
          </div>

          {/* progressive layout cards */}
          <div className="space-y-4">
            <h3 className="font-sans text-base text-slate-900 font-bold border-l-4 border-amber-500 pl-3 uppercase tracking-tight flex items-center justify-between">
              <span>Hlasovací kuloáry poslaneckých klubů</span>
              <span className="text-xs text-slate-500">
                Odmítnuto/Přijato: {Math.min(revealIndex, potentialPartnersInParliament.length)} z {potentialPartnersInParliament.length}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {potentialPartnersInParliament.map((partner, idx) => {
                const isRevealed = idx < revealIndex;
                const rollInfo = rollsState[partner.id];

                if (!isRevealed || !rollInfo) {
                  return (
                    <div key={partner.id} className="p-4 rounded-2xl border border-slate-150 bg-slate-50/40 flex items-center justify-center py-7 text-center animate-pulse">
                      <div className="space-y-1">
                        <div className="w-2.5 h-2.5 rounded-full mx-auto" style={{ backgroundColor: partner.barva }} />
                        <span className="font-sans text-xs uppercase font-extrabold text-slate-400 tracking-wider inline-block mt-1">
                          Vyčkává se na {partner.zkratka}
                        </span>
                        <p className="text-[10px] text-slate-350 italic">Hledá se parlamentní shoda...</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={partner.id}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 duration-500 transform translate-y-0 opacity-100 ${
                      rollInfo.success
                        ? "bg-emerald-50/55 border-emerald-400 text-slate-800"
                        : "bg-rose-50/50 border-rose-300 text-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: partner.barva }} />
                          <h4 className="font-sans font-black uppercase text-slate-800 text-xs">
                            {partner.zkratka} ({partner.lidr})
                          </h4>
                        </div>
                        <span className="text-xs uppercase font-mono font-black text-slate-700">
                          {partner.seats} mandátů
                        </span>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        {rollInfo.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-650 shrink-0 mt-0.5" />
                        )}
                        <p className="text-xs font-sans text-slate-700 leading-relaxed font-semibold">
                          {rollInfo.success ? (
                            <>
                              <strong>✅ {partner.lidr} vstupuje do vlády:</strong> {rollInfo.motive}
                            </>
                          ) : (
                            <>
                              <strong>❌ Odmítnuto (hod: {rollInfo.roll}, šance: {rollInfo.chance}%):</strong> {rollInfo.motive}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-sans text-slate-500 font-semibold">
                      <span>Názorový soulad: <strong className="text-slate-800">{rollInfo.chance}%</strong></span>
                      <span>Hlasovací roll: <strong className="text-slate-800">{rollInfo.roll}%</strong></span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Redirect to result box */}
          {revealIndex >= potentialPartnersInParliament.length && (
            <div className="bg-slate-50 border border-slate-205 p-6 rounded-[28px] text-center space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Hlasování bylo kompletně vyhodnoceno</span>
              
              <div className="text-3xl font-mono font-black text-slate-900">
                Konečný mandátový stav:{" "}
                <span className={fullRevealedSeatsSum >= 101 ? "text-emerald-700" : "text-amber-700"}>
                  {fullRevealedSeatsSum}
                </span>{" "}
                <span className="text-sm font-sans font-normal text-slate-500">/ 200 křesel</span>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleGoToResultPhase}
                  className="px-8 py-3.5 bg-blue-800 hover:bg-blue-900 border border-blue-800 text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <span>Mířit k výslednému sepsání dějin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PHASE 4: VÝSLEDEK (phase === "vysledek" && finalResults) */}
      {phase === "vysledek" && finalResults && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="p-6 sm:p-8 rounded-[36px] text-center space-y-5 border border-slate-150 bg-white shadow-sm">
            
            {/* Visual outcome status */}
            {finalResults.totalSeats >= 101 ? (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-emerald-100 border border-emerald-250 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-sans font-black uppercase text-emerald-800 tracking-tight">
                  Vládní aliance byla úspěšně sestavena!
                </h3>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                  Prezident republiky jmenuje vaši politickou koalici na základě <strong className="text-emerald-700 font-extrabold">{finalResults.totalSeats} mandátů</strong> novou většinovou vládou České republiky.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-rose-100 border border-rose-250 text-rose-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <XCircle className="w-8 h-8 text-rose-650" />
                </div>
                <h3 className="text-2xl font-sans font-black uppercase text-red-750 tracking-tight">
                  Vyjednávání většiny selhala!
                </h3>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                  Aliance disponuje pouze <strong className="text-rose-700 font-bold">{finalResults.totalSeats} mandátem</strong>, což k vládní většině 101 nestačí. Země míří do hluboké politické bezvýchodnosti a předčasných sněmovních voleb.
                </p>
              </div>
            )}

            {/* Side-by-side informational grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left pt-2">
              
              {/* Left detail card */}
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3.5">
                <h4 className="font-sans text-xs uppercase font-extrabold text-slate-800 tracking-wider">
                  Složení vládního kabinetu
                </h4>

                <div className="space-y-2">
                  <div className="p-3 bg-white border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: playerParty.barva }} />
                      <span className="font-extrabold uppercase text-slate-800">{playerParty.zkratka} (vy)</span>
                    </div>
                    <strong className="font-mono">{playerSeats} křesel</strong>
                  </div>

                  {finalResults.acceptedPartyIds.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Žádný partner nevstoupil do aliance.</p>
                  ) : (
                    finalResults.acceptedPartyIds.map((id) => (
                      <div key={id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STRANY[id].barva }} />
                          <span className="font-extrabold uppercase text-slate-800">{STRANY[id].zkratka}</span>
                        </div>
                        <strong className="font-mono">+{seatMap[id]} křesel</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right compromise constraints */}
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-sans text-xs uppercase font-extrabold text-slate-800 tracking-wider mb-2.5">
                    Podepsané programové kompromisy ({prijatePodminky.length})
                  </h4>

                  {prijatePodminky.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Smlouva neobsahuje žádné programové ústupky.</p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {prijatePodminky.map((pid) => {
                        let match: KoalicniPodminka | null = null;
                        let shortcut = "";
                        for (const prof of KOALICNI_PODMINKY) {
                          const tgt = prof.podminky.find((c) => c.id === pid);
                          if (tgt) {
                            match = tgt;
                            shortcut = STRANY[prof.partyId]?.zkratka || "";
                            break;
                          }
                        }

                        if (!match) return null;

                        return (
                          <div key={pid} className="p-2.5 bg-white border border-slate-150 rounded-lg text-[10.5px] leading-relaxed font-semibold">
                            <span className="font-bold text-amber-700">[{shortcut}]</span> {match.popis}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* finish control handler trigger button */}
            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <button
                onClick={() => onFinishGame(finalResults.totalSeats >= 101, finalResults)}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Vstoupit do dějin české politiky 🏁</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default React.memo(CoalitionStage);
