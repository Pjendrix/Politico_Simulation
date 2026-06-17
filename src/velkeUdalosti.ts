import { VelkaUdalost, SpolecenskyKompas } from "./types";

export function generateSpolecenskyKompas(rng: () => number = Math.random): SpolecenskyKompas {
  return {
    ekonomika: Math.floor(rng() * 41) + 30, // 30–70
    kultura: Math.floor(rng() * 41) + 30,   // 30–70
    evropa: Math.floor(rng() * 41) + 30,    // 30–70
    stylPolitiky: Math.floor(rng() * 41) + 30, // 30–70
  };
}

export const VELKE_UDALOSTI: VelkaUdalost[] = [
  {
    id: "valka_recko_turecko",
    nazev: "Válka v Egejském moři",
    popis: "Řecko a Turecko zahájily vojenský konflikt v Egejském moři. NATO je v pohotovosti, EU jedná o společné obraně. Česká veřejnost se masivně přiklání k evropské solidaritě.",
    atributDrift: { evropa: +40, stylPolitiky: -15 },
  },
  {
    id: "ekonomicka_krize",
    nazev: "Hospodářský otřes",
    popis: "Globální recese zasáhla českou ekonomiku. Nezaměstnanost roste, podniky propouštějí. Voliči žádají státní zásahy a jistoty.",
    atributDrift: { ekonomika: -35, stylPolitiky: +10 },
  },
  {
    id: "migrační_vlna",
    nazev: "Migrační krize na hranicích",
    popis: "Nová vlna migrantů z Blízkého východu dosáhla českých hranic. Debata o azylu a bezpečnosti dominuje médiím.",
    atributDrift: { kultura: -30, evropa: -20 },
  },
  {
    id: "klimatická_katastrofa",
    nazev: "Extrémní sucho a povodně",
    popis: "Kombinace extrémního sucha a následných povodní zasáhla střední Čechy. Klimatická změna je náhle nevyvratitelná i pro skeptiky.",
    atributDrift: { kultura: +25, ekonomika: -10 },
  },
  {
    id: "korupce_skandal",
    nazev: "Mega-korupční skandál",
    popis: "Investigace odhalila rozsáhlou korupci propojující vládní strany s organizovaným zločinem. Důvěra v establishment je na dně.",
    atributDrift: { stylPolitiky: -35, ekonomika: -10 },
  },
  {
    id: "technologicky_boom",
    nazev: "Technologický boom",
    popis: "Česká republika se stává středoevropským tech-hubem. Příval zahraničních investic mění strukturu ekonomiky i hodnotový žebříček společnosti.",
    atributDrift: { ekonomika: +30, evropa: +15 },
  },
  {
    id: "energeticka_krize",
    nazev: "Energetická krize",
    popis: "Rusko odstavilo dodávky plynu do střední Evropy. Česká republika čelí zdražení energií a výpadkům. Voliči žádají energetickou soběstačnost.",
    atributDrift: { ekonomika: -25, evropa: +20 },
  },
  {
    id: "brexit_efekt",
    nazev: "Czexit debata",
    popis: "Po sérii skandálů s evropskými fondy se v médiích rozhořela debata o členství ČR v EU. Polovina společnosti si klade otázku: má smysl zůstat?",
    atributDrift: { evropa: -35, stylPolitiky: +15 },
  },
];
