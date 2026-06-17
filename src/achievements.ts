import { GameState, EndingTyp, CoalitionDetails } from "./types";

export type AchievementCategory = "vysledek" | "styl" | "poradce" | "skryte" | "daily" | "meta" | "prestizni";

export interface AchievementContext {
  state: GameState;
  endingTyp: EndingTyp;
  coalitionResults: CoalitionDetails | null;
  gameVictory: boolean;
  unlockedIds?: Set<string>; // nové — pro meta podmínky
}

export interface Achievement {
  id: string;
  nazev: string;
  popis: string;
  emoji: string;
  kategorie: AchievementCategory;
  skryty?: boolean;
  podminka: (ctx: AchievementContext) => boolean;
  cilovyPocetStran?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "meta_gold",
    nazev: "Politická legenda",
    popis: "Odemkni všechny achievementy.",
    emoji: "👑",
    kategorie: "meta",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const nonMeta = ACHIEVEMENTS.filter((a) => a.kategorie !== "meta");
      return nonMeta.every((a) => ctx.unlockedIds?.has(a.id) === true);
    }
  },
  {
    id: "meta_silver",
    nazev: "Ostřílený stratég",
    popis: "Odemkni alespoň 75 % všech achievementů.",
    emoji: "🥈",
    kategorie: "meta",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const nonMeta = ACHIEVEMENTS.filter((a) => a.kategorie !== "meta");
      const unlockedNonMetaCount = nonMeta.filter((a) => ctx.unlockedIds?.has(a.id)).length;
      return (unlockedNonMetaCount / nonMeta.length) >= 0.75;
    }
  },
  {
    id: "meta_bronze",
    nazev: "Zkušený kandidát",
    popis: "Odemkni alespoň 50 % všech achievementů.",
    emoji: "🥉",
    kategorie: "meta",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const nonMeta = ACHIEVEMENTS.filter((a) => a.kategorie !== "meta");
      const unlockedNonMetaCount = nonMeta.filter((a) => ctx.unlockedIds?.has(a.id)).length;
      return (unlockedNonMetaCount / nonMeta.length) >= 0.50;
    }
  },
  {
    id: "meta_daily_gold",
    nazev: "Šampion denních výzev",
    popis: "Odemkni všechny achievementy z kategorie Denní výzva.",
    emoji: "📅",
    kategorie: "meta",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const dailyAch = ACHIEVEMENTS.filter((a) => a.kategorie === "daily");
      return dailyAch.every((a) => ctx.unlockedIds?.has(a.id) === true);
    }
  },
  {
    id: "vysledek_jednobarevna",
    nazev: "101 - Sestav jednobarevnou vládu",
    popis: "Dosáhni nadpoloviční většiny a sestav jednobarevnou většinovou vládu bez koaličních partnerů.",
    emoji: "🏰",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.endingTyp === "premier" && ctx.coalitionResults !== null && ctx.coalitionResults.playerSeats >= 101 && (ctx.coalitionResults.acceptedPartyIds?.length ?? 0) === 0
  },
  {
    id: "vysledek_premier",
    nazev: "Premiér lidu",
    popis: "Dokonči hru jako premiér a sestav vlastní koalici.",
    emoji: "🏆",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.endingTyp === "premier"
  },
  {
    id: "vysledek_vicepremier",
    nazev: "Druhé housle",
    popis: "Sestav koalici, ale skonči jako vicepremiér.",
    emoji: "🥈",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.endingTyp === "vicepremier"
  },
  {
    id: "vysledek_koalicni_partner",
    nazev: "Stačilo počkat",
    popis: "Skonči jako koaliční partner, aniž bys sám vyjednával koalici.",
    emoji: "🤝",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.endingTyp === "koalicni_partner"
  },
  {
    id: "vysledek_propad",
    nazev: "Volný pád",
    popis: "Skonči s preferencemi nižšími o víc než 10 procentních bodů oproti startu.",
    emoji: "📉",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => (ctx.state.preference - (ctx.state.stats?.initialPreference ?? 0)) <= -10
  },
  {
    id: "vysledek_fenomen",
    nazev: "Politický fenomén",
    popis: "Skonči s nárůstem preferencí o víc než 15 procentních bodů oproti startu.",
    emoji: "📈",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => (ctx.state.preference - (ctx.state.stats?.initialPreference ?? 0)) >= 15
  },
  {
    id: "vysledek_pod_5",
    nazev: "Mimo hru",
    popis: "Skonči s preferencemi pod 5 % - tvá strana se nedostala do Sněmovny.",
    emoji: "🚫",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.preference < 5.0
  },
  {
    id: "vysledek_nejvetsi_strana",
    nazev: "Vítěz voleb",
    popis: "Skonči s nejvyšším počtem mandátů ze všech stran.",
    emoji: "🥇",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const seats = ctx.coalitionResults?.parliamentSeats;
      if (!seats) return false;
      const values = Object.values(seats);
      if (values.length === 0) return false;
      return seats[ctx.state.stranaId] === Math.max(...values);
    }
  },
  {
    id: "styl_mistr_podcastu",
    nazev: "Mistr podcastů",
    popis: "Podcasty přispěly k tvým preferencím více než +5 p.b. a byly tvým hlavním zdrojem zisku.",
    emoji: "🎙️",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const s = ctx.state.stats;
      if (!s) return false;
      const vals = {
        prefMimoradne: Math.abs(s.prefMimoradne ?? 0),
        prefBezny: Math.abs(s.prefBezny ?? 0),
        prefDebaty: Math.abs(s.prefDebaty ?? 0),
        prefMedia: Math.abs(s.prefMedia ?? 0),
        prefPodcasty: Math.abs(s.prefPodcasty ?? 0)
      };
      const maxVal = Math.max(...Object.values(vals));
      return (s.prefPodcasty ?? 0) > 5 && vals.prefPodcasty === maxVal;
    }
  },
  {
    id: "styl_kral_debat",
    nazev: "Král debat",
    popis: "V jedné televizní debatě posuň alespoň dva různé atributy každý o 10 nebo více bodů.",
    emoji: "🗣️",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => (ctx.state.stats?.bestDebateAxesOver10 ?? 0) >= 2
  },
  {
    id: "styl_medialni_hvezda",
    nazev: "Mediální hvězda",
    popis: "Mediální kauzy ti zlepšily vztahy alespoň se 4 různými stranami.",
    emoji: "📰",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => Object.keys(ctx.state.stats?.improvedRelationsMedia || {}).length >= 4
  },
  {
    id: "styl_v_souladu",
    nazev: "V souladu s národem",
    popis: "Na konci hry je tvá strana ve všech 4 osách Hodnotového kompasu max. 10 bodů od aktuální nálady společnosti.",
    emoji: "🧭",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const a = ctx.state.atributy;
      const k = ctx.state.spolecenskyKompas;
      if (!a || !k) return false;
      const osy: readonly ("ekonomika" | "kultura" | "evropa" | "stylPolitiky")[] = ["ekonomika", "kultura", "evropa", "stylPolitiky"];
      return osy.every(o => Math.abs(a[o] - k[o]) < 10);
    }
  },
  {
    id: "styl_chameleon",
    nazev: "Politický chameleon",
    popis: "Za hru se tvé politické atributy posunuly celkem o víc než 100 bodů.",
    emoji: "🌪️",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const init = ctx.state.stats?.initialAtributy;
      const cur = ctx.state.atributy;
      if (!init || !cur) return false;
      const osy: readonly ("ekonomika" | "kultura" | "evropa" | "stylPolitiky")[] = ["ekonomika", "kultura", "evropa", "stylPolitiky"];
      const sum = osy.reduce((acc, o) => acc + Math.abs(cur[o] - init[o]), 0);
      return sum > 100;
    }
  },
  {
    id: "styl_bez_kompasu",
    nazev: "Proti proudu",
    popis: "Dostaň se do sněmovny i se ztrátou preferencí podle hodnotového kompasu o více než 5 %.",
    emoji: "🌊",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => (ctx.state.stats?.prefCompass ?? 0) < -5 && ctx.state.preference >= 5.0
  },
  {
    id: "styl_vyrovnany",
    nazev: "Vyrovnaná kampaň",
    popis: "Žádný z hlavních zdrojů preferencí nepřesáhl v absolutní hodnotě 4 procentní body.",
    emoji: "⚖️",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const s = ctx.state.stats;
      if (!s) return false;
      return [s.prefMimoradne, s.prefBezny, s.prefDebaty, s.prefMedia, s.prefPodcasty].every(v => Math.abs(v ?? 0) <= 4);
    }
  },
  {
    id: "poradce_turek_prezil",
    nazev: "Přežil jsem Turka",
    popis: "Dohraj hru s poradcem Filip Turek a přesto se dostaň do vlády.",
    emoji: "🏎️",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.poradceId === "turek" && (ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner")
  },
  {
    id: "poradce_kalousek_ideolog",
    nazev: "Kalousek má vždy pravdu",
    popis: "S poradcem Miroslav Kalousek posuň své politické atributy celkem o více než 40 bodů.",
    emoji: "📊",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      if (ctx.state.poradceId !== "strateg") return false;
      const init = ctx.state.stats?.initialAtributy;
      const cur = ctx.state.atributy;
      if (!init || !cur) return false;
      const osy = ["ekonomika", "kultura", "evropa", "stylPolitiky"] as const;
      const sum = osy.reduce((acc, o) => acc + Math.abs(cur[o] - init[o]), 0);
      return sum > 40;
    }
  },
  {
    id: "poradce_klaus_motoriste",
    nazev: "Klausova škola",
    popis: "Dohraj hru s poradcem Václav Klaus a získej koalici s Motoristy sobě.",
    emoji: "👴",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.poradceId === "klaus" && ctx.coalitionResults?.acceptedPartyIds?.includes("motoriste") === true
  },
  {
    id: "poradce_spin_doctor_teflon",
    nazev: "Teflonový politik",
    popis: "S poradcem Marek Prchal sestav koalici mezi Andrejem Babišem a Vítem Rakušanem!",
    emoji: "🎭",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      if (ctx.state.poradceId !== "spin_doctor" || !ctx.coalitionResults) return false;
      const isGov = ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner";
      if (!isGov) return false;
      const coalParties = [ctx.state.stranaId, ...(ctx.coalitionResults.acceptedPartyIds ?? [])];
      return coalParties.includes("ano") && coalParties.includes("starostove");
    }
  },
  {
    id: "poradce_diplomat_full_house",
    nazev: "Plný diplomatický kufřík",
    popis: "S poradcem Petr Kolář využij všechny 3 diplomatické akce při koalici.",
    emoji: "🤝",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.poradceId === "diplomat" && (ctx.coalitionResults?.pouziteAkceCount ?? 0) >= 3
  },
  {
    id: "skryte_turek_vyjednavac",
    nazev: "Hazardér",
    popis: "Použil(a) jsi akci \"Poslat vyjednávat Turka\" při koaličním vyjednávání.",
    emoji: "🥚",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => ctx.coalitionResults?.provedeneAkce?.some(a => a.typ === "poslat_turka") === true
  },
  {
    id: "skryte_dve_velke_udalosti",
    nazev: "Vše nebo nic",
    popis: "Ve hře nastaly obě možné \"Velké události\".",
    emoji: "🎲",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => (ctx.state.velkeUdalostiHistory?.length ?? 0) >= 2
  },
  {
    id: "skryte_klidna_kampan",
    nazev: "Bez ztráty kytičky",
    popis: "Debaty tě v průběhu hry téměř neovlivnily (vliv kompasu z debat menší než 0.5 p.b.).",
    emoji: "🎯",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => Math.abs(ctx.state.stats?.prefDebaty ?? 0) < 0.5
  },
  {
    id: "skryte_rychly_pad",
    nazev: "Padák",
    popis: "V jediném kole ti preference klesly o víc než 3 procentní body.",
    emoji: "🪂",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => {
      const hist = ctx.state.preferenceHistory ?? [];
      const maxDrop = Math.max(0, ...hist.slice(1).map((v, i) => hist[i] - v));
      return maxDrop > 3;
    }
  },
  {
    id: "skryte_posledni_chvile",
    nazev: "Na poslední chvíli",
    popis: "Skonči hru s preferencemi mezi 4.5 % a 5.0 % - na hraně vstupu do Sněmovny.",
    emoji: "⏱️",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => ctx.state.preference >= 4.5 && ctx.state.preference < 5.0
  },
  {
    id: "vysledek_drtive_vitezstvi",
    nazev: "Drtivé vítězství",
    popis: "Skonči s více než 35 % preferencí.",
    emoji: "💥",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.preference > 35
  },
  {
    id: "vysledek_zazrak_z_periferie",
    nazev: "Zázrak z periferie",
    popis: "Začni pod 5 % a skonči jako premiér.",
    emoji: "🌱",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => (ctx.state.stats?.initialPreference ?? 0) < 5 && ctx.endingTyp === "premier"
  },
  {
    id: "vysledek_velky_skok",
    nazev: "Raketový vzestup",
    popis: "Za jednu kampaň posuň své preference nahoru o 25 nebo více procentních bodů.",
    emoji: "🚀",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => (ctx.state.preference - (ctx.state.stats?.initialPreference ?? 0)) >= 25
  },
  {
    id: "vysledek_koalicni_architekt",
    nazev: "Koaliční architekt",
    popis: "Sestav koalici tří a více stran a skonči jako premiér.",
    emoji: "🏗️",
    kategorie: "vysledek",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.endingTyp === "premier" && (ctx.coalitionResults?.acceptedPartyIds?.length ?? 0) >= 2
  },
  {
    id: "styl_konzistentni_vize",
    nazev: "Konzistentní vize",
    popis: "Za celou hru se tvé atributy nepohnuly o více než 5 bodů celkem na všech osách.",
    emoji: "🗿",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const init = ctx.state.stats?.initialAtributy;
      const cur = ctx.state.atributy;
      if (!init || !cur) return false;
      const osy: readonly ("ekonomika" | "kultura" | "evropa" | "stylPolitiky")[] = ["ekonomika", "kultura", "evropa", "stylPolitiky"];
      const sum = osy.reduce((acc, o) => acc + Math.abs(cur[o] - init[o]), 0);
      return sum <= 5;
    }
  },
  {
    id: "styl_vsechno_nebo_nic",
    nazev: "Všechno nebo nic",
    popis: "V posledních pěti kolech před volbami tvé preference buď vzrostly o víc než 5 %, nebo klesly o víc než 5 %.",
    emoji: "🎰",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const hist = ctx.state.preferenceHistory ?? [];
      if (hist.length < 25) return false;
      const diff = hist[24] - hist[19];
      return Math.abs(diff) > 5;
    }
  },
  {
    id: "poradce_bartonicek_exkluziv",
    nazev: "Bartoníčkova síť",
    popis: "S poradcem Radek Bartoníček získej za celou kampaň z podcastů alespoň +3.5 procentních bodů.",
    emoji: "🎤",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      if (ctx.unlockedIds?.has("poradce_bartonicek_exkluziv")) return true;
      return ctx.state.poradceId === "novinar" && (ctx.state.stats?.prefPodcasty ?? 0) >= 3.5;
    }
  },
  {
    id: "poradce_soukupova_pojistka",
    nazev: "Soukupova pojistka",
    popis: "S poradcem Jaromír Soukup dohraj hru bez záporného výsledku v debatě.",
    emoji: "📺",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.poradceId === "populista" && (ctx.state.stats?.prefDebaty ?? 0) >= 0
  },
  {
    id: "poradce_strategova_sachovnice",
    nazev: "Diplomatova šachovnice",
    popis: "S poradcem Petr Kolář sestav koalici bez jediného odmítnutí od partnera.",
    emoji: "♟️",
    kategorie: "poradce",
    skryty: false,
    podminka: (ctx: AchievementContext) => ctx.state.poradceId === "diplomat" && ctx.coalitionResults !== null && (ctx.coalitionResults.acceptedPartyIds?.length ?? 0) > 0 && (ctx.coalitionResults.rejectCount ?? 0) === 0
  },
  {
    id: "skryte_zahadny_vzestup",
    nazev: "Záhadný vzestup",
    popis: "Vyber na startu hry nejmenší stranu Zelení nebo Silné Česko a skonči s více než 20 %.",
    emoji: "🛸",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => (ctx.state.stats?.initialPreference ?? 0) <= 3 && ctx.state.preference > 20
  },
  {
    id: "skryte_snemovni_matematik",
    nazev: "Sněmovní matematik",
    popis: "Koalice, kterou jsi sestavil, má přesně 101 mandátů — ani o jeden víc.",
    emoji: "🔢",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => ctx.coalitionResults !== null && ctx.coalitionResults.totalSeats === 101
  },
  {
    id: "skryte_absolutni_izolace",
    nazev: "Absolutní izolace",
    popis: "Skonči hru v opozici bez jediného koaličního partnera a přitom měj nejvyšší počet mandátů.",
    emoji: "🏝️",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => {
      if (ctx.endingTyp !== "opozice") return false;
      const seats = ctx.coalitionResults?.parliamentSeats;
      if (!seats) return false;
      const values = Object.values(seats);
      if (values.length === 0) return false;
      return seats[ctx.state.stranaId] === Math.max(...values);
    }
  },
  {
    id: "daily_odehrano_ano",
    nazev: "Premiérova kandidatura",
    popis: "Odehraj celou denní výzvu za ANO.",
    emoji: "🟦",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && ctx.state.stranaId === "ano"
  },
  {
    id: "daily_vlada_ano",
    nazev: "Babiš znovu vládne",
    popis: "Dokonči denní výzvu za ANO a staň se součástí vlády.",
    emoji: "👑",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && ctx.state.stranaId === "ano" && (ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner")
  },
  {
    id: "daily_odehrano_motoriste_spd",
    nazev: "Jízda na hraně",
    popis: "Odehraj celou denní výzvu za Motoristy sobě nebo SPD.",
    emoji: "🏎️",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "motoriste" || ctx.state.stranaId === "spd")
  },
  {
    id: "daily_vlada_motoriste_spd",
    nazev: "Protisystémoví u moci",
    popis: "Dokonči denní výzvu za Motoristy nebo SPD a staň se součástí vlády.",
    emoji: "🔥",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "motoriste" || ctx.state.stranaId === "spd") && (ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner")
  },
  {
    id: "daily_odehrano_ods_skupina",
    nazev: "Koalice SPOLU v akci",
    popis: "Odehraj celou denní výzvu za ODS, TOP 09 nebo KDU-ČSL.",
    emoji: "🤝",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "ods" || ctx.state.stranaId === "top09" || ctx.state.stranaId === "kdu")
  },
  {
    id: "daily_vlada_ods_skupina",
    nazev: "Pravice u kormidla",
    popis: "Dokonči denní výzvu za ODS, TOP 09 nebo KDU-ČSL a staň se součástí vlády.",
    emoji: "🏛️",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "ods" || ctx.state.stranaId === "top09" || ctx.state.stranaId === "kdu") && (ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner")
  },
  {
    id: "daily_odehrano_stan_pirati",
    nazev: "Demokratická alternativa",
    popis: "Odehraj celou denní výzvu za STAN nebo Piráty.",
    emoji: "⚓",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "starostove" || ctx.state.stranaId === "pirati")
  },
  {
    id: "daily_vlada_stan_pirati",
    nazev: "Nová politika vládne",
    popis: "Dokonči denní výzvu za STAN nebo Piráty a staň se součástí vlády.",
    emoji: "🌐",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "starostove" || ctx.state.stranaId === "pirati") && (ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner")
  },
  {
    id: "daily_odehrano_leva_skupina",
    nazev: "Hlas z periferie",
    popis: "Odehraj celou denní výzvu za KSČM, SocDem, Naše Česko nebo Zelené.",
    emoji: "🌿",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "kscm" || ctx.state.stranaId === "socdem" || ctx.state.stranaId === "silnecz" || ctx.state.stranaId === "zeleni")
  },
  {
    id: "daily_vlada_leva_skupina",
    nazev: "Levice se vrátila",
    popis: "Dokonči denní výzvu za KSČM, SocDem, Naše Česko nebo Zelené a staň se součástí vlády.",
    emoji: "👊",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && (ctx.state.stranaId === "kscm" || ctx.state.stranaId === "socdem" || ctx.state.stranaId === "silnecz" || ctx.state.stranaId === "zeleni") && (ctx.endingTyp === "premier" || ctx.endingTyp === "vicepremier" || ctx.endingTyp === "koalicni_partner")
  },
  {
    id: "daily_premier_jakakoli",
    nazev: "Denní premiér",
    popis: "Sestav vládu a staň se premiérem v denní výzvě za jakoukoliv stranu.",
    emoji: "🏆",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && ctx.endingTyp === "premier"
  },
  {
    id: "daily_vicepremier_jakakoli",
    nazev: "Denní vicepremiér",
    popis: "Sestav vládu a staň se vicepremiérem v denní výzvě za jakoukoliv stranu.",
    emoji: "🥈",
    kategorie: "daily",
    skryty: false,
    podminka: (ctx: AchievementContext) => !!ctx.state.dailyDate && ctx.endingTyp === "vicepremier"
  },
  {
    id: "skryte_dokonala_koalice",
    nazev: "Dokonalá koalice",
    popis: "Sestav koalici kde máš s každým koaličním partnerem trust 70 nebo výše.",
    emoji: "💎",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => {
      if (!ctx.coalitionResults || ctx.coalitionResults.acceptedPartyIds.length === 0) return false;
      return ctx.coalitionResults.acceptedPartyIds.every(
        id => (ctx.state.trust[id] ?? 0) >= 70
      );
    }
  },
  {
    id: "skryte_opozicni_kral",
    nazev: "Opozičník roku",
    popis: "Skonči v opozici s preferencemi nad 25 %.",
    emoji: "👑",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) =>
      ctx.endingTyp === "opozice" && ctx.state.preference >= 25
  },
  {
    id: "skryte_trust_nula",
    nazev: "Persona non grata",
    popis: "Skonči hru s trustem pod 10 u alespoň tří různých stran.",
    emoji: "🚫",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => {
      const lowTrust = Object.entries(ctx.state.trust)
        .filter(([id]) => id !== ctx.state.stranaId)
        .filter(([, v]) => v < 10);
      return lowTrust.length >= 3;
    }
  },
  {
    id: "skryte_comeback",
    nazev: "Comeback roku",
    popis: "V průběhu hry ti preference klesly pod 2 % — a přesto ses dostal(a) do Sněmovny.",
    emoji: "🔄",
    kategorie: "skryte",
    skryty: true,
    podminka: (ctx: AchievementContext) => {
      const hist = ctx.state.preferenceHistory ?? [];
      const wasBelowThreshold = hist.some(v => v < 2.0);
      return wasBelowThreshold && ctx.state.preference >= 5.0;
    }
  },
  {
    id: "styl_diplomat",
    nazev: "Síť vztahů",
    popis: "Skonči hru s trustem 60 nebo výše u alespoň čtyř různých stran.",
    emoji: "🌐",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const highTrust = Object.entries(ctx.state.trust)
        .filter(([id]) => id !== ctx.state.stranaId)
        .filter(([, v]) => v >= 60);
      return highTrust.length >= 4;
    }
  },
  {
    id: "styl_jednosmerny_kompas",
    nazev: "Ideologický pilgrim",
    popis: "Za celou hru se posunuj v jedné ose (ekonomika nebo kultura) pouze jedním směrem — a to o alespoň 10 bodů.",
    emoji: "🧭",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const init = ctx.state.stats?.initialAtributy;
      const cur = ctx.state.atributy;
      if (!init || !cur) return false;
      const ekonDelta = cur.ekonomika - init.ekonomika;
      const kultDelta = cur.kultura - init.kultura;
      return Math.abs(ekonDelta) >= 10 || Math.abs(kultDelta) >= 10;
    }
  },
  {
    id: "styl_posledni_kolo_nahoru",
    nazev: "Závěrečný sprint",
    popis: "V posledních třech kolech před volbami tvé preference nepřetržitě rostly.",
    emoji: "🏃",
    kategorie: "styl",
    skryty: false,
    podminka: (ctx: AchievementContext) => {
      const hist = ctx.state.preferenceHistory ?? [];
      if (hist.length < 4) return false;
      const last = hist.slice(-3);
      return last[1] > last[0] && last[2] > last[1];
    }
  },
  {
    id: "prestiz_kandidat",
    nazev: "Kandidát",
    popis: "Odehraj alespoň jednu celou řádnou hru za každou z politických stran.",
    emoji: "🎓",
    kategorie: "prestizni",
    cilovyPocetStran: 12,
    podminka: (ctx: AchievementContext) => {
      if (typeof window === "undefined" || !window.localStorage) return false;
      try {
        const raw = localStorage.getItem("prestigeAchievementsProgress");
        if (!raw) return false;
        const prog = JSON.parse(raw);
        return (prog["prestiz_kandidat"]?.completedPartyIds?.length ?? 0) >= 12;
      } catch {
        return false;
      }
    }
  },
  {
    id: "prestiz_poslanec",
    nazev: "Poslanec",
    popis: "Dostaň se do sněmovny s každou z politických stran.",
    emoji: "🏛️",
    kategorie: "prestizni",
    cilovyPocetStran: 12,
    podminka: (ctx: AchievementContext) => {
      if (typeof window === "undefined" || !window.localStorage) return false;
      try {
        const raw = localStorage.getItem("prestigeAchievementsProgress");
        if (!raw) return false;
        const prog = JSON.parse(raw);
        return (prog["prestiz_poslanec"]?.completedPartyIds?.length ?? 0) >= 12;
      } catch {
        return false;
      }
    }
  },
  {
    id: "prestiz_ministr",
    nazev: "Ministr",
    popis: "Sestav vládu s každou z politických stran.",
    emoji: "💼",
    kategorie: "prestizni",
    cilovyPocetStran: 12,
    podminka: (ctx: AchievementContext) => {
      if (typeof window === "undefined" || !window.localStorage) return false;
      try {
        const raw = localStorage.getItem("prestigeAchievementsProgress");
        if (!raw) return false;
        const prog = JSON.parse(raw);
        return (prog["prestiz_ministr"]?.completedPartyIds?.length ?? 0) >= 12;
      } catch {
        return false;
      }
    }
  },
  {
    id: "prestiz_premier",
    nazev: "Premiér",
    popis: "Staň se premiérem za každou z politických stran.",
    emoji: "👑",
    kategorie: "prestizni",
    cilovyPocetStran: 12,
    podminka: (ctx: AchievementContext) => {
      if (typeof window === "undefined" || !window.localStorage) return false;
      try {
        const raw = localStorage.getItem("prestigeAchievementsProgress");
        if (!raw) return false;
        const prog = JSON.parse(raw);
        return (prog["prestiz_premier"]?.completedPartyIds?.length ?? 0) >= 12;
      } catch {
        return false;
      }
    }
  }
];

export interface PartyCoverageProgress {
  completedPartyIds: string[]; // ID stran, za které byla podmínka už splněna
}

export interface GameRunMetadata {
  totalRounds: number; // musí být 25
  roundsSkipped: number; // kola odehraná jako REST/skip — musí být 0
  debatesSkipped: number; // počet debat, které hráč vynechal nebo z nich odstoupil — musí být 0
  earlyElectionTriggered: boolean; // true pokud došlo k předčasným volbám
  isDailyChallenge: boolean;
}

export function isRadnaHra(meta: GameRunMetadata): boolean {
  return (
    meta.totalRounds === 25 &&
    meta.roundsSkipped === 0 &&
    meta.debatesSkipped === 0 &&
    meta.earlyElectionTriggered === false
  );
}

export function updatePrestigeAchievements(
  runMeta: GameRunMetadata,
  partyId: string,
  endingTyp: string,
  byl_tvurcem_koalice: boolean,
  currentProgress: Record<string, PartyCoverageProgress>,
  playerPreference: number
): Record<string, PartyCoverageProgress> {
  if (!isRadnaHra(runMeta)) {
    return currentProgress; // řádná hra nesplněna, nic se nepočítá
  }
  const updated = { ...currentProgress };
  const addPartyIfMissing = (achievementId: string) => {
    const prog = updated[achievementId] ?? { completedPartyIds: [] };
    if (!prog.completedPartyIds.includes(partyId)) {
      updated[achievementId] = {
        completedPartyIds: [...prog.completedPartyIds, partyId],
      };
    }
  };

  // Kandidát: dohraná hra bez ohledu na ending
  addPartyIfMissing("prestiz_kandidat");

  // Poslanec: dostaň se do sněmovny (získej alespoň 5 % hlasů ve volbách)
  if (playerPreference >= 5.0) {
    addPartyIfMissing("prestiz_poslanec");
  }

  const endingLower = endingTyp.toLowerCase();
  
  if (
    byl_tvurcem_koalice && 
    (endingLower === "premier" ||
     endingLower === "vicepremier" ||
     endingTyp === "Premiér" ||
     endingTyp === "Viceprémiér")
  ) {
    addPartyIfMissing("prestiz_ministr");
  }
  
  if (endingLower === "premier" || endingTyp === "Premiér") {
    addPartyIfMissing("prestiz_premier");
  }
  return updated;
}

export function evaluateAchievements(ctx: AchievementContext): string[] {
  if (ctx.state.isEarlyElection) {
    return [];
  }

  // Nejprve vyhodnoť všechny non-meta achievementy
  const nonMetaIds = new Set<string>();
  ACHIEVEMENTS.filter((a) => a.kategorie !== "meta").forEach((a) => {
    try {
      if (a.podminka(ctx)) nonMetaIds.add(a.id);
    } catch {}
  });

  // Přidej již dříve odemčené (pokud jsou předány v ctx)
  const allUnlocked = new Set([...nonMetaIds, ...(ctx.unlockedIds ?? [])]);

  // Vyhodnoť meta achievementy s rozšířeným kontextem
  const metaCtx = { ...ctx, unlockedIds: allUnlocked };
  const metaIds = new Set<string>();
  ACHIEVEMENTS.filter((a) => a.kategorie === "meta").forEach((a) => {
    try {
      if (a.podminka(metaCtx)) metaIds.add(a.id);
    } catch {}
  });

  return [...nonMetaIds, ...metaIds];
}
