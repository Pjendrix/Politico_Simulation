/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SpolecenskyKompas {
  ekonomika: number;      // 0–100
  kultura: number;        // 0–100
  evropa: number;         // 0–100
  stylPolitiky: number;   // 0–100
}

export interface VelkaUdalost {
  id: string;
  nazev: string;
  popis: string;          // Zobrazený text hráči
  atributDrift: Partial<SpolecenskyKompas>;  // Posun kompasu (velký, ±20–50)
}

export interface Party {
  id: string;
  zkratka: string;
  nazev: string;
  lidr: string;
  blok: "vladni" | "opozicni" | "mimo";
  preference: number; // in %
  budget: number; // in CZK
  popis: string;
  ekonomika: number; // 0 - 100
  kultura: number; // 0 - 100
  evropa: number; // 0 - 100
  stylPolitiky: number; // 0 - 100
  winPopis: string;
  barva?: string; // HEX color for nice UI indicators
}

export interface AdvisorEffects {
  undoOnce?: boolean;
  coalitionForcedAccept?: string[];   // ID stran, které VŽDY přijmou koalici
  coalitionForcedReject?: string[];   // ID stran, které NIKDY nepřijmou koalici
  extraDiploActions?: number;         // navíc k základním 2
  coalitionRollBonusPct?: number;     // např. -10 = o 10% lepší šance (nebo záporná hodnota jako bonus v porovnání s roll)
  debateImpactMultiplier?: number;    // např. 1.5 = +50%
  debateImpactClamp?: { min: number; max: number }; // omezení rozsahu dopadu debaty
  podcastAlwaysPositive?: boolean;
  mediaNegativeImpactMultiplier?: number; // např. 0.5 = -50% negativního dopadu
  mediaPositiveImpactMultiplier?: number; // např. 1.5 = +50% pozitivního dopadu
  canSendTurek?: boolean;             // custom action for Filip Turek
  podcastChance?: number;             // custom roll chance for podcasts
}

export interface Advisor {
  id: string;
  jmeno: string;
  emoji: string;
  popis: string;
  specialita: string;
  role: string;
  vahy: {
    debaty: number;
    media: number;
    podcast: number;
  };
  effects?: AdvisorEffects;
}

export interface ChoiceEffect {
  preference: number;
  budget: number;
}

export interface Choice {
  p: "A" | "B" | "C" | "D";
  text: string;
  lock?: string; // e.g. "budget:150000"
  efekt: ChoiceEffect;
  partnerPreference?: Record<string, number>;
  sympatie?: Record<string, number>; // mappings like opozicni: +5, motoriste: -5, evropa_vysoke: -5...
  atributDrift?: Partial<{
    ekonomika: number;
    kultura: number;
    evropa: number;
    stylPolitiky: number;
  }>;
}

export interface CategoricalEvent {
  id: string;
  nazev: string;
  kategorie: "media" | "ekonomika" | "koalice" | "kampan" | "podcast" | "debaty";
  minTurn: number;
  maxTurn: number;
  sance: number; // relative weight/chance in category
  text: string;
  moznosti: Choice[];
}

export interface GenericEvent {
  id: string;
  typ: string;
  prob: number;
  text: string;
  efekt: ChoiceEffect;
}

export interface GameState {
  stranaId: string;
  poradceId: string;
  preference: number; // Player's preference in %
  budget: number; // Player's budget in CZK
  turn: number; // 1 to 25
  trust: Record<string, number>; // Sympathy map towards player (0 - 100)
  atributy: {
    ekonomika: number;
    kultura: number;
    evropa: number;
    stylPolitiky: number;
  };
  npcPreferred: Record<string, number>; // Current preferences of NPC parties
  npcAtributy: Record<string, {
    ekonomika: number;
    kultura: number;
    evropa: number;
    stylPolitiky: number;
  }>;
  npcTrust: Record<string, Record<string, number>>; // Complete sympathy matrix between all parties
  history: Array<{
    turn: number;
    type: "event" | "generic" | "poll" | "system";
    title: string;
    description: string;
    changes?: string[];
  }>;
  undoAvailable: boolean; // For Soukup specialty
  undoUsed?: boolean;
  lastTurnPrefChange?: number;
  lastActionState?: string; // Serialized GameState before last action for undoing
  hasWithdrawn?: boolean;
  electionResults?: Record<string, number>;
  spolecenskyKompas: SpolecenskyKompas;
  prevSpolecenskyKompas?: SpolecenskyKompas; // Předchozí hodnota kompasu — slouží k zobrazení trendu (šipky) v MetricBar
  velkeUdalostiHistory?: string[];
  stats?: {
    prefMimoradne: number; // accumulated preferences from non-media categorical events (ekonomika, koalice, kampan)
    prefBezny: number;     // accumulated preferences from generic/routine events
    prefDebaty: number;    // accumulated preferences from debates (and skipped/boycotted debates)
    prefMedia: number;     // accumulated preferences from media categorical events
    prefPodcasty?: number; // accumulated preferences from podcasts
    prefCompass?: number;  // accumulated preferences from values compass pressure
    bestDebateAxesOver10?: number; // max počet os s posunem ≥10 bodů v jedné debatě
    prefPenalizace?: number; // accumulated preferences from penalties (e.g. boycotts, skips, early election)
    initialBudget: number; // starting budget for comparison
    initialPreference: number; // starting preference for comparison
    initialLeaderPreference?: number; // starting preference of strongest NPC party
    initialAtributy?: { ekonomika: number; kultura: number; evropa: number; stylPolitiky: number };
    maxNegativeBudgetStreak?: number;
    improvedRelationsMedia?: Record<string, boolean>;
  };
  preferenceHistory?: number[];
  dailyDate?: string;
  isEarlyElection?: boolean;
  roundsSkipped?: number;
  debatesSkipped?: number;
}

export interface PodcastEvent {
  id: string;
  podcast: string;
  text: string;
  typ: "Pozitivní" | "Negativní";
}

// Jedna provedená akce hráče
export type DiploAkceTyp =
  | "kontakt"      // Přímý kontakt: 80 % → +10 trust, 20 % → +5 trust
  | "podminka"     // Přijmout podmínku strany: +podminka.trustBonus + atributDrift
  | "zakulisni"    // Zákulisní dohoda: 40 % → +20, 40 % → +10, 20 % → -15
  | "poslat_turka"; // Poslat vyjednávat Turka: snížení sympatie na 0!

export interface DiploAkce {
  typ: DiploAkceTyp;
  targetId: string;        // Strana, které se akce týká
  podminka?: string;       // ID podmínky (jen pro typ "podminka")
  vysledek?: "uspech" | "castecny" | "neuspech";  // Výsledek (jen pro "zakulisni" a "kontakt")
}

export interface CoalitionDetails {
  playerSeats: number;
  invitedPartyIds: string[];
  acceptedPartyIds: string[];
  totalSeats: number;
  rolls: Record<string, { roll: number; success: boolean; chance: number; motive: string }>;
  parliamentSeats: Record<string, number>;
  prijatePodminky: string[];            // NOVÉ: ID přijatých podmínek
  atributyPoVyjednavani: {              // NOVÉ: finální atributy hráče po driftu
    ekonomika: number;
    kultura: number;
    evropa: number;
    stylPolitiky: number;
  };
  pouziteAkceCount?: number;
  provedeneAkce?: DiploAkce[];
  rejectCount?: number;
}

export type EndingTyp =
  | "premier"          // Hráč sestavil koalici sám A je největší strana v ní
  | "vicepremier"      // Hráč sestavil koalici sám, ale NENÍ největší strana
  | "koalicni_partner" // Hráč NESESTAVI koalici sám, ale je součástí systémové koalice
  | "opozice";         // Hráč není součástí žádné vládní koalice

export interface DailyBestRecord {
  date: string;            // "YYYY-MM-DD"
  attempts: number;        // počet odehraných pokusů v tento den
  best: {
    preference: number;
    initialPreference: number;
    prefChange: number;
    endingTyp: EndingTyp;
    seats: number;
    poradceId: string;
    partyId: string;
  };
}

export interface LeaderboardEntrySummary {
  id: string;
  partyZkratka: string;
  partyName: string;
  partyBarva: string;
  preference: number;
  initialPreference: number;
  prefChange: number;
  seats: number;
  isGovernment: boolean;
  advisorName: string;
  date: string;
  gameState: {
    stranaId: string;
    poradceId: string;
    preference: number;
    budget: number;
    atributy: {
      ekonomika: number;
      kultura: number;
      evropa: number;
      stylPolitiky: number;
    };
    spolecenskyKompas: SpolecenskyKompas;
    stats?: {
      prefMimoradne: number;
      prefBezny: number;
      prefDebaty: number;
      prefMedia: number;
      prefPodcasty?: number;
      prefCompass?: number;
      bestDebateAxesOver10?: number;
      prefPenalizace?: number;
      initialBudget: number;
      initialPreference: number;
      initialLeaderPreference?: number;
      initialAtributy?: { ekonomika: number; kultura: number; evropa: number; stylPolitiky: number };
    };
    trust: Record<string, number>;
    electionResults?: Record<string, number>;
    npcPreferred: Record<string, number>;
    npcAtributy: Record<string, {
      ekonomika: number;
      kultura: number;
      evropa: number;
      stylPolitiky: number;
    }>;
    npcTrust: Record<string, Record<string, number>>;
    preferenceHistory?: number[];
    hasWithdrawn?: boolean;
  };
  coalitionResults: {
    playerSeats: number;
    invitedPartyIds?: string[];
    acceptedPartyIds: string[];
    totalSeats: number;
    parliamentSeats: Record<string, number>;
  } | null;
  gameVictory: boolean;
  endingTyp?: EndingTyp;
}



