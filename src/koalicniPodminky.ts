/**
 * Czech Political Campaign — Koaliční podmínky stran
 * 
 * Každá strana má:
 *   - 2 podmínky: jedna "měkká" (diplomatická), jedna "tvrdá" (ideologická/mocenská)
 *   - Každá podmínka má: text zobrazený hráči, efekt na trust a atributDrift
 *   - trustBonus: o kolik vzroste trust s touto stranou po přijetí podmínky
 *   - trustPenalty: o kolik klesne trust u nepřátelské/konkurenční strany (volitelné)
 *   - atributDrift: posun hráčových atributů po přijetí (signalizuje hráči, co koalice "stojí")
 *   - penaltyTarget: ID strany, které klesne trust (může být více, odděleno čárkou v logice)
 * 
 * Podmínky se zobrazují ve vyjednávacím kole jako klikatelné karty.
 * Přijetí podmínky spotřebuje 1 diplomatickou akci a nelze vzít zpět.
 */

export interface KoalicniPodminka {
  id: string;
  text: string;           // Zobrazený text požadavku (hlas lídra strany)
  popis: string;          // Stručné vysvětlení dopadu pro hráče
  trustBonus: number;     // Přidá k trust s touto stranou
  penaltyTargets?: string[];  // ID stran, kterým klesne trust o 20
  atributDrift?: Partial<{
    ekonomika: number;
    kultura: number;
    evropa: number;
    stylPolitiky: number;
  }>;
}

export interface KoalicniProfilStrany {
  partyId: string;
  podminky: [KoalicniPodminka, KoalicniPodminka]; // vždy právě 2 podmínky
}

export const KOALICNI_PODMINKY: KoalicniProfilStrany[] = [
  {
    partyId: "ano",
    podminky: [
      {
        id: "ano_post",
        text: "„Babiš musí být premiér. To je nepřekročitelná červená linie.“",
        popis: "ANO požaduje post předsedy vlády pro svého lídra. Přijetí dá ANO +30 trust, ale ostatní demokratické strany to vnímají jako kapitulaci.",
        trustBonus: 30,
        penaltyTargets: ["ods", "top09", "pirati", "starostove"],
        atributDrift: { stylPolitiky: +20 },
      },
      {
        id: "ano_media",
        text: "„Chceme záruky, že ČT nebude dál šikanovat naše hnutí. Mediální zákon musí projít.“",
        popis: "ANO tlačí na mediální legislativu omezující ČT. Posun vaší strany směrem k populistické rétorice.",
        trustBonus: 20,
        penaltyTargets: ["pirati", "zeleni", "top09"],
        atributDrift: { stylPolitiky: +15, evropa: -10 },
      },
    ],
  },
  {
    partyId: "motoriste",
    podminky: [
      {
        id: "motoriste_spalovaky",
        text: "„Závazek zastavit zákaz spalovacích motorů v EU. Bez toho nejdeme do vlády.“",
        popis: "MOTO požaduje aktivní odpor vůči evropské emisní politice. Posun vaší strany k euroskepticismu.",
        trustBonus: 25,
        penaltyTargets: ["zeleni", "pirati", "top09"],
        atributDrift: { evropa: -15, ekonomika: +7 },
      },
      {
        id: "motoriste_ministerstvo",
        text: "„Chceme resort dopravy. Macinka tam konečně udělá pořádek.“",
        popis: "Motoristé chtějí konkrétní ministerský post. Nevyvolá odpor, ale váže vás k jejich agendě.",
        trustBonus: 20,
        atributDrift: { ekonomika: +10 },
      },
    ],
  },
  {
    partyId: "spd",
    podminky: [
      {
        id: "spd_migrace",
        text: "„Nulová tolerance nelegální migrace musí být zakotvena přímo ve vládním prohlášení. Slova nestačí.“",
        popis: "SPD požaduje tvrdý antimigrační závazek. Silný posun vaší strany doprava v kultuře.",
        trustBonus: 28,
        penaltyTargets: ["pirati", "zeleni", "top09", "starostove"],
        atributDrift: { kultura: -25, stylPolitiky: +8, evropa: -20 },
      },
      {
        id: "spd_referendum",
        text: "„Zákon o přímé demokracii a referendu. Okamura to slibuje voličům už deset let.“",
        popis: "SPD chce zákon o referendu jako podmínku vstupu do vlády. Méně kontroverzní, ale stojí politický kapitál.",
        trustBonus: 18,
        penaltyTargets: ["ods"],
        atributDrift: { stylPolitiky: +15 },
      },
    ],
  },
  {
    partyId: "ods",
    podminky: [
      {
        id: "ods_dan",
        text: "„Závazek ke snížení daňového zatížení firem. Žádné nové daně, žádné výjimky.“",
        popis: "ODS trvá na pravicové ekonomické agendě. Posun vaší strany k liberální ekonomice.",
        trustBonus: 25,
        penaltyTargets: ["kscm", "socdem"],
        atributDrift: { ekonomika: +20 },
      },
      {
        id: "ods_nato",
        text: "„Závazek 2,5 % HDP na obranu. Kupka to nepodepíše s nikým, kdo váhá s NATO.“",
        popis: "ODS chce silný bezpečnostní závazek. Proevropské a atlantické strany to přivítají, populisté ne.",
        trustBonus: 22,
        penaltyTargets: ["spd", "kscm", "ano"],
        atributDrift: { evropa: +20 },
      },
    ],
  },
  {
    partyId: "top09",
    podminky: [
      {
        id: "top09_eu",
        text: "„Chceme aktivní proevropský kurz — euro do roku 2030 jako strategický cíl.“",
        popis: "TOP 09 požaduje proevropský závazek. Drasticky zlepší vztah s EU-oriented stranami, ale pohorší euroskeptiky.",
        trustBonus: 28,
        penaltyTargets: ["spd", "ano", "motoriste"],
        atributDrift: { evropa: +22 },
      },
      {
        id: "top09_kultura",
        text: "„Restituce kulturního rozpočtu na předkrizovou úroveň. Kultura není luxus.“",
        popis: "TOP 09 trvá na navýšení financování kultury. Mírný posun, malý odpor.",
        trustBonus: 15,
        atributDrift: { kultura: +15 },
      },
    ],
  },
  {
    partyId: "kdu",
    podminky: [
      {
        id: "kdu_rodina",
        text: "„Zákon o podpoře rodin — daňové úlevy, mateřská, dostupné bydlení. Grolich to má v programu.“",
        popis: "KDU chce prosadit rodinnou politiku. Neutrální posun, pro-family agenda.",
        trustBonus: 22,
        atributDrift: { kultura: -10, ekonomika: -9 },
      },
      {
        id: "kdu_kraje",
        text: "„Decentralizace — větší pravomoci krajům. Praha nemůže rozhodovat o všem.“",
        popis: "KDU-ČSL prosazuje posílení regionální samosprávy. Starostové to přivítají.",
        trustBonus: 18,
        penaltyTargets: [],
        atributDrift: { stylPolitiky: -9 },
      },
    ],
  },
  {
    partyId: "starostove",
    podminky: [
      {
        id: "stan_bezpecnost",
        text: "„Rakušan chce vnitro. Bezpečnost a integrace jsou naše téma — nikdo jiný to nedělá lip.“",
        popis: "STAN požaduje Ministerstvo vnitra pro Vít Rakušan. Neutrální pro většinu stran.",
        trustBonus: 25,
        penaltyTargets: ["ano"],
        atributDrift: { stylPolitiky: -15 },
      },
      {
        id: "stan_korupce",
        text: "„Zákon o střetu zájmů musí projít beze změn. Žádné výjimky, žádné ústupky lobbistům.“",
        popis: "STAN trvá na protikorupční agendě. Piráti a TOP 09 budou nadšeni, ANO zuří.",
        trustBonus: 20,
        penaltyTargets: ["ano"],
        atributDrift: { stylPolitiky: -18 },
      },
    ],
  },
  {
    partyId: "pirati",
    podminky: [
      {
        id: "pirati_digital",
        text: "„Digitalizace státní správy jako priorita číslo jedna. Hřib má plán, stačí podpis.“",
        popis: "Piráti chtějí digitální agendu. Bez konfliktu s ostatními, ale zavazuje k investicím.",
        trustBonus: 20,
        atributDrift: { ekonomika: -15, evropa: +9 },
      },
      {
        id: "pirati_transparence",
        text: "„Plná transparentnost vládních zakázek — otevřená data, žádné výjimky. Nebo nejdeme.“",
        popis: "Piráti trvají na transparentnosti. ANO a SPD to odmítají, demokratické strany vítají.",
        trustBonus: 25,
        penaltyTargets: ["ano", "spd"],
        atributDrift: { stylPolitiky: -18 },
      },
    ],
  },
  {
    partyId: "kscm",
    podminky: [
      {
        id: "kscm_nato",
        text: "„Referendum o členství v NATO. Lid má právo rozhodnout sám.“",
        popis: "KSČM požaduje referendum o NATO — fatální podmínka pro většinu demokratických stran. Přijetí izoluje hráče.",
        trustBonus: 30,
        penaltyTargets: ["ods", "top09", "starostove", "pirati", "kdu"],
        atributDrift: { evropa: -25, stylPolitiky: +15 },
      },
      {
        id: "kscm_znarodn",
        text: "„Znovuznárodnění strategických podniků — energie, voda, zdravotnictví.“",
        popis: "KSČM požaduje znárodnění. Silný levicový posun ekonomiky, pravice zuří.",
        trustBonus: 22,
        penaltyTargets: ["ods", "top09", "motoriste"],
        atributDrift: { ekonomika: -29 },
      },
    ],
  },
  {
    partyId: "socdem",
    podminky: [
      {
        id: "socdem_mzda",
        text: "„Zvýšení minimální mzdy na 60 % průměrné mzdy. Šmarda to neustoupí.“",
        popis: "SocDem chce socioekonomickou politiku. Levicové strany kvitují, pravice se mračí.",
        trustBonus: 22,
        penaltyTargets: ["ods", "motoriste"],
        atributDrift: { ekonomika: -18 },
      },
      {
        id: "socdem_zdravotnictvi",
        text: "„Konec privatizace nemocnic. Zdravotnictví jako veřejná služba, ne byznys.“",
        popis: "SocDem brání veřejné zdravotnictví. Střední cesta — méně polarizující než mzda.",
        trustBonus: 18,
        atributDrift: { ekonomika: -15, kultura: +9 },
      },
    ],
  },
  {
    partyId: "silnecz",
    podminky: [
      {
        id: "nc_prumysl",
        text: "„Průmyslová politika pro regiony — žádné rušení fabrik kvůli Green Dealu.“",
        popis: "NČ hájí průmyslové regiony a odmítá klimatickou politiku jako hrozbu zaměstnanosti.",
        trustBonus: 20,
        penaltyTargets: ["zeleni", "pirati"],
        atributDrift: { ekonomika: +9, evropa: -9 },
      },
      {
        id: "nc_bydleni",
        text: "„Státní bytová výstavba — Praha a Brno nejsou celá republika.“",
        popis: "NČ chce dostupné bydlení jako státní prioritu. Neutrální, populárně znějící podmínka.",
        trustBonus: 15,
        atributDrift: { ekonomika: -9 },
      },
    ],
  },
  {
    partyId: "zeleni",
    podminky: [
      {
        id: "zeleni_klima",
        text: "„Závazná klimatická neutralita do roku 2045 — zapsáno do koaliční smlouvy.“",
        popis: "Zelení požadují klimatický závazek. Progresivní strany jásají, průmyslové lobby a SPD/MOTO zuří.",
        trustBonus: 28,
        penaltyTargets: ["motoriste", "spd", "kscm"],
        atributDrift: { evropa: +18, ekonomika: -9 },
      },
      {
        id: "zeleni_pesticides",
        text: "„Harmonogram výstupu z pesticidů a dotační reforma — zemědělství musí být udržitelné.“",
        popis: "Zelení tlačí na zemědělskou reformu. Méně mediálně výbušné než klima, ale KDU a venkovské strany se zamračí.",
        trustBonus: 18,
        penaltyTargets: ["kdu"],
        atributDrift: { kultura: +8, ekonomika: -3 },
      },
    ],
  },
];
