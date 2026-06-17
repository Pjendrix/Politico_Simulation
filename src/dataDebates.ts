export interface DebateOption {
  text: string;
  ekonomika: number;
  kultura: number;
  evropa: number;
  styl: number;
}

export interface DebateQuestion {
  id: string;
  tema: string;
  otazka: string;
  kontext: string;
  moznosti: {
    A: DebateOption;
    B: DebateOption;
    C: DebateOption;
    D: DebateOption;
  };
}

export const DEBATE_QUESTIONS: DebateQuestion[] = [
  {
    "id": "DEB_T_001",
    "tema": "Důchody",
    "otazka": "Systém důchodů je neudržitelný. Jak vyřešíte narůstající sekeru v důchodovém účtu?",
    "kontext": "Populární, ale drahé téma.",
    "moznosti": {
      "A": {
        "text": "Zvýšíme věk odchodu do důchodu na 67 let. Musíme být zodpovědní.",
        "ekonomika": 3,
        "kultura": 0,
        "evropa": 0,
        "styl": -1
      },
      "B": {
        "text": "Zavedeme povinný druhý pilíř and privatizujeme část fondů.",
        "ekonomika": 4,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "C": {
        "text": "Sáhneme do rozpočtu a věk nezvýšíme ani o den. Senioři si to zaslouží.",
        "ekonomika": -4,
        "kultura": 1,
        "evropa": 0,
        "styl": 2
      },
      "D": {
        "text": "Zrušíme zbytečné úřady a z těch peněz zaplatíme důchody.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 0,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_002",
    "tema": "Green Deal",
    "otazka": "Evropský Green Deal ničí náš průmysl. Budete jako premiér požadovat jeho kompletní zrušení, nebo revizi?",
    "kontext": "Střet průmyslu a ekologie.",
    "moznosti": {
      "A": {
        "text": "Green Deal je příležitost! Masivně podpoříme soláry a dotace.",
        "ekonomika": -2,
        "kultura": 2,
        "evropa": 3,
        "styl": -1
      },
      "B": {
        "text": "Klimatický terorismus odmítáme. V Bruselu to celé zablokujeme!",
        "ekonomika": 2,
        "kultura": -2,
        "evropa": -4,
        "styl": 4
      },
      "C": {
        "text": "Budeme pragmatičtí. Podpoříme jádro a vyjednáme výjimky pro emise.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Zrušíme emisní povolenky jednostranně a podpoříme uhelné elektrárny.",
        "ekonomika": 2,
        "kultura": -2,
        "evropa": -3,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_003",
    "tema": "Přijetí Eura",
    "otazka": "Česko se zavázalo přijmout euro. Kdy konečně stanovíte pevný termín pro vstup do eurozóny?",
    "kontext": "Věčné téma rozdělující společnost.",
    "moznosti": {
      "A": {
        "text": "Okamžitě! Euro potřebujeme jako sůl, koruna nás táhne ke dnu.",
        "ekonomika": 2,
        "kultura": 1,
        "evropa": 4,
        "styl": -2
      },
      "B": {
        "text": "Nikdy. Koruna je symbolem naší suverenity a nenecháme si ji vzít.",
        "ekonomika": -1,
        "kultura": -2,
        "evropa": -4,
        "styl": 2
      },
      "C": {
        "text": "Až splníme Maastrichtská kritéria a bude to výhodné pro lidi.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Vyhlásíme o euru referendum. Ať rozhodnou lidé, ne lobbisté.",
        "ekonomika": -1,
        "kultura": 0,
        "evropa": -2,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_004",
    "tema": "Daně a Deficit",
    "otazka": "Státní dluh roste. Jakým způsobem chcete stabilizovat veřejné finance?",
    "kontext": "Pravice vs Levice.",
    "moznosti": {
      "A": {
        "text": "Zvýšíme korporátní daně a zavedeme sektorovou daň pro banky.",
        "ekonomika": -4,
        "kultura": 1,
        "evropa": 0,
        "styl": 1
      },
      "B": {
        "text": "Zásadně osekáme státní aparát, propustíme úředníky a snížíme daně.",
        "ekonomika": 3,
        "kultura": -1,
        "evropa": 0,
        "styl": -1
      },
      "C": {
        "text": "Nebudeme měnit daně, ale nastartujeme hospodářský růst investicemi.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Zavedeme progresivní daň z příjmu a zdaníme bohaté a oligarchy.",
        "ekonomika": -3,
        "kultura": 2,
        "evropa": 0,
        "styl": 2
      }
    }
  },
  {
    "id": "DEB_T_005",
    "tema": "Dostupnost Bydlení",
    "otazka": "Mladí lidé nemají kde bydlet, ceny bytů jsou astronomické. Jak situaci vyřešíte?",
    "kontext": "Sociální krize.",
    "moznosti": {
      "A": {
        "text": "Trh to vyřeší sám. Musíme jen zrychlit stavební řízení a uvolnit půdu.",
        "ekonomika": 3,
        "kultura": 0,
        "evropa": 0,
        "styl": -2
      },
      "B": {
        "text": "Spustíme masivní státní a obecní výstavbu bytů s regulovaným nájmem.",
        "ekonomika": -4,
        "kultura": 2,
        "evropa": 0,
        "styl": 1
      },
      "C": {
        "text": "Zavedeme tvrdou daň z prázdných bytů a zakážeme Airbnb.",
        "ekonomika": -3,
        "kultura": 3,
        "evropa": 1,
        "styl": 2
      },
      "D": {
        "text": "Dotujeme hypotéky pro mladé rodiny. Stát přispěje každému na první byt.",
        "ekonomika": -2,
        "kultura": -1,
        "evropa": 0,
        "styl": 1
      }
    }
  },
  {
    "id": "DEB_T_006",
    "tema": "Migrace a Azyl",
    "otazka": "Evropský migrační pakt obsahuje mechanismy solidarity. Jak se k němu postavíte?",
    "kontext": "Bezpečnostní rétorika.",
    "moznosti": {
      "A": {
        "text": "Odmítneme jakékoliv kvóty i solidární platby. Ani jeden migrant!",
        "ekonomika": -1,
        "kultura": -4,
        "evropa": -4,
        "styl": 4
      },
      "B": {
        "text": "Pakt podporujeme, musíme ukázat, že jsme součástí západní Evropy.",
        "ekonomika": 1,
        "kultura": 3,
        "evropa": 4,
        "styl": -2
      },
      "C": {
        "text": "Pomáhat budeme, ale pouze v místech konfliktu a materiálně.",
        "ekonomika": 0,
        "kultura": -1,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Migrace je přirozená. Naše ekonomika potřebuje pracovní sílu.",
        "ekonomika": 2,
        "kultura": 2,
        "evropa": 1,
        "styl": -1
      }
    }
  },
  {
    "id": "DEB_T_007",
    "tema": "Školství a Platy",
    "otazka": "Učitelé si stěžují na neustálé změny a nedostatek peněz na pomůcky. Slibujete jim 130 % průměrné mzdy?",
    "kontext": "Sliby voličům.",
    "moznosti": {
      "A": {
        "text": "Zákonných 130 % garantujeme bez výjimek. Na vzdělání škrtat nebudeme.",
        "ekonomika": -2,
        "kultura": 1,
        "evropa": 0,
        "styl": -1
      },
      "B": {
        "text": "Platy zvýšíme, ale pouze těm kvalitním ředitelům a podle zásluh.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 0,
        "styl": -1
      },
      "C": {
        "text": "Školství potřebuje reformu obsahu, ne jen sypání peněz do černé díry.",
        "ekonomika": 2,
        "kultura": 1,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Zrušíme inkluzi a ušetřené peníze rozdělíme normálním učitelům.",
        "ekonomika": 0,
        "kultura": -4,
        "evropa": -1,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_008",
    "tema": "Zdravotnictví a Poplatky",
    "otazka": "Nemocnice bojují s nedostatkem personálu a peněz. Vrátíte do hry regulační poplatky u lékaře?",
    "kontext": "Citlivé téma.",
    "moznosti": {
      "A": {
        "text": "Ano, poplatek 100 Kč za den v nemocnici a 30 Kč u lékaře motivuje lidi.",
        "ekonomika": 3,
        "kultura": 0,
        "evropa": 0,
        "styl": -2
      },
      "B": {
        "text": "Nikdy. Zdravotnictví musí být bezplatné pro každého občana.",
        "ekonomika": -4,
        "kultura": 1,
        "evropa": 0,
        "styl": 2
      },
      "C": {
        "text": "Zavedeme legální možnost připlatit si za nadstandardní péči.",
        "ekonomika": 2,
        "kultura": 1,
        "evropa": 0,
        "styl": -1
      },
      "D": {
        "text": "Sloučíme zdravotní pojišťovny a omezíme zisky lékových korporací.",
        "ekonomika": -2,
        "kultura": 1,
        "evropa": 0,
        "styl": 2
      }
    }
  },
  {
    "id": "DEB_T_009",
    "tema": "Dopravní infrastruktura",
    "otazka": "Stavba dálnic u nás trvá nejdéle v Evropě. Jak donutíte ŘSD stavět rychleji?",
    "kontext": "Beton a sliby.",
    "moznosti": {
      "A": {
        "text": "Zavedeme liniový zákon a omezíme práva ekologických aktivistů blokovat stavby.",
        "ekonomika": 2,
        "kultura": -2,
        "evropa": -1,
        "styl": 3
      },
      "B": {
        "text": "Využijeme masivně PPP projekty, soukromý sektor staví efektivněji.",
        "ekonomika": 3,
        "kultura": 0,
        "evropa": 1,
        "styl": -2
      },
      "C": {
        "text": "Zacílíme peníze na modernizaci železnic, dálnice nejsou budoucnost.",
        "ekonomika": -1,
        "kultura": 2,
        "evropa": 2,
        "styl": -1
      },
      "D": {
        "text": "Osobně na to dohlédnu, budu tam jezdit s helmou a kontrolovat je každé úterý.",
        "ekonomika": 0,
        "kultura": 0,
        "evropa": 0,
        "styl": 4
      }
    }
  },
  {
    "id": "DEB_T_010",
    "tema": "Zahraniční politika a Ukrajina",
    "otazka": "Měla by Česká republika nadále posílat vojenskou a finanční pomoc Ukrajině?",
    "kontext": "Geopolitika.",
    "moznosti": {
      "A": {
        "text": "Bezmezně a na maximum. Bojují i za naši svobodu a bezpečnost.",
        "ekonomika": 0,
        "kultura": 2,
        "evropa": 4,
        "styl": -2
      },
      "B": {
        "text": "Stop zbraním. Budeme posílat pouze humanitární pomoc a volat po míru.",
        "ekonomika": 0,
        "kultura": -3,
        "evropa": -4,
        "styl": 3
      },
      "C": {
        "text": "Pomáhat budeme, ale jen do výše, která neohrozí obranyschopnost naší armády.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Zahraniční pomoc stopneme úplně. Na prvním místě musí být naši lidi!",
        "ekonomika": -2,
        "kultura": -3,
        "evropa": -4,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_011",
    "tema": "Zákaz Spalovacích Motorů",
    "otazka": "Od roku 2035 má platit zákaz prodeje nových aut se spalovacími motory. Podpoříte ho?",
    "kontext": "Auta jako české náboženství.",
    "moznosti": {
      "A": {
        "text": "Je to skvělý krok pro planetu, elektromobilita je technologický pokrok.",
        "ekonomika": -1,
        "kultura": 2,
        "evropa": 3,
        "styl": -1
      },
      "B": {
        "text": "Nesmysl, diktát Bruselu. Spalovací motory budeme bránit do posledního dechu.",
        "ekonomika": 2,
        "kultura": -3,
        "evropa": -4,
        "styl": 3
      },
      "C": {
        "text": "Podpoříme syntetická paliva jako kompromis mezi ekologií a průmyslem.",
        "ekonomika": 2,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Trh si měl vybrat sám, dotace pro elektromobily okamžitě zrušíme.",
        "ekonomika": 2,
        "kultura": -1,
        "evropa": -1,
        "styl": 1
      }
    }
  },
  {
    "id": "DEB_T_012",
    "tema": "Legalizace Konopí",
    "otazka": "Německo konopí legalizovalo, u nás se o tom stále debatuje. Jste pro plnou legalizaci a regulovaný trh?",
    "kontext": "Kultura a peníze.",
    "moznosti": {
      "A": {
        "text": "Ano, přinese to miliardy do rozpočtu na daních a uleví to věznicím.",
        "ekonomika": 2,
        "kultura": 3,
        "evropa": 1,
        "styl": -1
      },
      "B": {
        "text": "Zásadně proti. Marihuana je startovní droga, nebudeme podporovat feťáky.",
        "ekonomika": -1,
        "kultura": -4,
        "evropa": -1,
        "styl": 2
      },
      "C": {
        "text": "Pouze pro léčebné účely a domácí pěstování, žádné specializované obchody.",
        "ekonomika": 0,
        "kultura": -1,
        "evropa": 0,
        "styl": -1
      },
      "D": {
        "text": "Je mi to jedno, máme důležitější problémy než řešit jointy.",
        "ekonomika": -1,
        "kultura": 0,
        "evropa": 0,
        "styl": 1
      }
    }
  },
  {
    "id": "DEB_T_013",
    "tema": "Manželství pro všechny",
    "otazka": "Měli by homosexuální páry možnost uzavírat plnohodnotné manželství včetně adopce dětí?",
    "kontext": "Kulturní války.",
    "moznosti": {
      "A": {
        "text": "Ano, lidé by měli mít stejná práva bez ohledu na orientaci. Je rok 2026.",
        "ekonomika": 0,
        "kultura": 4,
        "evropa": 2,
        "styl": -2
      },
      "B": {
        "text": "Tradiční rodina je muž, žena a děti. Manželství nebudeme redefinovat.",
        "ekonomika": 0,
        "kultura": -4,
        "evropa": -2,
        "styl": 2
      },
      "C": {
        "text": "Podporujeme kompromis — narovnání práv v rámci registrovaného partnerství, bez názvu manželství.",
        "ekonomika": 0,
        "kultura": -1,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Ať o tom rozhodne lidové referendum, nechceme rozdělovat společnost.",
        "ekonomika": -1,
        "kultura": 0,
        "evropa": -1,
        "styl": 2
      }
    }
  },
  {
    "id": "DEB_T_014",
    "tema": "Zbrojení a Bezpečnost",
    "otazka": "Světová situace je napjatá. Měli bychom dávat více než slíbená 2 % HDP na obranu?",
    "kontext": "Armáda a bezpečí.",
    "moznosti": {
      "A": {
        "text": "Musíme dávat klidně 3 % HDP. Bezpečnost a modernizace armády jsou prioritou.",
        "ekonomika": -1,
        "kultura": 0,
        "evropa": 2,
        "styl": -2
      },
      "B": {
        "text": "2 % bohatě stačí, peníze navíc musíme dát do zdravotnictví a školství.",
        "ekonomika": -2,
        "kultura": 0,
        "evropa": -1,
        "styl": 1
      },
      "C": {
        "text": "Armáda nepotřebuje drahé americké stíhačky, ale investice do kyberbezpečnosti.",
        "ekonomika": 1,
        "kultura": 1,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Nekupujme žádné zbraně, zrušme nákupy a investujme do našich občanů.",
        "ekonomika": -3,
        "kultura": -3,
        "evropa": -3,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_015",
    "tema": "Koncesionářské Poplatky",
    "otazka": "Vládní návrh počítá se zvýšením poplatků pro ČT a ČRo. Podpoříte financování veřejnoprávních médií?",
    "kontext": "Bitva o média.",
    "moznosti": {
      "A": {
        "text": "Média veřejné služby jsou pilířem demokracie. Poplatky se musí zvýšit.",
        "ekonomika": -2,
        "kultura": 2,
        "evropa": 2,
        "styl": -2
      },
      "B": {
        "text": "Zrušíme poplatky úplně. ČT je neobjektivní a má se financovat z reklamy nebo rozpočtu.",
        "ekonomika": 2,
        "kultura": -3,
        "evropa": -2,
        "styl": 3
      },
      "C": {
        "text": "Poplatky zachováme na stávající úrovni, ale ČT musí projít hlubokým auditem.",
        "ekonomika": 1,
        "kultura": -1,
        "evropa": 0,
        "styl": -1
      },
      "D": {
        "text": "Zestátníme Českou televizi, ať slouží přímo zájmům České republiky.",
        "ekonomika": -2,
        "kultura": -3,
        "evropa": -3,
        "styl": 4
      }
    }
  },
  {
    "id": "DEB_T_016",
    "tema": "Energetika a Jádro",
    "otazka": "Česko sází na dostavbu Dukovan a Temelína. Je jaderná energie tou správnou cestou?",
    "kontext": "Základ průmyslu.",
    "moznosti": {
      "A": {
        "text": "Jednoznačně. Jádro je náš národní zájem, postavíme klidně 4 nové bloky.",
        "ekonomika": 1,
        "kultura": -2,
        "evropa": -1,
        "styl": -1
      },
      "B": {
        "text": "Sázet jen na jádro je drahé a pomalé. Budoucnost je v decentralizovaných obnovitelných zdrojích.",
        "ekonomika": -2,
        "kultura": 3,
        "evropa": 3,
        "styl": -1
      },
      "C": {
        "text": "Postavíme jeden velký blok a k tomu malé modulární reaktory v krajích.",
        "ekonomika": 2,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Energetiku musíme nejdřív stoprocentně zestátnit a vykoupit minoritní akcionáře ČEZu.",
        "ekonomika": -3,
        "kultura": -1,
        "evropa": 0,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_017",
    "tema": "Byrokracie a Digitalizace",
    "otazka": "Digitalizace stavebního řízení skončila fiaskem. Jak napravíte stav státní správy?",
    "kontext": "Digitalizační trauma.",
    "moznosti": {
      "A": {
        "text": "Vyhodíme neschopné dodavatele a systém postavíme znovu a pořádně přes interní experty.",
        "ekonomika": 1,
        "kultura": 1,
        "evropa": 1,
        "styl": -1
      },
      "B": {
        "text": "Vrátíme se částečně k papíru a úředníkům na přepážkách, lidé chtějí jistotu.",
        "ekonomika": -1,
        "kultura": -2,
        "evropa": -1,
        "styl": 2
      },
      "C": {
        "text": "Zavedeme princip jednou a dost a zrušíme třetinu ministerstev.",
        "ekonomika": 3,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Za toto fiasko může předchozí vláda. My pod naším vedením digitalizaci dokončíme do měsíce.",
        "ekonomika": 0,
        "kultura": 0,
        "evropa": 0,
        "styl": 4
      }
    }
  },
  {
    "id": "DEB_T_018",
    "tema": "Zemědělství a Dotace",
    "otazka": "Naši zemědělci protestují v ulicích proti levným dovozům a byrokracii. Jak jim pomůžete?",
    "kontext": "Traktory v Praze.",
    "moznosti": {
      "A": {
        "text": "Zavedeme tvrdá cla na dovoz potravin mimo EU a podpoříme české farmáře.",
        "ekonomika": -2,
        "kultura": -2,
        "evropa": -2,
        "styl": 3
      },
      "B": {
        "text": "Dotace musíme omezit velkým agrokoncernům a dát je malým rodinným farmám.",
        "ekonomika": 2,
        "kultura": 2,
        "evropa": 1,
        "styl": -2
      },
      "C": {
        "text": "Protesty jsou zpolitizované. Agrobaroni mají rekordní zisky, pomáhat netřeba.",
        "ekonomika": 1,
        "kultura": 1,
        "evropa": 0,
        "styl": -1
      },
      "D": {
        "text": "Zrušíme byrokratické green-deal limity pro hnojení, ať mohou normálně produkovat.",
        "ekonomika": 2,
        "kultura": -2,
        "evropa": -2,
        "styl": 2
      }
    }
  },
  {
    "id": "DEB_T_019",
    "tema": "Sociální Dávky",
    "otazka": "Systém sociálních dávek je podle kritiků zneužívaný. Zpřísníte podmínky pro jejich vyplácení?",
    "kontext": "Práce vs Dávky.",
    "moznosti": {
      "A": {
        "text": "Ano, zavedeme princip třikrát a dost a povinné veřejné práce pro dlouhodobě nezaměstnané.",
        "ekonomika": 2,
        "kultura": -3,
        "evropa": -1,
        "styl": 3
      },
      "B": {
        "text": "Systém zjednodušíme do jedné superdávky, abychom pomohli těm nejzranitelnějším.",
        "ekonomika": -2,
        "kultura": 2,
        "evropa": 1,
        "styl": -1
      },
      "C": {
        "text": "Zavedeme nepodmíněný základní příjem pro každého občana a zrušíme úřady práce.",
        "ekonomika": -4,
        "kultura": 3,
        "evropa": 2,
        "styl": -1
      },
      "D": {
        "text": "Dávky škrtat nebudeme, ale zaměříme se na kontrolu nepřiznaných příjmů na černo.",
        "ekonomika": 0,
        "kultura": 1,
        "evropa": 0,
        "styl": -1
      }
    }
  },
  {
    "id": "DEB_T_020",
    "tema": "Kultura a Financování",
    "otazka": "Národní umělci a divadla si stěžují na podfinancování. Zvýšíte rozpočet ministerstva kultury na 1 % HDP?",
    "kontext": "Kulturní elita.",
    "moznosti": {
      "A": {
        "text": "Ano, kultura je vizitkou národa. Zaslouží si stabilní a vysoké financování.",
        "ekonomika": -1,
        "kultura": 2,
        "evropa": 1,
        "styl": -2
      },
      "B": {
        "text": "Kultura si na sebe má vydělat sama, stát nemá dotovat podivná avantgardní představení.",
        "ekonomika": 3,
        "kultura": -3,
        "evropa": -2,
        "styl": 2
      },
      "C": {
        "text": "Podpoříme regionální kulturu a památky, ne jen pražská velká divadla.",
        "ekonomika": 0,
        "kultura": -1,
        "evropa": 0,
        "styl": -1
      },
      "D": {
        "text": "Zřídíme speciální fond z hazardu, ze kterého budeme kulturu financovat.",
        "ekonomika": 1,
        "kultura": 0,
        "evropa": 0,
        "styl": -1
      }
    }
  },
  {
    "id": "DEB_T_021",
    "tema": "Školství a Zkoušky",
    "otazka": "Má být maturita z matematiky povinná pro všechny studenty středních škol?",
    "kontext": "Vzdělávací standard.",
    "moznosti": {
      "A": {
        "text": "Ano, je to základní filtr a posílí úroveň vzdělání.",
        "ekonomika": 1,
        "kultura": -1,
        "evropa": 0,
        "styl": -1
      },
      "B": {
        "text": "Povinně jen pro gymnázia a technické obory.",
        "ekonomika": 0,
        "kultura": 0,
        "evropa": 0,
        "styl": 0
      },
      "C": {
        "text": "Ne, povinné by měly být spíš praktické předměty a kritické myšlení.",
        "ekonomika": -1,
        "kultura": 2,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Povinnosti zrušit, ať si školy rozhodnou samy.",
        "ekonomika": 0,
        "kultura": 1,
        "evropa": 0,
        "styl": 1
      }
    }
  },
  {
    "id": "DEB_T_022",
    "tema": "Mediální Regulace",
    "otazka": "Má stát omezovat weby, které šíří dezinformace?",
    "kontext": "Svoboda slova a bezpečnost.",
    "moznosti": {
      "A": {
        "text": "Ne, stát nemá do médií zasahovat.",
        "ekonomika": 0,
        "kultura": -1,
        "evropa": -1,
        "styl": -2
      },
      "B": {
        "text": "Jen v případě přímého podněcování k násilí.",
        "ekonomika": 0,
        "kultura": 0,
        "evropa": 0,
        "styl": -1
      },
      "C": {
        "text": "Ano, ale jen po rozhodnutí soudu a jasných pravidlech.",
        "ekonomika": 0,
        "kultura": 1,
        "evropa": 1,
        "styl": -1
      },
      "D": {
        "text": "Ano, blokovat je okamžitě, bez zdlouhavých procedur.",
        "ekonomika": 0,
        "kultura": 3,
        "evropa": 1,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_023",
    "tema": "Hranice a Schengen",
    "otazka": "Měl by stát dočasně obnovit kontroly na hranicích?",
    "kontext": "Volný pohyb vs bezpečnost.",
    "moznosti": {
      "A": {
        "text": "Ne, Schengen je třeba chránit za každou cenu.",
        "ekonomika": 1,
        "kultura": 1,
        "evropa": 4,
        "styl": -2
      },
      "B": {
        "text": "Jen při mimořádné bezpečnostní hrozbě.",
        "ekonomika": 0,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "C": {
        "text": "Ano, dokud se nevyřeší nelegální migrace.",
        "ekonomika": -1,
        "kultura": -3,
        "evropa": -3,
        "styl": 2
      },
      "D": {
        "text": "Ano, hranice máme kontrolovat dlouhodobě a přísně.",
        "ekonomika": -1,
        "kultura": -4,
        "evropa": -4,
        "styl": 3
      }
    }
  },
  {
    "id": "DEB_T_024",
    "tema": "Práce a Mzdy",
    "otazka": "Měl by stát tlakem tlačit na růst mezd v soukromém sektoru?",
    "kontext": "Zaměstnanci a firmy.",
    "moznosti": {
      "A": {
        "text": "Ano, zákony mají chránit zaměstnance před chudobou.",
        "ekonomika": -3,
        "kultura": 1,
        "evropa": 0,
        "styl": 0
      },
      "B": {
        "text": "Jen v odvětvích s nedostatkem pracovníků.",
        "ekonomika": -1,
        "kultura": 0,
        "evropa": 0,
        "styl": -1
      },
      "C": {
        "text": "Ne, mzdy mají určovat firmy a trh.",
        "ekonomika": 3,
        "kultura": -1,
        "evropa": 0,
        "styl": -1
      },
      "D": {
        "text": "Stát má hlavně snižovat odvody, aby firmám zůstalo víc peněz.",
        "ekonomika": 2,
        "kultura": 0,
        "evropa": 0,
        "styl": 1
      }
    }
  },
  {
    "id": "DEB_T_025",
    "tema": "Evropské Fondy",
    "otazka": "Má Česko více čerpat evropské fondy, i když to znamená větší administrativu?",
    "kontext": "Brusel a dotace.",
    "moznosti": {
      "A": {
        "text": "Ano, evropské peníze za to stojí.",
        "ekonomika": -1,
        "kultura": 0,
        "evropa": 3,
        "styl": -1
      },
      "B": {
        "text": "Jen v dobře připravených projektech.",
        "ekonomika": 0,
        "kultura": 0,
        "evropa": 1,
        "styl": -1
      },
      "C": {
        "text": "Ne, administrativní zátěž je moc vysoká.",
        "ekonomika": 1,
        "kultura": -1,
        "evropa": -2,
        "styl": 1
      },
      "D": {
        "text": "Raději ať si vše financujeme sami bez Bruselu.",
        "ekonomika": 2,
        "kultura": -1,
        "evropa": -4,
        "styl": 2
      }
    }
  }
];
