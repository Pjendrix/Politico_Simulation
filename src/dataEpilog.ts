/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EndingTyp } from "./types";

/**
 * Datové podklady pro generování satirického "epilogu" na konci hry.
 * Epilog je vždy poskládán ze stejné kostry vět (viz generateEpilog v gameUtils.ts):
 *
 *  1. Úvodní věta podle typu konce (premier / vicepremier / koalicni_partner / opozice)
 *  2. Reakce hlavního koaličního partnera (nebo "doslov z opozice")
 *  3. Věta o tom, co kampaň nejvíc definovalo (média / debaty / podcasty / mimořádné události / kompas)
 *  4. Verdikt o souladu vlády se Společenským kompasem (nízká / střední / vysoká odchylka)
 *  5. Poslední slovo poradce
 *
 * Náhodnost je omezena vždy jen na výběr varianty UVNITŘ jedné kategorie,
 * takže text dává smysl, ale při opakovaném hraní se mírně liší.
 */

export interface EpilogData {
  uvod: Record<EndingTyp, string[]>;
  partnerReakce: Record<string, { positive: string; negative: string }>;
  opozicniDoslov: string[];
  dominantniRys: {
    media: string[];
    debaty: string[];
    podcasty: string[];
    mimoradne: string[];
    kompas: string[];
  };
  kompasVerdikt: {
    nizka: string[];
    stredni: string[];
    vysoka: string[];
  };
  poradceOdchod: Record<string, string[]>;
}

export const EPILOG: EpilogData = {
  // ═══════════════════════════════════════════
  // 1. ÚVODNÍ VĚTA PODLE TYPU KONCE
  // ═══════════════════════════════════════════
  uvod: {
    premier: [
      "Stal(a) jste se premiérem/premiérkou. Hradní kancelář si váš telefon uložila do rychlých voleb dřív, než stihla dopít kafe.",
      "Sestavil(a) jste vlastní koalici a usedl(a) do křesla premiéra. Komentátoři ČT24 už si připravili grafický balíček s vaší fotkou na příští měsíc.",
    ],
    vicepremier: [
      "Sestavil(a) jste koalici, ale premiérské křeslo si vzal silnější partner. Vy jste dostal(a) 'klíčové' ministerstvo a slib, že 'na vás se bude pamatovat'.",
      "Vyjednal(a) jste si místo ve vládě, jen ne to nejlepší. Tisková zpráva o vašem jmenování vyšla o den později než ta o premiérovi.",
    ],
    koalicni_partner: [
      "Sám/sama jste koalici nevyjednal(a), ale systém vás do ní nakonec přihodil — jako třetí pizzu navíc k objednávce, kterou si nikdo nepamatuje, že objednal.",
      "Vláda vznikla, aniž byste hnul(a) prstem. Najednou jste ve vládě. Nikdo, včetně vás, přesně neví, jak se to stalo.",
    ],
    opozice: [
      "Vláda vznikla bez vás. Čtyři roky interpelací, tweetů a věty 'já jsem to říkal/a' jsou před vámi.",
      "Skončil(a) jste v opozici. Vaše tiskové oddělení už pracuje na narativu 'morální vítězství'.",
    ],
  },

  // ═══════════════════════════════════════════
  // 2A. REAKCE HLAVNÍHO KOALIČNÍHO PARTNERA
  //     (podle trustu hráče k partnerovi: >= 50 = positive, < 50 = negative)
  // ═══════════════════════════════════════════
  partnerReakce: {
    ano: {
      positive:
        "Andrej Babiš na tiskovce prohlásil, že 'spolupráce funguje', a hned dodal, že je to především jeho zásluha.",
      negative:
        "Andrej Babiš na Facebooku napsal dlouhý status o tom, jak by to 'dělal jinak, lépe a levněji', než jste přišli vy.",
    },
    motoriste: {
      positive:
        "Petr Macinka oznámil, že konečně 'mají ve vládě někoho, kdo rozumí motorům i ekonomice' — myslel tím vás.",
      negative:
        "Petr Macinka veřejně litoval, že koaliční smlouva 'nezmiňuje silniční daň ani jednou', a obvinil vás z kompromisu na úkor motoristů.",
    },
    spd: {
      positive:
        "Tomio Okamura prohlásil, že 'konečně někdo poslouchá hlas lidu' — a tím hlasem myslel sebe i vás.",
      negative:
        "Tomio Okamura na svém kanálu varoval, že vláda s vámi je jen 'dočasná nutnost', dokud nepřijdou 'správné' volby.",
    },
    ods: {
      positive:
        "Martin Kupka ocenil 'odpovědný přístup k rozpočtu' a slíbil, že ODS bude 'spolehlivým partnerem' — což ve své branži považuje za kompliment.",
      negative:
        "Martin Kupka v rozhovoru pro Seznam Zprávy připustil, že spolupráce s vámi je 'výzva', a hned avizoval 'jasné červené linie' do budoucna.",
    },
    top09: {
      positive:
        "Ondřej Havel pochválil proevropský kurz nové vlády a vyjádřil naději, že se 'konečně něco pohne' s rozpočtem.",
      negative:
        "Ondřej Havel v Hyde Parku ČT poznamenal, že TOP 09 'bude hlídat, aby se na evropské závazky nezapomnělo' — adresováno přímo vám.",
    },
    kdu: {
      positive:
        "Jan Grolich poděkoval za respekt k regionům a rodinám a slíbil, že KDU-ČSL bude 'pevným morálním kompasem' vlády.",
      negative:
        "Jan Grolich varoval, že KDU-ČSL 'nebude couvat z hodnotových témat' — a že v koaliční smlouvě v tomto bodě 'zůstává otevřeno'.",
    },
    starostove: {
      positive:
        "Vít Rakušan ocenil důraz na bezpečnost a decentralizaci a označil spolupráci za 'překvapivě funkční'.",
      negative:
        "Vít Rakušan v rozhovoru připustil, že 'ne všechno sedí', ale že STAN bude ve vládě 'hlasem rozumu' — narážka na vás byla zřejmá.",
    },
    pirati: {
      positive:
        "Zdeněk Hřib uvítal pokrok v digitalizaci a poznamenal, že i nečekaná spolupráce může přinést výsledky.",
      negative:
        "Zdeněk Hřib napsal, že Piráti budou hájet transparentnost, i kdyby to znamenalo 'nepříjemné otázky' na vaši adresu.",
    },
    kscm: {
      positive:
        "Kateřina Konečná uvítala návrat sociálních témat do vlády a ocenila, že 'konečně někdo myslí na lidi'.",
      negative:
        "Kateřina Konečná kritizovala 'polovičatost' sociálních opatření a slíbila, že KSČM bude 'tlačit na víc'.",
    },
    socdem: {
      positive:
        "Michal Šmarda prohlásil, že 'sociální demokracie je zpátky ve hře', a ocenil ochotu k dialogu.",
      negative:
        "Michal Šmarda poznamenal, že 'levice si zaslouží víc než jen místo u stolu' — adresováno vám.",
    },
    silnecz: {
      positive:
        "Martin Kuba ocenil pragmatický přístup a řekl, že Naše Česko konečně 'cítí, že regiony mají hlas'.",
      negative:
        "Martin Kuba si stěžoval, že 'regionální témata zase skončila na vedlejší koleji', a to i ve vládě s vámi.",
    },
    zeleni: {
      positive:
        "Gabriela Svárovská ocenila posun v klimatické agendě a nazvala spolupráci 'začátkem něčeho slibného'.",
      negative:
        "Gabriela Svárovská kritizovala nedostatečnou ambici v klimatických závazcích a slíbila, že Zelení budou 'hlasitým svědomím vlády'.",
    },
  },

  // ═══════════════════════════════════════════
  // 2B. DOSLOV PRO HRÁČE V OPOZICI (žádný partner)
  // ═══════════════════════════════════════════
  opozicniDoslov: [
    "Vítězná koalice mezitím slavila na Žofíně, zatímco vy jste sledovali přenos z domova a počítali, kde se to zlomilo.",
    "Nová vláda se ustavila bez vás. Vaše tisková zpráva s titulkem 'Připraveni na konstruktivní opozici' vyšla o tři hodiny později než ta vítězná.",
    "Zatímco se nová koalice domlouvala na rozdělení portfolií, vy jste řešili, kdo bude mluvčí pro nadcházející interpelace.",
  ],

  // ═══════════════════════════════════════════
  // 3. DOMINANTNÍ RYS KAMPANĚ
  //    (podle toho, který stats.pref* měl největší absolutní hodnotu)
  // ═══════════════════════════════════════════
  dominantniRys: {
    media: [
      "Vaši kampaň definovala média — bulvár vás miloval i pohřbíval ve stejném týdnu, podle toho, co se zrovna lépe prodávalo.",
      "Bez novinářů byste byl(a) nikdo. S novináři jste byl(a) taky téměř nikdo, ale aspoň o tom psali.",
    ],
    debaty: [
      "Rozhodly debaty. Národ si z celé kampaně zapamatuje jednu vaši větu — vystřiženou z kontextu a sdílenou tisíckrát.",
      "Vaše vystoupení v Superdebatě a finále na ČT bylo to, co lidi reálně zaujalo. Zbytek kampaně si nikdo nepamatuje.",
    ],
    podcasty: [
      "Vyhráli/prohráli jste to v podcastech. Politika se dnes dělá ve sluchátkách, ne na náměstích.",
      "Komentátorské podcasty vás formovaly víc, než jste byli ochotni si připustit.",
    ],
    mimoradne: [
      "Vaši kampaň zlomily mimořádné momenty — krize, skandály a unáhlená rozhodnutí, na která jste museli reagovat v přímém přenosu.",
      "Nebyla to strategie, byly to reflexy. Každá vaše velká chvíle byla reakcí na něco, co jste nečekali.",
    ],
    kompas: [
      "Společnost se za 25 kol posunula víc než vaše kampaň. Honili jste vlastní stín ve volebních průzkumech.",
      "Voličská nálada byla váš nejsilnější i nejslabší soupeř — neviditelná, ale rozhodující.",
    ],
  },

  // ═══════════════════════════════════════════
  // 4. VERDIKT O SOULADU VLÁDY SE SPOLEČENSKÝM KOMPASEM
  //    (podle průměrné odchylky |atributy - spolecenskyKompas|)
  // ═══════════════════════════════════════════
  kompasVerdikt: {
    nizka: [
      "Vaše vláda is v nečekaném souladu s veřejným míněním. Komentátoři to označují za 'podezřele harmonické' a čekají, kdy se to zlomí.",
      "Paradoxně jste skončili tam, kde to společnost momentálně chce. Vydrží to možná do prvního rozpočtu.",
    ],
    stredni: [
      "Část společnosti vás chápe, část vás vnímá jako přízrak z minulé kampaně. Talk show budou mít o čem diskutovat.",
      "Mezi vámi a veřejným míněním je rozumná, ale citelná mezera — přesně suchá, na kterou se dobře nabaluje opoziční rétorika.",
    ],
    vysoka: [
      "Komentátoři se shodují na jednom: vy a veřejnost momentálně mluvíte odlišnými jazyky. Otázkou je jen, kdo se přizpůsobí dřív.",
      "Propast mezi vaší vládou a nálady společnosti je tak velká, že by se do ní vešlo i druhé Temelín. Užijte si volební období.",
    ],
  },

  // ═══════════════════════════════════════════
  // 5. POSLEDNÍ SLOVO PORADCE
  // ═══════════════════════════════════════════
  poradceOdchod: {
    spin_doctor: [
      "Marek Prchal si na rozlučkové párty otevřel láhev a prohlásil: 'Tohle byla nejlepší kampaň, na které jsem nikdy nedělal.'",
      "Marek Prchal už plánuje dalšího klienta. 'Mediální obraz je jen otázka úhlu,' poznamenal a odešel s telefonem u ucha.",
    ],
    klaus: [
      "Václav Klaus na odchodu poznamenal, že 'koalice je jen detail' a že důležité je, kdo má klíče od chaty.",
      "Václav Klaus si na závěr zapálil dýmku a prohlásil, že tohle už jednou viděl, jen s jinými lidmi.",
    ],
    diplomat: [
      "Petr Kolář si po nočním vyjednávání dal kafe a řekl: 'Vidíte, šlo to. Jen jsme si museli najít čas.'",
      "Petr Kolář si do diáře už zapsal první schůzku s 'jistým' koaličním partnerem na příští volební období.",
    ],
    strateg: [
      "Miroslav Kalousek otevřel tabulku, podíval se na výsledky a suše poznamenal: 'Rozpočet to nezachrání, ale aspoň jsme byli systematičtí.'",
      "Miroslav Kalousek na rozlučce rozdal grafy s trendy preferencí. 'Příště to uděláme ještě o 50 % efektivněji,' slíbil.",
    ],
    populista: [
      "Jaromír Soukup prohlásil, že 'lidi chtěli přesně tohle', a už natáčí speciál na Barrandov TV.",
      "Jaromír Soukup si pochvaloval, že 'každá debata byla jasná od první minuty' — i ty, které jste prohráli.",
    ],
    novinar: [
      "Radek Bartoníček zavolal pár kolegům z redakce a poznamenal, že příští týden vyjde 'už jen pozitivní materiál'.",
      "Radek Bartoníček si na konci kampaně povzdechl: 'Někdy je těžší najít negativní zprávu, než si lidi myslí.'",
    ],
    turek: [
      "Filip Turek se omluvil, že 'tohle se příště nestane' — pak nastoupil do auta a odjel směrem, kterým neměl.",
      "Filip Turek na poslední tiskovce slíbil 'žádné další kauzy' a o pět minut později ztratil mikrofon i auto.",
    ],
  },
};
