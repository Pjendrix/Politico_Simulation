/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import SetupStage from "./components/SetupStage";
import MetricBar from "./components/MetricBar";
import PollingResults from "./components/PollingResults";
import CoalitionStage from "./components/CoalitionStage";
import EndingStage from "./components/EndingStage";
import DebateStage from "./components/DebateStage";
import ElectionsStage, { calculateElectionResults, calculatePartySeats } from "./components/ElectionsStage";
import CompassGeneration from "./components/CompassGeneration";
import { RngContext, useRng } from "./rngContext";
import { DailyConfig, generateDailyConfig, getTodayUtcDateString } from "./dailyChallenge";
import { createSeededRandom } from "./seededRandom";
import { motion, AnimatePresence } from "motion/react";
import { determineEndingTyp, normalizePreferencesTo100, resolveEndOfTurn, calculateZeroSumAdjustment } from "./gameUtils";
import { evaluateAchievements, AchievementContext, updatePrestigeAchievements, GameRunMetadata } from "./achievements";
import { unlockAchievements, UnlockedAchievementRecord, loadUnlockedAchievements } from "./achievementsStorage";

// Firebase Integration imports
import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  saveCampaignToCloud,
  loadCampaignFromCloud,
  clearCampaignOnCloud,
  submitLeaderboardEntryToCloud,
  submitDailyResultToCloud,
} from "./firebaseService";
import UserAuthBar from "./components/UserAuthBar";

import { STRANY, PORADCI, TUREK_KAUZY, TurekKauza } from "./data";
import { GameState, CategoricalEvent, GenericEvent, Choice, PodcastEvent, CoalitionDetails, EndingTyp, VelkaUdalost, LeaderboardEntrySummary, DailyBestRecord } from "./types";
import { PODCAST_EVENTY } from "./dataPodcasts";
import { VELKE_UDALOSTI } from "./velkeUdalosti";
import { MEDIA_EVENTS_TEMPLATES } from "./dataMediaEvents";
import { DEBATE_QUESTIONS } from "./dataDebates";
import { SVE_QUESTIONS } from "./dataSve";
import {
  Sparkles,
  HelpCircle,
  AlertTriangle,
  History,
  TrendingUp,
  ArrowRight,
  RotateCcw,
  X,
  Podcast,
  Check,
  RefreshCw,
} from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// --- Herní konstanty délky kampaně ---
// Pokud se v budoucnu změní délka hry nebo frekvence debat/pollů, měň POUZE tady.
const TOTAL_GAME_TURNS = 25;
const POLL_INTERVAL_TURNS = 5;
const DEBATE_TURNS: readonly number[] = [10, 20];
const isDebateTurn = (turn: number): boolean => DEBATE_TURNS.includes(turn);

const TurekSvgPortrait = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-28 sm:h-28 text-white filter grayscale drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" className="opacity-40" />
    <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="2" />
    <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="0.5" className="opacity-30" />
    
    <g transform="translate(10, 10)">
      <path d="M 30 18 C 30 18, 48 10, 68 18 C 72 20, 75 25, 75 32 C 75 38, 70 42, 65 42 C 58 42, 55 35, 48 35 C 40 35, 33 42, 25 40 C 20 38, 18 32, 20 25 C 22 18, 30 18, 30 18 Z" fill="currentColor" />
      
      <path d="M 18 45 C 18 40, 20 40, 22 45 C 23 48, 20 53, 18 51" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M 82 45 C 82 40, 80 40, 78 45 C 77 48, 80 53, 82 51" fill="none" stroke="currentColor" strokeWidth="2.5" />

      <path d="M 22 35 L 22 55 C 22 68, 32 75, 50 75 C 68 75, 78 68, 78 55 L 78 35" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="miter" />

      <rect x="26" y="42" width="20" height="15" rx="3" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="54" y="42" width="20" height="15" rx="3" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
      <line x1="46" y1="47" x2="54" y2="47" stroke="currentColor" strokeWidth="3.5" />
      <line x1="18" y1="45" x2="26" y2="45" stroke="currentColor" strokeWidth="2" />
      <line x1="74" y1="45" x2="82" y2="45" stroke="currentColor" strokeWidth="2" />

      <line x1="42" y1="64" x2="58" y2="64" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      
      <path d="M 32 85 L 50 78 L 68 85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 50 78 L 47 90 L 53 90 Z" fill="currentColor" />
    </g>
  </svg>
);

export default function App() {
  // Firebase Auth and sync states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<"none" | "syncing" | "synced" | "error">("none");
  const [cloudErrorDetails, setCloudErrorDetails] = useState<string | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState<boolean>(false);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setInitialSyncDone(false);
      setCloudErrorDetails(null);
    });
    return () => unsubscribe();
  }, []);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameMode, setGameMode] = useState<"normal" | "daily">("normal");
  const [dailyConfig, setDailyConfig] = useState<DailyConfig | null>(null);
  const [dailySubmitStatus, setDailySubmitStatus] = useState<"not_daily" | "submitting" | "success" | "error">("not_daily");
  const [dailyIsNewBest, setDailyIsNewBest] = useState<boolean>(false);
  const [dailyAttempts, setDailyAttempts] = useState<number>(1);
  const [dailyBestResult, setDailyBestResult] = useState<DailyBestRecord | null>(null);

  const activeRng = React.useMemo(() => {
    if (gameMode === "daily" && dailyConfig) {
      return createSeededRandom(dailyConfig.gameplaySeed);
    }
    return Math.random;
  }, [gameMode, dailyConfig]);
  const rng = activeRng;
  const [currentStage, setCurrentStage] = useState<
    "setup" | "compass_generation" | "gameplay" | "poll" | "elections" | "coalition" | "ending"
  >("setup");

  // Active event states
  const [activeEvent, setActiveEvent] = useState<CategoricalEvent | GenericEvent | null>(null);
  const [eventType, setEventType] = useState<"categorical" | "generic" | null>(null);
  const [encounteredEventIds, setEncounteredEventIds] = useState<string[]>([]);
  const [encounteredPodcastIds, setEncounteredPodcastIds] = useState<string[]>([]);

  // Resolution review screen (shows results of the turn action before clicking Next)
  const [turnResult, setTurnResult] = useState<{
    flavor: string;
    choiceLetter?: "A" | "B" | "C" | "D";
    changes: string[];
    isGeneric?: boolean;
    isBoycott?: boolean;
    oldPref?: number;
    newPref?: number;
    isMediaEvent?: boolean;
    isGenEvent?: boolean;
    isKrizEvent?: boolean;
    vztahyChanges?: Array<{
      partyId: string;
      partyName: string;
      delta: number;
      currentTrust: number;
    }>;
  } | null>(null);

  // Coalition and ending final values
  const [coalitionResults, setCoalitionResults] = useState<CoalitionDetails | null>(null);
  const [gameVictory, setGameVictory] = useState<boolean>(false);
  const [endingTyp, setEndingTyp] = useState<EndingTyp | null>(null);

  // Draw random event selection animation state support for 3 options (Debate: 55%, Media: 25%, Podcast: 20%)
  const [drawAnimation, setDrawAnimation] = useState<{
    active: boolean;
    resultType: "debaty" | "media" | "podcast" | null;
    targetEvent: any;
    isCycling: boolean;
    currentShowcased: "debaty" | "media" | "podcast";
  } | null>(null);

  // Persistence/Saved Game & Leaderboard States
  const [savedGame, setSavedGame] = useState<any>(null);
  const [viewingLeaderboardRun, setViewingLeaderboardRun] = useState<LeaderboardEntrySummary | null>(null);

  // Active Podcast Event state
  const [activePodcastEvent, setActivePodcastEvent] = useState<{
    podcast: string;
    text: string;
    isPositive: boolean;
    delta: number;
  } | null>(null);

  const [pendingNextState, setPendingNextState] = useState<GameState | null>(null);
  const [pendingNextStage, setPendingNextStage] = useState<string | null>(null);

  // Active Large Event Popup state for the modern popup request
  const [activeLargeEventPopup, setActiveLargeEventPopup] = useState<VelkaUdalost | null>(null);

  // Active Filip Turek controversy popup
  const [activeTurekKauza, setActiveTurekKauza] = useState<{
    nazev: string;
    popis: string;
    dopad: number;
  } | null>(null);

  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<UnlockedAchievementRecord[]>([]);

  const rollPodcastEvent = (
    basePreference: number,
    poradceId: string
  ): {
    podcastData: { id: string; podcast: string; text: string; isPositive: boolean; delta: number } | null;
    podcastLog: { turn: number; type: "system"; title: string; description: string; changes: string[] } | null;
    nextPrefAfterPodcast: number;
  } => {
    if (!gameState) {
      return {
        podcastData: null,
        podcastLog: null,
        nextPrefAfterPodcast: basePreference,
      };
    }

    const rollPodcast = false; // Disabled to prevent random pop-ups as requested

    if (!rollPodcast) {
      return {
        podcastData: null,
        podcastLog: null,
        nextPrefAfterPodcast: basePreference,
      };
    }

    const availablePodcasts = PODCAST_EVENTY.filter(
      (p) => !encounteredPodcastIds.includes(p.id)
    );
    const pool = availablePodcasts.length > 0 ? availablePodcasts : PODCAST_EVENTY;
    const randomPodcast = pool[Math.floor(rng() * pool.length)];
    const effectVal = parseFloat((rng() * (1.5 - 0.5) + 0.5).toFixed(1));
    const isPositive = randomPodcast.typ === "Pozitivní";
    const signedDelta = isPositive ? effectVal : -effectVal;

    const podcastData = {
      id: randomPodcast.id,
      podcast: randomPodcast.podcast,
      text: randomPodcast.text,
      isPositive,
      delta: Math.abs(signedDelta),
    };

    // Add podcast id to encountered list to prevent repeat
    setEncounteredPodcastIds((prev) => {
      if (prev.includes(randomPodcast.id)) return prev;
      return [...prev, randomPodcast.id];
    });

    const nextPrefAfterPodcast = Math.max(0, parseFloat((basePreference + signedDelta).toFixed(1)));

    const podcastLog = {
      turn: gameState.turn,
      type: "system" as const,
      title: `🎙️ Podcast: ${podcastData.podcast}`,
      description: podcastData.text,
      changes: [
        `Volební preference: ${isPositive ? "+" : "-"}${podcastData.delta.toFixed(1)} %`
      ],
    };

    return {
      podcastData,
      podcastLog,
      nextPrefAfterPodcast,
    };
  };

  // Shared Helper: Simulate Společenský kompas progression, Random drifting,
  // Přelomové události (Large Events), Voter Pressure computations, and Zero-sum offsets.
  // Performs centralized NPC properties simulation (resolves #1).
  const processEndTurnPoliticsState = (
    nextPref: number,
    nextBudget: number,
    baseLogs: any[],
    npcPreferredMap: Record<string, number>,
    skipPodcast: boolean = false,
    overrideStats?: any,
    stateOverride?: GameState
  ) => {
    const activeGameState = stateOverride || gameState;
    if (!activeGameState) {
      return {
        nextState: null,
        rollPodcast: false,
        podcastData: null,
      };
    }

    // 1. NPC ATTR AND SYMPATHY SIMULATION (Moved from handlers to resolve issue #1)
    const nextNpcAtributy = { ...activeGameState.npcAtributy };
    const nextNpcTrust = structuredClone(activeGameState.npcTrust); // Deep clones safely (resolves #7)
    const npcIds = Object.keys(STRANY);

    // A) Simulate NPC Attributes:
    npcIds.forEach((id) => {
      const attrObj = nextNpcAtributy[id];
      if (attrObj && id !== activeGameState.stranaId) {
        (["ekonomika", "kultura", "evropa", "stylPolitiky"] as const).forEach((key) => {
          const rand = rng() * 100;
          let diffSum = 0;
          if (rand < 2.5) diffSum = 10;
          else if (rand < 5.0) diffSum = -10;
          else if (rand < 10.0) diffSum = 5;
          else if (rand < 15.0) diffSum = -5;

          if (diffSum !== 0) {
            attrObj[key] = Math.max(0, Math.min(100, attrObj[key] + diffSum));
          }
        });
      }
    });

    // B) Simulate NPC Sympathies:
    npcIds.forEach((id) => {
      const trustMap = nextNpcTrust[id];
      if (trustMap && id !== activeGameState.stranaId) {
        const rand = rng() * 105;

        if (rand < 25) {
          const target = npcIds[Math.floor(rng() * npcIds.length)];
          if (trustMap[target] !== "x") {
            trustMap[target] = Math.max(0, Math.min(100, (trustMap[target] as number) + 5));
          }
        } else if (rand < 50) {
          const target = npcIds[Math.floor(rng() * npcIds.length)];
          if (trustMap[target] !== "x") {
            trustMap[target] = Math.max(0, Math.min(100, (trustMap[target] as number) - 5));
          }
        } else if (rand < 60) {
          npcIds.forEach((target) => {
            if (trustMap[target] !== "x") {
              trustMap[target] = Math.max(0, Math.min(100, (trustMap[target] as number) + 5));
            }
          });
        } else if (rand < 70) {
          npcIds.forEach((target) => {
            if (trustMap[target] !== "x") {
              trustMap[target] = Math.max(0, Math.min(100, (trustMap[target] as number) - 5));
            }
          });
        }
      }
    });

    // 2. Společenský kompas progression
    const currentCompass = activeGameState.spolecenskyKompas || { ekonomika: 50, kultura: 50, evropa: 50, stylPolitiky: 50 };
    const prevCompass = { ...currentCompass };
    const nextCompass = { ...currentCompass };

    // A) Base drift of ±1 to ±3 on all 4 axes
    (["ekonomika", "kultura", "evropa", "stylPolitiky"] as const).forEach((key) => {
      const dirShift = rng() < 0.5 ? 1 : -1;
      const mag = Math.floor(rng() * 3) + 1; // 1, 2, 3
      nextCompass[key] = Math.min(100, Math.max(0, nextCompass[key] + dirShift * mag));
    });

    // B) 8% chance for Velká Udalost (Large Event)
    const nextVelkeUdalostiHistory = activeGameState.velkeUdalostiHistory ? [...activeGameState.velkeUdalostiHistory] : [];
    let largeEventLog: any = null;
    let triggeredLargeEvent: VelkaUdalost | null = null;

    if (nextVelkeUdalostiHistory.length < 2 && rng() < 0.08) {
      const availableLarge = VELKE_UDALOSTI.filter(
        (v) => !nextVelkeUdalostiHistory.includes(v.id)
      );
      if (availableLarge.length > 0) {
        const pickedLarge = availableLarge[Math.floor(rng() * availableLarge.length)];
        nextVelkeUdalostiHistory.push(pickedLarge.id);

        Object.entries(pickedLarge.atributDrift).forEach(([key, val]) => {
          const k = key as keyof typeof nextCompass;
          nextCompass[k] = Math.min(100, Math.max(0, nextCompass[k] + val));
        });

        largeEventLog = {
          turn: activeGameState.turn,
          type: "system" as const,
          title: `🚨 PŘELOMOVÁ UDÁLOST: ${pickedLarge.nazev}`,
          description: pickedLarge.popis,
          changes: Object.entries(pickedLarge.atributDrift)
            .filter(([_, val]) => val !== 0)
            .map(([key, val]) => {
              const label = key === "ekonomika" ? "Ekonomika" : key === "kultura" ? "Kultura" : key === "evropa" ? "Evropa" : "Styl politiky";
              return `Posun v kompasu: ${label} ${val > 0 ? "+" : ""}${val}%`;
            })
        };
        triggeredLargeEvent = pickedLarge;
      }
    }

    // 3. Compass pressure calculations
    const vypoctiOsuTlak = (diff: number): number => {
      if (diff <= 10) {
        return 0.6 - (diff / 10) * 0.2;
      } else if (diff <= 25) {
        return 0.3 - ((diff - 11) / 14) * 0.2;
      } else if (diff <= 40) {
        return -0.1 - ((diff - 26) / 14) * 0.2;
      } else if (diff <= 60) {
        return -0.4 - ((diff - 41) / 19) * 0.4;
      } else {
        const clamped = Math.min(100, diff);
        return -0.9 - ((clamped - 61) / 39) * 0.6;
      }
    };

    const vypoctiKompasovyTlak = (
      attrs: { ekonomika: number; kultura: number; evropa: number; stylPolitiky: number },
      kompas: typeof nextCompass
    ): number => {
      const distEkonomika = Math.abs(attrs.ekonomika - kompas.ekonomika);
      const distKultura = Math.abs(attrs.kultura - kompas.kultura);
      const distEvropa = Math.abs(attrs.evropa - kompas.evropa);
      const distStyl = Math.abs(attrs.stylPolitiky - kompas.stylPolitiky);

      return (
        vypoctiOsuTlak(distEkonomika) +
        vypoctiOsuTlak(distKultura) +
        vypoctiOsuTlak(distEvropa) +
        vypoctiOsuTlak(distStyl)
      );
    };

    const hracZisk = vypoctiKompasovyTlak(activeGameState.atributy, nextCompass);
    const npcZisky: Record<string, number> = {};
    Object.keys(npcPreferredMap).forEach((partyId) => {
      const attrs = nextNpcAtributy[partyId] || { ekonomika: 50, kultura: 50, evropa: 50, stylPolitiky: 50 };
      npcZisky[partyId] = vypoctiKompasovyTlak(attrs, nextCompass);
    });

    const vsechnyStranyIds = [activeGameState.stranaId, ...Object.keys(npcPreferredMap)];
    const celkovyZisk = hracZisk + Object.values(npcZisky).reduce((a, b) => a + b, 0);
    const prumernyZisk = celkovyZisk / vsechnyStranyIds.length;

    const hracCiste = hracZisk - prumernyZisk;
    const npcCiste: Record<string, number> = {};
    Object.keys(npcZisky).forEach((id) => {
      npcCiste[id] = npcZisky[id] - prumernyZisk;
    });

    // Apply pressure gains
    const rawPlayerPref = Math.max(0.1, nextPref + hracCiste);
    const rawNpcPrefs: Record<string, number> = {};
    Object.entries(npcPreferredMap).forEach(([id, pref]) => {
      rawNpcPrefs[id] = Math.max(0.1, pref + npcCiste[id]);
    });

    // Zero-sum normalize back to 100.0% — reuses the same residual-distribution
    // logic as normalizePreferencesTo100 (largest party absorbs rounding residue,
    // not an arbitrary last key in object iteration order).
    const { playerPref: finalPlayerPref, npcPrefs: finalNpcPrefs } = normalizePreferencesTo100(
      rawPlayerPref,
      rawNpcPrefs,
      activeGameState.stranaId
    );

    // 3. Roll podcast using already normal preferences context
    const {
      podcastData,
      podcastLog,
      nextPrefAfterPodcast,
    } = skipPodcast
      ? { podcastData: null, podcastLog: null, nextPrefAfterPodcast: finalPlayerPref }
      : rollPodcastEvent(finalPlayerPref, activeGameState.poradceId);

    let fullyFinalNpcPrefs = { ...finalNpcPrefs };
    if (podcastData) {
      const deltaPref = nextPrefAfterPodcast - finalPlayerPref;
      fullyFinalNpcPrefs = calculateZeroSumAdjustment(deltaPref, activeGameState.stranaId, finalNpcPrefs, undefined, nextPrefAfterPodcast);
    }

    // 4. Concat all log events
    const resultLogs = [...baseLogs];
    if (largeEventLog) {
      resultLogs.unshift(largeEventLog);
    }
    if (podcastLog) {
      resultLogs.unshift(podcastLog);
    }

    const nextTurnValue = activeGameState.turn + 1;

    const podcastDeltaVal = podcastData ? (nextPrefAfterPodcast - finalPlayerPref) : 0;
    const compassDeltaVal = finalPlayerPref - nextPref;

    const currentStats = overrideStats || activeGameState.stats || {
      prefMimoradne: 0,
      prefBezny: 0,
      prefDebaty: 0,
      prefMedia: 0,
      prefPodcasty: 0,
      prefCompass: 0,
      prefPenalizace: 0,
      bestDebateAxesOver10: 0,
      initialBudget: activeGameState.budget,
      initialPreference: activeGameState.preference,
    };
    const nextStats = {
      ...currentStats,
      prefPodcasty: (currentStats.prefPodcasty || 0) + podcastDeltaVal,
      prefCompass: (currentStats.prefCompass || 0) + compassDeltaVal,
    };

    const lastTurnPrefChangeVal = nextPrefAfterPodcast - activeGameState.preference;

    const nextState: GameState = {
      ...activeGameState,
      turn: nextTurnValue,
      preference: nextPrefAfterPodcast,
      budget: nextBudget,
      npcPreferred: fullyFinalNpcPrefs,
      npcTrust: nextNpcTrust,
      npcAtributy: nextNpcAtributy,
      spolecenskyKompas: nextCompass,
      prevSpolecenskyKompas: prevCompass,
      velkeUdalostiHistory: nextVelkeUdalostiHistory,
      history: [...resultLogs, ...activeGameState.history],
      stats: nextStats,
      lastTurnPrefChange: lastTurnPrefChangeVal,
      lastActionState: undefined,
      preferenceHistory: activeGameState.preferenceHistory
        ? [...activeGameState.preferenceHistory, nextPrefAfterPodcast]
        : [activeGameState.preference, nextPrefAfterPodcast],
    };

    return {
      nextState,
      rollPodcast: !!podcastData,
      podcastData,
      triggeredLargeEvent,
    };
  };

  // Retrieve saved game at startup or on user login
  useEffect(() => {
    let active = true;
    const todayStr = getTodayUtcDateString();

    if (currentUser) {
      setSyncStatus("syncing");
      setCloudErrorDetails(null);
      loadCampaignFromCloud(currentUser.uid)
        .then((cloudSave) => {
          if (!active) return;
          if (cloudSave) {
            // Check stale daily challenge save
            if (cloudSave.gameState?.dailyDate && cloudSave.gameState.dailyDate !== todayStr) {
              clearCampaignOnCloud(currentUser.uid);
              try {
                localStorage.removeItem("campaignSave");
              } catch (e) {}
              setSavedGame(null);
              setSyncStatus("none");
              setInitialSyncDone(true);
            } else {
              setSavedGame(cloudSave);
              setSyncStatus("synced");
              setCloudErrorDetails(null);
              setInitialSyncDone(true);
            }
          } else {
            // Check if local save exists to sync to cloud!
            try {
              const localRaw = localStorage.getItem("campaignSave");
              if (localRaw) {
                const parsed = JSON.parse(localRaw);
                if (parsed && parsed.gameState && parsed.currentStage) {
                  // Check stale daily challenge save locally
                  if (parsed.gameState.dailyDate && parsed.gameState.dailyDate !== todayStr) {
                    localStorage.removeItem("campaignSave");
                    setSavedGame(null);
                    setSyncStatus("none");
                    setInitialSyncDone(true);
                  } else {
                    setSavedGame(parsed);
                    // Sync local save to cloud immediately
                    saveCampaignToCloud(currentUser.uid, parsed)
                      .then(() => {
                        if (active) {
                          setSyncStatus("synced");
                          setCloudErrorDetails(null);
                          setInitialSyncDone(true);
                        }
                      })
                      .catch((err) => {
                        if (active) {
                          setSyncStatus("error");
                          setCloudErrorDetails(err instanceof Error ? err.message : String(err));
                          setInitialSyncDone(true);
                        }
                      });
                  }
                } else {
                  setSavedGame(null);
                  setSyncStatus("none");
                  setInitialSyncDone(true);
                }
              } else {
                setSavedGame(null);
                setSyncStatus("none");
                setInitialSyncDone(true);
              }
            } catch (e) {
              setSavedGame(null);
              setSyncStatus("none");
              setInitialSyncDone(true);
            }
          }
        })
        .catch((err) => {
          console.error("Error reading from Firestore:", err);
          if (active) {
            setSyncStatus("error");
            setCloudErrorDetails(err instanceof Error ? err.message : String(err));
            setInitialSyncDone(true);
          }
        });
    } else {
      // Offline / not logged in
      try {
        const raw = localStorage.getItem("campaignSave");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.gameState && parsed.currentStage) {
            if (parsed.gameState.dailyDate && parsed.gameState.dailyDate !== todayStr) {
              localStorage.removeItem("campaignSave");
              setSavedGame(null);
            } else {
              setSavedGame(parsed);
            }
          } else {
            setSavedGame(null);
          }
        } else {
          setSavedGame(null);
        }
      } catch (e) {
        console.error("Error reading campaignSave from localStorage", e);
      }
      setSyncStatus("none");
      setCloudErrorDetails(null);
      setInitialSyncDone(true);
    }

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Debounce ref pro cloud-save — zabraňuje Firestore write na KAŽDÝ tah hry
  const cloudSaveDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state to appropriate storage (local / cloud) dynamically
  useEffect(() => {
    // Avoid autosaving or overwriting until the initial cloud load resolves
    if (!initialSyncDone) return;

    // Cleanup any pending debounced save when dependencies change
    if (cloudSaveDebounceRef.current) {
      clearTimeout(cloudSaveDebounceRef.current);
      cloudSaveDebounceRef.current = null;
    }

    if (currentStage === "ending" || currentStage === "setup" || !gameState) {
      if (currentUser) {
        setSyncStatus("syncing");
        clearCampaignOnCloud(currentUser.uid)
          .then(() => {
            setSyncStatus("none");
            setCloudErrorDetails(null);
          })
          .catch((err) => {
            setSyncStatus("error");
            setCloudErrorDetails(err instanceof Error ? err.message : String(err));
          });
      } else {
        try {
          localStorage.removeItem("campaignSave");
        } catch (e) {
          // Safe check
        }
      }
      return;
    }

    const saveObj = {
      gameState,
      currentStage,
      gameVictory,
      coalitionResults,
      endingTyp,
      encounteredEventIds,
      encounteredPodcastIds,
    };

    // localStorage zůstává okamžitý — je to lokální/levná operace a slouží
    // jako recovery při refreshi, nehrozí u ní nákladové riziko.
    if (!currentUser) {
      try {
        localStorage.setItem("campaignSave", JSON.stringify(saveObj));
      } catch (e) {
        console.error("Failed to save to localStorage", e);
      }
      return;
    }

    // Cloud save je debouncovaný — čeká 2.5s klidu od poslední změny gameState,
    // než provede Firestore setDoc. Zabraňuje to jednomu writu na každý tah.
    setSyncStatus("syncing");
    cloudSaveDebounceRef.current = setTimeout(() => {
      saveCampaignToCloud(currentUser.uid, saveObj)
        .then(() => {
          setSyncStatus("synced");
          setCloudErrorDetails(null);
        })
        .catch((err) => {
          console.error("Failed to sync to firestore:", err);
          setSyncStatus("error");
          setCloudErrorDetails(err instanceof Error ? err.message : String(err));
        });
    }, 2500);

    return () => {
      if (cloudSaveDebounceRef.current) {
        clearTimeout(cloudSaveDebounceRef.current);
        cloudSaveDebounceRef.current = null;
      }
    };
  }, [gameState, currentStage, gameVictory, coalitionResults, endingTyp, encounteredEventIds, encounteredPodcastIds, currentUser, initialSyncDone]);

  // Log completed runs to the local and cloud Leaderboard
  useEffect(() => {
    if (currentStage === "ending" && gameState) {
      if (gameState.hasWithdrawn === true || gameState.isEarlyElection === true) {
        setNewlyUnlockedAchievements([]);
        return;
      }

      const loggedKey = "lastLoggedEnding_" + gameState.stranaId + "_" + gameState.turn + "_" + gameState.preference;
      const isLogged = sessionStorage.getItem(loggedKey);
      if (isLogged) return;
      sessionStorage.setItem(loggedKey, "true");

      const playerParty = STRANY[gameState.stranaId];
      const advisor = PORADCI[gameState.poradceId] || PORADCI["populista"];
      const initialPreference = gameState.stats?.initialPreference ?? playerParty?.preference ?? 30.0;
      const prefChange = gameState.preference - initialPreference;
      const playerSeats = coalitionResults?.playerSeats || 0;

      const computedTyp = determineEndingTyp(gameVictory ?? false, gameState, coalitionResults);

      // Kampaň ukončena - vyhodnoťme a uložme Prestižní progres
      const runMeta: GameRunMetadata = {
        totalRounds: Math.min(25, gameState.turn - 1),
        roundsSkipped: gameState.roundsSkipped || 0,
        debatesSkipped: gameState.debatesSkipped || 0,
        earlyElectionTriggered: !!gameState.isEarlyElection,
        isDailyChallenge: gameMode === "daily",
      };

      const currentPrestigeProgress = (() => {
        try {
          const raw = localStorage.getItem("prestigeAchievementsProgress") || "{}";
          return JSON.parse(raw);
        } catch {
          return {};
        }
      })();

      const updatedPrestigeProgress = updatePrestigeAchievements(
        runMeta,
        gameState.stranaId,
        computedTyp,
        computedTyp === "premier" || computedTyp === "vicepremier",
        currentPrestigeProgress,
        gameState.preference
      );

      try {
        localStorage.setItem("prestigeAchievementsProgress", JSON.stringify(updatedPrestigeProgress));
      } catch (err) {
        console.error("Failed to save prestige progress:", err);
      }

      const existingUnlocked = new Set(loadUnlockedAchievements().map((r) => r.id));
      const achievementCtx: AchievementContext = {
        state: gameState,
        endingTyp: computedTyp,
        coalitionResults,
        gameVictory: gameVictory ?? false,
        unlockedIds: existingUnlocked,
      };
      const earnedIds = evaluateAchievements(achievementCtx);
      const newly = unlockAchievements(earnedIds, {
        partyZkratka: playerParty?.zkratka || "",
        date: new Date().toLocaleDateString("cs-CZ"),
      });
      setNewlyUnlockedAchievements(newly);

      const compactGameState = {
        stranaId: gameState.stranaId,
        poradceId: gameState.poradceId,
        preference: gameState.preference,
        budget: gameState.budget,
        atributy: gameState.atributy,
        spolecenskyKompas: gameState.spolecenskyKompas,
        stats: gameState.stats,
        trust: gameState.trust,
        electionResults: gameState.electionResults,
        npcPreferred: gameState.npcPreferred,
        npcAtributy: gameState.npcAtributy,
        npcTrust: gameState.npcTrust,
        preferenceHistory: gameState.preferenceHistory,
        hasWithdrawn: gameState.hasWithdrawn,
      };

      const compactCoalitionResults = coalitionResults ? {
        playerSeats: coalitionResults.playerSeats,
        invitedPartyIds: coalitionResults.invitedPartyIds,
        acceptedPartyIds: coalitionResults.acceptedPartyIds,
        totalSeats: coalitionResults.totalSeats,
        parliamentSeats: coalitionResults.parliamentSeats,
      } : null;

      const newEntry: LeaderboardEntrySummary = {
        id: Date.now().toString(),
        partyZkratka: playerParty?.zkratka || gameState.stranaId.toUpperCase(),
        partyName: playerParty?.nazev || "",
        partyBarva: playerParty?.barva || "#ffffff",
        preference: gameState.preference,
        initialPreference,
        prefChange,
        seats: playerSeats,
        isGovernment: gameVictory ?? false,
        advisorName: advisor?.jmeno || "",
        date: new Date().toLocaleDateString("cs-CZ"),
        gameState: compactGameState,
        coalitionResults: compactCoalitionResults,
        gameVictory: gameVictory ?? false,
        endingTyp: computedTyp,
      };

      // 1. Submit to Local Storage Leaderboard
      try {
        const rawLeaderboard = localStorage.getItem("leaderboardSavedHistory") || "[]";
        const historyList = JSON.parse(rawLeaderboard);
        const updatedHistory = [...historyList, newEntry]
          .sort((a, b) => {
            const aInit = a.initialPreference ?? (STRANY[a.gameState?.stranaId]?.preference ?? 0);
            const bInit = b.initialPreference ?? (STRANY[b.gameState?.stranaId]?.preference ?? 0);
            const aChange = a.prefChange !== undefined ? a.prefChange : (a.preference - aInit);
            const bChange = b.prefChange !== undefined ? b.prefChange : (b.preference - bInit);
            return bChange - aChange;
          })
          .slice(0, 5);

        localStorage.setItem("leaderboardSavedHistory", JSON.stringify(updatedHistory));
      } catch (e) {
        console.error("Failed to save to local leaderboard", e);
      }

      // 1b. Submit to per-party "personal best" Local Storage record
      // Toto je NEZÁVISLÉ na Top 5 leaderboardu výše — ukládá se sem jeden
      // nejlepší výsledek pro KAŽDOU stranu, bez ořezávání na top N.
      if (gameMode !== "daily") {
        try {
          const rawBestByParty = localStorage.getItem("bestResultByParty") || "{}";
          const bestByParty: Record<string, LeaderboardEntrySummary> = JSON.parse(rawBestByParty);
          const partyKey = newEntry.gameState?.stranaId || gameState.stranaId;
          const existingBest = bestByParty[partyKey];

          const isNewPartyBest =
            !existingBest ||
            newEntry.prefChange > existingBest.prefChange ||
            (newEntry.prefChange === existingBest.prefChange &&
              (newEntry.seats > existingBest.seats || newEntry.preference > existingBest.preference));

          if (isNewPartyBest) {
            bestByParty[partyKey] = newEntry;
            localStorage.setItem("bestResultByParty", JSON.stringify(bestByParty));
          }
        } catch (e) {
          console.error("Failed to save per-party best result", e);
        }
      }

      // 2. Submit to Cloud Leaderboard if logged in!
      if (currentUser) {
        setSyncStatus("syncing");
        const cloudEntry = {
          ...newEntry,
          userId: currentUser.uid,
          displayName: currentUser.displayName || "Anonymní Kandidát",
          photoURL: currentUser.photoURL || "",
        };
        submitLeaderboardEntryToCloud(cloudEntry)
          .then(() => {
            setSyncStatus("synced");
          })
          .catch((err) => {
            console.error("Failed to sync entry to cloud leaderboard:", err);
            setSyncStatus("error");
          });
      }
    }
  }, [currentStage, gameState, gameVictory, coalitionResults, currentUser, gameMode]);

  // Initialize the game state after SetupStage completes
  const handleStartGame = (initialState: GameState, isDaily?: boolean, dailyCfg?: DailyConfig) => {
    if (isDaily && dailyCfg) {
      setGameMode("daily");
      setDailyConfig(dailyCfg);
    } else {
      setGameMode("normal");
      setDailyConfig(null);
    }

    setGameState(initialState);
    setEncounteredEventIds([]);
    setEncounteredPodcastIds([]);
    setTurnResult(null);
    setCoalitionResults(null);
    setSavedGame(null); // Clear loaded reference
    
    if (currentUser) {
      setSyncStatus("syncing");
      clearCampaignOnCloud(currentUser.uid)
        .then(() => setSyncStatus("none"))
        .catch(() => setSyncStatus("error"));
    } else {
      try {
        localStorage.removeItem("campaignSave"); // Overwrite save slot
      } catch (e) {}
    }

    if (isDaily) {
      setCurrentStage("gameplay");
    } else {
      setCurrentStage("compass_generation");
    }
  };

  const handleContinueGame = () => {
    if (!savedGame) return;
    try {
      if (savedGame.gameState?.dailyDate) {
        setGameMode("daily");
        setDailyConfig(generateDailyConfig(savedGame.gameState.dailyDate));
      } else {
        setGameMode("normal");
        setDailyConfig(null);
      }
      setGameState(savedGame.gameState);
      setCurrentStage(savedGame.currentStage);
      setGameVictory(savedGame.gameVictory !== undefined ? savedGame.gameVictory : false);
      setCoalitionResults(savedGame.coalitionResults !== undefined ? savedGame.coalitionResults : null);
      setEndingTyp(savedGame.endingTyp !== undefined ? savedGame.endingTyp : null);
      if (savedGame.encounteredEventIds) {
        setEncounteredEventIds(savedGame.encounteredEventIds);
      }
      setEncounteredPodcastIds(savedGame.encounteredPodcastIds ?? []);
      setTurnResult(null);
    } catch (e) {
      console.error("Failed to restore saved game, fallback to new game", e);
      setSavedGame(null);
    }
  };

  const dailySubmittedRef = React.useRef<string | null>(null);

  // Auto-submit daily results when the ending stage is reached
  useEffect(() => {
    if (
      currentStage === "ending" &&
      gameMode === "daily" &&
      dailyConfig &&
      gameState &&
      gameState.dailyDate === dailyConfig.date
    ) {
      // Avoid duplicate submissions for this specific date and ending pref
      const submissionKey = `${dailyConfig.date}_${gameState.preference}_${endingTyp}`;
      if (dailySubmittedRef.current === submissionKey) return;
      dailySubmittedRef.current = submissionKey;

      const currentParty = STRANY[gameState.stranaId];
      const initialPref = gameState.stats?.initialPreference ?? currentParty.preference;
      const prefChangeVal = gameState.preference - initialPref;
      const finalEnding = endingTyp || (gameVictory ? "premier" : "opozice");
      const seatsCount = coalitionResults?.playerSeats || 0;

      // Prepare core candidate run details
      const currentRunBestCandidate = {
        preference: gameState.preference,
        initialPreference: initialPref,
        prefChange: prefChangeVal,
        endingTyp: finalEnding as EndingTyp,
        seats: seatsCount,
        poradceId: gameState.poradceId,
        partyId: gameState.stranaId,
      };

      // Read existing record from localStorage
      let existingRecord: DailyBestRecord | null = null;
      try {
        const stored = localStorage.getItem("dailyChallengeBest");
        if (stored) {
          const parsed = JSON.parse(stored) as DailyBestRecord;
          if (parsed && parsed.date === dailyConfig.date) {
            existingRecord = parsed;
          }
        }
      } catch (err) {
        console.error("Failed to read dailyChallengeBest from localStorage:", err);
      }

      let isNewBest = false;
      let newAttemptsCount = 1;
      let finalBestRecord: DailyBestRecord;

      if (!existingRecord) {
        // First play of the day
        isNewBest = true;
        newAttemptsCount = 1;
        finalBestRecord = {
          date: dailyConfig.date,
          attempts: 1,
          best: currentRunBestCandidate,
        };
      } else {
        // Replaying daily challenge
        newAttemptsCount = existingRecord.attempts + 1;
        if (prefChangeVal > existingRecord.best.prefChange) {
          isNewBest = true;
        } else if (prefChangeVal === existingRecord.best.prefChange) {
          // Tie breakers: seats or preference percentage
          if (seatsCount > existingRecord.best.seats || gameState.preference > existingRecord.best.preference) {
            isNewBest = true;
          }
        }

        finalBestRecord = {
          date: dailyConfig.date,
          attempts: newAttemptsCount,
          best: isNewBest ? currentRunBestCandidate : existingRecord.best,
        };
      }

      // Update state hooks to display correctly in EndingStage
      setDailyIsNewBest(isNewBest);
      setDailyAttempts(newAttemptsCount);
      setDailyBestResult(finalBestRecord);

      // Write updated best record and summary back to localStorage
      try {
        localStorage.setItem("dailyChallengeBest", JSON.stringify(finalBestRecord));
        // Simple legacy key for support:
        localStorage.setItem("dailyChallengeCompleted", JSON.stringify({
          date: finalBestRecord.date,
          preference: finalBestRecord.best.preference,
          prefChange: finalBestRecord.best.prefChange,
          seats: finalBestRecord.best.seats,
          endingTyp: finalBestRecord.best.endingTyp,
        }));
      } catch (err) {
        console.error("Failed to write dailyChallengeBest to localStorage:", err);
      }

      // 2. Clear saved standard gameplay campaign immediately so they can't resume to cheat
      try {
        localStorage.removeItem("savedGameState_v1");
        setSavedGame(null);
      } catch (e) {
        console.error("Failed to clear saved campaign:", e);
      }

      // 3. Conditional cloud submission is bypassed since daily leaderboard is removed.
      if (currentUser) {
        // Clear saved game on cloud too for daily challenge integrity
        clearCampaignOnCloud(currentUser.uid).catch(console.error);
      }
      setDailySubmitStatus("success");
    }
  }, [
    currentStage,
    gameMode,
    dailyConfig,
    gameState,
    currentUser,
    endingTyp,
    gameVictory,
    coalitionResults,
  ]);

  // Triggers selection of a new event
  useEffect(() => {
    if (gameState && currentStage === "gameplay" && !activeEvent && !turnResult && !drawAnimation) {
      if (gameState.turn !== 10 && gameState.turn !== 20) {
        drawNextEvent();
      }
    }
  }, [gameState, currentStage, activeEvent, turnResult, drawAnimation, encounteredEventIds, encounteredPodcastIds]);

  // Decelerating lottery cycle tick for 50:50 Event drawing
  useEffect(() => {
    if (!drawAnimation || !drawAnimation.active || !drawAnimation.isCycling) return;

    let currentTick = 0;
    const tickDelays = [80, 80, 100, 120, 140, 170, 200, 250, 310, 350];
    const maxTicks = tickDelays.length;
    let timerId: any;

    const tick = () => {
      if (currentTick >= maxTicks) {
        // Halt and Land on the final true selected outcome type
        setDrawAnimation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isCycling: false,
            currentShowcased: prev.resultType!,
          };
        });

        // Trigger transition into the main event panel after showing the landing side
        timerId = setTimeout(() => {
          setDrawAnimation((prev) => {
            if (prev) {
              setActiveEvent(prev.targetEvent);
              setEventType("categorical");
            }
            return null; // destroy animation screen
          });
        }, 1200); // 1.2s of triumphant landing celebration!
        return;
      }

      setDrawAnimation((prev) => {
        if (!prev) return null;
        const cycleMap: Record<string, "debaty" | "media" | "podcast"> = {
          debaty: "media",
          media: "podcast",
          podcast: "debaty",
        };
        const nextShowcased = cycleMap[prev.currentShowcased] || "debaty";
        return {
          ...prev,
          currentShowcased: nextShowcased,
        };
      });

      const nextDelay = tickDelays[currentTick];
      currentTick++;
      timerId = setTimeout(tick, nextDelay);
    };

    timerId = setTimeout(tick, tickDelays[0]);

    return () => {
      clearTimeout(timerId);
    };
  }, [drawAnimation?.active, drawAnimation?.isCycling]);

  // Safe checks for requirements
  const satisfiesLock = (budget: number, lockString?: string) => {
    if (!lockString) return true;
    const [type, value] = lockString.split(":");
    if (type === "budget") return budget >= parseInt(value, 10);
    return true;
  };

  // Helper parsing dynamic key sympathy shifts
  const computeSympatieShifts = (
    shifts: Record<string, number>,
    playerPartyId: string,
    playerAttributes: Record<string, number>,
    currentTrust: Record<string, number>,
    npcAtributy: Record<string, any>
  ) => {
    const nextTrust = { ...currentTrust };

    Object.entries(shifts).forEach(([key, value]) => {
      if (key === "vsichni" || key === "ostatni") {
        Object.keys(STRANY).forEach((id) => {
          if (id !== playerPartyId) {
            nextTrust[id] = Math.max(0, Math.min(100, (nextTrust[id] || 50) + value));
          }
        });
      } else if (key === "vladni" || key === "opozicni" || key === "mimo") {
        Object.keys(STRANY).forEach((id) => {
          if (id !== playerPartyId && STRANY[id].blok === key) {
            nextTrust[id] = Math.max(0, Math.min(100, (nextTrust[id] || 50) + value));
          }
        });
      } else if (key.endsWith("_vysoke") || key.endsWith("_nizke")) {
        const attrName = key.split("_")[0];
        const wantHigh = key.endsWith("_vysoke");

        Object.keys(STRANY).forEach((id) => {
          if (id !== playerPartyId) {
            const partnerAttr = npcAtributy[id]?.[attrName] ?? 50;
            const matches = wantHigh ? partnerAttr >= 50 : partnerAttr < 50;
            if (matches) {
              nextTrust[id] = Math.max(0, Math.min(100, (nextTrust[id] || 50) + value));
            }
          }
        });
      } else if (STRANY[key]) {
        nextTrust[key] = Math.max(0, Math.min(100, (nextTrust[key] || 50) + value));
      }
    });

    return nextTrust;
  };

  // Draw an event dynamically based on coin-toss category weights
  const drawNextEvent = () => {
    if (!gameState) return;

    const advisor = PORADCI[gameState.poradceId] || PORADCI["populista"];

    // Read advisor weights
    const weights = {
      debaty: Math.max(5, 55 + (advisor.vahy.debaty || 0)),
      media: Math.max(5, 25 + (advisor.vahy.media || 0)),
      podcast: Math.max(5, 20 + (advisor.vahy.podcast || 0)),
    };

    const totalWeight = weights.debaty + weights.media + weights.podcast;
    const selector = rng() * totalWeight;

    let chosenType: "debaty" | "media" | "podcast";
    if (selector <= weights.debaty) {
      chosenType = "debaty";
    } else if (selector <= weights.debaty + weights.media) {
      chosenType = "media";
    } else {
      chosenType = "podcast";
    }

    let targetEvent: any = null;

    if (chosenType === "debaty") {
      // Draw standard policy debate question
      const availableQuestions = SVE_QUESTIONS.filter(
        (q) => !encounteredEventIds.includes(q.id)
      );
      const pool = availableQuestions.length > 0 ? availableQuestions : SVE_QUESTIONS;
      const pickedQuestion = pool[Math.floor(rng() * pool.length)];

      const convertOptionToChoice = (opt: any, letter: "A" | "B" | "C" | "D"): Choice => {
        return {
          p: letter,
          text: opt.text,
          efekt: {
            preference: 0,
            budget: 0,
          },
          atributDrift: {
            ekonomika: opt.ekonomika,
            kultura: opt.kultura,
            evropa: opt.evropa,
            stylPolitiky: opt.styl
          }
        };
      };

      const options = pickedQuestion.moznosti;
      targetEvent = {
        id: pickedQuestion.id,
        nazev: `Ostrá Debata: ${pickedQuestion.tema}`,
        kategorie: "debaty",
        minTurn: 1,
        maxTurn: 25,
        sance: 1,
        text: pickedQuestion.otazka,
        kontext: pickedQuestion.kontext,
        moznosti: [
          convertOptionToChoice(options.A, "A"),
          convertOptionToChoice(options.B, "B"),
          convertOptionToChoice(options.C, "C"),
          ...( (options as any).D ? [convertOptionToChoice((options as any).D, "D")] : [] )
        ],
        isDebateQuestion: true, // Marker for Soukup / Kalousek skills!
      };
    } else if (chosenType === "media") {
      // Draw random media template resolved with live physical parties
      const availableTemplates = MEDIA_EVENTS_TEMPLATES.filter(
        (t) => !encounteredEventIds.includes(t.id)
      );
      const pool = availableTemplates.length > 0 ? availableTemplates : MEDIA_EVENTS_TEMPLATES;
      const t = pool[Math.floor(rng() * pool.length)];

      const availableNpcParties = Object.values(STRANY).filter(p => p.id !== gameState.stranaId);
      const shuffledParties = [...availableNpcParties].sort(() => rng() - 0.5);
      const p1 = shuffledParties[0];
      const p2 = shuffledParties[1] || shuffledParties[0];

      const replacePlaceholders = (text: string) => {
        return text
          .replace(/{strana1}/g, p1.zkratka)
          .replace(/{strana2}/g, p2.zkratka)
          .replace(/{lidr1}/g, p1.lidr)
          .replace(/{lidr2}/g, p2.lidr);
      };

      const makeChoice = (variant: any, letter: "A" | "B"): Choice => {
        const choice: Choice = {
          p: letter,
          text: replacePlaceholders(variant.textTemplate),
          efekt: {
            preference: 0,
            budget: 0
          },
          sympatie: {}
        };

        if (variant.efekt.vztahy) {
          Object.entries(variant.efekt.vztahy).forEach(([key, val]) => {
            const resolvedId = key === "{strana1}" ? p1.id : key === "{strana2}" ? p2.id : key;
            choice.sympatie![resolvedId] = val as number;
          });
        }

        if (variant.efekt.partnerPreference) {
          choice.partnerPreference = {};
          Object.entries(variant.efekt.partnerPreference).forEach(([key, val]) => {
            const resolvedId = key === "{strana1}" ? p1.id : key === "{strana2}" ? p2.id : key;
            if (resolvedId !== gameState.stranaId) {
              choice.partnerPreference![resolvedId] = val as number;
            }
          });
        }

        return choice;
      };

      targetEvent = {
        id: t.id,
        nazev: `Mediální Kauza: ${t.typ}`,
        kategorie: "media",
        minTurn: 1,
        maxTurn: 25,
        sance: 1,
        text: replacePlaceholders(t.textTemplate),
        moznosti: [
          makeChoice(t.variantA, "A"),
          makeChoice(t.variantB, "B")
        ],
        isMediaEvent: true,
      };
    } else {
      // Draw podcast commentary feed
      const availablePodcasts = PODCAST_EVENTY.filter(
        (p) => !encounteredPodcastIds.includes(p.id)
      );
      const pool = availablePodcasts.length > 0 ? availablePodcasts : PODCAST_EVENTY;
      const pickedPodcast = pool[Math.floor(rng() * pool.length)];

      const isAlwaysPositive = PORADCI[gameState.poradceId]?.effects?.podcastAlwaysPositive;
      const basePositiveChance = pickedPodcast.typ === "Pozitivní" ? 0.70 : 0.30;
      const resolvedPositive = isAlwaysPositive ? true : (rng() < basePositiveChance);

      // Random preference change between 0.1% and 0.6%
      const rawDelta = parseFloat((rng() * (0.6 - 0.1) + 0.1).toFixed(1));

      targetEvent = {
        id: pickedPodcast.id,
        nazev: `Feedback z podcastu: ${pickedPodcast.podcast}`,
        kategorie: "podcast",
        minTurn: 1,
        text: pickedPodcast.text,
        isPodcastEvent: true,
        resolvedPositive,
        rawDelta,
        moznosti: [
          {
            p: "A",
            text: resolvedPositive
              ? `Vzít na vědomí s úsměvem (+${rawDelta}% preference)`
              : `Vymyslet krizové vyjádření (-${rawDelta}% preference)`,
            efekt: {
              preference: resolvedPositive ? rawDelta : -rawDelta,
              budget: 0
            }
          }
        ]
      };
    }

    // Trigger the lottery selection animation state!
    setDrawAnimation({
      active: true,
      resultType: chosenType,
      targetEvent: targetEvent,
      isCycling: true,
      currentShowcased: "debaty",
    });
  };

  // Unified helper to perform turn advancement processing
  const performTurnAdvancementWithState = useCallback((
    baseState: GameState,
    choiceChanges: string[],
    customLoggedDescription?: string,
    isBoycott?: boolean
  ) => {
    const nextBudget = baseState.budget - 5000;
    const turnPenalties = resolveEndOfTurn(
      baseState,
      nextBudget,
      choiceChanges,
      baseState.preference,
      rng
    );

    const currentTurnLog = isBoycott
      ? {
          turn: baseState.turn,
          type: "system" as const,
          title: `Bojkot debaty (${baseState.turn}. kolo)`,
          description: customLoggedDescription || "Bojkotovali jste debatu.",
          changes: turnPenalties.logs,
        }
      : {
          turn: baseState.turn,
          type: "system" as const,
          title: customLoggedDescription ? `Odbavena zpráva (${baseState.turn}. kolo)` : `Vyhodnocení ${baseState.turn}. kola`,
          description: customLoggedDescription || `Rundovní událost odbavena. Politická scéna v kuloárech mutuje. Ostatní strany upravily své atributy i sympatie na základě zpravodajských svodek.`,
          changes: turnPenalties.logs,
        };

    const {
      nextState,
      rollPodcast,
      podcastData,
      triggeredLargeEvent,
    } = processEndTurnPoliticsState(
      turnPenalties.nextPreference,
      nextBudget,
      [currentTurnLog],
      baseState.npcPreferred,
      false,
      baseState.stats,
      baseState
    );

    if (!nextState) return;

    if (triggeredLargeEvent) {
      setActiveLargeEventPopup(triggeredLargeEvent);
    }

    if (turnPenalties.turekKauza) {
      setActiveTurekKauza({
        nazev: turnPenalties.turekKauza.nazev,
        popis: turnPenalties.turekKauza.popis,
        dopad: turnPenalties.turekDopad || 0,
      });
    }

    const nextTurnValue = nextState.turn;
    let nextStageTarget: "gameplay" | "poll" = "gameplay";
    if (nextTurnValue > TOTAL_GAME_TURNS) {
      nextStageTarget = "poll";
    } else if (baseState.turn % POLL_INTERVAL_TURNS === 0) {
      nextStageTarget = "poll";
    }

    if (rollPodcast) {
      setPendingNextState(nextState);
      setPendingNextStage(nextStageTarget);
      setActivePodcastEvent(podcastData);
    } else {
      setGameState(nextState);
      setActiveEvent(null);
      setEventType(null);
      setTurnResult(null);
      setCurrentStage(nextStageTarget);
    }
  }, [rng, processEndTurnPoliticsState, setActiveLargeEventPopup, setActiveTurekKauza, setPendingNextState, setPendingNextStage, setActivePodcastEvent, setGameState, setActiveEvent, setEventType, setTurnResult, setCurrentStage, resolveEndOfTurn]);

  // Process choice made by the player
  const handleSelectChoice = useCallback((choice: Choice) => {
    if (!gameState || !activeEvent || eventType !== "categorical") return;

    // Backup current state for Sourkup's "Undo" specialty
    const stateBackup = JSON.stringify(gameState);

    // Apply debate impact multiplier inside debates (multiplier 1.5 for Miroslav Kalousek)
    const isDebateEvent = (activeEvent as any).isDebateQuestion;
    const debateMultiplier = PORADCI[gameState.poradceId]?.effects?.debateImpactMultiplier ?? 1.0;
    const kalousekMultiplier = isDebateEvent ? debateMultiplier : 1.0;

    // Apply drop protection / bonus for media relationship changes (for Marek Prchal)
    const isMediaEvent = (activeEvent as any).isMediaEvent;
    const mediaNegativeMultiplier = PORADCI[gameState.poradceId]?.effects?.mediaNegativeImpactMultiplier ?? 1.0;
    const mediaPositiveMultiplier = PORADCI[gameState.poradceId]?.effects?.mediaPositiveImpactMultiplier ?? 1.0;

    let resolvedSympatie = choice.sympatie;
    if (isMediaEvent && choice.sympatie && (mediaNegativeMultiplier !== 1.0 || mediaPositiveMultiplier !== 1.0)) {
      resolvedSympatie = {};
      Object.entries(choice.sympatie).forEach(([key, val]) => {
        resolvedSympatie![key] = val < 0 ? val * mediaNegativeMultiplier : val * mediaPositiveMultiplier;
      });
    }

    // Create mutable copies
    const oldPref = gameState.preference;
    let nextPreference = gameState.preference;
    let nextBudget = gameState.budget;

    const addedPref = choice.efekt.preference * kalousekMultiplier;
    nextPreference += addedPref;
    nextBudget += choice.efekt.budget;

    // Keep preference clamp bounded between 0 - 100
    nextPreference = Math.max(0, Math.min(100, nextPreference));

    // Calculate npc preferred overrides delta (for zero-sum)
    const partnerDeltas: Record<string, number> = {};
    if (choice.partnerPreference) {
      Object.entries(choice.partnerPreference).forEach(([key, val]) => {
        partnerDeltas[key] = (val as number) * kalousekMultiplier;
      });
    }

    // Calculate zero-sum compensations
    const initialNpcPrefs = calculateZeroSumAdjustment(
      addedPref,
      gameState.stranaId,
      gameState.npcPreferred,
      partnerDeltas,
      nextPreference
    );
    const nextNpcPrefs = { ...initialNpcPrefs };

    let prchalPrefBonus = 0;
    const prchalBullets: string[] = [];

    const formatCzechList = (items: string[]): string => {
      if (items.length === 0) return "";
      if (items.length === 1) return items[0];
      return items.slice(0, -1).join(", ") + " a " + items[items.length - 1];
    };

    if (isMediaEvent && gameState.poradceId === "spin_doctor" && resolvedSympatie) {
      Object.entries(resolvedSympatie).forEach(([partyId, trustShift]) => {
        if (trustShift < 0) {
          // Větev A: 50% chance
          if (rng() < 0.5) {
            const actualLoss = Math.min(nextNpcPrefs[partyId] || 0, 1.0);
            nextNpcPrefs[partyId] = Math.max(0, parseFloat(((nextNpcPrefs[partyId] || 0) - actualLoss).toFixed(1)));
            prchalPrefBonus += 1.0;
            const zkratka = STRANY[partyId]?.zkratka?.toUpperCase() || partyId.toUpperCase();
            prchalBullets.push(
              `⚡ Prchalův efekt: ${zkratka} ztratili 1 % preferencí → přešlo k vám`
            );
          }
        } else if (trustShift > 0) {
          // Větev B: 50% chance
          if (rng() < 0.5) {
            prchalPrefBonus += 0.5;
            nextNpcPrefs[partyId] = parseFloat(((nextNpcPrefs[partyId] || 0) + 0.5).toFixed(1));

            const playerParty = STRANY[gameState.stranaId];
            const playerBlock = playerParty?.blok || "vladni";
            
            const donorPartiesInBlock = Object.keys(STRANY).filter(
              (id) => id !== gameState.stranaId && id !== partyId && STRANY[id].blok === playerBlock
            );

            const finalDonors = donorPartiesInBlock.length > 0 
              ? donorPartiesInBlock 
              : Object.keys(STRANY).filter((id) => id !== gameState.stranaId && id !== partyId);

            if (finalDonors.length > 0) {
              const lossPerDonor = parseFloat((1.0 / finalDonors.length).toFixed(2));
              finalDonors.forEach((dId) => {
                const loss = Math.min(nextNpcPrefs[dId] || 0, lossPerDonor);
                nextNpcPrefs[dId] = Math.max(0, parseFloat(((nextNpcPrefs[dId] || 0) - loss).toFixed(2)));
              });

              const allyZkratka = STRANY[partyId]?.zkratka?.toUpperCase() || partyId.toUpperCase();
              const donorZkratky = finalDonors.map((dId) => STRANY[dId]?.zkratka?.toUpperCase() || dId.toUpperCase());
              const donorsStr = formatCzechList(donorZkratky);

              prchalBullets.push(
                `⚡ Prchalův efekt: Mediální momentum s ${allyZkratka} (+0.5 % oběma, -${lossPerDonor.toFixed(1)} % ${donorsStr})`
              );
            }
          }
        }
      });
    }

    if (prchalPrefBonus > 0) {
      nextPreference = parseFloat((nextPreference + prchalPrefBonus).toFixed(1));
      nextPreference = Math.max(0, Math.min(100, nextPreference));
    }

    // Apply sympathy changes
    let nextTrust = gameState.trust;
    if (resolvedSympatie) {
      nextTrust = computeSympatieShifts(
        resolvedSympatie,
        gameState.stranaId,
        gameState.atributy,
        gameState.trust,
        gameState.npcAtributy
      );
    }

    // Dynamic shift player attributes slightly based on the style of choice
    const nextAtributy = { ...gameState.atributy };
    const drift_ekonomika = (choice.atributDrift?.ekonomika ?? (choice as any).ekonomika ?? 0) * kalousekMultiplier;
    const drift_kultura = (choice.atributDrift?.kultura ?? (choice as any).kultura ?? 0) * kalousekMultiplier;
    const drift_evropa = (choice.atributDrift?.evropa ?? (choice as any).evropa ?? 0) * kalousekMultiplier;
    const drift_styl = (choice.atributDrift?.stylPolitiky ?? (choice as any).styl ?? 0) * kalousekMultiplier;

    nextAtributy.ekonomika = Math.min(100, Math.max(0, nextAtributy.ekonomika + drift_ekonomika));
    nextAtributy.kultura = Math.min(100, Math.max(0, nextAtributy.kultura + drift_kultura));
    nextAtributy.evropa = Math.min(100, Math.max(0, nextAtributy.evropa + drift_evropa));
    nextAtributy.stylPolitiky = Math.min(100, Math.max(0, nextAtributy.stylPolitiky + drift_styl));

    // Set stage details for review
    const changes: string[] = [];
    if (addedPref !== 0 && !isMediaEvent) {
      changes.push(
        `Volební preference: ${addedPref > 0 ? "+" : ""}${addedPref.toFixed(1)} %`
      );
    }
    if (drift_ekonomika !== 0) {
      changes.push(`Hodnotový kompas - Ekonomika: ${drift_ekonomika > 0 ? "+" : ""}${drift_ekonomika}%`);
    }
    if (drift_kultura !== 0) {
      changes.push(`Hodnotový kompas - Kultura: ${drift_kultura > 0 ? "+" : ""}${drift_kultura}%`);
    }
    if (drift_evropa !== 0) {
      changes.push(`Hodnotový kompas - Evropa: ${drift_evropa > 0 ? "+" : ""}${drift_evropa}%`);
    }
    if (drift_styl !== 0) {
      changes.push(`Hodnotový kompas - Styl politiky: ${drift_styl > 0 ? "+" : ""}${drift_styl}%`);
    }
    if (choice.efekt.budget !== 0) {
      changes.push(
        `Kampaňový rozpočet: ${choice.efekt.budget > 0 ? "+" : ""}${choice.efekt.budget.toLocaleString(
          "cs-CZ"
        )} Kč`
      );
    }

    const isKriz = isMediaEvent && activeEvent.id.startsWith("KRIZ");
    if (resolvedSympatie) {
      if (isKriz) {
        Object.entries(resolvedSympatie).forEach(([partyId, val]) => {
          if (val < 0) {
            const zkratka = STRANY[partyId]?.zkratka?.toUpperCase() || partyId.toUpperCase();
            changes.push(`Ochlazení vztahů: ${zkratka} (${val} důvěry)`);
          } else if (val > 0) {
            const zkratka = STRANY[partyId]?.zkratka?.toUpperCase() || partyId.toUpperCase();
            changes.push(`Zlepšení vztahů: ${zkratka} (+${val} důvěry)`);
          }
        });
      } else {
        const positiveShifts = Object.entries(resolvedSympatie)
          .filter(([_, v]) => v > 0)
          .map(([k, _]) => STRANY[k]?.zkratka?.toUpperCase() || k.toUpperCase());
        const negativeShifts = Object.entries(resolvedSympatie)
          .filter(([_, v]) => v < 0)
          .map(([k, _]) => STRANY[k]?.zkratka?.toUpperCase() || k.toUpperCase());

        if (positiveShifts.length > 0) {
          changes.push(`Sbližování vztahů: ${positiveShifts.join(", ")} (+ sympatie)`);
        }
        if (negativeShifts.length > 0) {
          changes.push(`Ochlazení vztahů: ${negativeShifts.join(", ")} (- sympatie)`);
        }
      }
    }

    if (prchalBullets.length > 0) {
      changes.push(...prchalBullets);
    }

    if (Object.keys(partnerDeltas).length > 0) {
      Object.entries(partnerDeltas).forEach(([id, delta]) => {
        changes.push(`Dopad na ${id.toUpperCase()}: ${delta > 0 ? "+" : ""}${delta}% preference`);
      });
    }

    const isPodcast = (activeEvent as CategoricalEvent).kategorie === "podcast";
    if (isPodcast) {
      const currentStats = gameState.stats || {
        prefMimoradne: 0,
        prefBezny: 0,
        prefDebaty: 0,
        prefMedia: 0,
        prefPodcasty: 0,
        prefCompass: 0,
        prefPenalizace: 0,
        bestDebateAxesOver10: 0,
        initialBudget: gameState.budget,
        initialPreference: gameState.preference,
      };
      const nextStats = {
        ...currentStats,
        prefPodcasty: (currentStats.prefPodcasty || 0) + addedPref,
      };

      const updatedStateForAdvance: GameState = {
        ...gameState,
        preference: nextPreference,
        budget: nextBudget,
        npcPreferred: nextNpcPrefs,
        trust: nextTrust,
        atributy: nextAtributy,
        stats: nextStats,
      };

      setEncounteredPodcastIds((prev) => {
        if (activeEvent.id && !prev.includes(activeEvent.id)) {
          return [...prev, activeEvent.id];
        }
        return prev;
      });

      performTurnAdvancementWithState(
        updatedStateForAdvance,
        changes,
        `Slyšeli jste feedback z podcastu: "${choice.text}"`
      );
      return;
    }

    const tId = activeEvent.id || "";
    const isGen = isMediaEvent && tId.startsWith("GEN");
    const isKrizEvent = isMediaEvent && tId.startsWith("KRIZ");

    const vztahyChanges = isKrizEvent && resolvedSympatie
      ? Object.entries(resolvedSympatie)
          .filter(([_, val]) => val !== 0)
          .map(([partyId, val]) => ({
            partyId,
            partyName: STRANY[partyId]?.zkratka?.toUpperCase() || partyId.toUpperCase(),
            delta: val,
            currentTrust: nextTrust[partyId] ?? 50,
          }))
      : [];

    setTurnResult({
      choiceLetter: choice.p,
      flavor: `Zvolili jste možnost ${choice.p}: "${choice.text}"`,
      changes,
      oldPref,
      newPref: nextPreference,
      isMediaEvent,
      isGenEvent: isGen,
      isKrizEvent: isKrizEvent,
      vztahyChanges,
    });

    // Update state to stage resolution
    setGameState((prev) => {
      if (!prev) return null;
      const currentStats = prev.stats || {
        prefMimoradne: 0,
        prefBezny: 0,
        prefDebaty: 0,
        prefMedia: 0,
        prefPodcasty: 0,
        prefCompass: 0,
        prefPenalizace: 0,
        bestDebateAxesOver10: 0,
        initialBudget: prev.budget,
        initialPreference: prev.preference,
      };
      const isMedia = (activeEvent as CategoricalEvent).kategorie === "media";
      const nextImprovedRelationsMedia = { ...currentStats.improvedRelationsMedia || {} };
      if (isMediaEvent) {
        Object.keys(STRANY).forEach((id) => {
          if (id !== prev.stranaId && (nextTrust[id] || 50) > (prev.trust[id] || 50)) {
            nextImprovedRelationsMedia[id] = true;
          }
        });
      }
      const nextStats = {
        ...currentStats,
        prefMimoradne: currentStats.prefMimoradne + (!isMedia ? addedPref : 0),
        prefMedia: currentStats.prefMedia + (isMedia ? (addedPref + prchalPrefBonus) : 0),
        improvedRelationsMedia: nextImprovedRelationsMedia,
      };
      return {
        ...prev,
        preference: nextPreference,
        budget: nextBudget,
        npcPreferred: nextNpcPrefs,
        trust: nextTrust,
        atributy: nextAtributy,
        lastActionState: stateBackup,
        stats: nextStats,
      };
    });

    setEncounteredEventIds((prev) => [...prev, activeEvent.id]);
  }, [gameState, activeEvent, eventType, rng, setEncounteredPodcastIds, setTurnResult, setGameState, setEncounteredEventIds, performTurnAdvancementWithState, computeSympatieShifts]);

  // Continue through generic narrative
  const handleAcknowledgeGeneric = useCallback(() => {
    if (!gameState || !activeEvent || eventType !== "generic") return;

    const backupState = JSON.stringify(gameState);
    const item = activeEvent as GenericEvent;

    let nextPref = Math.max(0, Math.min(100, gameState.preference + item.efekt.preference));
    let nextBudget = gameState.budget + item.efekt.budget;

    // Recalculate zero-sums
    const nextNpcPrefs = calculateZeroSumAdjustment(
      item.efekt.preference,
      gameState.stranaId,
      gameState.npcPreferred,
      undefined,
      nextPref
    );

    const changes = [];
    if (item.efekt.preference !== 0) {
      changes.push(`Volební preference: ${item.efekt.preference > 0 ? "+" : ""}${item.efekt.preference} %`);
    }
    if (item.efekt.budget !== 0) {
      changes.push(
        `Kampaňový rozpočet: ${item.efekt.budget > 0 ? "+" : ""}${item.efekt.budget.toLocaleString(
          "cs-CZ"
        )} Kč`
      );
    }

    const currentStats = gameState.stats || {
      prefMimoradne: 0,
      prefBezny: 0,
      prefDebaty: 0,
      prefMedia: 0,
      prefPodcasty: 0,
      prefCompass: 0,
      prefPenalizace: 0,
      bestDebateAxesOver10: 0,
      initialBudget: gameState.budget,
      initialPreference: gameState.preference,
    };
    const nextStats = {
      ...currentStats,
      prefBezny: currentStats.prefBezny + item.efekt.preference,
    };

    const updatedStateForAdvance: GameState = {
      ...gameState,
      preference: nextPref,
      budget: nextBudget,
      npcPreferred: nextNpcPrefs,
      lastActionState: backupState,
      stats: nextStats,
    };

    setEncounteredEventIds((prev) => [...prev, activeEvent.id]);

    performTurnAdvancementWithState(
      updatedStateForAdvance,
      changes,
      `Běžná událost odbavena: ${item.text}`
    );
  }, [gameState, activeEvent, eventType, setEncounteredEventIds, performTurnAdvancementWithState]);

  // Filip Turek - close controversy modal, deduct preference, and normalize
  const handleCloseTurekKauza = useCallback(() => {
    if (!gameState || !activeTurekKauza) return;

    const currentPref = gameState.preference;
    const nextPref = Math.max(0.1, parseFloat((currentPref + activeTurekKauza.dopad).toFixed(1)));
    const deltaPref = nextPref - currentPref;

    // Zero-sum adjust everyone else
    const updatedNpcPrefs = calculateZeroSumAdjustment(
      deltaPref,
      gameState.stranaId,
      gameState.npcPreferred,
      undefined,
      nextPref
    );

    const newLog = {
      turn: gameState.turn - 1,
      type: "system" as const,
      title: `🚨 KAUZA TURKA: ${activeTurekKauza.nazev}`,
      description: activeTurekKauza.popis,
      changes: [`🚨 Ztráta ${activeTurekKauza.dopad.toFixed(1)} % preferencí kvůli nečekané kauze Filipa Turka.`],
    };

    setGameState((prev) => {
      if (!prev) return prev;
      const originalChange = prev.lastTurnPrefChange !== undefined ? prev.lastTurnPrefChange : 0;
      const updatedHistory = prev.preferenceHistory ? [...prev.preferenceHistory] : [];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1] = nextPref;
      }
      return {
        ...prev,
        preference: nextPref,
        npcPreferred: updatedNpcPrefs,
        lastTurnPrefChange: parseFloat((originalChange + activeTurekKauza.dopad).toFixed(2)),
        history: [newLog, ...prev.history],
        preferenceHistory: updatedHistory,
      };
    });

    setActiveTurekKauza(null);
  }, [gameState, activeTurekKauza, setGameState, setActiveTurekKauza]);

  // Jaromír Soukup 1x per turn Revert trigger
  const handleUndoOnce = useCallback(() => {
    if (!gameState || !gameState.lastActionState || !gameState.undoAvailable) return;

    // Deserialise and restore
    const reverted = JSON.parse(gameState.lastActionState) as GameState;
    reverted.undoAvailable = false; // Spent
    reverted.undoUsed = true;
    reverted.lastActionState = undefined;

    setGameState(reverted);
    setTurnResult(null);

    // Pop the undone event from encountered IDs list to make it repeatable
    if (activeEvent) {
      setEncounteredEventIds((prev) => prev.filter((id) => id !== activeEvent.id));
    }
    setActiveEvent(null);
  }, [gameState, setGameState, setTurnResult, activeEvent, setEncounteredEventIds, setActiveEvent]);

  // Skip Turn or Boycott Debate
  const handleSkipTurn = useCallback(() => {
    if (!gameState) return;

    const isDebateRound = isDebateTurn(gameState.turn);
    const costPref = isDebateRound ? 5.0 : 0.5;

    if (gameState.preference < costPref) return;

    // Backup current state for Sourkup's "Undo" specialty
    const backupState = JSON.stringify(gameState);

    let nextPreference = gameState.preference - costPref;
    nextPreference = Math.max(0, Math.min(100, nextPreference));

    // Zero-sum adjustment
    const nextNpcPrefs = calculateZeroSumAdjustment(
      -costPref,
      gameState.stranaId,
      gameState.npcPreferred,
      undefined,
      nextPreference
    );

    let nextTrust = { ...gameState.trust };
    const changes: string[] = [];

    if (isDebateRound) {
      // Sympathy decay by 5 points for all other parties (floor at 0)
      Object.keys(STRANY).forEach((id) => {
        if (id !== gameState.stranaId) {
          nextTrust[id] = Math.max(0, (nextTrust[id] || 50) - 5);
        }
      });

      changes.push(`Volební preference: -5.0 %`);
      changes.push(`Ochlazení vztahů se všemi stranami (-5 sympatie)`);

      setTurnResult({
        flavor: "Rozhodl(a) ses bojkotovat klíčovou televizní debatu! Média a političtí soupeři tě cupují za zbabělost. Ztrácíš masivních 5% preferencí a naštval(a) jsi všechny ostatní strany (sympatie se snižují o 5).",
        changes,
        isBoycott: true,
        oldPref: gameState.preference,
        newPref: nextPreference,
      });

      setGameState((prev) => {
        if (!prev) return null;
        const currentStats = prev.stats || {
          prefMimoradne: 0,
          prefBezny: 0,
          prefDebaty: 0,
          prefMedia: 0,
          prefPodcasty: 0,
          prefCompass: 0,
          prefPenalizace: 0,
          bestDebateAxesOver10: 0,
          initialBudget: prev.budget,
          initialPreference: prev.preference,
        };
        const nextStats = {
          ...currentStats,
          prefPenalizace: (currentStats.prefPenalizace || 0) - costPref,
        };
        return {
          ...prev,
          preference: nextPreference,
          npcPreferred: nextNpcPrefs,
          trust: nextTrust,
          lastActionState: backupState,
          stats: nextStats,
          debatesSkipped: (prev.debatesSkipped || 0) + 1,
        };
      });
    } else {
      // Standard regular turn skip (NOT debate round)
      const nextBudget = gameState.budget - 5000;
      const turnPenalties = resolveEndOfTurn(
        gameState,
        nextBudget,
        [`Volební preference: -0.5 %`],
        nextPreference,
        rng
      );

      const currentTurnLog = {
        turn: gameState.turn,
        type: "system" as const,
        title: `Vyhodnocení ${gameState.turn}. kola (Přeskočeno)`,
        description: "Předal(a) jsi na jeden den vedení strany svému krizovému PR týmu. Sice se vyhnete těžkému rozhodnutí, ale voliči to vnímají jako alibismus a ztrácíte 0.5% preferencí.",
        changes: turnPenalties.logs,
      };

      const currentStats = gameState.stats || {
        prefMimoradne: 0,
        prefBezny: 0,
        prefDebaty: 0,
        prefMedia: 0,
        prefPodcasty: 0,
        prefCompass: 0,
        prefPenalizace: 0,
        bestDebateAxesOver10: 0,
        initialBudget: gameState.budget,
        initialPreference: gameState.preference,
      };
      const nextStats = {
        ...currentStats,
        prefPenalizace: (currentStats.prefPenalizace || 0) - costPref,
      };

      const {
        nextState,
        triggeredLargeEvent,
      } = processEndTurnPoliticsState(
        turnPenalties.nextPreference,
        nextBudget,
        [currentTurnLog],
        nextNpcPrefs,
        isDebateRound,
        nextStats
      );

      if (!nextState) return;

      if (triggeredLargeEvent) {
        setActiveLargeEventPopup(triggeredLargeEvent);
      }

      if (turnPenalties.turekKauza) {
        setActiveTurekKauza({
          nazev: turnPenalties.turekKauza.nazev,
          popis: turnPenalties.turekKauza.popis,
          dopad: turnPenalties.turekDopad || 0,
        });
      }

      const nextTurnValue = nextState.turn;
      let nextStageTarget: "gameplay" | "poll" = "gameplay";
      if (nextTurnValue > TOTAL_GAME_TURNS) {
        nextStageTarget = "poll";
      } else if (gameState.turn % POLL_INTERVAL_TURNS === 0) {
        nextStageTarget = "poll";
      }

      if (activeEvent) {
        setEncounteredEventIds((prev) => [...prev, activeEvent.id]);
      }

      setGameState({
        ...nextState,
        roundsSkipped: (gameState.roundsSkipped || 0) + 1,
        lastActionState: backupState,
      });
      setActiveEvent(null);
      setEventType(null);
      setTurnResult(null);
      setCurrentStage(nextStageTarget);
    }
  }, [gameState, rng, setTurnResult, setGameState, processEndTurnPoliticsState, setActiveLargeEventPopup, setActiveTurekKauza, activeEvent, setEncounteredEventIds, setActiveEvent, setEventType, setCurrentStage]);

  const handleCompleteDebate = useCallback((
    updatedPreference: number,
    updatedNpcPrefs: Record<string, number>,
    updatedAttributes: {
      ekonomika: number;
      kultura: number;
      evropa: number;
      stylPolitiky: number;
    },
    summaryChanges: string[]
  ) => {
    if (!gameState) return;

    const debateName = gameState.turn === DEBATE_TURNS[0] ? "Superdebata CNN Prima News" : "Finálová debata na ČT";

    const currentTurnLog = {
      turn: gameState.turn,
      type: "system" as const,
      title: `${debateName}`,
      description: `Úspěšně jste absolvovali ostré diskuzní klání v televizním vysílání. Vaše vyjádření posunula ideologické těžiště strany a otřásla preferencemi všech hráčů na trhu.`,
      changes: summaryChanges,
    };

    // Standard round closure details (same administrative cost and checks)
    const nextBudget = gameState.budget - 5000;
    const turnPenalties = resolveEndOfTurn(
      gameState,
      nextBudget,
      [`Ukončeno celkové televizní klání.`],
      updatedPreference,
      rng
    );

    const currentTurnSystemLog = {
      turn: gameState.turn,
      type: "system" as const,
      title: `Vyhodnocení ${gameState.turn}. kola`,
      description: `S klesajícím napětím po televizním přenosu byly publikovány bleskové průzkumy reakcí diváků.`,
      changes: turnPenalties.logs,
    };

    const {
      nextState,
      rollPodcast,
      podcastData,
      triggeredLargeEvent,
    } = processEndTurnPoliticsState(
      turnPenalties.nextPreference,
      nextBudget,
      [currentTurnSystemLog, currentTurnLog],
      updatedNpcPrefs,
      true,
      undefined,
      { ...gameState, atributy: updatedAttributes }
    );

    if (!nextState) return;

    if (triggeredLargeEvent) {
      setActiveLargeEventPopup(triggeredLargeEvent);
    }

    if (turnPenalties.turekKauza) {
      setActiveTurekKauza({
        nazev: turnPenalties.turekKauza.nazev,
        popis: turnPenalties.turekKauza.popis,
        dopad: turnPenalties.turekDopad || 0,
      });
    }

    // Apply the latest debate specific attributes & statistics overrides
    nextState.atributy = updatedAttributes;
    const debateDelta = updatedPreference - gameState.preference;
    const currentStats = nextState.stats || {
      prefMimoradne: 0,
      prefBezny: 0,
      prefDebaty: 0,
      prefMedia: 0,
      prefPodcasty: 0,
      prefCompass: 0,
      prefPenalizace: 0,
      bestDebateAxesOver10: 0,
      initialBudget: gameState.budget,
      initialPreference: gameState.preference,
    };

    const osy = ["ekonomika", "kultura", "evropa", "stylPolitiky"] as const;
    const axesOver10 = osy.filter(
      o => Math.abs(updatedAttributes[o] - gameState.atributy[o]) >= 10
    ).length;

    nextState.stats = {
      ...currentStats,
      prefDebaty: currentStats.prefDebaty + debateDelta,
      bestDebateAxesOver10: Math.max(currentStats.bestDebateAxesOver10 ?? 0, axesOver10),
    };

    if (rollPodcast) {
      setPendingNextState(nextState);
      setPendingNextStage("poll");
      setActivePodcastEvent(podcastData);
    } else {
      setGameState(nextState);
      setActiveEvent(null);
      setEventType(null);
      setTurnResult(null);
      setCurrentStage("poll");
    }
  }, [gameState, rng, processEndTurnPoliticsState, setActiveLargeEventPopup, setActiveTurekKauza, setPendingNextState, setPendingNextStage, setActivePodcastEvent, setGameState, setActiveEvent, setEventType, setTurnResult, setCurrentStage, resolveEndOfTurn]);



  // Turn closing execution routine matching the spec
  const handleAdvanceToNextTurn = useCallback(() => {
    if (!gameState) return;
    performTurnAdvancementWithState(
      gameState,
      turnResult?.isBoycott ? (turnResult?.changes || []) : [],
      turnResult?.flavor || "",
      turnResult?.isBoycott
    );
  }, [gameState, turnResult, performTurnAdvancementWithState]);

  const handleConfirmPodcast = useCallback(() => {
    if (pendingNextState) {
      setGameState(pendingNextState);
      setPendingNextState(null);
    }
    setActivePodcastEvent(null);

    // Clean active event views to ready drawing next
    setActiveEvent(null);
    setEventType(null);
    setTurnResult(null);

    if (pendingNextStage === "poll") {
      setCurrentStage("poll");
    } else {
      setCurrentStage("gameplay");
    }
    setPendingNextStage(null);
  }, [pendingNextState, pendingNextStage, setGameState, setPendingNextState, setActivePodcastEvent, setActiveEvent, setEventType, setTurnResult, setCurrentStage, setPendingNextStage]);

  const handleDismissPoll = useCallback(() => {
    if (gameState && gameState.turn > TOTAL_GAME_TURNS) {
      const finalRes = calculateElectionResults(gameState, rng);
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          electionResults: finalRes,
        };
      });
      setCurrentStage("elections");
    } else {
      setCurrentStage("gameplay");
    }
  }, [gameState, rng, setGameState, setCurrentStage]);

  const handleFinishCoalition = useCallback((success: boolean, details: CoalitionDetails | null) => {
    setCoalitionResults(details);
    setGameVictory(success);

    let typ: EndingTyp = "opozice";
    if (success && details) {
      const playerSeats = details.playerSeats;
      const partnerSeats = details.acceptedPartyIds.map((id: string) => details.parliamentSeats[id] || 0);
      const maxPartnerSeats = partnerSeats.length > 0 ? Math.max(...partnerSeats) : 0;
      typ = playerSeats >= maxPartnerSeats ? "premier" : "vicepremier";
    }
    // "koalicni_partner" vs "opozice" se určí v EndingStage z bestAlternative
    // Proto zde ukládáme zatím jen success-side typy; EndingStage si failure-side dopočítá
    setEndingTyp(typ);
    setCurrentStage("ending");
  }, [setCoalitionResults, setGameVictory, setEndingTyp, setCurrentStage]);

  const handleWithdrawFromCampaign = useCallback(() => {
    if (!gameState) return;

    const otherParties = Object.keys(STRANY).filter((id) => id !== gameState.stranaId);
    const newNpcPreferred = { ...gameState.npcPreferred };

    const keys = Object.keys(gameState.npcPreferred);
    let totalNpcPref = 0;
    keys.forEach((id) => {
      totalNpcPref += gameState.npcPreferred[id] || 0;
    });

    if (totalNpcPref > 0) {
      keys.forEach((id) => {
        const val = gameState.npcPreferred[id] || 0;
        const share = val / totalNpcPref;
        const added = share * gameState.preference;
        newNpcPreferred[id] = parseFloat((val + added).toFixed(1));
      });
    } else {
      const share = gameState.preference / otherParties.length;
      otherParties.forEach((id) => {
        newNpcPreferred[id] = parseFloat(((gameState.npcPreferred[id] || 0) + share).toFixed(1));
      });
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preference: 0,
        npcPreferred: newNpcPreferred,
        hasWithdrawn: true,
        isEarlyElection: true,
      };
    });

    setGameVictory(false);
    setCoalitionResults(null);
    setCurrentStage("ending");
  }, [gameState, setGameState, setGameVictory, setCoalitionResults, setCurrentStage]);

  const handleEarlyElections = useCallback(() => {
    if (!gameState) return;

    const penalizedPreference = parseFloat((gameState.preference * 0.5).toFixed(1));
    const lostPreference = gameState.preference - penalizedPreference;

    let newNpcPreferred = { ...gameState.npcPreferred };
    const keys = Object.keys(gameState.npcPreferred);
    let totalNpcPref = 0;
    keys.forEach((id) => {
      totalNpcPref += gameState.npcPreferred[id] || 0;
    });

    if (totalNpcPref > 0) {
      keys.forEach((id) => {
        const val = gameState.npcPreferred[id] || 0;
        const share = val / totalNpcPref;
        const added = share * lostPreference;
        newNpcPreferred[id] = parseFloat((val + added).toFixed(1));
      });
    }

    setGameState((prev) => {
      if (!prev) return null;
      const currentStats = prev.stats || {
        prefMimoradne: 0,
        prefBezny: 0,
        prefDebaty: 0,
        prefMedia: 0,
        prefPodcasty: 0,
        prefCompass: 0,
        prefPenalizace: 0,
        bestDebateAxesOver10: 0,
        initialBudget: prev.budget,
        initialPreference: prev.preference,
      };
      const nextStats = {
        ...currentStats,
        prefPenalizace: (currentStats.prefPenalizace || 0) - lostPreference,
      };
      return {
        ...prev,
        preference: penalizedPreference,
        npcPreferred: newNpcPreferred,
        turn: TOTAL_GAME_TURNS + 1,
        isEarlyElection: true,
        stats: nextStats,
      };
    });
    setCurrentStage("poll");
  }, [gameState, setGameState, setCurrentStage]);

  const handleResetGame = useCallback(() => {
    setGameState(null);
    setActiveEvent(null);
    setEventType(null);
    setEncounteredEventIds([]);
    setTurnResult(null);
    setCoalitionResults(null);
    setEndingTyp(null);
    setNewlyUnlockedAchievements([]);
    setCurrentStage("setup");
  }, [setGameState, setActiveEvent, setEventType, setEncounteredEventIds, setTurnResult, setCoalitionResults, setEndingTyp, setNewlyUnlockedAchievements, setCurrentStage]);

  return (
    <RngContext.Provider value={activeRng}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-800 selection:text-white">
      {/* Visual Navigation Bar */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">🗳️</span>
            <div>
              <span className="font-sans text-sm tracking-widest font-bold text-red-600 uppercase">
                Czech Political Simulation
              </span>
              {gameState && (
                <span className="hidden sm:inline text-[11px] font-sans text-slate-500 border-l border-slate-200 ml-2.5 pl-2.5">
                  Lídr: <span className="font-semibold text-slate-800">{STRANY[gameState.stranaId].nazev}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <UserAuthBar onUserChanged={setCurrentUser} syncStatus={syncStatus} cloudErrorDetails={cloudErrorDetails} />
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center bg-[#fff0f0]">
        {viewingLeaderboardRun ? (
          <div className="space-y-6">
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => setViewingLeaderboardRun(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-850 text-white font-sans text-xs uppercase tracking-widest font-extrabold rounded-xl shadow-md transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
              >
                <span>&larr; Zpět na hlavní menu (Leaderboard)</span>
              </button>
            </div>
            <EndingStage
              success={viewingLeaderboardRun.gameVictory}
              state={viewingLeaderboardRun.gameState as any}
              coalitionDetails={viewingLeaderboardRun.coalitionResults}
              endingTyp={viewingLeaderboardRun.endingTyp ?? (viewingLeaderboardRun.gameVictory ? "premier" : "opozice")}
              onRestart={() => setViewingLeaderboardRun(null)}
              currentUser={currentUser}
            />
          </div>
        ) : (
          <>
            {currentStage === "setup" && (
              <SetupStage
                onStartGame={handleStartGame}
                savedGameExist={!!savedGame}
                onContinueGame={handleContinueGame}
                onViewRun={(run: any) => setViewingLeaderboardRun(run)}
                currentUser={currentUser}
              />
            )}

            {currentStage === "compass_generation" && gameState && (
              <CompassGeneration
                initialCompass={gameState.spolecenskyKompas}
                onComplete={() => setCurrentStage("gameplay")}
              />
            )}

        {gameState && currentStage === "gameplay" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left side primary actions console */}
            <div className="lg:col-span-8 space-y-6">
              {/* HUD metrics */}
              <MetricBar state={gameState} />

              {/* Central Event Panel Card */}
              {turnResult ? (
                <div className="bg-white border border-slate-100 rounded-[24px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
                  {/* Decorative glowing backplate */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 blur-2xl pointer-events-none" />

                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      {!turnResult?.isGeneric && (
                        <span className="text-[10px] tracking-widest uppercase font-sans text-amber-800 font-bold bg-amber-50 px-3 py-1 border border-amber-200 rounded">
                          Účinky rozhodnutí
                        </span>
                      )}
                      <h3 className="text-xl sm:text-2xl font-sans text-slate-900 font-bold mt-3">
                        {turnResult?.isGeneric
                          ? "Dopady dnešního dne"
                          : activeEvent && "nazev" in activeEvent
                          ? `${activeEvent.nazev} — Dopady dnešního dne`
                          : "Dopady dnešního dne"}
                      </h3>
                      <p className="text-slate-655 font-serif text-sm mt-3 leading-relaxed whitespace-pre-line">
                        {turnResult.flavor}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <span className="text-[10px] font-sans text-slate-455 uppercase tracking-widest block border-b border-slate-200 pb-1 font-bold">
                        Okamžité reportované dopady
                      </span>

                      {/* Dynamic Preference change details */}
                      {turnResult.isMediaEvent ? (
                        turnResult.isKrizEvent && turnResult.vztahyChanges && turnResult.vztahyChanges.length > 0 ? (
                          <div className="bg-white border border-slate-200/55 rounded-xl p-4 shadow-xs space-y-2.5">
                            <div className="border-b border-slate-100 pb-1.5 w-full">
                              <span className="text-[10px] font-sans text-slate-500 block uppercase font-extrabold tracking-widest leading-none">
                                Vývoj vztahů
                              </span>
                            </div>
                            <div className="space-y-2">
                              {turnResult.vztahyChanges.map((item: any, idx: number) => {
                                const isPos = item.delta > 0;
                                const coeffColor = isPos ? "text-emerald-700 bg-emerald-50 border-emerald-150" : "text-rose-700 bg-rose-50 border-rose-150";
                                return (
                                  <div key={idx} className="flex justify-between items-center text-[12px]">
                                    <span className="font-sans font-bold text-slate-800 uppercase">
                                      {item.partyName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded border text-[11px] font-extrabold leading-none ${coeffColor}`}>
                                        {isPos ? "+" : ""}{item.delta} důvěry
                                      </span>
                                      <span className="text-slate-500 font-sans text-[11px] font-medium">
                                        Trust: <span className="font-bold text-slate-700">{item.currentTrust} %</span>
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null
                      ) : (
                        turnResult.oldPref !== undefined && turnResult.newPref !== undefined && (
                          <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200/50 rounded-xl shadow-xs">
                            <div>
                              <span className="text-[10px] font-sans text-slate-400 block uppercase font-bold leading-none">Celková úprava preferencí</span>
                              <span className="text-[11px] font-sans text-slate-500">tímto rozhodnutím</span>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const diff = turnResult.newPref! - turnResult.oldPref!;
                                const diffText = diff === 0 ? "±0.0 %" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} %`;
                                const colorClass = diff > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : diff < 0 ? "text-rose-700 bg-rose-50 border-rose-100" : "text-slate-600 bg-slate-50/50 border-slate-200/40";
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className={`text-xs font-sans font-black px-2 py-0.5 rounded-lg border leading-none ${colorClass}`}>
                                      {diffText}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">Preference: {turnResult.newPref!.toFixed(1)} %</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )
                      )}

                      {turnResult.changes.length > 0 ? (
                        <div className="space-y-1">
                          {turnResult.changes.map((c, idx) => (
                            <div
                              key={idx}
                              className="text-sm font-sans text-emerald-750 font-medium flex items-center space-x-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-455 italic block font-sans">
                          Žádné přímé dopady na finance ani preference. Voliči vaši taktiku snášejí v tichosti.
                        </span>
                      )}
                    </div>

                    {/* Advancing and undo actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {PORADCI[gameState.poradceId]?.effects?.undoOnce && gameState.undoAvailable && activeEvent && (
                        <button
                          onClick={handleUndoOnce}
                          className="py-3.5 px-6 font-sans text-xs uppercase tracking-wider font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center justify-center space-x-1.5 z-10 cursor-pointer w-full sm:w-auto"
                        >
                          <RotateCcw className="w-4 h-4 shrink-0" />
                          <span>Zpět ({PORADCI[gameState.poradceId]?.jmeno} Undo)</span>
                        </button>
                      )}

                      <button
                        onClick={handleAdvanceToNextTurn}
                        className="flex-1 py-4 bg-blue-800 hover:bg-blue-900 text-white font-sans text-xs uppercase tracking-widest font-bold rounded-xl shadow-md transition-colors duration-150 flex items-center justify-center space-x-1.5 z-10 cursor-pointer shadow-blue-100"
                      >
                        <span>Ukončit kolo a pokračovat</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : isDebateTurn(gameState.turn) ? (
                <DebateStage
                  state={gameState}
                  onCompleteDebate={handleCompleteDebate}
                />
              ) : drawAnimation && drawAnimation.active ? (
                <div className="bg-white border border-slate-100 rounded-[24px] p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all">
                  {/* Decorative glowing backplates */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/20 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50/20 blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="text-center pb-4 border-b border-slate-100 relative z-10">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-blue-800 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 font-bold">
                      Události dnešního dne
                    </span>
                    <h2 className="text-xl font-sans text-slate-800 font-extrabold mt-2 uppercase tracking-tight">
                      Co přinese dnešní den?
                    </h2>
                    <p className="text-xs text-slate-505 font-sans mt-1 max-w-xl mx-auto leading-relaxed">
                      Narazí Váš tým na tiskovou kauzu, televizní diskuzi se soupeři, nebo dostane zpětnou vazbu z podcastů komentátorů?
                    </p>
                  </div>

                  {/* Three Main Cards: Debate (55%) VS Media (25%) VS Podcast (20%) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 relative z-10 shrink-0">
                    {/* Debate Card */}
                    <div
                      className={`relative p-4 rounded-2xl border transition-all duration-300 flex items-center space-x-3.5 ${
                        drawAnimation.currentShowcased === "debaty"
                          ? "bg-purple-50/65 border-purple-400 shadow-sm scale-[1.02] ring-2 ring-purple-100"
                          : "bg-slate-50/30 border-slate-100 opacity-40 grayscale animate-pulse"
                      }`}
                    >
                      {drawAnimation.currentShowcased === "debaty" && (
                        <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full p-1 shadow-lg animate-bounce">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className={`p-3 rounded-xl font-bold text-lg leading-none shrink-0 ${
                        drawAnimation.currentShowcased === "debaty" ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        🗣️
                      </span>
                      <div className="min-w-0 text-left">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block leading-tight">
                          Diskuze (55%)
                        </span>
                        <span className="font-sans text-[12px] sm:text-xs uppercase font-black text-purple-950 block mt-0.5 leading-tight">
                          Otázka z Debaty
                        </span>
                      </div>
                    </div>

                    {/* Media Card */}
                    <div
                      className={`relative p-4 rounded-2xl border transition-all duration-300 flex items-center space-x-3.5 ${
                        drawAnimation.currentShowcased === "media"
                          ? "bg-blue-50/65 border-blue-400 shadow-sm scale-[1.02] ring-2 ring-blue-100"
                          : "bg-slate-50/30 border-slate-100 opacity-40 grayscale animate-pulse"
                      }`}
                    >
                      {drawAnimation.currentShowcased === "media" && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg animate-bounce">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className={`p-3 rounded-xl font-bold text-lg leading-none shrink-0 ${
                        drawAnimation.currentShowcased === "media" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        📺
                      </span>
                      <div className="min-w-0 text-left">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block leading-tight">
                          Tisk (25%)
                        </span>
                        <span className="font-sans text-[12px] sm:text-xs uppercase font-black text-blue-950 block mt-0.5 leading-tight">
                          Mediální Kauza
                        </span>
                      </div>
                    </div>

                    {/* Podcast Card */}
                    <div
                      className={`relative p-4 rounded-2xl border transition-all duration-300 flex items-center space-x-3.5 ${
                        drawAnimation.currentShowcased === "podcast"
                          ? "bg-emerald-50/65 border-emerald-400 shadow-sm scale-[1.02] ring-2 ring-emerald-100"
                          : "bg-slate-50/30 border-slate-100 opacity-40 grayscale animate-pulse"
                      }`}
                    >
                      {drawAnimation.currentShowcased === "podcast" && (
                        <div className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full p-1 shadow-lg animate-bounce">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className={`p-3 rounded-xl font-bold text-lg leading-none shrink-0 ${
                        drawAnimation.currentShowcased === "podcast" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        🎧
                      </span>
                      <div className="min-w-0 text-left">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block leading-tight">
                          Zpětná vazba (20%)
                        </span>
                        <span className="font-sans text-[12px] sm:text-xs uppercase font-black text-emerald-950 block mt-0.5 leading-tight">
                          Feedback Podcastu
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual selection ticker details & progress */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 z-10 shrink-0">
                    {drawAnimation.isCycling ? (
                      <div className="flex flex-col items-center space-y-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
                          className="w-10 h-10 rounded-full border-4 border-t-blue-800 border-r-slate-200 border-b-slate-200 border-l-slate-200 shadow-sm"
                        />
                        <span className="font-sans text-xs font-black text-blue-800 uppercase tracking-widest animate-pulse">
                          Probíhá osudové losování...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2 text-center animate-bounce">
                        <span className="text-2xl shrink-0 mb-1">🎯</span>
                        <span className="font-sans text-sm font-black text-emerald-800 uppercase tracking-wider">
                          Vylosováno: {
                            drawAnimation.resultType === "debaty" 
                              ? "Debatní diskuse!" 
                              : drawAnimation.resultType === "media"
                              ? "Mediální kauza!"
                              : "Feedback z Podcastu!"
                          }
                        </span>
                      </div>
                    )}

                    <div className="w-full bg-slate-250 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className={`h-full ${drawAnimation.isCycling ? "bg-blue-600 animate-pulse" : "bg-emerald-650"}`}
                      />
                    </div>
                  </div>

                  {/* Skip and auto-proceed handles */}
                  <div className="flex justify-center pt-3.5 z-10 relative">
                    <button
                      onClick={() => {
                        // Skip directly to event activation
                        setDrawAnimation((prev) => {
                          if (prev) {
                            setActiveEvent(prev.targetEvent);
                            setEventType("categorical");
                          }
                          return null;
                        });
                      }}
                      className="px-6 py-3.5 bg-blue-800 hover:bg-blue-900 text-white font-sans text-xs uppercase tracking-widest font-extrabold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow"
                    >
                      <span>Vstoupit do nového dne &rarr;</span>
                    </button>
                  </div>
                </div>
              ) : activeEvent ? (
                <div className={`bg-white rounded-[24px] shadow-sm relative overflow-hidden transition-all duration-150 ${
                  eventType === "categorical" && (activeEvent as CategoricalEvent).kategorie === "podcast"
                    ? "border-[3px] border-slate-900 p-2"
                    : "border border-slate-100 p-6 sm:p-8"
                }`}>
                  {/* Decorative glowing backplate */}
                  {!(eventType === "categorical" && (activeEvent as CategoricalEvent).kategorie === "podcast") && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 blur-2xl pointer-events-none" />
                  )}

                  {eventType === "categorical" ? (
                    (activeEvent as CategoricalEvent).kategorie === "podcast" ? (
                      // Custom Newspaper Styled Podcast card inside stage!
                      <div className="border border-slate-900/25 p-5 sm:p-9 bg-[#fdfdfc] rounded-[18px] flex flex-col items-center">
                        <div className="relative w-full flex flex-col items-center justify-center text-center pb-2">
                          <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-[0.25em] font-sans font-extrabold">
                            ZMÍNKA V PODCASTU
                          </span>
                          <h3 className="font-serif italic font-black text-slate-900 text-lg sm:text-2xl mt-1 tracking-tight">
                            {(activeEvent as any).resolvedPositive ? "MLUVÍ SE O VÁS V DOBRÉM" : "POD PALBOU MIKROFONŮ"}
                          </h3>
                        </div>

                        {/* Thick Solid Editorial Divider */}
                        <div className="w-full h-[3px] bg-slate-900 mb-4 sm:mb-5" />

                        {/* Headline in Bohemian quotes */}
                        <h4 className="font-serif text-xl sm:text-2xl font-extrabold text-[#111827] leading-tight mb-4 text-center px-1 text-balance">
                          „{activeEvent.nazev.replace("Feedback z podcastu: ", "")}“
                        </h4>

                        {/* Report Context Text */}
                        <p className="font-serif text-slate-700 text-xs sm:text-sm leading-relaxed text-center max-w-md mb-6 px-1">
                          {activeEvent.text}
                        </p>

                        {/* Dynamic Electrorate Influence Container */}
                        <div
                          className={`flex flex-row items-center justify-between gap-3 p-3.5 sm:p-4 w-full rounded-xl border mb-5 ${
                            (activeEvent as any).resolvedPositive
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                              : "bg-rose-50/60 border-rose-200 text-rose-900"
                          }`}
                        >
                          <div className="font-serif italic text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                            Vliv na elektorát:{" "}
                            <span className={`font-sans font-black text-sm sm:text-base ${
                              (activeEvent as any).resolvedPositive ? "text-emerald-700" : "text-rose-700"
                            }`}>
                              {(activeEvent as any).resolvedPositive ? "+" : "-"}{(activeEvent as any).rawDelta?.toFixed(1) || "0.4"} %
                            </span>
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[11px] sm:text-xs font-sans tracking-widest font-extrabold ${
                              (activeEvent as any).resolvedPositive ? "text-emerald-800" : "text-rose-800"
                            } uppercase`}
                          >
                            {(activeEvent as any).resolvedPositive ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>POZITIVNÍ</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-650 shrink-0" />
                                <span>NEGATIVNÍ</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Standard button from choice */}
                        <button
                          onClick={() => handleSelectChoice((activeEvent as CategoricalEvent).moznosti[0])}
                          className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white font-sans text-xs sm:text-sm uppercase tracking-[0.16em] font-black rounded-xl transition-all duration-150 shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.002] active:scale-[0.998]"
                        >
                          {(activeEvent as CategoricalEvent).moznosti[0].text}
                        </button>

                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-sans tracking-[0.25em] uppercase font-bold text-center mt-5">
                          VOLEBNÍ LISTINY • STATISTICKÁ ZPĚTNÁ VAZBA NAŠÍ REDAKCE
                        </span>
                      </div>
                    ) : (
                      // Categorical Choices Loop
                      <div className="space-y-6">
                      {/* Badge category details */}
                      <div className="flex justify-between items-center gap-2">
                        <span
                          className={`text-[9px] tracking-widest font-sans font-bold uppercase rounded px-2.5 py-1 box-border border ${
                            (activeEvent as CategoricalEvent).kategorie === "media"
                              ? "bg-cyan-50 border-cyan-100 text-cyan-700"
                              : (activeEvent as CategoricalEvent).kategorie === "ekonomika"
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                              : (activeEvent as CategoricalEvent).kategorie === "koalice"
                              ? "bg-purple-50 border-purple-100 text-purple-700"
                              : "bg-amber-50 border-amber-100 text-amber-700"
                          }`}
                        >
                          {(activeEvent as CategoricalEvent).kategorie.toUpperCase()} — Událost
                        </span>

                        <span className="text-[10px] text-slate-400 font-sans tracking-tight uppercase">
                          id: {activeEvent.id}
                        </span>
                      </div>

                      {/* Event description */}
                      <div className="space-y-3">
                        <h2 className="text-2xl font-sans text-slate-900 font-black tracking-tight leading-snug">
                          {activeEvent.nazev}
                        </h2>

                        {/* Highlight parties in media conflicts as requested */}
                        {(((activeEvent as CategoricalEvent).kategorie === "media") || (activeEvent as any).isMediaEvent) && (
                          <div className="flex flex-wrap gap-2 items-center text-xs font-sans py-1.5">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Střet se stranou:</span>
                            {(() => {
                              const partiesToShow = (activeEvent as any).conflictParty 
                                ? [(activeEvent as any).conflictParty, (activeEvent as any).conflictParty2].filter(Boolean)
                                : Object.values(STRANY).filter(p => {
                                    if (p.id === gameState.stranaId) return false;
                                    return activeEvent.text.includes(p.zkratka) || activeEvent.text.includes(p.lidr);
                                  });
                              
                              if (partiesToShow.length === 0) {
                                // Default fallback to first non-player party if none identified
                                const firstOpponent = Object.values(STRANY).find(p => p.id !== gameState.stranaId);
                                if (firstOpponent) partiesToShow.push(firstOpponent);
                              }
                              
                              return partiesToShow.map((p: any) => (
                                <span 
                                  key={p.id} 
                                  style={{ backgroundColor: `${p.barva}12`, borderColor: p.barva, color: p.barva }}
                                  className="px-2.5 py-1 rounded-lg font-black border uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-sm"
                                >
                                  <span style={{ backgroundColor: p.barva }} className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" />
                                  {p.zkratka} ({p.lidr})
                                </span>
                              ));
                            })()}
                          </div>
                        )}

                        {((activeEvent as CategoricalEvent).kategorie === "podcast") ? (
                          <div className="border-[3px] border-slate-900 p-1.5 rounded-lg shadow-sm w-full">
                            <div className="border border-slate-900/30 p-5 sm:p-7 bg-[#fdfdfc] rounded-md flex flex-col items-center">
                              <span className="text-[9px] text-slate-500 uppercase tracking-[0.25em] font-sans font-extrabold mb-1">
                                ZMÍNKA V PODCASTU
                              </span>
                              <div className="w-full h-[3px] bg-slate-900 mb-4" />
                              <h4 className="font-serif text-lg sm:text-xl font-extrabold text-slate-950 leading-tight mb-3 text-center px-1 italic">
                                „{activeEvent.nazev}“
                              </h4>
                              <p className="font-serif text-slate-850 text-xs sm:text-sm leading-relaxed text-center max-w-sm px-1">
                                {activeEvent.text}
                              </p>
                            </div>
                          </div>
                        ) : (activeEvent as CategoricalEvent).kategorie === "debaty" ? (
                          // 📺 Studio Televize Live Debata Style
                          <div className="bg-slate-950 text-white rounded-2xl border-[3px] border-indigo-700/80 shadow-2xl overflow-hidden font-sans">
                            {/* Live TV Bar */}
                            <div className="bg-gradient-to-r from-red-650 via-indigo-950 to-slate-900 px-4 py-2 sm:py-2.5 flex items-center justify-between border-b border-indigo-950 select-none">
                              <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse inline-block shrink-0" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-50">STUDIO ČT24 v25 • LIVE DEBATA</span>
                              </div>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">HD KANÁL</span>
                            </div>
                            
                            {/* Inner Screen content */}
                            <div className="p-5 sm:p-7 bg-slate-900 relative">
                              <div className="absolute top-4 right-4 text-white/5 font-sans font-black text-6xl tracking-tighter select-none pointer-events-none">
                                LIVE
                              </div>
                              <div className="space-y-4 relative z-10">
                                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-indigo-400 block border-b border-slate-800 pb-1.5 max-w-max">
                                  TÉma: {activeEvent.kontext || "Politická diskuse"}
                                </span>
                                <div className="space-y-4">
                                  {/* Moderator character head and prompt */}
                                  <div className="flex items-start space-x-3.5">
                                    <div className="w-10 h-10 rounded-full bg-indigo-900 border border-indigo-400/30 flex items-center justify-center font-sans font-black text-indigo-100 text-sm shrink-0 shadow-lg">
                                      🎙️
                                    </div>
                                    <div className="bg-slate-850/90 border border-slate-850 rounded-2xl p-4 text-xs sm:text-[13.5px] leading-relaxed text-slate-100 shadow-inner flex-1 italic">
                                      {activeEvent.text}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (activeEvent as CategoricalEvent).kategorie === "media" ? (
                          // 📰 Blesková / Mediální Kauza Newspaper Style
                          <div className="bg-[#FAF8F5] text-slate-900 rounded-2xl border-[3.5px] border-rose-700 shadow-xl overflow-hidden font-sans relative">
                            {/* BREAKING NEWS BAR */}
                            <div className="bg-red-700 text-white px-4 py-2 flex items-center justify-between shadow-sm select-none border-b-[2.5px] border-slate-900">
                              <div className="flex items-center space-x-2">
                                <span className="text-base">🚨</span>
                                <span className="text-xs sm:text-sm font-black uppercase tracking-widest">MIMOŘÁDNÉ VYDÁNÍ: BLESKOVÉ ZPRÁVY</span>
                              </div>
                              <span className="text-[9px] sm:text-xs text-rose-100 font-bold uppercase tracking-wider font-sans">KAUZA</span>
                            </div>
                            
                            {/* Headline container and newspaper layout */}
                            <div className="p-5 sm:p-7 space-y-4 relative bg-[#FFFDFB]">
                              <div className="border-b-[1.5px] border-slate-900/10 pb-4">
                                <div className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-rose-750 font-sans mb-1">
                                  UNIKLÉ INFORMACE • REPORTÁŽ
                                </div>
                                <h3 className="text-lg sm:text-xl font-serif font-black text-slate-950 leading-snug">
                                  Skandál na politické scéně čeří vody!
                                </h3>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-4 items-start">
                                {/* Newspaper capital dropcap */}
                                <p className="text-slate-800 text-xs sm:text-[13.5px] leading-relaxed font-serif text-justify first-letter:text-4xl first-letter:font-black first-letter:text-rose-700 first-letter:mr-2.5 first-letter:float-left flex-1 font-serif">
                                  {activeEvent.text}
                                </p>
                              </div>

                              <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg text-[10px] sm:text-xs text-rose-950 font-medium leading-relaxed">
                                💡 <em>Kauza byla převzata předními českými deníky a ovlivňuje sympatie ostatních politických stran k Vám.</em>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-650 font-sans text-[15px] sm:text-base leading-relaxed p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                            {activeEvent.text}
                          </p>
                        )}
                      </div>

                      {/* Grid of A/B/C/D choices */}
                      <div className="grid grid-cols-1 gap-3">
                        {(activeEvent as CategoricalEvent).moznosti.map((option) => {
                          const unlocked = satisfiesLock(gameState.budget, option.lock);
                          const advisor = PORADCI[gameState.poradceId] || PORADCI["populista"];

                          // Check if advisor reveals specialty
                          const isSpecialtyRevealed =
                            (advisor.id === "ekonom" &&
                              (activeEvent as CategoricalEvent).kategorie === "ekonomika") ||
                            (advisor.id === "diplomat" &&
                              (activeEvent as CategoricalEvent).kategorie === "koalice") ||
                            (advisor.id === "strateg" &&
                              (activeEvent as CategoricalEvent).kategorie === "kampan");

                          return (
                            <button
                              key={option.p}
                              disabled={!unlocked}
                              onClick={() => handleSelectChoice(option)}
                              className={`p-4.5 text-left rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                                unlocked
                                  ? "bg-slate-50/50 hover:bg-white border-slate-100 hover:border-blue-800 hover:shadow-md text-slate-800 cursor-pointer"
                                  : "bg-slate-100/40 border-slate-200 text-slate-450 italic opacity-50 cursor-not-allowed"
                              }`}
                            >
                              <div className="flex items-start space-x-3.5">
                                <span className="font-sans text-sm font-bold bg-slate-200 text-slate-800 rounded-full w-6 h-6 shrink-0 flex items-center justify-center mt-0.5 select-none">
                                  {option.p}
                                </span>
                                <div className="flex-1 text-sm leading-relaxed font-sans font-medium text-slate-700">
                                  {option.text}
                                </div>
                              </div>

                              {/* Lock warnings */}
                              {!unlocked && option.lock && (
                                <div className="text-[10px] uppercase font-sans text-red-600 font-bold mt-2 flex items-center space-x-1 pl-9">
                                  <span>🔒 Nedostatek peněz</span>
                                  <span>
                                    (Vyžadováno: {parseInt(option.lock.split(":")[1], 10).toLocaleString("cs-CZ")} Kč)
                                  </span>
                                </div>
                              )}

                              {/* Special advisor cheat tooltips */}
                              {unlocked && isSpecialtyRevealed && (
                                <div className="text-[10px] uppercase font-sans text-amber-800 font-bold mt-2 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded inline-block self-start shrink-0">
                                  ✨ Odhaleno poradcem {advisor.jmeno}: (
                                  {option.efekt.preference !== 0
                                    ? `Preference: ${option.efekt.preference > 0 ? "+" : ""}${
                                        option.efekt.preference
                                      }%`
                                    : ""}{" "}
                                  {option.efekt.budget !== 0
                                    ? `Rozpočet: ${option.efekt.budget > 0 ? "+" : ""}${
                                        option.efekt.budget.toLocaleString("cs-CZ")
                                      } Kč`
                                    : ""}
                                  )
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    )
                  ) : (
                    // Generic Routine Event (no choice, only viewer)
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] tracking-widest font-sans font-bold uppercase rounded bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1">
                          {(activeEvent as GenericEvent).typ.toUpperCase()} — BĚŽNÁ UDÁLOST
                        </span>
                        <span className="text-[10px] text-slate-450 font-sans uppercase">
                          id: {activeEvent.id}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-xl sm:text-2xl font-sans text-slate-900 font-bold leading-normal">
                          Zprávy z regionálních štábů
                        </h2>
                        <p className="text-slate-650 font-sans text-[15px] sm:text-base leading-relaxed p-5 bg-slate-50 border border-slate-100 rounded-2xl font-medium">
                          {activeEvent.text}
                        </p>
                      </div>

                      <button
                        onClick={handleAcknowledgeGeneric}
                        className="w-full py-3.5 bg-blue-800 hover:bg-blue-900 text-white font-sans text-xs uppercase tracking-widest font-bold rounded-xl shadow transition-colors duration-150 cursor-pointer shadow-blue-100"
                      >
                        Vzít na vědomí a pokračovat &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 bg-white border border-slate-100 rounded-[24px] shadow-sm animate-pulse text-slate-400 italic font-sans font-medium">
                  Vyhledávání další události...
                </div>
              )}
            </div>

            {/* Right side history log panel & Skip Turn */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[28px] p-6 self-stretch flex flex-col justify-between min-h-[480px] lg:max-h-[650px] overflow-hidden shadow-sm">
              <div className="space-y-4.5 overflow-hidden flex flex-col h-full flex-1">
                <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-100 shrink-0">
                  <History className="w-5 h-5 text-blue-800" />
                  <h3 className="font-sans text-sm uppercase tracking-wider text-slate-800 font-bold">
                    Dnes v kuloárech (Historie)
                  </h3>
                </div>

                <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs mt-3">
                  {gameState.history.length === 0 ? (
                    <p className="text-slate-405 italic font-sans text-center py-10">
                      Zatím žádné záznamy o průběhu kampaně.
                    </p>
                  ) : (
                    gameState.history.map((log, index) => (
                      <div
                        key={index}
                        className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5"
                      >
                        <div className="flex justify-between items-center font-sans tracking-tight">
                          <span className="font-bold text-slate-800">
                            {log.title}
                          </span>
                          <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-bold">
                            {log.turn ? `${log.turn}. kolo` : "Zápis"}
                          </span>
                        </div>
                        <p className="text-slate-600 font-sans leading-relaxed line-clamp-3">
                          {log.description}
                        </p>
                        {log.changes && log.changes.length > 0 && (
                          <div className="text-[10px] font-sans border-t border-slate-200/50 pt-1.5 mt-1 space-y-0.5">
                            {log.changes.map((c, idx) => (
                              <div key={idx} className="text-emerald-700 font-medium">
                                • {c}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Skip Turn Mechanismus & Rescind */}
              <div className="border-t border-slate-100 pt-4 mt-4 shrink-0">
                {!turnResult && (
                  <>
                    <button
                      id="skip-turn-btn"
                      disabled={gameState.preference < (isDebateTurn(gameState.turn) ? 5.0 : 0.5)}
                      onClick={handleSkipTurn}
                      className={`w-full py-3 px-4 font-sans text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all duration-155 flex items-center justify-center gap-2 ${
                        gameState.preference < (isDebateTurn(gameState.turn) ? 5.0 : 0.5)
                          ? "bg-slate-50 border border-slate-250 text-slate-400 cursor-not-allowed opacity-50"
                          : "bg-red-50 hover:bg-red-105 border border-red-200 text-red-800 hover:text-red-955 shadow-sm cursor-pointer"
                      }`}
                    >
                      <span>
                        {isDebateTurn(gameState.turn)
                          ? "⏭️ Vyhnout se debatě (Bojkotovat)"
                          : "⏭️ Předat vedení PR týmu (Přeskočit kolo)"}
                      </span>
                    </button>

                    <p className="text-[11px] text-slate-500 font-sans mt-2 text-center leading-relaxed">
                      {isDebateTurn(gameState.turn) ? (
                        <span className="text-red-700 font-medium block">
                          ⚠️ <strong>Bojkot debaty stojí 5.0 % preferencí</strong> a sníží sympatie se všemi stranami o 5 bodů.
                        </span>
                      ) : (
                        <span>
                          ℹ️ Předání vedení krizovému PR týmu <strong>stojí 0.5 % preferencí</strong>.
                        </span>
                      )}
                    </p>

                    {gameState.preference < (isDebateTurn(gameState.turn) ? 5.0 : 0.5) && (
                      <p className="text-[10px] text-red-600 font-sans mt-1.5 text-center font-bold">
                        ⚠️ Nedostatek preferencí (Nelze klesnout pod 0 % preferencí).
                      </p>
                    )}
                  </>
                )}

                <button
                  onClick={handleWithdrawFromCampaign}
                  className="w-full mt-3 py-2.5 px-4 font-sans text-[11px] uppercase tracking-wider font-extrabold rounded-xl transition-all duration-155 flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-100 hover:bg-black hover:text-white shadow-sm cursor-pointer"
                >
                  <span>🏳️ Odstoupit z Kampaně</span>
                </button>

                <button
                  onClick={handleEarlyElections}
                  className="w-full mt-2 py-2.5 px-4 font-sans text-[11px] uppercase tracking-wider font-extrabold rounded-xl transition-all duration-155 flex items-center justify-center gap-2 bg-amber-950/40 border border-amber-900/50 text-amber-300 hover:bg-amber-900/30 shadow-sm cursor-pointer"
                >
                  <span>⚡ Vyvolat předčasné volby</span>
                </button>
                <p className="text-[11px] text-slate-500 font-sans mt-2 text-center leading-relaxed">
                  Vyvolání předčasných voleb znamená okamžitou ztrátu 50 % vašich stávajících volebních preferencí, které budou redistribuovány mezi ostatní strany.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStage === "poll" && gameState && (
          <div className="max-w-3xl mx-auto w-full">
            <PollingResults
              state={gameState}
              showDismissButton={true}
              onDismiss={handleDismissPoll}
              titleOverride={
                gameState.turn > TOTAL_GAME_TURNS
                  ? `Finální předvolební průzkum (Kolo ${TOTAL_GAME_TURNS})`
                  : `Volební průzkum — Kolo ${gameState.turn - 1}`
              }
              subtitleOverride={
                gameState.turn > TOTAL_GAME_TURNS
                  ? "Toto jsou odhady preferencí těsně před otevřením volebních místností. Chcete-li přistoupit ke sčítání reálných hlasů voličů pod vlivem statistické odchylky, pokračujte tlačítkem níže."
                  : "Zveřejněno nezávislou agenturou Kantar. Sněmovní bariéra je stanovena na 5.0 %."
              }
              buttonTextOverride={
                gameState.turn > TOTAL_GAME_TURNS
                  ? "Přejít k celostátním volbám \u2192"
                  : undefined
              }
            />
          </div>
        )}

        {currentStage === "elections" && gameState && (
          <ElectionsStage
            state={gameState}
            onProceedToCoalition={() => {
              setCurrentStage("coalition");
            }}
            onProceedToEnding={(success, customCoalitionDetails) => {
              const finalCoalition = customCoalitionDetails || null;
              setCoalitionResults(finalCoalition);
              setGameVictory(success);
              if (finalCoalition) {
                const computedTyp = determineEndingTyp(success, gameState, finalCoalition);
                setEndingTyp(computedTyp);
              } else {
                setEndingTyp(success ? "premier" : "opozice");
              }
              setCurrentStage("ending");
            }}
          />
        )}

        {currentStage === "coalition" && gameState && (
          <CoalitionStage state={gameState} onFinishGame={handleFinishCoalition} />
        )}

        {currentStage === "ending" && gameState && (
          <EndingStage
            success={gameVictory}
            state={gameState}
            coalitionDetails={coalitionResults}
            endingTyp={endingTyp}
            onRestart={handleResetGame}
            currentUser={currentUser}
            dailySubmitStatus={dailySubmitStatus}
            dailyIsNewBest={dailyIsNewBest}
            dailyAttempts={dailyAttempts}
            dailyBestResult={dailyBestResult}
            newlyUnlockedAchievements={newlyUnlockedAchievements}
          />
        )}
          </>
        )}

        {/* Large Event (Přelomová událost) Modal */}
        <AnimatePresence>
          {activeLargeEventPopup && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveLargeEventPopup(null)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-[5px] z-50 transition-opacity"
              />
              
              {/* Modal Container */}
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white rounded-3xl shadow-[0_30px_70px_-10px_rgba(0,0,0,0.8)] border border-slate-800 overflow-hidden"
                >
                  {/* Visual flare / accent */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-500" />
                  
                  <div className="p-6 sm:p-8 flex flex-col items-center">
                    
                    {/* Header Alert Emblem */}
                    <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] uppercase tracking-[0.2em] font-sans font-black px-3.5 py-1.5 rounded-full mb-6">
                      <span className="animate-pulse">🚨</span>
                      <span>Přelomová událost</span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-xl sm:text-2xl font-sans font-black text-center text-white leading-tight tracking-tight mb-3">
                      {activeLargeEventPopup.nazev}
                    </h2>

                    {/* Event Description */}
                    <p className="text-slate-350 font-sans text-sm sm:text-base text-center leading-relaxed font-normal mb-6">
                      {activeLargeEventPopup.popis}
                    </p>

                    {/* Societal shifts (atributDrift) breakdown */}
                    <div className="w-full bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl mb-8">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-4.5 text-center">
                        Důsledky pro českou společnost
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(activeLargeEventPopup.atributDrift).map(([key, v]) => {
                          const val = v as number;
                          const label = key === "ekonomika" ? "Ekonomika" : key === "kultura" ? "Kultura" : key === "evropa" ? "Evropa" : "Styl politiky";
                          const isPos = val > 0;
                          return (
                            <div key={key} className="flex justify-between items-center bg-slate-950/50 px-3.5 py-2.5 border border-slate-900 rounded-xl">
                              <span className="text-slate-300 font-semibold">{label}</span>
                              <span className={`font-black uppercase text-[10px] sm:text-xs tracking-wider px-2 py-0.5 rounded ${isPos ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                                {isPos ? "↑" : "↓"} {isPos ? "+" : ""}{val}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CTA button */}
                    <button
                      onClick={() => setActiveLargeEventPopup(null)}
                      className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 hover:from-red-500 hover:to-amber-600 text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl shadow-lg transition-all duration-150 transform hover:-translate-y-0.5 cursor-pointer text-center"
                    >
                      Být připraven a reagovat ⚡
                    </button>

                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Podcast Event Slide-In Notification */}
        <AnimatePresence>
          {activePodcastEvent && (
            <>
              {/* Screen-locking backdrop to prevent proceeding */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleConfirmPodcast}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-[3px] z-40 transition-opacity"
              />
              
              {/* Center Modal Layout */}
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="relative w-full max-w-xl bg-white border-[3px] border-slate-900 p-2 rounded-lg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)]"
                >
                  <div className="border border-slate-900/30 p-5 sm:p-9 bg-[#fdfdfc] rounded-md flex flex-col items-center">
                    
                    {/* Header Row */}
                    <div className="relative w-full flex flex-col items-center justify-center text-center pb-2">
                      <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-[0.25em] font-sans font-extrabold">
                        ZMÍNKA V PODCASTU
                      </span>
                      <h3 className="font-serif italic font-black text-slate-900 text-lg sm:text-2xl mt-1 tracking-tight">
                        {activePodcastEvent.isPositive ? "MLUVÍ SE O VÁS V DOBRÉM" : "POD PALBOU MIKROFONŮ"}
                      </h3>
                      
                      {/* Close button "× Zavřít" in top corner */}
                      <button
                        onClick={handleConfirmPodcast}
                        className="absolute -top-1 sm:-top-4 -right-1 sm:-right-4 text-slate-400 hover:text-slate-900 font-sans text-xs tracking-wider font-extrabold flex items-center gap-0.5 cursor-pointer p-1.5 transition-colors duration-150"
                      >
                        <span className="text-base sm:text-lg leading-none font-light">×</span> Zavřít
                      </button>
                    </div>

                    {/* Thick Solid Editorial Divider */}
                    <div className="w-full h-[3px] bg-slate-900 mb-4 sm:mb-5" />

                    {/* Centered headline inside Bohemian curly quotes */}
                    <h4 className="font-serif text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight mb-4 text-center px-2">
                      „{activePodcastEvent.podcast}“
                    </h4>

                    {/* Report Text in beautiful styled Serif */}
                    <p className="font-serif text-slate-700 text-xs sm:text-sm leading-relaxed text-center max-w-md mb-6 px-1">
                      {activePodcastEvent.text}
                    </p>

                    {/* Dynamic Electrorate Influence Container */}
                    <div
                      className={`flex flex-row items-center justify-between gap-3 p-3.5 sm:p-4 w-full rounded-xl border mb-5 ${
                        activePodcastEvent.isPositive
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                          : "bg-rose-50/60 border-rose-200 text-rose-900"
                      }`}
                    >
                      <div className="font-serif italic text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                        Vliv na elektorát:{" "}
                        <span className={`font-sans font-black text-sm sm:text-base ${
                          activePodcastEvent.isPositive ? "text-emerald-700" : "text-rose-700"
                        }`}>
                          {activePodcastEvent.isPositive ? "+" : "-"}{activePodcastEvent.delta.toFixed(1)} %
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-1 text-[11px] sm:text-xs font-sans tracking-widest font-extrabold ${
                          activePodcastEvent.isPositive ? "text-emerald-800" : "text-rose-800"
                        } uppercase`}
                      >
                        {activePodcastEvent.isPositive ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>POZITIVNÍ</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-650 shrink-0" />
                            <span>NEGATIVNÍ</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Primary Newspaper Action Button */}
                    <button
                      onClick={handleConfirmPodcast}
                      className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-sans text-xs sm:text-sm uppercase tracking-[0.16em] font-black rounded-lg transition-all duration-150 shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.005] active:scale-[0.995]"
                    >
                      VZÍT NA VĚDOMÍ
                    </button>

                    {/* Footer citation stamp */}
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-sans tracking-[0.25em] uppercase font-bold text-center mt-5">
                      VOLEBNÍ LISTINY • NEZÁVISLÁ ANALÝZA TISKOVÉ SLUŽBY
                    </span>
                    
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Filip Turek Controversy Popup */}
        <AnimatePresence>
          {activeTurekKauza && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#07090e]/85 backdrop-blur-md z-50 transition-opacity"
              />
              
              {/* Modal Container */}
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full max-w-2xl bg-white text-slate-900 rounded-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.7)] border border-slate-200 overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Left Column - Grayscale Turek Portrait Section */}
                  <div className="w-full md:w-2/5 bg-slate-950 text-white p-8 flex flex-col items-center justify-center space-y-5 relative">
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                    
                    <div className="relative p-1.5 bg-gradient-to-tr from-slate-800 to-slate-400 rounded-full shadow-inner shadow-black/80">
                      <div className="bg-slate-900 rounded-full p-4 flex items-center justify-center border border-white/10">
                        <TurekSvgPortrait />
                      </div>
                    </div>
                    
                    <div className="text-center space-y-1">
                      <span className="font-mono text-[9px] tracking-[0.25em] text-red-500 uppercase font-black">
                        AKTIVNÍ PORADCE
                      </span>
                      <h4 className="font-sans font-black text-lg tracking-tight text-white uppercase sm:text-xl">
                        Filip Turek
                      </h4>
                      <p className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">
                        Hranatá Legenda
                      </p>
                    </div>
                    
                    <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest text-center leading-normal max-w-[160px]">
                      „MOUDRÝ NEPORADÍ, ALE AUTO TI UKÁŽE.“
                    </span>
                  </div>

                  {/* Right Column - Threat info & Detail text */}
                  <div className="w-full md:w-3/5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#fafafa] md:bg-white text-left">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-1.5 text-red-650 bg-red-50 border border-red-150 px-3 py-1 rounded-full w-fit">
                        <span className="animate-ping w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                        <span className="text-[10px] tracking-wider uppercase font-sans font-black leading-none">
                          AKTUÁLNÍ HROZBA
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 uppercase tracking-tight leading-tight">
                          KAUZA: FILIP TUREK
                        </h2>
                        <div className="h-[2px] w-12 bg-slate-950 rounded" />
                      </div>
                      
                      <p className="text-xs text-slate-500 font-sans font-medium italic mt-2 leading-relaxed">
                        Veřejnost bouří. Nově zveřejněné kontroverzní skutečnosti vrhají na vašeho poradce pochybné světlo. Jaká bude reakce volebního štábu?
                      </p>

                      <div className="bg-white border border-slate-200 p-4.5 rounded-2xl space-y-2 shadow-xs">
                        <h3 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span>⚠️</span> {activeTurekKauza.nazev}
                        </h3>
                        <p className="text-xs text-slate-650 leading-relaxed font-sans">
                          {activeTurekKauza.popis}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border-t border-slate-150/80 pt-4 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-sans text-slate-400 block uppercase font-black tracking-wider leading-none">
                            DOPAD NA PREFERENCE
                          </span>
                          <span className="text-[10px] font-sans text-slate-455">
                            nepřímé kuloární důsledky
                          </span>
                        </div>
                        <span className="text-2xl sm:text-3xl font-sans font-black text-rose-650 tracking-tight leading-none">
                          {activeTurekKauza.dopad.toFixed(1)} %
                        </span>
                      </div>

                      <button
                        onClick={handleCloseTurekKauza}
                        className="w-full py-4 bg-slate-950 hover:bg-slate-900 active:bg-black text-white font-sans text-xs uppercase tracking-widest font-black rounded-xl shadow-lg transition-all duration-150 cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <span>ROZUMÍM A JDU DÁL</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-100 bg-white px-4 py-5 shrink-0 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Czech Political Simulation (Satirická parlamentní simulace).</p>
          <a
            href="https://heyzine.com/flip-book/724f8f24dd.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-600 underline font-medium transition-colors"
          >
            📖 Uživatelský manuál
          </a>
          <p className="font-sans text-[10px] text-slate-450 uppercase tracking-widest font-bold">
            Nepodporuje politický trolling, nýbrž politické pochopení.
          </p>
        </div>
      </footer>
    </div>
    <Analytics />
    <SpeedInsights />
    </RngContext.Provider>
  );
}
