/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { STRANY, PORADCI, SYMPATIE_INIT } from "../data";
import { Party, Advisor, GameState, DailyBestRecord } from "../types";
import { generateSpolecenskyKompas } from "../velkeUdalosti";
import { normalizePreferencesTo100 } from "../gameUtils";
import { useRng } from "../rngContext";
import { generateDailyConfig, getTodayUtcDateString, DailyConfig } from "../dailyChallenge";
import { Users, Landmark, Flame, Compass, Award, ArrowLeft, Play, ChevronRight, Globe, Award as TrophyIcon, RefreshCw, Sparkles, Clock, Calendar } from "lucide-react";
import { getGlobalLeaderboardFromCloud } from "../firebaseService";
import AchievementsPanel from "./AchievementsPanel";
import { loadUnlockedAchievements } from "../achievementsStorage";

interface SetupStageProps {
  onStartGame: (initialState: GameState, isDaily?: boolean, dailyCfg?: DailyConfig) => void;
  savedGameExist?: boolean;
  onContinueGame?: () => void;
  onViewRun?: (run: any) => void;
  currentUser?: any;
}

const ADVISOR_PRO_TIPS: Record<string, string> = {
  spin_doctor: "Marek Prchal: Při Mediálních Kauzách s ostatními stranami existuje 50% šance že strana, se kterou oslabíš trust ztratí 1% preferencí a to se přímo přesune k tobě. Naopak při pozivní změně trustu je 50% šance, aby obě strany získaly +0.5% preferencí.",
  klaus: "Václav Klaus: Legendární prezident zaručuje, že Motoristé s vámi bezvýhradně za jakýchkoli okolností podepíší koaliční smlouvu s úspěšností 100 % (ignoruje se veto či nízký trust). Na druhou stranu, koaliční vyjednávání s ODS bude s jistotou sabotováno a šance klesne na 0 %.",
  diplomat: "Petr Kolář: Získáte 3 diplomatické akce namísto standardních 2 pro finální koaliční kolo. Navíc se při tajném schvalování vládní aliance každý hlasovací hod sníží o 10 % ve váš prospěch, čímž se radikálně zvýší pravděpodobnost úspěšné koaliční integrace i u skeptických stran.",
  strateg: "Miroslav Kalousek: Zvyšuje veškeré preference a dopady získané v televizních debatách a debatních otázkách o plných 50 %. Pokud excelujete v politických diskusích a dokážete trefit správné odpovědi, tento bonus vás katapultuje přímo k vítězství.",
  populista: "Jaromír Soukup: Tato schopnost Vám umožní vidět u každé z možností v televizních debatách jejich přesný dopad na preference. Zároveň se při generování dopadu debaty rozmezí generovaného dopadu na preference nepohybuje mezi -5% a +5% ale pouze od -2% do +5%",
  novinar: "Radek Bartoníček: Ovlivněním novinářského cechu se postará o to, že jakýkoli podcastový feedback a reakce na sociálních sítích po odehraném kole budou mít výhradně pozitivní dopad na preference. Už žádné negativní podcastové komentáře!",
  turek: "Filip Turek: Jestli si opravdu myslíš, že ti Filip Turek dokáže poradit, tak si ho teda vezmi no..."
};

export default function SetupStage({
  onStartGame,
  savedGameExist = false,
  onContinueGame,
  onViewRun,
  currentUser,
}: SetupStageProps) {
  const rng = useRng();
  const [selectedPartyId, setSelectedPartyId] = useState<string>("ods");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("strateg");
  const [step, setStep] = useState<"party" | "advisor">("party");

  const dailyConfig = useMemo(() => generateDailyConfig(getTodayUtcDateString()), []);
  const [timeLeft, setTimeLeft] = useState("");
  const [dailyChallengeBest, setDailyChallengeBest] = useState<DailyBestRecord | null>(null);
  const [dailySelectedAdvisorId, setDailySelectedAdvisorId] = useState<string>("strateg");
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = utcMidnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const hrs = Math.floor(diffMs / (3600 * 1000));
      const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diffMs % (60 * 1000)) / 1000);
      
      const pad = (n: number) => String(n).padStart(2, "0");
      setTimeLeft(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dailyChallengeBest");
      if (stored) {
        const parsed = JSON.parse(stored) as DailyBestRecord;
        if (parsed && parsed.date === dailyConfig.date) {
          setDailyChallengeBest(parsed);
          return;
        }
      }

      // Migration fallback from old key dailyChallengeCompleted
      const oldStored = localStorage.getItem("dailyChallengeCompleted");
      if (oldStored) {
        const oldData = JSON.parse(oldStored);
        if (oldData && oldData.date === dailyConfig.date) {
          const migrated: DailyBestRecord = {
            date: oldData.date,
            attempts: 1,
            best: {
              preference: oldData.preference,
              initialPreference: oldData.initialPreference ?? (STRANY[dailyConfig.partyId]?.preference ?? 0),
              prefChange: oldData.prefChange,
              endingTyp: oldData.endingTyp,
              seats: oldData.seats,
              poradceId: "strateg", // standard starting advisor fallback
              partyId: dailyConfig.partyId,
            }
          };
          setDailyChallengeBest(migrated);
          localStorage.setItem("dailyChallengeBest", JSON.stringify(migrated));
        }
      }
    } catch (e) {
      console.error("Failed to read dailyChallengeBest from localStorage", e);
    }
  }, [dailyConfig.date, dailyConfig.partyId]);

  const partyList = Object.values(STRANY);
  const selectedParty = STRANY[selectedPartyId];
  const selectedAdvisor = PORADCI[selectedAdvisorId];

  // Group parties by parliamentary blocks
  const blocks = {
    vladni: {
      name: "Tábory a spojenectví ANO / populisté",
      desc: "Strany profitující z kritiky vládních reforem nebo stavící na protestu.",
      parties: partyList.filter((p) => p.blok === "vladni"),
    },
    opozicni: {
      name: "Tradiční demokratický blok (Koaliční strany)",
      desc: "Tradiční vládní a liberální opora držící proevropský směr.",
      parties: partyList.filter((p) => p.blok === "opozicni"),
    },
    mimo: {
      name: "Mimoparlamentní opozice a výzvy",
      desc: "Challenge strany balancující pod 5% hranicí.",
      parties: partyList.filter((p) => p.blok === "mimo"),
    },
  };

  const handleInitializeGame = () => {
    // Collect inicial data
    const npcTrust: Record<string, Record<string, number>> = {};
    const npcPreferred: Record<string, number> = {};
    const npcAtributy: Record<
      string,
      { ekonomika: number; kultura: number; evropa: number; stylPolitiky: number }
    > = {};

    // Copy initial setup
    partyList.forEach((p) => {
      npcPreferred[p.id] = p.preference;
      npcAtributy[p.id] = {
        ekonomika: p.ekonomika,
        kultura: p.kultura,
        evropa: p.evropa,
        stylPolitiky: p.stylPolitiky,
      };
    });

    // Generate initial trust matrix towards the player
    const trustMap: Record<string, number> = {};
    partyList.forEach((p) => {
      if (p.id !== selectedPartyId) {
        // Look up value in SYMPATIE_INIT
        const lookup = SYMPATIE_INIT[p.id][selectedPartyId];
        trustMap[p.id] = lookup === "x" ? 50 : (lookup as number);
      } else {
        trustMap[p.id] = 100; // self-love
      }
    });

    // Fully build the dynamic trust matrix
    partyList.forEach((p1) => {
      npcTrust[p1.id] = {};
      partyList.forEach((p2) => {
        const value = SYMPATIE_INIT[p1.id][p2.id];
        npcTrust[p1.id][p2.id] = value === "x" ? 50 : (value as number);
      });
    });

    const initialCompass = generateSpolecenskyKompas(rng);

    const { playerPref, npcPrefs: normalizedNpcPreferred } = normalizePreferencesTo100(
      selectedParty.preference,
      npcPreferred,
      selectedPartyId
    );

    const npcStartingPrefs = Object.values(STRANY)
      .filter((p) => p.id !== selectedPartyId)
      .map((p) => p.preference);
    const initialLeaderPreference = npcStartingPrefs.length > 0 ? Math.max(...npcStartingPrefs) : 32.0;

    const initialState: GameState = {
      stranaId: selectedPartyId,
      poradceId: selectedAdvisorId,
      preference: playerPref,
      budget: selectedParty.budget,
      turn: 1,
      trust: trustMap,
      atributy: {
        ekonomika: selectedParty.ekonomika,
        kultura: selectedParty.kultura,
        evropa: selectedParty.evropa,
        stylPolitiky: selectedParty.stylPolitiky,
      },
      npcPreferred: normalizedNpcPreferred,
      npcAtributy,
      npcTrust,
      history: [
        {
          turn: 1,
          type: "system",
          title: "Kampaň zahájena!",
          description: `Vstoupili jste do ringu jako lídr strany ${selectedParty.nazev} pod vedením poradce ${selectedAdvisor.jmeno}. Cílem hry je projít 25 koly, zachovat si zdravé finance, maximalizovat preference a po 25. kole sestavit vládní koalici s alespoň 101 křesly ve Sněmovně.`,
          changes: [
            `Počáteční rozpočet: ${selectedParty.budget.toLocaleString("cs-CZ")} Kč`,
            `Aktuální preference: ${selectedParty.preference} %`,
            `Schopnost poradce: ${selectedAdvisor.specialita}`,
          ],
        },
      ],
      undoAvailable: !!selectedAdvisor.effects?.undoOnce,
      spolecenskyKompas: initialCompass,
      prevSpolecenskyKompas: initialCompass,
      velkeUdalostiHistory: [],
      stats: {
        prefMimoradne: 0,
        prefBezny: 0,
        prefDebaty: 0,
        prefMedia: 0,
        prefPodcasty: 0,
        prefCompass: 0,
        prefPenalizace: 0,
        initialBudget: selectedParty.budget,
        initialPreference: selectedParty.preference,
        initialLeaderPreference,
        initialAtributy: {
          ekonomika: selectedParty.ekonomika,
          kultura: selectedParty.kultura,
          evropa: selectedParty.evropa,
          stylPolitiky: selectedParty.stylPolitiky,
        },
      },
      preferenceHistory: [playerPref],
    };

    onStartGame(initialState);
  };

  const handlePlayDailyChallenge = () => {
    const selectedAdvisor = PORADCI[dailySelectedAdvisorId];
    const selectedParty = STRANY[dailyConfig.partyId];

    const trustMap: Record<string, number> = {};
    partyList.forEach((p) => {
      if (p.id !== dailyConfig.partyId) {
        const lookup = SYMPATIE_INIT[p.id][dailyConfig.partyId];
        trustMap[p.id] = lookup === "x" ? 50 : (lookup as number);
      } else {
        trustMap[p.id] = 100;
      }
    });

    const npcTrust: Record<string, Record<string, number>> = {};
    const npcPreferred: Record<string, number> = {};
    const npcAtributy: Record<
      string,
      { ekonomika: number; kultura: number; evropa: number; stylPolitiky: number }
    > = {};

    partyList.forEach((p) => {
      npcPreferred[p.id] = p.preference;
      npcAtributy[p.id] = {
        ekonomika: p.ekonomika,
        kultura: p.kultura,
        evropa: p.evropa,
        stylPolitiky: p.stylPolitiky,
      };
    });

    partyList.forEach((p1) => {
      npcTrust[p1.id] = {};
      partyList.forEach((p2) => {
        const value = SYMPATIE_INIT[p1.id][p2.id];
        npcTrust[p1.id][p2.id] = value === "x" ? 50 : (value as number);
      });
    });

    const { playerPref, npcPrefs: normalizedNpcPreferred } = normalizePreferencesTo100(
      selectedParty.preference,
      npcPreferred,
      dailyConfig.partyId
    );

    const npcStartingPrefsDaily = Object.values(STRANY)
      .filter((p) => p.id !== dailyConfig.partyId)
      .map((p) => p.preference);
    const initialLeaderPreferenceDaily = npcStartingPrefsDaily.length > 0 ? Math.max(...npcStartingPrefsDaily) : 32.0;

    const initialState: GameState = {
      stranaId: dailyConfig.partyId,
      poradceId: dailySelectedAdvisorId,
      preference: playerPref,
      budget: selectedParty.budget,
      turn: 1,
      trust: trustMap,
      atributy: {
        ekonomika: selectedParty.ekonomika,
        kultura: selectedParty.kultura,
        evropa: selectedParty.evropa,
        stylPolitiky: selectedParty.stylPolitiky,
      },
      npcPreferred: normalizedNpcPreferred,
      npcAtributy,
      npcTrust,
      history: [
        {
          turn: 1,
          type: "system",
          title: "Denní výzva zahájena!",
          description: `Vstoupili jste do ringu Denní Výzvy (${dailyConfig.date}) jako lídr strany ${selectedParty.nazev} pod vedením poradce ${selectedAdvisor.jmeno}.`,
          changes: [
            `Počáteční rozpočet: ${selectedParty.budget.toLocaleString("cs-CZ")} Kč`,
            `Aktuální preference: ${selectedParty.preference} %`,
            `Schopnost poradce: ${selectedAdvisor.specialita}`,
          ],
        },
      ],
      undoAvailable: !!selectedAdvisor.effects?.undoOnce,
      spolecenskyKompas: dailyConfig.initialCompass,
      prevSpolecenskyKompas: dailyConfig.initialCompass,
      velkeUdalostiHistory: [],
      stats: {
        prefMimoradne: 0,
        prefBezny: 0,
        prefDebaty: 0,
        prefMedia: 0,
        prefPodcasty: 0,
        prefCompass: 0,
        prefPenalizace: 0,
        initialBudget: selectedParty.budget,
        initialPreference: selectedParty.preference,
        initialLeaderPreference: initialLeaderPreferenceDaily,
        initialAtributy: {
          ekonomika: selectedParty.ekonomika,
          kultura: selectedParty.kultura,
          evropa: selectedParty.evropa,
          stylPolitiky: selectedParty.stylPolitiky,
        },
      },
      preferenceHistory: [playerPref],
      dailyDate: dailyConfig.date,
    };

    onStartGame(initialState, true, dailyConfig);
  };

  const getIdeologyLabel = (val: number, left: string, right: string) => {
    if (val < 35) return left;
    if (val > 65) return right;
    return "Střed";
  };

  const rawLeaderboard = typeof window !== "undefined" ? (localStorage.getItem("leaderboardSavedHistory") || "[]") : "[]";
  let leaderboard: any[] = [];
  try {
    leaderboard = JSON.parse(rawLeaderboard);
  } catch (e) {
    console.error(e);
  }

  const bestRunForParty = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const rawBestByParty = localStorage.getItem("bestResultByParty") || "{}";
      const bestByParty: Record<string, any> = JSON.parse(rawBestByParty);
      if (bestByParty[selectedPartyId]) {
        return bestByParty[selectedPartyId];
      }

      // Jednorázová migrace: pokud per-party rekord ještě neexistuje,
      // zkusíme dohledat nejlepší dostupný záznam ve staré Top 5 historii
      // a uložit ho jako počáteční per-party rekord.
      const fallbackFromOldHistory = leaderboard
        .filter((e: any) => e.gameState?.stranaId === selectedPartyId)
        .sort((a: any, b: any) => (b.prefChange ?? 0) - (a.prefChange ?? 0))[0];

      if (fallbackFromOldHistory) {
        bestByParty[selectedPartyId] = fallbackFromOldHistory;
        localStorage.setItem("bestResultByParty", JSON.stringify(bestByParty));
        return fallbackFromOldHistory;
      }

      return null;
    } catch (e) {
      console.error("Failed to read bestResultByParty from localStorage", e);
      return null;
    }
  }, [selectedPartyId, leaderboard]);

  const [leaderboardTab, setLeaderboardTab] = useState<"local" | "global">("local");
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  useEffect(() => {
    if (leaderboardTab === "global") {
      setLoadingGlobal(true);
      getGlobalLeaderboardFromCloud()
        .then((data) => {
          setGlobalLeaderboard(data);
          setLoadingGlobal(false);
        })
        .catch((err) => {
          console.error("Failed to load global leaderboard: ", err);
          setLoadingGlobal(false);
        });
    }
  }, [leaderboardTab]);

  if (showAchievements) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-0">
        <AchievementsPanel
          unlockedRecords={loadUnlockedAchievements()}
          onBack={() => setShowAchievements(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <div className="w-full p-6 sm:p-8 bg-white border border-slate-150 rounded-[32px] shadow-sm">
      {/* Header */}
      <div className="text-center mb-8 border-b border-slate-100 pb-6">
        <h1 className="text-4xl sm:text-5xl font-sans tracking-wider text-red-650 font-bold uppercase">
          Czech Political Simulation
        </h1>
        <p className="text-slate-500 font-sans text-base lg:text-lg italic mt-2">
          Satirická simulace parlamentního klání o moc v České republice
        </p>
      </div>

      {step === "party" ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left side: Grouped party selector */}
            <div className="md:col-span-7 space-y-6">
              <h2 className="text-xl font-sans text-slate-900 font-black uppercase tracking-tight border-l-4 border-red-600 pl-3.5">
                1. Vyberte politickou stranu
              </h2>

              {Object.entries(blocks).map(([key, value]) => {
                return (
                  <div key={key} className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div>
                    <h3 className="font-sans text-base text-slate-800 font-extrabold uppercase tracking-tight">
                      {value.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mb-1">{value.desc}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {value.parties.map((party) => {
                      const isSelected = party.id === selectedPartyId;
                      return (
                        <button
                          key={party.id}
                          onClick={() => setSelectedPartyId(party.id)}
                          style={{
                            borderColor: isSelected ? party.barva || "#c0392b" : "",
                            boxShadow: isSelected ? `0 0 10px ${party.barva || "#c0392b"}40` : "",
                          }}
                          className={`p-3.5 text-left rounded-xl border transition-all duration-150 relative overflow-hidden flex flex-col justify-between h-26 ${
                            isSelected
                              ? "bg-white text-slate-900 font-bold"
                              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 hover:border-slate-300 border-slate-100"
                          }`}
                        >
                          <div className="text-sm font-sans truncate uppercase tracking-wider">
                            {party.id === "silnecz" ? party.nazev : party.zkratka}
                          </div>
                          <div className="text-xs text-slate-500 font-sans italic truncate">
                            {party.lidr}
                          </div>
                          <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-1.5">
                            <span className="text-xs font-sans font-bold text-blue-800">
                              {party.preference}%
                            </span>
                            <span className="text-[10px] p-0.5 rounded px-1 bg-slate-100 text-slate-600">
                              {party.blok === "vladni"
                                ? "Vláda"
                                : party.blok === "opozicni"
                                ? "Opozice"
                                : "Mimo"}
                            </span>
                          </div>
                          {isSelected && (
                            <div
                              style={{ backgroundColor: party.barva || "#c0392b" }}
                              className="absolute top-0 right-0 w-1.5 h-full"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Right side: Selected party info */}
            <div className="md:col-span-5 bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
              {selectedParty ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedParty.barva || "#c0392b" }}
                      />
                      <span className="font-sans text-[11px] uppercase tracking-widest text-slate-500 px-2.5 py-1 bg-slate-200/60 rounded">
                        Zvolená strana
                      </span>
                    </div>
                    <h2 className="text-2xl font-sans text-slate-900 font-black tracking-tight mt-2">
                      {selectedParty.nazev}
                    </h2>
                    <p className="text-sm text-slate-500 font-sans italic mb-4">
                      Lídr strany: <strong className="text-slate-805 font-bold">{selectedParty.lidr}</strong>
                    </p>
                    <p className="text-slate-600 font-serif text-sm bg-white p-4 rounded-xl border border-slate-150 leading-relaxed font-medium">
                      {selectedParty.popis}
                    </p>
                  </div>

                  {/* Starter Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-150 text-center shadow-sm">
                      <div className="text-slate-500 text-[10px] font-sans uppercase flex items-center justify-center space-x-1 font-bold tracking-wider">
                        <Users className="w-3.5 h-3.5 text-amber-500" />
                        <span>Počáteční %</span>
                      </div>
                      <div className="text-2xl font-sans font-bold text-amber-500 mt-1">
                        {selectedParty.preference} %
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-150 text-center shadow-sm">
                      <div className="text-slate-500 text-[10px] font-sans uppercase flex items-center justify-center space-x-1 font-bold tracking-wider">
                        <Award className="w-3.5 h-3.5 text-violet-500" />
                        <span>Nejlepší výsledek</span>
                      </div>
                      {bestRunForParty ? (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-2xl font-sans font-bold text-violet-500">
                              {bestRunForParty.preference.toFixed(1)} %
                            </span>
                            <span className="text-xl leading-none">
                              {PORADCI[bestRunForParty.gameState?.poradceId]?.emoji ?? "🗳️"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                            {bestRunForParty.date}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-350 font-sans mt-2 italic">
                          zatím žádná hra
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ideology metrics */}
                  <div className="space-y-2.5 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
                    <h4 className="font-sans uppercase text-[10px] tracking-widest text-slate-550 border-b border-slate-100 pb-1.5 flex items-center space-x-1 font-bold">
                      <Compass className="w-3.5 h-3.5 text-red-500" />
                      <span>Ideologický profil strany</span>
                    </h4>

                    <div className="space-y-2.5 pt-2 text-xs">
                      {/* Ekonomika */}
                      <div>
                        <div className="flex justify-between font-sans mb-1 text-slate-705">
                          <span>Ekonomická osa</span>
                          <span className="text-amber-600 font-semibold">
                            {getIdeologyLabel(selectedParty.ekonomika, "Státní / Levice", "Tržní / Pravice")}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded">
                          <div
                            className="h-full bg-amber-500 rounded transition-all duration-300"
                            style={{ width: `${selectedParty.ekonomika}%` }}
                          />
                        </div>
                      </div>

                      {/* Kultura */}
                      <div>
                        <div className="flex justify-between font-sans mb-1 text-slate-705">
                          <span>Kulturní tón</span>
                          <span className="text-cyan-600 font-semibold">
                            {getIdeologyLabel(selectedParty.kultura, "Konzervativní", "Progresivní / Liberální")}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded">
                          <div
                            className="h-full bg-cyan-500 rounded transition-all duration-300"
                            style={{ width: `${selectedParty.kultura}%` }}
                          />
                        </div>
                      </div>

                      {/* Evropa */}
                      <div>
                        <div className="flex justify-between font-sans mb-1 text-slate-705">
                          <span>Vztah k Evropské unii</span>
                          <span className="text-blue-600 font-semibold">
                            {getIdeologyLabel(selectedParty.evropa, "Euroskeptický", "Silně proevropský")}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded">
                          <div
                            className="h-full bg-blue-600 rounded transition-all duration-300"
                            style={{ width: `${selectedParty.evropa}%` }}
                          />
                        </div>
                      </div>

                      {/* Styl politiky */}
                      <div>
                        <div className="flex justify-between font-sans mb-1 text-slate-705">
                          <span>Styl komunikace</span>
                          <span className="text-red-601 font-semibold">
                            {getIdeologyLabel(selectedParty.stylPolitiky, "Konstruktivní", "Ostrý / Populistický")}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded">
                          <div
                            className="h-full bg-red-500 rounded transition-all duration-300"
                            style={{ width: `${selectedParty.stylPolitiky}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target objective */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-150 flex items-start space-x-3 shadow-sm">
                    <Award className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs uppercase font-sans text-slate-800 font-bold">
                        Volební cíl kampaně
                      </h4>
                      <p className="text-sm text-slate-600 font-sans leading-relaxed mt-1 font-medium">
                        {selectedParty.winPopis}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 font-sans text-center py-10 font-semibold">
                  Vyberte stranu pro zobrazení podrobností.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {savedGameExist && onContinueGame && (
                  <button
                    onClick={onContinueGame}
                    type="button"
                    className="flex-1 py-4 px-6 bg-emerald-50 hover:bg-emerald-100/90 active:bg-emerald-200/50 border border-emerald-200 text-emerald-800 font-sans text-xs uppercase tracking-widest font-extrabold rounded-xl transition-all duration-150 cursor-pointer shadow-xs flex items-center justify-center text-center font-bold"
                  >
                    <span>Pokračovat v rozehrané hře</span>
                  </button>
                )}
                <button
                  disabled={!selectedPartyId}
                  onClick={() => setStep("advisor")}
                  className={`py-4 px-6 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-40 text-white font-sans text-xs uppercase tracking-widest font-extrabold rounded-xl transition-all duration-150 cursor-pointer shadow-md shadow-blue-100 flex items-center justify-center gap-2 group ${
                    savedGameExist ? "flex-1" : "w-full"
                  }`}
                >
                  <span>Pokračovat k výběru poradce</span>
                  {!savedGameExist && (
                    <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform duration-150" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <button
              onClick={() => setStep("party")}
              className="text-slate-650 hover:text-slate-900 font-sans text-[11px] uppercase bg-white border border-slate-250 px-4 py-2.5 rounded-xl font-extrabold shadow-xs hover:border-slate-350 transition-colors duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zpět na výběr strany</span>
            </button>
            <h2 className="text-xl font-sans text-slate-905 font-black uppercase tracking-tight border-l-4 border-red-650 pl-3.5">
              2. Zvolte volebního poradce
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Advisor selection cards */}
            <div className="md:col-span-7 space-y-3">
              {Object.values(PORADCI).map((advisor) => {
                const isSelected = advisor.id === selectedAdvisorId;
                return (
                  <button
                    key={advisor.id}
                    onClick={() => setSelectedAdvisorId(advisor.id)}
                    className={`w-full p-4.5 rounded-2xl text-left border transition-all duration-150 flex items-start space-x-4 ${
                      isSelected
                        ? "bg-white border-blue-800 shadow-md scale-[1.005]"
                        : "bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-250 cursor-pointer"
                    }`}
                  >
                    <div className="text-4xl bg-slate-50 p-2.5 border border-slate-150 rounded-xl">
                      {advisor.emoji}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-lg text-slate-800 font-extrabold">
                          {advisor.jmeno}
                        </span>
                        <span className="text-[10px] tracking-wider text-amber-800 font-sans uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                          {advisor.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed line-clamp-2">
                        {advisor.popis}
                      </p>
                      <div className="text-xs pt-1.5 mt-1.5 text-slate-700 font-sans flex items-center space-x-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                        <span className="text-blue-800 font-extrabold">Unikátní Schopnost:</span>
                        <span>{advisor.specialita}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected advisor overview & stats changes */}
            <div className="md:col-span-5 bg-slate-55 border border-slate-100 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <div className="text-center pb-4 mb-4 border-b border-slate-105">
                  <div className="text-6xl mb-2">{selectedAdvisor?.emoji}</div>
                  <h3 className="font-sans text-xl text-slate-900 font-black">
                    {selectedAdvisor?.jmeno}
                  </h3>
                  <p className="text-slate-600 text-xs font-sans italic mt-1.5 px-4 leading-relaxed font-medium">
                    {selectedAdvisor?.popis}
                  </p>
                </div>

                {/* Weights info */}
                <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
                  <h4 className="font-sans uppercase text-[10px] tracking-widest text-slate-500 border-b border-slate-100 pb-1.5 font-bold">
                    Vliv na výskyt témat událostí
                  </h4>
                  <p className="text-xs text-slate-550 font-sans italic font-normal">
                    Tento poradce mění náhodnou šanci, s jakou se vám budou objevovat specifické typy událostí:
                  </p>

                  <div className="space-y-2 pt-2 text-xs font-sans">
                    <>
                      {/* Debates */}
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Televizní debaty a diskuze</span>
                        <span
                          className={`font-semibold ${
                            selectedAdvisor.vahy.debaty > 0
                              ? "text-emerald-700 font-bold"
                              : selectedAdvisor.vahy.debaty < 0
                              ? "text-red-700 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          {selectedAdvisor.vahy.debaty > 0 ? "+" : ""}
                          {selectedAdvisor.vahy.debaty} %
                        </span>
                      </div>

                      {/* Media category */}
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Mediální skandály & PR</span>
                        <span
                          className={`font-semibold ${
                            selectedAdvisor.vahy.media > 0
                              ? "text-emerald-700 font-bold"
                              : selectedAdvisor.vahy.media < 0
                              ? "text-red-700 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          {selectedAdvisor.vahy.media > 0 ? "+" : ""}
                          {selectedAdvisor.vahy.media} %
                        </span>
                      </div>

                      {/* Podcast */}
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Podcasty a rozhovory</span>
                        <span
                          className={`font-semibold ${
                            selectedAdvisor.vahy.podcast > 0
                              ? "text-emerald-700 font-bold"
                              : selectedAdvisor.vahy.podcast < 0
                              ? "text-red-700 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          {selectedAdvisor.vahy.podcast > 0 ? "+" : ""}
                          {selectedAdvisor.vahy.podcast} %
                        </span>
                      </div>
                    </>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mt-4 text-xs font-sans leading-relaxed text-slate-700 font-medium whitespace-pre-line">
                  <strong className="text-amber-800 font-sans font-bold block mb-1">PRO TIP PORADCE:</strong>{" "}
                  {ADVISOR_PRO_TIPS[selectedAdvisorId] || `Moudrý výběr poradce dává mocný bonus. Zvolte zbraň vhodnou pro vaši strategickou stranu!`}
                </div>
              </div>

              <button
                onClick={handleInitializeGame}
                className="w-full py-4.5 mt-6 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-sans text-xs uppercase tracking-widest font-extrabold rounded-2xl shadow-md hover:shadow-lg shadow-blue-100 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Spustit volební kampaň 🗳️</span>
                <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform duration-150" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Leaderboard box */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-slate-800 shadow-sm font-sans flex flex-col justify-center">
        <div className="border-b border-slate-200 pb-2 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-sans text-sm uppercase tracking-widest text-slate-500 font-extrabold flex items-center gap-2">
            <span>🏆 Síň slávy & Výsledky kampaní</span>
          </h3>
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs gap-1 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setLeaderboardTab("local")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                leaderboardTab === "local"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-100"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              <TrophyIcon className="w-3.5 h-3.5" />
              <span>Lokální (Top 5)</span>
            </button>
            <button
              onClick={() => setLeaderboardTab("global")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                leaderboardTab === "global"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-100"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Globální (Top 10)</span>
            </button>
            <button
              id="setup-achievements-btn"
              onClick={() => setShowAchievements(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer text-slate-500 hover:text-amber-700 bg-amber-50/20 hover:bg-amber-50 border border-dashed border-amber-300/80 hover:border-amber-400/85"
            >
              <Award className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Achievementy 🏆</span>
            </button>
          </div>
        </div>

        {leaderboardTab === "local" ? (
          leaderboard.length === 0 ? (
            <p className="text-xs text-slate-400 font-sans italic py-4 text-center">
              Zatím zde nejsou žádné uložené výsledky kampaní. Dokončete kampaň pro zapsání do tabulky šampionů!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Pořadí</th>
                    <th className="py-2.5">Politická strana</th>
                    <th className="py-2.5 text-right">Vývoj preferencí</th>
                    <th className="py-2.5 text-center">Počet mandátů</th>
                    <th className="py-2.5 text-center">Výsledek</th>
                    <th className="py-2.5 pl-4">Volební poradce</th>
                    <th className="py-2.5 text-right">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {leaderboard.map((entry, index) => {
                    const initPref = entry.initialPreference ?? (STRANY[entry.gameState?.stranaId]?.preference ?? 0);
                    const change = entry.prefChange !== undefined ? entry.prefChange : (entry.preference - initPref);
                    const seats = entry.seats !== undefined ? entry.seats : (entry.coalitionResults?.playerSeats ?? 0);

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => onViewRun && onViewRun(entry)}
                        className="hover:bg-slate-100/75 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-extrabold text-slate-400">
                          #{index + 1}
                        </td>
                        <td className="py-3 flex items-center gap-2.5">
                          <span
                            className="w-1.5 h-4.5 rounded-sm shrink-0"
                            style={{ backgroundColor: entry.partyBarva }}
                          />
                          <div>
                            <span className="font-extrabold text-slate-900">
                              {entry.partyZkratka}
                            </span>
                            <span className="hidden sm:inline text-slate-450 text-[10px] ml-1.5 font-normal">
                              {entry.partyName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-bold">
                          <span className={change >= 0 ? "text-emerald-600 font-black" : "text-rose-650 font-black"}>
                            {change >= 0 ? "+" : ""}{change.toFixed(1)} %
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5 hidden md:inline">
                            ({initPref.toFixed(1)}% &rarr; {entry.preference.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-3 text-center font-bold text-slate-800">
                          {seats}
                        </td>
                        <td className="py-3 text-center">
                          {(() => {
                            const typ = entry.endingTyp || (entry.gameVictory || entry.isGovernment ? "premier" : "opozice");
                            if (typ === "premier") {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-yellow-50 text-amber-700 border border-yellow-200 font-bold whitespace-nowrap">
                                  🏆 Premiér
                                </span>
                              );
                            } else if (typ === "vicepremier") {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold whitespace-nowrap">
                                  🥈 Vicepremiér
                                </span>
                              );
                            } else if (typ === "koalicni_partner") {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold whitespace-nowrap">
                                  🤝 Koalice
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-150 font-semibold whitespace-nowrap">
                                  ⚡ Opozice
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="py-3 pl-4 text-slate-600 font-medium">
                          {entry.advisorName}
                        </td>
                        <td className="py-3 text-right text-slate-400 font-medium whitespace-nowrap">
                          {entry.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3.5 pt-2 border-t border-slate-200 text-[10px] text-slate-450 flex justify-between items-center italic">
                <span>* Kliknutím na řádek zobrazíte detailní statistiky a vyhodnocení dané kampaně.</span>
                <span>Top 5 výsledků</span>
              </div>
            </div>
          )
        ) : (
          loadingGlobal ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs text-slate-500 font-sans italic">Načítání výsledků z cloudu...</p>
            </div>
          ) : globalLeaderboard.length === 0 ? (
            <p className="text-xs text-slate-400 font-sans italic py-4 text-center">
              Zatím nejsou v cloudu žádné příspěvky. Přihlaste se přes Google a dokončete kampaň, abyste byli v globální tabulce!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Pořadí</th>
                    <th className="py-2.5">Hráč</th>
                    <th className="py-2.5">Politická strana</th>
                    <th className="py-2.5 text-right">Vývoj preferencí</th>
                    <th className="py-2.5 text-center">Počet mandátů</th>
                    <th className="py-2.5 text-center">Výsledek</th>
                    <th className="py-2.5 pl-4">Poradce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {globalLeaderboard.map((entry, index) => {
                    const initPref = entry.initialPreference ?? 30.0;
                    const change = entry.prefChange ?? (entry.preference - initPref);
                    const seats = entry.seats ?? 0;

                    return (
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-slate-100/75"
                      >
                        <td className="py-3 font-extrabold text-blue-600 text-sm">
                          #{index + 1}
                        </td>
                        <td className="py-3 flex items-center gap-2">
                          {entry.photoURL ? (
                            <img
                              src={entry.photoURL}
                              alt=""
                              className="w-5 h-5 rounded-full border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {entry.displayName ? entry.displayName[0].toUpperCase() : '?'}
                            </div>
                          )}
                          <span className="font-semibold text-slate-800 max-w-[120px] truncate">
                            {entry.displayName || 'Politik'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1.5 h-4.5 rounded-sm shrink-0"
                              style={{ backgroundColor: entry.partyBarva }}
                            />
                            <span className="font-extrabold text-slate-900">
                              {entry.partyZkratka}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-bold">
                          <span className={change >= 0 ? "text-emerald-600 font-black" : "text-rose-650 font-black"}>
                            {change >= 0 ? "+" : ""}{change.toFixed(1)} %
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5 hidden md:inline">
                            ({initPref.toFixed(1)}% &rarr; {entry.preference.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-3 text-center font-bold text-slate-800">
                          {seats}
                        </td>
                        <td className="py-3 text-center">
                          {(() => {
                            const typ = entry.endingTyp || (entry.isGovernment ? "premier" : "opozice");
                            if (typ === "premier") {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-yellow-50 text-amber-700 border border-yellow-200 font-bold whitespace-nowrap">
                                  🏆 Premiér
                                </span>
                              );
                            } else if (typ === "vicepremier") {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold whitespace-nowrap">
                                  🥈 Vicepremiér
                                </span>
                              );
                            } else if (typ === "koalicni_partner") {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold whitespace-nowrap">
                                  🤝 Koalice
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-150 font-semibold whitespace-nowrap">
                                  ⚡ Opozice
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="py-3 pl-4 text-slate-600 font-medium">
                          {entry.advisorName}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3.5 pt-2 border-t border-slate-200 text-[10px] text-slate-455 italic">
                * Zobrazeno je TOP 10 nejlepších výsledků z celého světa seřazených podle celkového vzrůstu preferencí.
              </div>
            </div>
          )
        )}
      </div>

      {/* 4. Denní výzva (NOVÉ UMÍSTĚNÍ - úplně dole) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-[24px] p-6 text-white shadow-md relative overflow-hidden font-sans">
        {/* Decorative subtle light aura */}
        <div className="absolute right-0 top-0 w-36 h-36 bg-emerald-500/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-sans font-black tracking-widest uppercase flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 animate-pulse" /> DENNÍ VÝZVA
              </span>
              <span className="text-slate-400 text-xs font-mono font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-450" />
                Konec za: <span className="text-white bg-slate-950 px-1.5 py-0.5 rounded font-bold">{timeLeft}</span>
              </span>
              {dailyChallengeBest && (
                <span className="px-2 py-0.5 bg-blue-600/50 text-blue-200 border border-blue-500/30 rounded text-[10px] font-sans font-bold uppercase">
                  Pokusů dnes: {dailyChallengeBest.attempts}
                </span>
              )}
            </div>
            <h3 className="text-lg font-sans tracking-tight font-black uppercase text-slate-100">
              Výzva ze dne: <span className="font-mono text-amber-400">{dailyConfig.date}</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Každý den nová pevná konfigurace! Všichni hráči mají naprosto shodné startovní podmínky, stejnou politickou stranu i stejný kompas. Kdo dosáhne největšího preferenčního růstu?
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-700/50 pt-5">
          {dailyChallengeBest ? (
            /* Played state - Best Result card */
            <div className="mb-4 p-4 bg-slate-950/60 rounded-xl border border-slate-750 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Tvůj dnešní nejlepší výsledek:
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  Hráno za stranu: <strong className="text-white">{STRANY[dailyChallengeBest.best.partyId]?.nazev || STRANY[dailyConfig.partyId]?.nazev}</strong> • Poradce: <strong className="text-white">{PORADCI[dailyChallengeBest.best.poradceId]?.jmeno || "Neznámý"}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    Koncové pref:{" "}
                    <strong className="text-emerald-400 text-sm font-black">{dailyChallengeBest.best.preference?.toFixed(1)}%</strong>
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Změna:{" "}
                    <strong className="text-amber-400 text-sm font-black">
                      {dailyChallengeBest.best.prefChange >= 0 ? "+" : ""}
                      {dailyChallengeBest.best.prefChange?.toFixed(1)} p.b.
                    </strong>
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Mandáty: <strong className="text-white text-sm font-black">{dailyChallengeBest.best.seats}</strong>
                  </span>
                  {dailyChallengeBest.best.endingTyp && (
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      Výsledek:{" "}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        dailyChallengeBest.best.endingTyp === "premier"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25"
                          : dailyChallengeBest.best.endingTyp === "vicepremier"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                          : dailyChallengeBest.best.endingTyp === "koalicni_partner"
                          ? "bg-slate-500/10 text-slate-300 border border-slate-500/25"
                          : "bg-red-500/10 text-red-400 border border-red-500/25"
                      }`}>
                        {dailyChallengeBest.best.endingTyp === "premier" && "🏆 "}
                        {dailyChallengeBest.best.endingTyp === "vicepremier" && "🥈 "}
                        {dailyChallengeBest.best.endingTyp === "koalicni_partner" && "🤝 "}
                        {dailyChallengeBest.best.endingTyp === "opozice" && "⚡ "}
                        {dailyChallengeBest.best.endingTyp === "premier"
                          ? "Premiér"
                          : dailyChallengeBest.best.endingTyp === "vicepremier"
                          ? "Vicepremiér"
                          : dailyChallengeBest.best.endingTyp === "koalicni_partner"
                          ? "Koalice"
                          : "Opozice"}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Selector & Play button always shown to allow replay / play */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* Read only party card */}
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-750 space-y-2 shrink-0 w-full lg:w-72">
                <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                  Dnešní politická strana
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-6 rounded-sm shrink-0"
                    style={{ backgroundColor: STRANY[dailyConfig.partyId]?.barva || "#ff0000" }}
                  />
                  <div>
                    <h4 className="text-sm font-black text-white leading-none">
                      {STRANY[dailyConfig.partyId]?.nazev || dailyConfig.partyId}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Lídr: {STRANY[dailyConfig.partyId]?.lidr}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-300 pt-1 border-t border-slate-800/60 font-sans italic">
                  {STRANY[dailyConfig.partyId]?.popis.slice(0, 75)}...
                </div>
              </div>

              {/* Quick Advisor Choice */}
              <div className="flex-1 w-full space-y-2">
                <span className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">
                  Vybrat volebního poradce pro dnešní výzvu
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 font-sans">
                  {Object.values(PORADCI).map((adv) => {
                    const isSel = adv.id === dailySelectedAdvisorId;
                    return (
                      <button
                        key={adv.id}
                        type="button"
                        onClick={() => setDailySelectedAdvisorId(adv.id)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          isSel
                            ? "bg-amber-400 border-amber-300 text-slate-950 shadow-md font-bold"
                            : "bg-slate-950/40 border-slate-750 text-slate-300 hover:bg-slate-950/60 hover:text-white"
                        }`}
                      >
                        <span className="text-lg leading-none">{adv.emoji}</span>
                        <span className="text-[9px] line-clamp-1 leading-none">{adv.jmeno.split(" ")[1] || adv.jmeno}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-300 italic min-h-6">
                  💡 {PORADCI[dailySelectedAdvisorId]?.jmeno}: {PORADCI[dailySelectedAdvisorId]?.specialita}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handlePlayDailyChallenge}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-sans text-xs uppercase tracking-widest font-black rounded-xl shadow-md transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-slate-950" />
                {dailyChallengeBest ? "Zkusit to znovu (vylepšit skóre)" : "Zahrát dnešní výzvu"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// require fallback commented out
const require = {} as any;
const requireOld = (path: string) => {
  if (path.includes("data")) {
    return {
      SYMPATIE_INIT: require("../data").SYMPATIE_INIT,
    };
  }
  return {
    SYMPATIE_INIT: {
      ano: { ano: "x", motoriste: 75, spd: 60, ods: 30, top09: 10, kdu: 25, starostove: 10, pirati: 5, kscm: 65, socdem: 75, silnecz: 60, zeleni: 10 },
      motoriste: { ano: 75, motoriste: "x", spd: 55, ods: 35, top09: 30, kdu: 30, starostove: 25, pirati: 10, kscm: 15, socdem: 40, silnecz: 65, zeleni: 0 },
      spd: { ano: 60, motoriste: 55, spd: "x", ods: 5, top09: 5, kdu: 15, starostove: 5, pirati: 0, kscm: 65, socdem: 70, silnecz: 55, zeleni: 5 },
      ods: { ano: 30, motoriste: 35, spd: 5, ods: "x", top09: 85, kdu: 80, starostove: 80, pirati: 60, kscm: 5, socdem: 20, silnecz: 50, zeleni: 55 },
      top09: { ano: 10, motoriste: 30, spd: 5, ods: 85, top09: "x", kdu: 85, starostove: 90, pirati: 75, kscm: 5, socdem: 10, silnecz: 45, zeleni: 65 },
      kdu: { ano: 25, motoriste: 30, spd: 15, ods: 80, top09: 85, kdu: "x", starostove: 80, pirati: 60, kscm: 10, socdem: 20, silnecz: 60, zeleni: 65 },
      starostove: { ano: 10, motoriste: 25, spd: 5, ods: 80, top09: 90, kdu: 80, starostove: "x", pirati: 90, kscm: 5, socdem: 30, silnecz: 55, zeleni: 70 },
      pirati: { ano: 5, motoriste: 10, spd: 0, ods: 60, top09: 75, kdu: 60, starostove: 90, pirati: "x", kscm: 5, socdem: 15, silnecz: 40, zeleni: 95 },
      kscm: { ano: 65, motoriste: 15, spd: 65, ods: 5, top09: 5, kdu: 10, starostove: 5, pirati: 5, kscm: "x", socdem: 95, silnecz: 45, zeleni: 15 },
      socdem: { ano: 75, motoriste: 40, spd: 70, ods: 20, top09: 10, kdu: 20, starostove: 30, pirati: 15, kscm: 95, socdem: "x", silnecz: 55, zeleni: 30 },
      silnecz: { ano: 60, motoriste: 65, spd: 55, ods: 50, top09: 45, kdu: 60, starostove: 55, pirati: 40, kscm: 45, socdem: 55, silnecz: "x", zeleni: 35 },
      zeleni: { ano: 10, motoriste: 0, spd: 5, ods: 55, top09: 65, kdu: 65, starostove: 70, pirati: 95, kscm: 15, hover: 30, silnecz: 35, zeleni: "x" },
    },
  };
};
