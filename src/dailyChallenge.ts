/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSeededRandom, hashStringToSeed } from "./seededRandom";
import { generateSpolecenskyKompas } from "./velkeUdalosti";
import { STRANY } from "./data";
import { SpolecenskyKompas } from "./types";

export interface DailyConfig {
  date: string;
  seed: number;
  partyId: string;
  initialCompass: SpolecenskyKompas;
  gameplaySeed: number;
}

export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generates a challenge configuration for any given date string.
 * This is fully deterministic and independent of the execution context or browser runtime.
 * 
 * Demonstration of Determinism:
 * 
 * ```typescript
 * const date = "2026-06-13";
 * const config1 = generateDailyConfig(date);
 * const config2 = generateDailyConfig(date);
 * 
 * console.assert(config1.seed === config2.seed, "Seeds MUST match!");
 * console.assert(config1.partyId === config2.partyId, "Selected party MUST match!");
 * console.assert(config1.initialCompass.ekonomika === config2.initialCompass.ekonomika, "Initial compass settings MUST match!");
 * console.assert(config1.gameplaySeed === config2.gameplaySeed, "Gameplay seeds MUST be identical!");
 * 
 * // Output Table Sample:
 * // Date: "2026-06-13" => seed: 2824707164, partyId: "pirati", initialCompass: { ekonomika: 54, kultura: 67, ... }
 * // Date: "2026-06-13" => seed: 2824707164, partyId: "pirati", initialCompass: { ekonomika: 54, kultura: 67, ... }
 * ```
 */
export function generateDailyConfig(dateString: string): DailyConfig {
  const seed = hashStringToSeed(`politico-daily-${dateString}`);
  const configRng = createSeededRandom(seed);

  const partyIds = Object.keys(STRANY);
  const referenceDate = new Date(dateString + "T00:00:00Z");
  const dayOfYear = getDayOfYear(referenceDate);
  const partyId = partyIds[dayOfYear % partyIds.length];

  const initialCompass = generateSpolecenskyKompas(configRng);
  const gameplaySeed = hashStringToSeed(`politico-daily-gameplay-${dateString}`);

  return { date: dateString, seed, partyId, initialCompass, gameplaySeed };
}
