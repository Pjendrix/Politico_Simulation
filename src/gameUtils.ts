/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EndingTyp, GameState, CoalitionDetails } from "./types";
import { STRANY, TUREK_KAUZY, TurekKauza } from "./data";
import { calculatePartySeats } from "./components/ElectionsStage";
import { EPILOG } from "./dataEpilog";


/**
 * Determine the game ending type based on electon results and coalition negotiation success.
 */
export function determineEndingTyp(
  success: boolean,
  state: GameState,
  details: CoalitionDetails | null
): EndingTyp {
  if (success && details) {
    const playerSeats = details.playerSeats;
    const partnerSeats = details.acceptedPartyIds.map(id => details.parliamentSeats[id] || 0);
    const maxPartnerSeats = partnerSeats.length > 0 ? Math.max(...partnerSeats) : 0;
    return playerSeats >= maxPartnerSeats ? "premier" : "vicepremier";
  }

  // Find passed parties
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
    const val = row[toId];
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

    // Václav Klaus vetoes any coalition containing both the player party and ODS
    if (state.poradceId === "klaus" && subsetIds.includes(state.stranaId) && subsetIds.includes("ods")) {
      hasExtremeAnimosity = true;
    }

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

  const allSubsets = getSubsets(passingPartiesWithSeats.map((p) => p.id));
  const coalitions101Plus = allSubsets
    .map((ids) => getCoalitionDetailsForSubset(ids))
    .filter((c) => c.totalSeats >= 101 && !c.hasExtremeAnimosity);

  const bestAlternative = [...coalitions101Plus].sort((a, b) => a.avgIdealDiff - b.avgIdealDiff)[0] || null;

  const isPlayerInAlt = bestAlternative
    ? bestAlternative.parties.some((p) => p.id === state.stranaId)
    : false;

  return isPlayerInAlt ? "koalicni_partner" : "opozice";
}

/**
 * Normalizes all party preferences (player and NPCs) so they sum up to EXACTLY 100.0%.
 * Rounds values to 1 decimal place. Re-distributes residual discrepancy to larger parties.
 */
export function normalizePreferencesTo100(
  playerPref: number,
  npcPrefs: Record<string, number>,
  playerPartyId: string
): { playerPref: number; npcPrefs: Record<string, number> } {
  const preferences: Record<string, number> = { [playerPartyId]: playerPref };
  Object.entries(npcPrefs).forEach(([id, pref]) => {
    preferences[id] = pref;
  });

  // Ensure minimum floor of 0.1% to prevent negative or disappearing preference scores
  Object.keys(preferences).forEach((id) => {
    if (preferences[id] < 0.1) {
      preferences[id] = 0.1;
    }
  });

  // Convert to initially rounded 1-decimal percentages
  const roundedPrefs: Record<string, number> = {};
  let roundedSum = 0;
  Object.entries(preferences).forEach(([id, pref]) => {
    const rounded = Math.round(pref * 10) / 10;
    roundedPrefs[id] = rounded;
    roundedSum += rounded;
  });

  // Discrepancy from 100.0%
  let discrepancy = Math.round((100.0 - roundedSum) * 10) / 10;

  // Distribute 0.1% pieces starting from largest parties down to preserve realistic proportions
  const sortedParties = Object.keys(preferences).sort((a, b) => preferences[b] - preferences[a]);

  let iteration = 0;
  while (Math.abs(discrepancy) > 0.01 && iteration < 200) {
    const partyId = sortedParties[iteration % sortedParties.length];
    const sign = discrepancy > 0 ? 1 : -1;

    if (roundedPrefs[partyId] + sign * 0.1 >= 0.1) {
      roundedPrefs[partyId] = Math.round((roundedPrefs[partyId] + sign * 0.1) * 10) / 10;
      discrepancy = Math.round((discrepancy - sign * 0.1) * 10) / 10;
    }
    iteration++;
  }

  const finalPlayerPref = roundedPrefs[playerPartyId];
  const finalNpcPrefs: Record<string, number> = {};
  Object.entries(roundedPrefs).forEach(([id, pref]) => {
    if (id !== playerPartyId) {
      finalNpcPrefs[id] = pref;
    }
  });

  return { playerPref: finalPlayerPref, npcPrefs: finalNpcPrefs };
}

/**
 * Calculates preference penalty impact for Filip Turek controversies (ranges from -1.0% to -2.0%).
 */
export function getTurekControversyImpact(rng: () => number = Math.random): number {
  return parseFloat((-1.0 - rng() * 1.0).toFixed(1));
}

/**
 * Unified turn penalty processor that manages Filip Turek controversial situations.
 */
export function applyTurnPenalties(
  state: GameState,
  rng: () => number = Math.random
): {
  turekDopad: number | null;
  turekKauza: TurekKauza | null;
} {
  let turekKauza: TurekKauza | null = null;
  let turekDopad: number | null = null;

  if (state.poradceId === "turek" && state.turn % 3 === 0) {
    const idx = Math.floor(rng() * TUREK_KAUZY.length);
    turekKauza = TUREK_KAUZY[idx];
    turekDopad = getTurekControversyImpact(rng);
  }

  return {
    turekDopad,
    turekKauza,
  };
}

/**
 * Centrally calculates end of turn updates and Turek controversy roll.
 */
export function resolveEndOfTurn(
  state: GameState,
  nextBudget: number,
  baseLogs: string[],
  currentPreference: number,
  rng: () => number = Math.random
): {
  nextPreference: number;
  logs: string[];
  turekDopad: number | null;
  turekKauza: TurekKauza | null;
} {
  const penalties = applyTurnPenalties(state, rng);
  let nextPreference = currentPreference;
  const logs = [...baseLogs];

  logs.push("Uhrazeny volební administrativní poplatky Centrály (-5 000 Kč).");

  return {
    nextPreference,
    logs,
    turekDopad: penalties.turekDopad,
    turekKauza: penalties.turekKauza,
  };
}

/**
 * Vygeneruje krátký satirický epilog (4-5 vět) na základě výsledku hry.
 * Náhodnost je omezena jen na výběr varianty UVNITŘ jedné kategorie textů.
 */
export function generateEpilog(
  state: GameState,
  finalEndingTyp: EndingTyp,
  coalitionDetails: CoalitionDetails | null,
  rng: () => number
): string {
  const pick = (arr: string[]): string => arr[Math.floor(rng() * arr.length)];

  const vety: string[] = [];

  // 1. Úvodní věta podle typu konce
  vety.push(pick(EPILOG.uvod[finalEndingTyp]));

  // 2. Reakce koaličního partnera / doslov z opozice
  if (finalEndingTyp !== "opozice") {
    let partnerId: string | null = null;

    if (coalitionDetails && coalitionDetails.acceptedPartyIds.length > 0) {
      // Partner s největším počtem mandátů
      partnerId = [...coalitionDetails.acceptedPartyIds].sort(
        (a, b) =>
          (coalitionDetails.parliamentSeats[b] || 0) -
          (coalitionDetails.parliamentSeats[a] || 0)
      )[0];
    }

    if (partnerId) {
      const reakce = EPILOG.partnerReakce[partnerId];
      if (reakce) {
        const trust = state.trust[partnerId] ?? 50;
        vety.push(trust >= 50 ? reakce.positive : reakce.negative);
      }
    }
  } else {
    vety.push(pick(EPILOG.opozicniDoslov));
  }

  // 3. Dominantní rys kampaně (podle stats.pref*)
  const stats = state.stats;
  if (stats) {
    const kandidati: { key: keyof typeof EPILOG.dominantniRys; val: number }[] = [
      { key: "media", val: Math.abs(stats.prefMedia ?? 0) },
      { key: "debaty", val: Math.abs(stats.prefDebaty ?? 0) },
      { key: "podcasty", val: Math.abs(stats.prefPodcasty ?? 0) },
      { key: "mimoradne", val: Math.abs(stats.prefMimoradne ?? 0) },
      { key: "kompas", val: Math.abs(stats.prefCompass ?? 0) },
    ];

    const top = kandidati.sort((a, b) => b.val - a.val)[0];
    if (top && top.val > 0) {
      vety.push(pick(EPILOG.dominantniRys[top.key]));
    }
  }

  // 4. Verdikt o souladu s kompasem
  const kompas = state.spolecenskyKompas;
  const atr = state.atributy;
  if (kompas && atr) {
    const avgDiff =
      (Math.abs(atr.ekonomika - kompas.ekonomika) +
        Math.abs(atr.kultura - kompas.kultura) +
        Math.abs(atr.evropa - kompas.evropa) +
        Math.abs(atr.stylPolitiky - kompas.stylPolitiky)) /
      4;

    if (avgDiff < 15) {
      vety.push(pick(EPILOG.kompasVerdikt.nizka));
    } else if (avgDiff < 35) {
      vety.push(pick(EPILOG.kompasVerdikt.stredni));
    } else {
      vety.push(pick(EPILOG.kompasVerdikt.vysoka));
    }
  }

  // 5. Poslední slovo poradce
  const poradceLines = EPILOG.poradceOdchod[state.poradceId];
  if (poradceLines) {
    vety.push(pick(poradceLines));
  }

  return vety.join(" ");
}

/**
 * Adjust preference in a zero-sum manner among all NPC parties in the system
 */
export function calculateZeroSumAdjustment(
  playerDiff: number,
  playerPartyId: string,
  currentNpcPrefs: Record<string, number>,
  partnerDeltas?: Record<string, number>,
  targetPlayerPref?: number,
  gameState?: { preference: number }
) {
  // Copy NPC preferences
  const nextNpcPrefs = { ...currentNpcPrefs };
  let playerDelta = playerDiff;

  // Apply partner explicit updates
  if (partnerDeltas) {
    Object.entries(partnerDeltas).forEach(([id, delta]) => {
      if (nextNpcPrefs[id] !== undefined) {
        nextNpcPrefs[id] = Math.max(0, nextNpcPrefs[id] + delta);
        playerDelta += delta;
      }
    });
  }

  if (playerDelta === 0) return nextNpcPrefs;

  const npcIds = Object.keys(STRANY).filter((id) => id !== playerPartyId && (!partnerDeltas || partnerDeltas[id] === undefined));
  if (npcIds.length === 0) return nextNpcPrefs;

  const playerParty = STRANY[playerPartyId];

  // Compute weights for zero-sum redistribution
  const weights: Record<string, number> = {};
  npcIds.forEach((id) => {
    const p = STRANY[id];
    // Opposing blocks have double weights, "mimo" standard
    let multiplier = 1;
    if (
      (playerParty.blok === "vladni" && p.blok === "opozicni") ||
      (playerParty.blok === "opozicni" && p.blok === "vladni")
    ) {
      multiplier = 2;
    } else if (playerParty.blok === "mimo") {
      if (p.blok === "vladni" || p.blok === "opozicni") {
        multiplier = 2;
      }
    }
    weights[id] = multiplier;
  });

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  // Change NPCs inversely
  const totalDeductionNeeded = playerDelta;
  npcIds.forEach((id) => {
    const propChange = (weights[id] / totalWeight) * totalDeductionNeeded;
    nextNpcPrefs[id] -= propChange;
  });

  // Clamp NPC preferences of others to prevent negative percentages
  let subZeroOverage = 0;
  npcIds.forEach((id) => {
    if (nextNpcPrefs[id] < 0) {
      subZeroOverage += -nextNpcPrefs[id];
      nextNpcPrefs[id] = 0;
    }
  });

  // Redistribute the clamped overflow among non-zero partners
  if (subZeroOverage > 0) {
    const positiveNpcIds = npcIds.filter((id) => nextNpcPrefs[id] > 0);
    if (positiveNpcIds.length > 0) {
      const positiveTotalWeight = positiveNpcIds.reduce((sum, id) => sum + (weights[id] || 1), 0);
      positiveNpcIds.forEach((id) => {
        nextNpcPrefs[id] -= ((weights[id] || 1) / positiveTotalWeight) * subZeroOverage;
        if (nextNpcPrefs[id] < 0) nextNpcPrefs[id] = 0;
      });
    }
  }

  const activePlayerPref = targetPlayerPref !== undefined
    ? targetPlayerPref
    : Math.max(0.1, (gameState?.preference ?? 0) + playerDiff);
  const { npcPrefs: finalNpcPrefs } = normalizePreferencesTo100(
    activePlayerPref,
    nextNpcPrefs,
    playerPartyId
  );

  return finalNpcPrefs;
}

