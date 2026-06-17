export interface MediaEventTemplate {
  id: string;
  typ: string;
  textTemplate: string;
  variantA: {
    textTemplate: string;
    efekt: {
      preference?: number; // Player's preference change
      vztahy?: Record<string, number>; // Dynamic target names like "{strana1}" or specific party ids
      partnerPreference?: Record<string, number>; // Dynamic pref change for target parties
    };
  };
  variantB: {
    textTemplate: string;
    efekt: {
      preference?: number;
      vztahy?: Record<string, number>;
      partnerPreference?: Record<string, number>;
    };
  };
}

export const MEDIA_EVENTS_TEMPLATES: MediaEventTemplate[] = [
  {
    id: "GEN_001",
    typ: "Konfrontační",
    textTemplate: "V televizní debatě se zástupce {strana1} ostře pohádal se zástupcem {strana2}. Na čí stranu se postavíš?",
    variantA: {
      textTemplate: "Zastat se strany {strana1}",
      efekt: {
        vztahy: { "{strana1}": 5, "{strana2}": -5 }
      }
    },
    variantB: {
      textTemplate: "Zastat se strany {strana2}",
      efekt: {
        vztahy: { "{strana1}": -5, "{strana2}": 5 }
      }
    }
  },
  {
    id: "GEN_002",
    typ: "Konfrontační",
    textTemplate: "Média zveřejnila tajnou nahrávku, kde lídr {strana1} ({lidr1}) ostře kritizuje program vaší strany. Jak reagujete?",
    variantA: {
      textTemplate: "Oplatit stejnou mincí a zaútočit na jeho stranu",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -10 }
      }
    },
    variantB: {
      textTemplate: "Přejít to s nadhledem a komentovat to diplomaticky",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": 5 }
      }
    }
  },
  {
    id: "GEN_003",
    typ: "Konfrontační",
    textTemplate: "Na sociálních sítích se rozhořela bitva mezi vaším mladým kandidátem a zástupcem {strana1}. Vedení {strana1} požaduje omluvu.",
    variantA: {
      textTemplate: "Veřejně se zastat svého kandidáta",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -8 }
      }
    },
    variantB: {
      textTemplate: "Přimět kandidáta k omluvě a incident urovnat",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": 7 }
      }
    }
  },
  {
    id: "GEN_004",
    typ: "Konfrontační",
    textTemplate: "Během společné tiskové konference vás lídr {strana2} ({lidr2}) nečekaně konfrontuje s citlivou otázkou na financování vaší kampaně.",
    variantA: {
      textTemplate: "Přejít do protiútoku a vytáhnout starou kauzu jejich strany",
      efekt: {
        partnerPreference: { "{strana2}": -0.3 },
        vztahy: { "{strana2}": -8 }
      }
    },
    variantB: {
      textTemplate: "Klidně argumentovat a doložit transparentní účet",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana2}": 2 }
      }
    }
  },
  {
    id: "GEN_005",
    typ: "Konfrontační",
    textTemplate: "V kuloárech sněmovny se potkáte s předsedou {strana1}, který vám nabízí stažení jejich blokačních pozměňovacích návrhů výměnou za politické ústupky.",
    variantA: {
      textTemplate: "Přistoupit na obchod a schválit zákon rychleji",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": 10 }
      }
    },
    variantB: {
      textTemplate: "Odmítnout a veřejně je obvinit z politického vydírání",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -15 }
      }
    }
  },
  {
    id: "GEN_006",
    typ: "Konfrontační",
    textTemplate: "Lídr {strana1} vás vyzval k přímému názorovému duelu v hlavním vysílacím čase o reformě daní. Váš tým si není jistý vaší přípravou.",
    variantA: {
      textTemplate: "Výzvu přijmout a jít do rizika",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -5 }
      }
    },
    variantB: {
      textTemplate: "Debatu odmítnout s tím, že nebudete naskakovat na populistickou vlnu",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": -2 }
      }
    }
  },
  {
    id: "GEN_007",
    typ: "Konfrontační",
    textTemplate: "Místní organizace {strana1} blokuje schválení vašeho klíčového projektu na krajské úrovni. Je nutné zasáhnout.",
    variantA: {
      textTemplate: "Vyvolat ostré jednání na celostátní úrovni a pohrozit koncem spolupráce",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -8 }
      }
    },
    variantB: {
      textTemplate: "Nabídnout jim kompromisní post v krajské dozorčí radě",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": 5 }
      }
    }
  },
  {
    id: "GEN_008",
    typ: "Srovnávací",
    textTemplate: "V diskusním pořadu jste byl dotázán, kdo by podle Vás byl lepším premiérem: {lidr1} ({strana1}), nebo {lidr2} ({strana2})?",
    variantA: {
      textTemplate: "Uvést, že lepším by byl {lidr1}",
      efekt: {
        partnerPreference: { "{strana1}": 0.4 }
      }
    },
    variantB: {
      textTemplate: "Uvést, že lepším by byl {lidr2}",
      efekt: {
        partnerPreference: { "{strana2}": 0.4 }
      }
    }
  },
  {
    id: "GEN_009",
    typ: "Podpora",
    textTemplate: "Lídr {strana1} veřejně pochválil váš ekonomický program. Jak na tuto nečekanou podporu odpovíte?",
    variantA: {
      textTemplate: "Poděkovat a naznačit možnou povolební koalici",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": 8 }
      }
    },
    variantB: {
      textTemplate: "Distancovat se s tím, že vaše programy jsou diametrálně odlišné",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -10 }
      }
    }
  },
  {
    id: "GEN_010",
    typ: "Podpora",
    textTemplate: "Ekologická iniciativa spojená se {strana1} pořádá demonstraci za klima. Žadyjí vás o vyjádření podpory.",
    variantA: {
      textTemplate: "Osobně se zúčastnit a vystoupit s projevem",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": 5 }
      }
    },
    variantB: {
      textTemplate: "Odmítnout s odkazem na příliš radikální požadavky organizátorů",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -5 }
      }
    }
  },
  {
    id: "GEN_011",
    typ: "Podpora",
    textTemplate: "Známá celebrita na svém profilu podpořila lídra {strana2}, což prokazatelně posílilo jeho stranu. Váš tým zvažuje reakci.",
    variantA: {
      textTemplate: "Investovat masivní úsilí do kampaně s vlastními influencery",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana2}": -2 }
      }
    },
    variantB: {
      textTemplate: "Nechat kampaň běžet přirozeně bez placených celebrit",
      efekt: {
        preference: -0.3,
        partnerPreference: { "{strana2}": 0.3 }
      }
    }
  },
  {
    id: "GEN_012",
    typ: "Podpora",
    textTemplate: "Vlivný podnikatelský svaz, který štědře sponzoruje {strana1}, nabízí finanční podporu i vaší straně, pokud zmírníte kritickou rétoriku ohledně regulací.",
    variantA: {
      textTemplate: "Nabídku přijmout a poupravit programové prohlášení",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": 9 }
      }
    },
    variantB: {
      textTemplate: "Nabídku okázale odmítnout a postavit na tom další kampaň",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -6 }
      }
    }
  },
  {
    id: "GEN_013",
    typ: "Podpora",
    textTemplate: "Bývalý velmi populární prezident vyjádřil nepřímou podporu straně {strana1}. Máte možnost se s ním pokusit sjednat schůzku.",
    variantA: {
      textTemplate: "Sjednat si schůzku a pokusit se ho přesvědčit o podpoře",
      efekt: {
        preference: 0.6,
        vztahy: { "{strana1}": -3 }
      }
    },
    variantB: {
      textTemplate: "Ignorovat to a spoléhat se striktně na vlastní voliče",
      efekt: {
        partnerPreference: { "{strana1}": 0.3 }
      }
    }
  },
  {
    id: "GEN_014",
    typ: "Pomluva",
    textTemplate: "Na mítinku s nespokojenými občany jste dostal perfektní politickou příležitost rýpnout si do {strana1}. Využijete ji?",
    variantA: {
      textTemplate: "Využít příležitost a ostře je zkritizovat",
      efekt: {
        partnerPreference: { "{strana1}": -0.4 },
        vztahy: { "{strana1}": -9 }
      }
    },
    variantB: {
      textTemplate: "Odmítnout laciné rýpání a mluvit o svém programu",
      efekt: {
        vztahy: { "{strana1}": 5 }
      }
    }
  },
  {
    id: "GEN_015",
    typ: "Pomluva",
    textTemplate: "Anonymní účet na platformě X začal virálně šířit podivné upravené fotografie lídra {strana1} z pochybného večírku. Váš PR tým doporučuje to přiživit.",
    variantA: {
      textTemplate: "Sdílet a komentovat to s narážkou na moralitu soupeře",
      efekt: {
        partnerPreference: { "{strana1}": -0.4 },
        vztahy: { "{strana1}": -12 }
      }
    },
    variantB: {
      textTemplate: "Veřejně se proti takové špinavé antikampani ohradit a lídra podpořit",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": 10 }
      }
    }
  },
  {
    id: "GEN_016",
    typ: "Pomluva",
    textTemplate: "V regionálním tisku se objevil nepodložený článek obviňující {strana1} ze zpronevěry dotací. Můžete kauzu přiživit v celostátních médiích.",
    variantA: {
      textTemplate: "Zorganizovat tiskovou konferenci a požadovat okamžité vyšetřování",
      efekt: {
        partnerPreference: { "{strana1}": -0.8 },
        vztahy: { "{strana1}": -8 }
      }
    },
    variantB: {
      textTemplate: "Nechat to být a počkat na oficiální vyjádření policie",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": 3 }
      }
    }
  },
  {
    id: "GEN_017",
    typ: "Pomluva",
    textTemplate: "Během živé debaty vás zástupce {strana1} nepřímo obviní z šíření prokazatelných dezinformací a lže o cílech vašeho programu.",
    variantA: {
      textTemplate: "Ostrým tónem ho nařknout ze lži, kňučení a neschopnosti",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -10 }
      }
    },
    variantB: {
      textTemplate: "Zcela klidně ho konfrontovat s věcným a faktickým přehledem výroků",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -2 }
      }
    }
  },
  {
    id: "GEN_018",
    typ: "Pomluva",
    textTemplate: "Do rukou se vám dostala tajná kompromitující složka na lídra {strana2} ({lidr2}), která obsahuje detailní nahrávky o jeho minulé podnikatelské činnosti.",
    variantA: {
      textTemplate: "Anonymně ji předat investigativním novinářům",
      efekt: {
        partnerPreference: { "{strana2}": -1.0 },
        vztahy: { "{strana2}": -5 }
      }
    },
    variantB: {
      textTemplate: "Složku okamžitě zničit a odmítnout se podílet na špinavé hře",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana2}": 10 }
      }
    }
  },
  {
    id: "GEN_019",
    typ: "Pomluva",
    textTemplate: "Lídr {strana1} o vás v rozhlasovém rozhovoru popudlivě prohlásil, že jste pouze poslušnou loutkou v rukou regionálních oligarchů.",
    variantA: {
      textTemplate: "Podat na něj okamžitou žalobu pro pomluvu a požadovat omluvu",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": -15 }
      }
    },
    variantB: {
      textTemplate: "Odmítnout to vtipným a virálním videem na sociálních sítích",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -5 }
      }
    }
  },
  {
    id: "KRIZ_001",
    typ: "Krizová situace",
    textTemplate: "V zemi nečekaně propukla masivní stávka dopravních odborů, kterou skrytě podporuje {strana1} s cílem oslabit opozici. Jak se zachováte?",
    variantA: {
      textTemplate: "Tvrdě stávku odsoudit a požadovat zajištění chodu státu",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -10 }
      }
    },
    variantB: {
      textTemplate: "Nabídnout se jako neutrální prostředník v jednání mezi odbory a vedením",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": 5 }
      }
    }
  },
  {
    id: "KRIZ_002",
    typ: "Krizová situace",
    textTemplate: "Zahraniční tajné služby varují před masivním kybernetickým útokem na servery sčítání hlasů. Opozice v čele se {strana2} ({lidr2}) již mluví o hrozbě manipulace voleb.",
    variantA: {
      textTemplate: "Podpořit jejich obavy, požadovat prověření systémů a odklad voleb",
      efekt: {
        partnerPreference: { "{strana2}": 0.4 },
        vztahy: { "{strana2}": 2 }
      }
    },
    variantB: {
      textTemplate: "Pokračovat striktně dle plánu a výrazně posílit kybernetickou bezpečnost",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana2}": -5 }
      }
    }
  },
  {
    id: "KRIZ_003",
    typ: "Krizová situace",
    textTemplate: "Byl odhalen rozsáhlý korupční skandál financování strany {strana1}, do kterého je bohužel okrajově zapleten i jeden z vašich regionálních manažerů.",
    variantA: {
      textTemplate: "Okamžitě dotyčného manažera vyloučit ze strany a rázně se distancovat",
      efekt: {
        preference: -0.3,
        vztahy: { "{strana1}": 2 }
      }
    },
    variantB: {
      textTemplate: "Manažera se zastat do rozhodnutí soudu a označit věc za účelovou kampaň strany {strana2}",
      efekt: {
        preference: -0.4,
        vztahy: { "{strana2}": -10, "{strana1}": 5 }
      }
    }
  },
  {
    id: "KRIZ_004",
    typ: "Krizová situace",
    textTemplate: "V klíčovém průmyslovém podniku v regionu hrozí hromadné propouštění stovek lidí. Lídr {strana1} navrhuje nouzovou státní sanaci z peněz daňových poplatníků.",
    variantA: {
      textTemplate: "Podpořit sanaci v zájmu klidnější sociální situace v regionu",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": 8 }
      }
    },
    variantB: {
      textTemplate: "Zásadně odmítnout státní zásah a navrhnout aktivní rekvalifikační programy",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -5 }
      }
    }
  },
  {
    id: "KRIZ_005",
    typ: "Krizová situace",
    textTemplate: "U stánku na hranicích došlo k závažnému bezpečnostnímu incidentu. {strana1} požaduje okamžité svolání mimořádného výboru a neprodlené zpřísnění kontrol.",
    variantA: {
      textTemplate: "Plně podpořit tvrdou reakci a okamžité zavedení vnitřních kontrol",
      efekt: {
        preference: 0.3,
        vztahy: { "{strana1}": 6 }
      }
    },
    variantB: {
      textTemplate: "Vyzvat k zachování klidu, deeskalaci a evropskému diplomatickému řešení",
      efekt: {
        preference: 0.4,
        vztahy: { "{strana1}": -8 }
      }
    }
  }
];
