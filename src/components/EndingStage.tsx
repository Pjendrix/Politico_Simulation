/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { STRANY, PORADCI } from "../data";
import { GameState, CoalitionDetails, EndingTyp, DailyBestRecord } from "../types";
import { UnlockedAchievementRecord } from "../achievementsStorage";
import { Trophy, Award, Landmark, TrendingUp, AlertTriangle, RefreshCw, Smile, ShieldAlert, Share2, Download, Check, Loader2, Sparkles, Play, Lock } from "lucide-react";
import { calculatePartySeats } from "./ElectionsStage";
import { generateEpilog } from "../gameUtils";
import { useRng } from "../rngContext";
import ShareCard from "./ShareCard";
import { ACHIEVEMENTS } from "../achievements";

interface EndingStageProps {
  success: boolean;
  state: GameState;
  coalitionDetails: CoalitionDetails | null;
  endingTyp: EndingTyp | null;   // NOVÉ
  onRestart: () => void;
  currentUser?: any;
  dailySubmitStatus?: "not_daily" | "submitting" | "success" | "error";
  dailyIsNewBest?: boolean;
  dailyAttempts?: number;
  dailyBestResult?: DailyBestRecord | null;
  newlyUnlockedAchievements?: UnlockedAchievementRecord[];
}

export default function EndingStage({
  success,
  state,
  coalitionDetails,
  endingTyp,
  onRestart,
  currentUser,
  dailySubmitStatus,
  dailyIsNewBest = false,
  dailyAttempts = 1,
  dailyBestResult = null,
  newlyUnlockedAchievements = [],
}: EndingStageProps) {
  const rng = useRng();
  const playerParty = STRANY[state.stranaId];
  const advisor = PORADCI[state.poradceId] || Object.values(PORADCI)[0];
  const playerSeats = coalitionDetails?.playerSeats || 0;

  const initialPreference = state.stats?.initialPreference ?? playerParty.preference;

  const prefChange = state.preference - initialPreference;

  const playerElectionResult = state.electionResults && state.electionResults[state.stranaId] !== undefined
    ? state.electionResults[state.stranaId]
    : state.preference;

  const prefKampanDelta = parseFloat((
    (state.stats?.prefMimoradne ?? 0) +
    (state.stats?.prefBezny ?? 0) +
    (state.stats?.prefMedia ?? 0)
  ).toFixed(1));
  const prefDebatyDelta = state.stats?.prefDebaty ?? 0;
  const prefPodcastyDelta = state.stats?.prefPodcasty ?? 0;
  const prefCompassDelta = state.stats?.prefCompass ?? 0;
  const prefPenalizaceDelta = state.stats?.prefPenalizace ?? 0;

  // Find or reconstruct historical preferences
  const historyData = (() => {
    if (state.preferenceHistory && state.preferenceHistory.length > 0) {
      return state.preferenceHistory.map((pref, index) => ({
        turn: index,
        preference: pref,
      }));
    }
    
    // Graceful fallback reconstruction of past turns
    const timeline: { turn: number; preference: number }[] = [];
    const startingPref = state.stats?.initialPreference ?? playerParty.preference;
    const finalPref = state.preference;
    const totalTurns = 25;
    for (let i = 0; i <= totalTurns; i++) {
      const ratio = i / totalTurns;
      const trend = startingPref + ratio * (finalPref - startingPref);
      const wave = Math.sin(ratio * Math.PI * 2) * 1.5;
      const val = parseFloat(Math.max(0.1, trend + wave * (1 - ratio * 0.5)).toFixed(1));
      timeline.push({
        turn: i,
        preference: i === totalTurns ? finalPref : val,
      });
    }
    return timeline;
  })();

  // Re-calculate seat distribution mathematically to find the stable alternative coalition
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

  const passingPartiesWithSeats = partyList
    .filter((p) => (seatMap[p.id] || 0) > 0)
    .map((p) => ({ ...p, seats: seatMap[p.id] || 0 }));

  const getSubsets = (arr: any[]) => {
    const res: any[][] = [];
    const fork = (i: number, cur: any[]) => {
      if (cur.length > 0) res.push(cur);
      for (let j = i; j < arr.length; j++) {
        fork(j + 1, [...cur, arr[j]]);
      }
    };
    fork(0, []);
    return res;
  };

  const getSympatie = (fromId: string, toId: string) => {
    if (fromId === toId) return 100;
    if (fromId === state.stranaId) {
      return state.trust[toId] !== undefined ? state.trust[toId] : 50;
    }
    if (toId === state.stranaId) {
      return state.trust[fromId] !== undefined ? state.trust[fromId] : 50;
    }
    const row = state.npcTrust[fromId];
    if (!row) return 50;
    const val = row[toId] as any;
    if (val === "x") return 100;
    return typeof val === "number" ? val : 50;
  };

  const getAtributy = (partyId: string) => {
    if (partyId === state.stranaId) {
      return state.atributy;
    }
    return state.npcAtributy[partyId] || { ekonomika: 50, kultura: 50, evropa: 50, stylPolitiky: 50 };
  };

  const getCoalitionDetailsForSubset = (subsetIds: string[]) => {
    const subsetParties = subsetIds.map((id) => {
      const isPlayer = id === state.stranaId;
      const originalParty = STRANY[id];
      return {
        id,
        zkratka: originalParty.zkratka,
        nazev: originalParty.nazev,
        barva: originalParty.barva || "#7f8c8d",
        seats: seatMap[id] || 0,
        isPlayer,
      };
    });

    const totalSeats = subsetParties.reduce((sum, p) => sum + p.seats, 0);

    let sumDiff = 0;
    let hasExtremeAnimosity = false;
    let pairCount = 0;

    for (let i = 0; i < subsetIds.length; i++) {
      for (let j = i + 1; j < subsetIds.length; j++) {
        const aId = subsetIds[i];
        const bId = subsetIds[j];

        const attrA = getAtributy(aId);
        const attrB = getAtributy(bId);

        const diffs = {
          ekonomika: Math.abs(attrA.ekonomika - attrB.ekonomika),
          kultura: Math.abs(attrA.kultura - attrB.kultura),
          evropa: Math.abs(attrA.evropa - attrB.evropa),
          stylPolitiky: Math.abs(attrA.stylPolitiky - attrB.stylPolitiky),
        };

        const maxDiff = Math.max(...Object.values(diffs));
        const avgDiff = Object.values(diffs).reduce((sum, v) => sum + v, 0) / 4;
        sumDiff += avgDiff;

        const relAB = getSympatie(aId, bId);
        const relBA = getSympatie(bId, aId);

        if (relAB <= 5 || relBA <= 5) {
          hasExtremeAnimosity = true;
        }

        pairCount++;
      }
    }

    const avgIdealDiff = pairCount > 0 ? sumDiff / pairCount : 0;

    return {
      parties: subsetParties,
      totalSeats,
      avgIdealDiff,
      hasExtremeAnimosity,
    };
  };

  // Compute all potential 101+ stable alternatives (no extreme animosity, sorted by programmatic alignment)
  const allSubsets = getSubsets(passingPartiesWithSeats.map((p) => p.id));
  const coalitions101Plus = allSubsets
    .map((ids) => getCoalitionDetailsForSubset(ids))
    .filter((c) => c.totalSeats >= 101 && !c.hasExtremeAnimosity);

  const bestAlternative = [...coalitions101Plus].sort((a, b) => a.avgIdealDiff - b.avgIdealDiff)[0] || null;

  // Identify status and leaders in the selected alternative coalition:
  const sortedPartiesInAlt = bestAlternative
    ? [...bestAlternative.parties].sort((a, b) => b.seats - a.seats)
    : [];
  const strongestAltParty = sortedPartiesInAlt[0] || null;
  const strongestAltPartyOriginal = strongestAltParty ? STRANY[strongestAltParty.id] : null;

  const isPlayerInAlt = bestAlternative
    ? bestAlternative.parties.some((p) => p.id === state.stranaId)
    : false;
  const isPlayerStrongestInAlt = strongestAltParty ? strongestAltParty.id === state.stranaId : false;

  // Dopočítej finální endingTyp (pro failure-side "koalicni_partner" vs "opozice")
  const finalEndingTyp: EndingTyp = (() => {
    if (endingTyp === "premier" || endingTyp === "vicepremier") return endingTyp;
    if (!success) {
      return isPlayerInAlt ? "koalicni_partner" : "opozice";
    }
    return endingTyp ?? "opozice";
  })();

  const epilogText = React.useMemo(
    () => generateEpilog(state, finalEndingTyp, coalitionDetails, rng),
    [state, finalEndingTyp, coalitionDetails, rng]
  );

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [shareFeedback, setShareFeedback] = React.useState<string | null>(null);

  const handleShare = async () => {
    setIsGenerating(true);
    setShareFeedback(null);
    try {
      const { toPng } = await import("html-to-image");
      const node = document.getElementById("politico-share-card");
      if (!node) {
        throw new Error("Generátor výsledkové karty nebyl nalezen.");
      }

      // Render image targeting precise resolution
      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: 1200,
        height: 630,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          margin: "0",
          padding: "0",
        }
      });

      // Human-readable outcome summary
      const outcomeCzech = 
        finalEndingTyp === "premier" ? "Premiér České republiky" :
        finalEndingTyp === "vicepremier" ? "Vicepremiér / Junior vládce" :
        finalEndingTyp === "koalicni_partner" ? "Koaliční partner" :
        "Opoziční lavičky";

      const diffSymbol = prefChange >= 0 ? "+" : "";
      const shareText = `Zrovna jsem dohrál/a politickou simulaci Politico! Moje strana ${playerParty.zkratka} skončila s výsledkem: ${playerElectionResult.toFixed(1)}% (${diffSymbol}${prefChange.toFixed(1)} p.b.). Ve vládě beru post: ${outcomeCzech}! 🗳️ Zkuste to taky na:`;

      // Trigger automatic PNG download
      const link = document.createElement("a");
      link.download = `politico-vysledek-${playerParty.zkratka.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();

      // Native share support
      let sharedSuccessfully = false;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], "politico-vysledek.png", { type: "image/png" });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "Politico — Volební výsledek",
              text: shareText,
              files: [file],
              url: window.location.href,
            });
            sharedSuccessfully = true;
            setShareFeedback("Výsledek úspěšně sdílen!");
          }
        } catch (e) {
          console.log("Navigator.share was skipped/cancelled:", e);
        }
      }

      if (!sharedSuccessfully) {
        // Clipboard fallback
        await navigator.clipboard.writeText(shareText + " " + window.location.href);
        setShareFeedback("Obrázek byl stažen a text byl zkopírován do schránky!");
      }

    } catch (err) {
      console.error(err);
      setShareFeedback("Chyba při generování kuloární karty.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setShareFeedback(null);
      }, 5000);
    }
  };

  // Konfigurace pro každý typ endingu
  const endingConfig: Record<EndingTyp, {
    ikona: string;
    nadpis: string;
    barvaBg: string;
    barvaText: string;
    barvaBorder: string;
    popis: string;
  }> = {
    premier: {
      ikona: "🏆",
      nadpis: "Premiér České republiky",
      barvaBg: "bg-yellow-50",
      barvaText: "text-amber-700",
      barvaBorder: "border-yellow-250",
      popis: "Sestavil(a) jsi koalici a jsi největší stranou. Klíče od Strakovy akademie jsou tvoje.",
    },
    vicepremier: {
      ikona: "🥈",
      nadpis: "Vicepremiér / Junior partner",
      barvaBg: "bg-blue-50",
      barvaText: "text-blue-700",
      barvaBorder: "border-blue-200",
      popis: "Sestavil(a) jsi koalici, ale silnější partner bere premiérský post. Jsi ve vládě, ale ne na vrcholu.",
    },
    koalicni_partner: {
      ikona: "🤝",
      nadpis: "Koaliční partner",
      barvaBg: "bg-slate-50",
      barvaText: "text-slate-700",
      barvaBorder: "border-slate-200",
      popis: "Nevyjednal(a) jsi koalici sám/sama, ale jiná strana tě přizvala. Jsi ve vládě, bez zásluhy.",
    },
    opozice: {
      ikona: "⚡",
      nadpis: "Opozice",
      barvaBg: "bg-red-50",
      barvaText: "text-red-700",
      barvaBorder: "border-red-200",
      popis: "Vláda vznikla bez tebe. Čekají tě čtyři roky v opozičních lavicích.",
    },
  };

  const config = endingConfig[finalEndingTyp];

  // Specific party-level narrative goal assessment
  const CONDITIONS_MAP: Record<string, { absolute: string; win: string; neutral: string; loss: string }> = {
    ano: {
      absolute: "Mít 101+ mandátů a sestavit jednobarevnou vládu.",
      win: "Být nejsilnější strana ve vládě - mít premiéra.",
      neutral: "Být ve vládě, ale bez premiéra.",
      loss: "Nebýt ve vládě."
    },
    motoriste: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    spd: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    ods: {
      absolute: "Získat 50+ mandátů, postavit vládu a mít premiéra.",
      win: "Být nejsilnější strana ve vládě - mít premiéra.",
      neutral: "Výsledek nad 10 % bez účasti ve vládě, nebo být součástí vlády (i s výsledkem pod 10 %).",
      loss: "Nepřekonat 10 % a zároveň nebýt součástí vlády."
    },
    top09: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    kdu: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    starostove: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě a dosáhnout dvouciferného výsledku (preference >= 10 %).",
      neutral: "Výsledek nad 10 % bez účasti ve vládě, nebo být součástí vlády s výsledkem pod 10 %.",
      loss: "Nepřekonat 10 % a zároveň nebýt součástí vlády."
    },
    pirati: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    kscm: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    socdem: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    silnecz: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    },
    zeleni: {
      absolute: "Být nejsilnější strana ve vládě - mít premiéra.",
      win: "Být ve vládě.",
      neutral: "Překonat 5 % ale nebýt součástí finální vládní koalice.",
      loss: "Nepřekonat 5 %."
    }
  };

  const getOutcomeRank = (): "absolute" | "win" | "neutral" | "loss" => {
    const finalPreference = playerElectionResult;
    if (state.hasWithdrawn || finalPreference <= 0) {
      return "loss";
    }

    const totalSeats = coalitionDetails?.totalSeats || 0;
    const isPlayerInGovernment = (success && totalSeats >= 101) || (!success && isPlayerInAlt);
    
    const alliesList = coalitionDetails?.acceptedPartyIds || [];
    const isPlayerPrimeMinister = 
      (success && playerSeats > 0 && alliesList.every(id => playerSeats > (coalitionDetails?.parliamentSeats[id] || 0))) ||
      (!success && isPlayerInAlt && isPlayerStrongestInAlt);

    switch (state.stranaId) {
      case "ano":
        if (playerSeats >= 101 && isPlayerInGovernment && alliesList.length === 0) {
          return "absolute";
        }
        if (isPlayerInGovernment && isPlayerPrimeMinister) {
          return "win";
        }
        if (isPlayerInGovernment) {
          return "neutral";
        }
        return "loss";

      case "ods":
        if (playerSeats >= 50 && isPlayerInGovernment && isPlayerPrimeMinister) {
          return "absolute";
        }
        if (isPlayerInGovernment && isPlayerPrimeMinister) {
          return "win";
        }
        if ((!isPlayerInGovernment && finalPreference >= 10.0) || (isPlayerInGovernment && !isPlayerPrimeMinister)) {
          return "neutral";
        }
        return "loss";

      case "starostove":
        if (isPlayerInGovernment && isPlayerPrimeMinister) {
          return "absolute";
        }
        if (isPlayerInGovernment && finalPreference >= 10.0) {
          return "win";
        }
        if ((!isPlayerInGovernment && finalPreference >= 10.0) || (isPlayerInGovernment && finalPreference < 10.0)) {
          return "neutral";
        }
        return "loss";

      default:
        // Motoristé, SPD, TOP 09, KDU-ČSL, Piráti, KSČM, SocDem, Naše Česko, Zelení
        if (isPlayerInGovernment && isPlayerPrimeMinister) {
          return "absolute";
        }
        if (isPlayerInGovernment) {
          return "win";
        }
        if (finalPreference >= 5.0 && !isPlayerInGovernment) {
          return "neutral";
        }
        return "loss";
    }
  };

  const outcomeRank = getOutcomeRank();
  const partyConditions = CONDITIONS_MAP[state.stranaId] || { absolute: "", win: "", neutral: "", loss: "" };

  const isGoalMet = outcomeRank === "win" || outcomeRank === "absolute";
  const isAbsoluteVictory = outcomeRank === "absolute";

  const getSatiricalSummary = () => {
    if (state.hasWithdrawn) {
      return `KAMPANĚ SE VZDÁVÁME! Šok na české politické scéně! Lídr strany ${playerParty.zkratka} oficiálně oznámil okamžité a bezprecedentní odstoupení z volební kampaně. Vaše dosavadní preference se bleskově rozpustily rovnoměrně mezi politickou konkurenci. Volební štáb v slzách vyklízí kanceláře a zklamaný ${advisor.jmeno} už si sepisuje smlouvu s novým klientem. Vaši voliči se cítí zrazeni a česká média bleskově analyzují, kdo na tomto nečekaném kolapsu nejvíce vydělá.`;
    }

    if (state.preference <= 0) {
      return `ZÁNIK STRANY! Volební preference vaší formace spadly na absolutní nulu. Strana se rozpadla rychleji než koalice Petra Nečase. Krajské buňky se hromadně hádají o zbývající kancelářský nábytek a rozladěný ${advisor.jmeno} už sepisuje memoáry, kde veškerou vinu svaluje výhradně na vaše amatérské chování v přímém přenosu. Do parlamentní historie jste se zapsali pouze jako vtipný meme na Azylu pro politické mrtvoly.`;
    }

    if (finalEndingTyp === "vicepremier") {
      return `Koaliční dohoda podepsána, ale premiérské křeslo obsadil lídr silnější strany. Tvoje strana ${playerParty.zkratka} sice vstoupila do vlády, ale skutečnou moc drží někdo jiný. ${advisor.jmeno} to komentuje: "Dostali jsme ministerstva, ale ne ta klíčová."`;
    }

    if (finalEndingTyp === "koalicni_partner") {
      return `Vlastní vyjednávání selhalo, ale ${strongestAltPartyOriginal?.lidr} z ${strongestAltPartyOriginal?.zkratka} tě v posledním momentu přizval(a) do koalice. Tvoje strana ${playerParty.zkratka} vládne — ale bez zásluhy a bez silné vyjednávací pozice. ${advisor.jmeno} to suše komentuje: "Dostali jsme se dovnitř, ale nezasloužili jsme si to."`;
    }

    if (finalEndingTyp === "premier") {
      if (outcomeRank === "absolute") {
        return `MIMOŘÁDNÁ ZPRÁVA: Absolutní a historické vítězství bez obdoby! Portál Seznam Zprávy hlásí: 'Drtivá vyjednávací a politická převaha pro stranu ${playerParty.zkratka}!' Pod neochvějným vedením specialisty ${advisor.jmeno} se vám podařilo zcela zbourat český koaliční systém a dosáhnout absolutního cíle splněním těch nejtvrdších podmínek: '${partyConditions.absolute}'. Nepotřebujete žádné kompromisy ani složité ústupky — vaše slovo je zákonem, opozice se utápí v slzách a politologové v ČT se dohadují, zda nevzniká nová monarchie. Martin Moravec o vás píše trilogii a Václav Dolejší z podcastu Vlevo dole jen tichým šeptem komentuje: 'Tohle se v Česku ještě nestalo!'`;
      }
      if (outcomeRank === "win") {
        return `Máme to doma! Portál Seznam Zprávy hlásí: 'Taktický triumf strany ${playerParty.zkratka}.' Pod neotřesitelným dohledem specialisty ${advisor.jmeno} se vám podařilo dosáhnout hlavního volebního cíle: '${partyConditions.win}'! Ovládli jste klíčové předvolební debaty a s přehledem vyjednali nebo se stali pevnou součástí vládní většiny. Vaše programová vyhlášení se stávají zákonem, opozice se utápí v slzách a politologové v ČT nechápou, kde jste na to vzali peníze (zejména když vám na kampaňovém účtu zbylo ${state.budget.toLocaleString("cs-CZ")} Kč). Martin Moravec s vámi již sepisuje knižní bestseller.`;
      }
      return `Vláda sice stojí, ale k nebi neodletí. Podepsali jste sice koaliční dohodu na ${coalitionDetails?.totalSeats} hlasů, ale z hlediska cíle se jedná o neutrální výsledek: '${partyConditions.neutral}'. V médiích se mluví o 'karpatské dohodě' plné bolestných kompromisů. Novinář Václav Dolejší z podcastu Vlevo dole poznamenává: 'Lídr ${playerParty.zkratka} sice sedí ve vládních kuloárech, ale musel partnerům odprodat i vlastní babičku'. Vaši voliči jsou mírně rozpačití - sice vládneme, ale s kým a za jakou cenu?`;
    }

    if (finalEndingTyp === "opozice") {
      const threshold = (state.stranaId === "ods" || state.stranaId === "starostove") ? 10.0 : 5.0;
      if (playerElectionResult < threshold) {
        return `VÝPRASK VE VOLBÁCH! Tvoje strana ${playerParty.zkratka} získala pouze ${playerElectionResult.toFixed(1)} % hlasů a nedosáhla na nutnou ${threshold}% hranici. Stáváte se mimoparlamentní silou, což znamená konec vládních ambicí. Volební štáb upadá do depresivního ticha a ${advisor.jmeno} dává rozhovory o tom, kde přesně jste udělali osudovou chybu. Do sněmovních lavic neusadíte jediného poslance, zatímco vítězné strany v čele s ${strongestAltPartyOriginal ? `${strongestAltPartyOriginal.lidr} (${strongestAltPartyOriginal.zkratka})` : "vítěznými formacemi"} už bleskově domlouvají vládní koalici bez vás.`;
      }

      if (bestAlternative) {
        if (bestAlternative.parties.length === 1) {
          return `Volby skončily naprostým triumfem jedné strany! Lídr vítězné formace ${strongestAltPartyOriginal?.lidr} (${strongestAltPartyOriginal?.zkratka}) získal se svými ${bestAlternative.totalSeats} mandáty absolutní většinu v Poslanecké sněmovně. Okamžitě sestavuje vlastní jednobarevnou většinovou vládu a odmítá jakákoliv koaliční vyjednávání s kýmkoliv dalším. Tvoje strana ${playerParty.zkratka} odchází do opozice s prázdnýma rukama. Vaše politické cíle se rozplynuly jako pára nad hrncem.`;
        }
        return `Zatímco tvoji vyjednavači pospávali na chodbách Sněmovny nebo slavili dílčí výsledky, politická konkurence v kuloárech nezahálela. Lídr nejsilnější strany ${strongestAltPartyOriginal?.lidr} (${strongestAltPartyOriginal?.zkratka}) bleskově vyjednal novou stabilní vládní koalici o síle ${bestAlternative.totalSeats} mandátů zcela beze tě a bez účasti tvé strany ${playerParty.zkratka}! Prohráli jste na celé čáře a vaše podmínka '${partyConditions.neutral}' zůstala nesplněna. Končíte izolovaní v chladných opozičních lavicích.`;
      } else {
        const sortedAll = [...passingPartiesWithSeats].sort((a, b) => b.seats - a.seats);
        const strongestOverall = sortedAll[0] || playerParty;
        if (strongestOverall.id === state.stranaId) {
          return `Česká republika upadá do naprostého patu a bezvládí! Tvoje strana ${playerParty.zkratka} sice kampaň formálně vyhrála se ziskem nejvíce křesel (${playerSeats}), ale nikdo v parlamentu s tebou nechce komunikovat a nepodařilo se dojednat žádnou většinu. Nesplnil jsi tak cíl své strany, což znamená porážku. Země míří neomylně k předčasným volbám v atmosféře těžkého rozčarování.`;
        } else {
          return `Země se ocitla v naprostém politickém patu a vaše strana ${playerParty.zkratka} si připisuje fatální prohru. Nejsilnější parlamentní strana ${strongestOverall.lidr} (${strongestOverall.zkratka}) nebyla schopna sestavit žádnou vládní většinu. Ty i tvé strana končíte zablokovaní mimo hru a Česká republika míří k předčasným volbám v atmosféře totálního rozvratu.`;
        }
      }
    }

    return "Kampaň dokončena.";
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 sm:p-8 bg-white border border-slate-150 rounded-[32px] shadow-sm space-y-6">
      {state.dailyDate && (
        <div className="space-y-4">
          <div className={`bg-gradient-to-r px-4 py-2.5 rounded-2xl text-xs font-sans font-black tracking-wider uppercase flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center shadow-sm ${
            dailySubmitStatus === "error"
              ? "from-red-500 to-rose-600 text-white"
              : dailySubmitStatus === "submitting"
              ? "from-blue-500 to-indigo-600 text-white"
              : "from-rose-500 to-amber-500 text-slate-950"
          }`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" />
              VÝSLEDEK DENNÍ VÝZVY: <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded font-black">{state.dailyDate}</span>
            </div>
            <div className="text-[10px] font-bold opacity-90">
              {dailySubmitStatus === "submitting" && "⏳ Odesílám výsledek na server..."}
              {dailySubmitStatus === "error" && "⚠️ Chyba uložení! Zkontrolujte připojení ke cloudu."}
              {dailySubmitStatus === "success" && "🎉 Výsledek úspěšně uložen do síně slávy!"}
              {(!dailySubmitStatus || dailySubmitStatus === "not_daily") && "Zaznamenáno v cloud žebříčku"}
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-750/70 rounded-2xl text-white font-sans flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm relative overflow-hidden">
            {/* Decorative subtle light aura */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 blur-xl pointer-events-none" />
            
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-1">
                Dnešní přehled pokusů
              </span>
              <div className="font-sans text-xs flex items-center gap-2">
                <span>Pokus číslo:</span>
                <strong className="text-white bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-sm">{dailyAttempts}</strong>
              </div>
              {dailyBestResult && (
                <div className="text-xs text-slate-300 mt-1.5">
                  Dnešní historicky nejlepší růst: <strong className="text-emerald-400 font-bold">{dailyBestResult.best.prefChange >= 0 ? "+" : ""}{dailyBestResult.best.prefChange?.toFixed(1)} p.b.</strong> • {dailyBestResult.best.seats} mandátů • strana {STRANY[dailyBestResult.best.partyId]?.zkratka || STRANY[state.stranaId]?.zkratka}
                </div>
              )}
            </div>

            <div className="z-10 shrink-0">
              {dailyIsNewBest ? (
                <span className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm animate-bounce" style={{ animationDuration: '3s' }}>
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Nový osobní rekord dne!
                </span>
              ) : (
                <div className="text-right">
                  <span className="px-3 py-1.5 bg-slate-800 text-slate-350 border border-slate-700/50 rounded-xl text-xs font-semibold uppercase flex items-center gap-1">
                    Rekord nebyl překonán
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visual Ending Emblem Banner */}
      <div className={`text-center p-8 ${config.barvaBg} border ${config.barvaBorder} rounded-[28px] relative overflow-hidden animate-fade-in`}>
        {/* Abstract background subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

        <div className="inline-flex p-4 bg-white border border-slate-100 rounded-full mb-3 shadow-sm">
          <span className="text-4xl">{config.ikona}</span>
        </div>

        <h1 className={`text-2xl font-sans ${config.barvaText} font-black uppercase tracking-tight`}>
          {config.nadpis}
        </h1>

        <p className="text-xs text-slate-500 font-sans uppercase font-bold tracking-wider mt-1.5">
          {config.popis}
        </p>
      </div>

      {/* Epilog — satirické shrnutí výsledku */}
      <div className="bg-white border border-slate-250/90 rounded-[24px] p-6 shadow-xs animate-fade-in space-y-3">
        <div className="flex items-center gap-2">
          <span className="bg-slate-900 border border-slate-800 text-white font-sans text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black">
            📰 Z tisku druhý den po volbách
          </span>
        </div>
        <p className="text-[14.5px] leading-relaxed text-slate-700 italic font-medium font-serif border-l-4 border-slate-900/60 pl-4.5 py-1 bg-slate-50/70 p-3 rounded-lg">
          "{epilogText}"
        </p>
      </div>

      {/* PROMINENT CONGRATULATIONS / VERDICT STATUS BANNER */}
      {success ? (
        <div className="p-6 bg-emerald-50/70 border border-emerald-250 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
            <span className="text-2xl">🎉</span>
          </div>
          <div>
            <h3 className="font-sans text-emerald-900 font-black text-base uppercase tracking-tight">
              Sestavení vlády úspěšné!
            </h3>
            <p className="text-sm text-emerald-850 font-sans font-semibold mt-1">
              Gratulujeme! Úspěšně jsi složil(a) novou vládu a osud České republiky je tak zcela na tvých bedrech. Hodně štěstí při vládnutí!
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-red-50/50 border border-red-250 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
            <span className="text-2xl">
              {state.hasWithdrawn ? "🏳️" : "⚡"}
            </span>
          </div>
          <div>
            <h3 className="font-sans text-red-900 font-black text-base uppercase tracking-tight">
              {state.hasWithdrawn
                ? "Odstoupení z kampaně"
                : playerElectionResult < 5.0
                ? "Volební porážka pod 5 %"
                : "Koaliční sestavení selhalo!"}
            </h3>
            <p className="text-sm text-red-800 font-sans font-semibold mt-1">
              {state.hasWithdrawn
                ? "Rozhodl(a) ses předčasně odstoupit z volebního klání. Tvoje strana se voleb vůbec neúčastnila, tudíž nemůže vyjednávat koalice."
                : playerElectionResult < 5.0
                ? "Neprobojoval(a) ses do Poslanecké sněmovny ČR, jelikož jsi nezískal(a) ve volbách potřebných 5 % hlasů. Koalice skládají druzí."
                : "Nepodařilo se ti sestavit stabilní většinovou vládu na tvůj vlastní návrh. Sněmovna vybrala nejpravděpodobnější variantu stability."}
            </p>
          </div>
        </div>
      )}

      {/* Main text box */}
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 shadow-sm">
        <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-150 pb-2 font-bold">
          Oficiální depeše ČTK
        </h3>
        <p className="text-slate-700 font-sans text-sm leading-relaxed font-semibold italic">
          {getSatiricalSummary()}
        </p>
      </div>

      {/* Newly Unlocked Achievements */}
      {newlyUnlockedAchievements && newlyUnlockedAchievements.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-[28px] p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 rounded-lg text-amber-600 block">
              <Award className="w-5 h-5 text-amber-500 animate-bounce" />
            </span>
            <h3 className="font-sans text-amber-900 font-extrabold text-base uppercase tracking-tight">
              🎉 Nové achievementy!
            </h3>
            <span className="ml-auto bg-amber-600 font-sans text-[10px] text-white px-2 py-0.5 rounded font-black uppercase">
              Odemčeno: {newlyUnlockedAchievements.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {newlyUnlockedAchievements.map((record, index) => {
              const detail = ACHIEVEMENTS.find(a => a.id === record.id);
              if (!detail) return null;

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.15, duration: 0.3 }}
                  key={record.id}
                  className="bg-white border border-amber-200 p-4 rounded-2xl shadow-xs hover:shadow-sm flex items-start gap-4 transition-all"
                >
                  <span className="text-3xl p-2.5 bg-amber-50 rounded-xl block shrink-0 select-none">
                    {detail.emoji}
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-sans text-sm font-black text-slate-900 flex items-center gap-1.5">
                      {detail.nazev}
                      <span className="text-yellow-500 text-xs">★</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-normal font-medium">
                      {detail.popis}
                    </p>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1">
                      Kategorie: {detail.kategorie}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal assessment card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specific Party Goal */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm animate-fade-in flex flex-col justify-between">
          <div>
            <h4 className="font-sans text-[10px] uppercase text-slate-500 tracking-wider font-bold mb-3">
              Kampaňové cíle a vyhodnocení
            </h4>
            <div className="space-y-2 text-xs font-sans">
              <div className={`p-2 rounded-lg border transition-all ${outcomeRank === 'absolute' ? 'bg-yellow-50/70 border-yellow-350 text-amber-950 font-bold' : 'bg-slate-50/50 border-slate-100 text-slate-500'}`}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="uppercase tracking-wide font-black text-[9px] text-amber-700">🏆 Absolutní Vítězství</span>
                  {outcomeRank === 'absolute' && <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black">DOSAŽENO</span>}
                </div>
                <p className="leading-tight font-medium">{partyConditions.absolute}</p>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${outcomeRank === 'win' ? 'bg-emerald-50/70 border-emerald-350 text-emerald-950 font-bold' : 'bg-slate-50/50 border-slate-100 text-slate-500'}`}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="uppercase tracking-wide font-black text-[9px] text-emerald-700">🌟 Vítězství / Hlavní cíl</span>
                  {outcomeRank === 'win' && <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-black">DOSAŽENO</span>}
                </div>
                <p className="leading-tight font-medium">{partyConditions.win}</p>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${outcomeRank === 'neutral' ? 'bg-blue-50/70 border-blue-350 text-blue-950 font-bold' : 'bg-slate-50/50 border-slate-100 text-slate-500'}`}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="uppercase tracking-wide font-black text-[9px] text-blue-700">⚖️ Neutrální výsledek</span>
                  {outcomeRank === 'neutral' && <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded font-black">DOSAŽENO</span>}
                </div>
                <p className="leading-tight font-medium">{partyConditions.neutral}</p>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${outcomeRank === 'loss' ? 'bg-rose-50/70 border-rose-350 text-rose-950 font-bold' : 'bg-slate-50/50 border-slate-100 text-slate-500'}`}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="uppercase tracking-wide font-black text-[9px] text-rose-700">🛑 Porážka</span>
                  {outcomeRank === 'loss' && <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.5 rounded font-black">DOSAŽENO</span>}
                </div>
                <p className="leading-tight font-medium">{partyConditions.loss}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-sans font-bold">Konečný status</span>
            <span className={`text-xs font-sans uppercase font-black px-2.5 py-1 rounded-lg ${
              outcomeRank === 'absolute' ? 'bg-yellow-105 text-amber-800 border border-yellow-250 animate-pulse' :
              outcomeRank === 'win' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
              outcomeRank === 'neutral' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
              'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {outcomeRank === 'absolute' ? 'ABSOLUTNÍ VÍTĚZSTVÍ' :
               outcomeRank === 'win' ? 'VÍTĚZSTVÍ' :
               outcomeRank === 'neutral' ? 'NEUTRÁLNÍ VÝSLEDEK' :
               'PORÁŽKA'}
            </span>
          </div>
        </div>

        {/* Coalition details / Alternative Coalition details */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm animate-fade-in">
          <h4 className="font-sans text-[10px] uppercase text-slate-500 tracking-wider font-bold">
            {success ? "Složení vládní většiny" : "Sestavená stabilní koalice (alternativní)"}
          </h4>
          <p className="text-sm text-slate-800 font-sans mt-2 flex flex-wrap gap-2 items-center">
            {success && coalitionDetails && coalitionDetails.acceptedPartyIds.length > 0 ? (
              coalitionDetails.acceptedPartyIds.map((id) => (
                <span
                  key={id}
                  className="px-2.5 py-1 border border-slate-100 rounded text-xs text-slate-800 font-sans font-extrabold uppercase bg-slate-50"
                  style={{ borderLeft: `3px solid ${STRANY[id].barva}` }}
                >
                  {STRANY[id].zkratka}
                </span>
              ))
            ) : !success && bestAlternative ? (
              bestAlternative.parties.map((p: any) => (
                <span
                  key={p.id}
                  className={`px-2.5 py-1 border rounded text-xs font-extrabold uppercase bg-slate-50 flex items-center space-x-1 ${
                    p.id === state.stranaId ? "ring-2 ring-blue-500/50" : ""
                  }`}
                  style={{ borderLeft: `3px solid ${p.barva}` }}
                  title={`${p.nazev} (${p.seats} mandátů)`}
                >
                  <span>{p.zkratka}</span>
                  <span className="text-[10px] font-normal text-slate-500">({p.seats})</span>
                </span>
              ))
            ) : (
              <span className="text-red-700 italic font-bold">Patová Roztržka (0 spojenců)</span>
            )}
          </p>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-sans font-bold">Celková síla hlasů</span>
            <span className="font-sans text-sm font-black text-slate-900">
              {success
                ? coalitionDetails?.totalSeats
                : bestAlternative
                ? bestAlternative.totalSeats
                : playerSeats}{" "}
              / 200 mandátů
            </span>
          </div>

          {!success && bestAlternative && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600 flex flex-col gap-1">
              <div>
                Premiér:{" "}
                <strong className="text-slate-900 font-extrabold">
                  {strongestAltPartyOriginal?.lidr} ({strongestAltPartyOriginal?.zkratka})
                </strong>
              </div>
              <div className="text-[11px] text-slate-500">
                Průměrný ideový rozdíl:{" "}
                <strong className="text-amber-800">{bestAlternative.avgIdealDiff.toFixed(1)} %</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Campaign Metrics / Stats Box */}
      <div className="bg-slate-50 border border-slate-200 p-6 sm:p-8 rounded-[24px] shadow-sm mb-6 text-slate-800">
         <h4 className="font-sans text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-3 mb-6 font-bold flex items-center justify-between">
           <span>📊 Celkové Vyhodnocení Kampaně</span>
           <span className="text-[10px] text-slate-400 font-sans tracking-tight font-normal lowercase">Srovnání s počátkem 1. kola</span>
         </h4>

         <div className="mb-6">
           {/* Posun preferencí */}
           <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
             <span className="text-[10px] font-sans uppercase font-bold text-slate-500 tracking-wider">Vývoj volebních preferencí</span>
             <div className={`text-2xl sm:text-3xl font-sans font-black mt-2 flex items-center flex-wrap gap-2 ${prefChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
               <span>{prefChange >= 0 ? "+" : ""}{prefChange.toFixed(1)} %</span>
               <span className="text-xs font-medium text-slate-400 font-sans normal-case">
                 (z {initialPreference}% na {state.preference.toFixed(1)}%)
               </span>
             </div>
           </div>
         </div>

         {/* Detailed Breakdown bullets */}
         <div className="space-y-3.5 pt-3 border-t border-slate-200 leading-relaxed font-sans text-sm text-slate-650">
           <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
             <span>Kampaňové události:</span>
             <span className={`font-extrabold font-sans tracking-wide ${prefKampanDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
               {prefKampanDelta >= 0 ? "+" : ""}{prefKampanDelta.toFixed(1)} %
             </span>
           </div>

           <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
             <span>Televizní debaty:</span>
             <span className={`font-extrabold font-sans tracking-wide ${prefDebatyDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
               {prefDebatyDelta >= 0 ? "+" : ""}{prefDebatyDelta.toFixed(1)} %
             </span>
           </div>

           <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
             <span>Feedback z podcastů:</span>
             <span className={`font-extrabold font-sans tracking-wide ${prefPodcastyDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
               {prefPodcastyDelta >= 0 ? "+" : ""}{prefPodcastyDelta.toFixed(1)} %
             </span>
           </div>

           <div className={`flex justify-between items-center py-1.5 border-b border-slate-150`}>
             <span>Hodnotový kompas:</span>
             <span className={`font-extrabold font-sans tracking-wide ${prefCompassDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
               {prefCompassDelta >= 0 ? "+" : ""}{prefCompassDelta.toFixed(1)} %
              </span>
            </div>

            {prefPenalizaceDelta !== 0 && (
              <div className="flex justify-between items-center py-1.5 animate-fade-in">
                <span>Penalizace v kampani:</span>
                <span className={`font-extrabold font-sans tracking-wide text-rose-600`}>
                  {prefPenalizaceDelta.toFixed(1)} %
                </span>
              </div>
            )}

         </div>
      </div>

       {/* Interactive Preference History Chart */}
       <PreferenceChart
         historyData={historyData}
         partyColor={playerParty.barva || "#1e3a8a"}
         partyZkratka={playerParty.zkratka}
       />

      {/* Campaign stats summary lists */}
      <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl shadow-sm">
        <h4 className="font-sans text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-150 pb-2.5 mb-4 font-bold">
          Statistické Výkazy Volební Kampaně
        </h4>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-[10px] uppercase font-sans text-slate-500 font-bold tracking-wider">Konečná preference</div>
            <div className="text-2xl font-sans font-black text-amber-700 mt-1">
              {state.preference.toFixed(1)} %
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-sans text-slate-500 font-bold tracking-wider">Volební poradce</div>
            <div className="text-xl font-sans font-black text-slate-800 mt-1 truncate max-w-[200px] mx-auto">
              {advisor.emoji} {advisor.jmeno}
            </div>
          </div>
        </div>
      </div>

      {/* Share Actions Panel */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 border border-slate-200 p-6 rounded-[24px] shadow-sm text-center space-y-4 animate-fade-in">
        <div className="max-w-md mx-auto space-y-1">
          <h4 className="font-sans text-xs uppercase tracking-wider font-extrabold text-indigo-950 flex items-center justify-center space-x-1.5">
            <Share2 className="w-4 h-4 text-indigo-650 animate-pulse" />
            <span>Sdílejte svůj volební triumf!</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
            Vygenerujte si exkluzivní volební kartu ve vysokém rozlišení s konečným výsledkem, mandáty, poradcem a novinovým titulkem, připravenou pro sociální sítě.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-2.5 max-w-sm mx-auto">
          <button
            onClick={handleShare}
            disabled={isGenerating}
            className={`w-full px-5 py-3 rounded-xl border font-sans text-xs uppercase tracking-wider font-extrabold flex items-center justify-center space-x-2 shadow-sm transition-all duration-150 cursor-pointer ${
              isGenerating
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:shadow-indigo-100 hover:shadow-md"
            }`}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-400" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            <span>{isGenerating ? "Generuji kartu..." : "Generovat kuloární kartu"}</span>
          </button>
        </div>

        {shareFeedback && (
          <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 px-3.5 py-1.5 rounded-xl text-[11px] font-bold animate-fade-in mx-auto">
            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-650" />
            <span>{shareFeedback}</span>
          </div>
        )}
      </div>

      {/* Replay action handle */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        {state.dailyDate ? (
          <>
            <button
              onClick={() => {
                onRestart();
                // We want to scroll to daily challenge. Since fresh mount takes a split second, let's schedule a tiny scroll-down
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }, 100);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-4.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-sans text-xs uppercase tracking-widest font-black rounded-xl shadow-md transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current text-slate-950" />
              <span>Zkusit znovu denní výzvu ⚡</span>
            </button>
            <button
              onClick={onRestart}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-4.5 bg-slate-800 hover:bg-slate-900 border border-slate-750 text-white font-sans text-xs uppercase tracking-widest font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Hrát standardní hru 🗳️</span>
            </button>
          </>
        ) : (
          <button
            onClick={onRestart}
            className="w-full sm:w-auto inline-flex items-center space-x-2 px-8 py-4.5 bg-blue-800 hover:bg-blue-900 border border-blue-800 text-white font-sans text-xs uppercase tracking-widest font-extrabold rounded-xl shadow-md shadow-blue-100 transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Navrhnout novou kampaň 🗳️</span>
          </button>
        )}
      </div>

      {/* Hidden container for rendering share image via html-to-image */}
      <div 
        style={{ 
          position: "absolute", 
          left: "-9999px", 
          top: "-9999px",
          width: "1200px",
          height: "630px",
          overflow: "hidden"
        }}
      >
        <ShareCard
          state={state}
          finalEndingTyp={finalEndingTyp}
          epilogText={epilogText}
          playerSeats={playerSeats}
          initialPreference={initialPreference}
        />
      </div>
    </div>
  );
}

function PreferenceChart({ historyData, partyColor, partyZkratka }: { historyData: Array<{ turn: number; preference: number }>, partyColor: string, partyZkratka: string }) {
  const [hoveredPoint, setHoveredPoint] = React.useState<{ turn: number; preference: number; x: number; y: number } | null>(null);

  // SVG dimensions
  const width = 600;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  // Find min and max for auto-scaling Y axis
  const preferences = historyData.map(d => d.preference);
  const maxPref = Math.max(...preferences, 15); // ensure some min threshold
  const minPref = Math.max(0, Math.min(...preferences) - 2);
  const displayMinY = Math.floor(minPref / 5) * 5;
  const displayMaxY = Math.ceil(maxPref / 5) * 5;
  const yRange = displayMaxY - displayMinY || 10;

  // Helper to map data points to SVG coordinates
  const getX = (turn: number) => {
    return paddingLeft + (turn / 25) * (width - paddingLeft - paddingRight);
  };
  const getY = (pref: number) => {
    return height - paddingBottom - ((pref - displayMinY) / yRange) * (height - paddingTop - paddingBottom);
  };

  // Generate SVG Path
  let pathD = "";
  historyData.forEach((d, i) => {
    const x = getX(d.turn);
    const y = getY(d.preference);
    if (i === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Generate Area under Path
  const areaD = pathD
    ? `${pathD} L ${getX(25)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`
    : "";

  return (
    <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs mb-6 relative">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-sans text-xs font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: partyColor }} />
          <span>Graf vývoje celkových preferencí ({partyZkratka})</span>
        </h5>
        <span className="font-mono text-[9px] text-slate-400">
          Kolo 0 až 25 • max: {Math.max(...preferences).toFixed(1)}%
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={partyColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={partyColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const val = displayMinY + (percent / 100) * yRange;
            const y = getY(val);
            return (
              <g key={percent} className="opacity-45">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  fill="#94a3b8"
                  fontSize="8.5"
                  className="font-mono text-right"
                  textAnchor="end"
                >
                  {val.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* X axis milestones */}
          {[0, 5, 10, 15, 20, 25].map((t) => {
            const x = getX(t);
            return (
              <g key={t} className="opacity-90">
                <line
                  x1={x}
                  y1={height - paddingBottom}
                  x2={x}
                  y2={height - paddingBottom + 4}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 13}
                  fill="#64748b"
                  fontSize="8"
                  className="font-mono text-[8px]"
                  textAnchor="middle"
                >
                  k. {t}
                </text>
              </g>
            );
          })}

          {/* Solid base line */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#94a3b8"
            strokeWidth="1"
            className="opacity-40"
          />

          {/* Area Fill */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#chartGradient)"
            />
          )}

          {/* Trend line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={partyColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Horizontal tracking line on hover */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={height - paddingBottom}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="opacity-70 pointer-events-none"
            />
          )}

          {/* Interactivity Overlay (Invisible hover bars) */}
          {historyData.map((d) => {
            const x = getX(d.turn);
            const y = getY(d.preference);
            return (
              <rect
                key={d.turn}
                x={x - (width - paddingLeft - paddingRight) / 50}
                y={paddingTop}
                width={(width - paddingLeft - paddingRight) / 25}
                height={height - paddingTop - paddingBottom}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredPoint({ ...d, x, y })}
                onMouseMove={() => setHoveredPoint({ ...d, x, y })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}

          {/* Actual static trace dots or highlight hover dot */}
          {historyData.map((d) => {
            const isMilestone = d.turn % 5 === 0 || d.turn === 25;
            const isHovered = hoveredPoint?.turn === d.turn;
            if (!isMilestone && !isHovered) return null;

            return (
              <circle
                key={d.turn}
                cx={getX(d.turn)}
                cy={getY(d.preference)}
                r={isHovered ? 4.5 : 2.5}
                fill={isHovered ? partyColor : "#ffffff"}
                stroke={partyColor}
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-100 pointer-events-none"
              />
            );
          })}
        </svg>

        {/* Hover absolute tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-slate-900 border border-slate-800 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-[10px] pointer-events-none font-sans z-10 flex flex-col items-start space-y-0.5"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              transform: "translateX(-50%)",
              top: `${Math.max(4, (hoveredPoint.y / height) * 100 - 32)}%`,
            }}
          >
            <span className="font-bold text-slate-300 text-[9px] uppercase tracking-wider font-mono">
              {hoveredPoint.turn}. kolo
            </span>
            <span className="font-extrabold text-amber-400 whitespace-nowrap">
              Preference: <span className="text-white font-black">{hoveredPoint.preference.toFixed(1)} %</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
