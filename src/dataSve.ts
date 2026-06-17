export interface SveOption {
  text: string;
  ekonomika: number;
  kultura: number;
  evropa: number;
  styl: number;
}

export interface SveQuestion {
  id: string;
  tema: string;
  otazka: string;
  kontext: string;
  moznosti: {
    A: SveOption;
    B: SveOption;
    C: SveOption;
  };
}

export const SVE_QUESTIONS: SveQuestion[] = [
  {
    "id": "SVE_001",
    "tema": "Kultura",
    "otazka": "Manželství pro všechny: Jaký postoj má strana k uzákonění manželství pro stejnopohlavní páry?",
    "kontext": "Manželství pro všechny",
    "moznosti": {
      "A": { "text": "Zachovat manželství výhradně jako svazek muže a ženy.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Zavést registrované partnerství s většinou práv, ale bez názvu manželství.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Plně podpořit manželství pro všechny a zrovnoprávnit všechny svazky.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_002",
    "tema": "Kultura",
    "otazka": "Adopce dětí stejnopohlavními páry: Měly by mít tyto páry možnost osvojit si děti?",
    "kontext": "Adopce dětí",
    "moznosti": {
      "A": { "text": "Ne, prioritou je zachování tradičního modelu rodiny (otec a matka).", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Umožnit adopci pouze pro biologické dítě jednoho z partnerů (přiosvojení).", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, umožnit plnohodnotné společné adopce i adopce z ústavní péče.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_003",
    "tema": "Kultura",
    "otazka": "Školní osnovy: Jak by se stát měl postavit k začleňování moderních témat (sexuální výchova, dezinformace, klima)?",
    "kontext": "Školní osnovy",
    "moznosti": {
      "A": { "text": "Soustředit se na klasické znalosti, národní historii a tradiční hodnoty.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Nechat rozhodnutí o těchto tématech na konkrétních školách a rodičích.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Integrovat moderní trends, inkluzi a globální témata povinně do osnov.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_004",
    "tema": "Kultura",
    "otazka": "Náboženské symboly ve veřejném prostoru: Měl by stát regulovat např. šátky ve školách či kříže na úřadech?",
    "kontext": "Náboženské symboly",
    "moznosti": {
      "A": { "text": "Zachovat nebo podporovat tradiční křesťanské a národní symboly.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Neregulovat stávající stav, pokud symboly nenarušují veřejný pořádek.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Důsledně prosazovat sekularismus a neutralitu veřejných institucí.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_005",
    "tema": "Kultura",
    "otazka": "Migrace: Jaký postoj by měla země zaujmout k přijímání uprchlíků a legální migraci?",
    "kontext": "Migrace",
    "moznosti": {
      "A": { "text": "Přísná ochrana hranic, nulové kvóty a minimalizace přílivu migrantů.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Přijímat pouze ekonomické migranty na základě aktuálních potřeb trhu práce.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Otevřená humanitární politika, solidární přijímání a podpora integrace.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_006",
    "tema": "Kultura",
    "otazka": "Integrace menšin: Jakým způsobem by měl stát přistupovat k etnickým či národnostním menšinám?",
    "kontext": "Integrace menšin",
    "moznosti": {
      "A": { "text": "Vyžadovat plné přizpůsobení se většinové kultuře a národním zvyklostem.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Podporovat integraci v základních oblastech (jazyk, práce) bez asimilace.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Aktivně podporovat svébytnost, multikulturalismus a inkluzivní programy.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_007",
    "tema": "Kultura",
    "otazka": "Transgender legislativa: Jak by měla vypadat pravidla pro úřední změnu pohlaví?",
    "kontext": "Transgender legislativa",
    "moznosti": {
      "A": { "text": "Zachovat přísná pravidla včetně podmínky chirurgického zákroku / sterilizace.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Umožnit změnu na základě posouzení komise odborných lékařů a psychologů.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Umožnit snadnou úřední změnu pohlaví na základě osobního prohlášení.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_008",
    "tema": "Kultura",
    "otazka": "Cenzura a svoboda projevu: Kde leží hranice při regulaci dezinformací a nenávistných projevů?",
    "kontext": "Cenzura a svoboda projevu",
    "moznosti": {
      "A": { "text": "Svoboda slova musí být absolutní, jakákoliv regulace hrozí cenzurou.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Postihovat pouze přímé výzvy k násilí a prokazatelné nezákonné projevy.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Aktivně regulovat a blokovat dezinformace, fake news a nenávistné projevy.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_009",
    "tema": "Evropa",
    "otazka": "Přijetí eura: Měla by Česká republika vstoupit do eurozóny?",
    "kontext": "Přijetí eura",
    "moznosti": {
      "A": { "text": "Ne, zachovat českou korunu a nezávislou měnovou politiku napořád.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Vyčkat na stabilizaci eurozóny a splnění podmínek bez pevného termínu.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, co nejdříve stanovit pevný termín a směřovat k přijetí eura.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_010",
    "tema": "Evropa",
    "otazka": "Veto EU: Jak nahlížíte na právo veta jednotlivých členských států v Radě EU?",
    "kontext": "Právo veta v EU",
    "moznosti": {
      "A": { "text": "Právo veta must be striktně zachováno pro ochranu národní suverenity.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Zachovat veto v klíčových oblastech (obrana, daně), jinde umožnit většinu.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Zrušit právo veta a přejít na rozhodování kvalifikovanou většinou.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_011",
    "tema": "Evropa",
    "otazka": "Green Deal: Jaký postoj má země zaujmout ke klimatickým cílům Evropské zelené dohody?",
    "kontext": "Klimatické cíle",
    "moznosti": {
      "A": { "text": "Odmítnout nebo radikálně zmírnit Green Deal, poškozuje náš průmysl.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Podporovat klimatické cíle, ale vyjednat pro ČR specifické úlevy a delší čas.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Plně podporovat a urychlit implementaci zelených cílů jako příležitost.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_012",
    "tema": "Evropa",
    "otazka": "Společná obrana EU: Měla by Evropská unie budovat vlastní armádu i společné síly?",
    "kontext": "Společná obrana EU",
    "moznosti": {
      "A": { "text": "Ne, obrana má zůstat výhradně v rukou národních států a v rámci NATO.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Posílit spolupráci národních armád v logistice, ale bez společného velení.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, vybudovat společnou evropskou armádu nezávislou na strukturách USA.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_013",
    "tema": "Evropa",
    "otazka": "Rozšiřování EU: Podporujete vstup zemí jako Ukrajina, Západní Balkán či Gruzie do EU?",
    "kontext": "Rozšiřování EU",
    "moznosti": {
      "A": { "text": "Ne, unie by se neměla rozšiřovat, přineslo by to jen ekonomické potíže.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Podporovat vstup až po hluboké vnitřní reformě samotných kandidátských zemí.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, integrace nových demokratických států posílí stabilitu Evropy.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_014",
    "tema": "Evropa",
    "otazka": "Evropské dotace: Měl by Brusel podmiňovat vyplácení dotací dodržováním právního státu?",
    "kontext": "Evropské dotace",
    "moznosti": {
      "A": { "text": "Ne, dotace jsou nárokové a unie je nesmí zneužívat k politickému tlaku.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Podmiňovat dotace pouze finanční kontrolou a transparentností čerpání.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, zastavit finance každé zemi, která porušuje evropské hodnoty.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_015",
    "tema": "Evropa",
    "otazka": "Emisní povolenky: Jak se stavíte k systému unijních povolenek EU ETS?",
    "kontext": "Emisní povolenky",
    "moznosti": {
      "A": { "text": "Systém povolenek uměle zdražuje život a energie, měl by se zrušit.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Zachovat stávající systém, ale nerozšiřovat ho na domácnosti a dopravu.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Systém je správný, motivuje k ekologické transformaci a je nutné ho rozšířit.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_016",
    "tema": "Evropa",
    "otazka": "Vztah k Bruselu: Jak by měla být celková rétorika země vůči orgánům EU?",
    "kontext": "Vztah k Bruselu",
    "moznosti": {
      "A": { "text": "Ostrá kritika unijního diktátu a obhajoba národních zájmů proti Bruselu.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Konstruktivní, ale pragmatická kritika konkrétních nefunkčních nařízení.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Plná loajalita k unijnímu projektu a snaha o posun do jádra integrace.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_017",
    "tema": "Styl politiky",
    "otazka": "Referenda: Mělo by být zavedeno celostátní obecné referendum?",
    "kontext": "Referenda",
    "moznosti": {
      "A": { "text": "Ne, v ČR má fungovat výhradně standardní zastupitelská demokracie.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Zavést referendum, ale s vysokým prahem podpisů a zákazem hlasovat o daních či EU.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, zavést snadno dostupné lidové hlasování o jakýchkoliv otázkách.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_018",
    "tema": "Styl politiky",
    "otazka": "Přímá volba dalších funkcí: Měli by občané přímo volit starosty, soudce či šéfy policie?",
    "kontext": "Přímé volby",
    "moznosti": {
      "A": { "text": "Ne, nominace mají zůstat v gesci parlamentu či zastupitelstev kvůli brzdám moci.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Umožnit přímou volbu pouze u starostů menších obcí, jinde zachovat systém.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, lidé by měli přímo volit mocné, aby se obešly stranické sekretariáty.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_019",
    "tema": "Styl politiky",
    "otazka": "Transparentnost státní správy: Jak moc by měl stát rozkrývat své vnitřní procesy?",
    "kontext": "Transparentnost státní správy",
    "moznosti": {
      "A": { "text": "Zachovat stávající úroveň ochrany interních informací a rozhodovacích procesů.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Zveřejňovat transparentnost postupně, ale s ohledem na akceschopnost úřadů.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Absolutní transparentnost, online přenosy z jednání a otevřená data pro všechny.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_020",
    "tema": "Styl politiky",
    "otazka": "Zveřejňování smluv: Měly by v Registru smluv být zveřejňovány smlouvy strategických státních firem?",
    "kontext": "Zveřejňování smluv",
    "moznosti": {
      "A": { "text": "Ne, státní firmy musí mít výjimky, aby neztratily konkurenceschopnost na trhu.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Zveřejňovat smlouvy nad určitý finanční limit s možností začernit obchodní tajemství.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, bez výjimek. Hospodaří s penězi občanů, utajování je nepřípustné.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_021",
    "tema": "Styl politiky",
    "otazka": "Pravomoci prezidenta: Měly by se posílit pravomoci hlavy státu na úkor vlády či parlamentu?",
    "kontext": "Pravomoci prezidenta",
    "moznosti": {
      "A": { "text": "Ne, ČR je parlamentní republika a role prezidenta má zůstat spíše reprezentativní.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Ponechat stávající ústavní pravomoci, ale přesněji definovat některé lhůty.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, silný přímo volený lídr by měl mít možnost vetovat kroky vlády i parlamentu.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_022",
    "tema": "Styl politiky",
    "otazka": "Nezávislost médií: Jak nahlížíte na roli a financování veřejnoprávních médií (ČT, ČRo)?",
    "kontext": "Nezávislost médií",
    "moznosti": {
      "A": { "text": "Veřejnoprávní média informují neobjektivně, poplatky zrušit a média zestátnit.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 },
      "B": { "text": "Zachovat stávající model financování, ale zpřísnit kontrolu hospodaření radami.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Média veřejné služby jsou pilířem demokracie, zvýšit poplatky a chránit je.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 }
    }
  },
  {
    "id": "SVE_023",
    "tema": "Styl politiky",
    "otazka": "Financování stran: Měl by stát zpřísnit pravidla pro dary od velkých podnikatelů?",
    "kontext": "Financování stran",
    "moznosti": {
      "A": { "text": "Stávající regulace jsou dostatečné, dary jsou projevem legitimní podpory.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Zpřísnit kontrolu transparentních účtů, ale limity na dary nezpřísňovat.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Úplně zakázat dary od korporací a oligarchů, strany financovat jen ze státního.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_024",
    "tema": "Styl politiky",
    "otazka": "Boj proti korupci: Jakým způsobem by se mělo bojovat proti korupci na nejvyšších místech?",
    "kontext": "Boj proti korupci",
    "moznosti": {
      "A": { "text": "Využívat standardní legislativu a důvěřovat stávajícím orgánům policie a justice.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Zavést specializované protikorupční soudy a posílit ochranu oznamovatelů.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Provést radikální očistu státní správy od starých struktur a zavedených elit.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  },
  {
    "id": "SVE_025",
    "tema": "Ekonomika",
    "otazka": "Daně: Jak by měla být nastavena úroveň zdanění příjmů fyzických osob a korporací?",
    "kontext": "Úroveň zdanění",
    "moznosti": {
      "A": { "text": "Podporovat progresivní zdanění a vyšší daně pro bohaté k financování státu.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Zachovat stabilní střední zdanění (např. dvě daňová pásma) a stabilní rozpočet.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Prosazujeme nízké a rovné daně pro minimalizaci daňové zátěže a svobodu trhu.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_026",
    "tema": "Ekonomika",
    "otazka": "Důchody: Jak by měl být nastaven důchodový systém v České republice?",
    "kontext": "Důchodový systém",
    "moznosti": {
      "A": { "text": "Stát musí garantovat důstojné důchody pro všechny a nést hlavní odpovědnost.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Kombinace státního průběžného pilíře a dobrovolného spoření podporovaného státem.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Důchodový systém postavit primárně na individuální odpovědnosti a soukromém spoření.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_027",
    "tema": "Ekonomika",
    "otazka": "Minimální mzda: Měl by stát zákonem určovat a pravidelně zvyšovat minimální mzdu?",
    "kontext": "Minimální mzda",
    "moznosti": {
      "A": { "text": "Ano, minimální mzda musí být vysoká, aby chránila zaměstnance před chudobou.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Zvyšovat minimální mzdu automaticky podle růstu průměrné mzdy v ekonomice.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ne, výši mezd má určovat výhradně trh a dohoda mezi pracovníkem a firmou.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_028",
    "tema": "Ekonomika",
    "otazka": "Privatizace: Jaký postoj má vláda zaujmout k privatizaci zbývajících státních podniků (pošta, dráhy)?",
    "kontext": "Privatizace",
    "moznosti": {
      "A": { "text": "Klíčové podniky a infrastruktura musí zůstat ve vlastnictví silného státu.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Ponechat státu strategickou infrastrukturu (koleje), ale služby privatizovat.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Stát by neměl podnikat, všechny tyto firmy kompletně prodat do soukromých rukou.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_029",
    "tema": "Ekonomika",
    "otazka": "Deregulace: Podporujete uvolnění byrokratických povinností pro podnikatelské prostředí?",
    "kontext": "Deregulace",
    "moznosti": {
      "A": { "text": "Regulace a přísné kontroly jsou nezbytné pro ochranu zaměstnanců a ekologie.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Zjednodušit administrativu pro drobné živnostníky, velké firmy kontrolovat.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Radikálně omezit byrokracii, kontroly a regulace, které zbytečně brzdí trh.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_030",
    "tema": "Ekonomika",
    "otazka": "Podpora podnikatelů: Měl by stát poskytovat specifické dotace a investiční stimuly?",
    "kontext": "Podpora podnikatelů",
    "moznosti": {
      "A": { "text": "Ano, stát musí aktivně řídit ekonomiku a lákat investory na pobídky a úlevy.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Podporovat pouze začínající inovativní startupy a strategický výzkum.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Stát nemá dotacemi křivit trh. Nejlepší podporou jsou férové a rovné podmínky.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_031",
    "tema": "Ekonomika",
    "otazka": "Sociální dávky: Jak by měl být nastaven systém sociální podpory od státu?",
    "kontext": "Sociální dávky",
    "moznosti": {
      "A": { "text": "Sociální síť musí být robustní a štědrá, aby nikdo nepropadl do chudoby.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Poskytovat cílenou pomoc těm, kteří se prokazatelně nemohou uživit sami.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Dávky minimalizovat a přísně podmiňovat, aby lidé spoléhali na trh a práci.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_032",
    "tema": "Ekonomika",
    "otazka": "Státní investice: Měl by stát masivně investovat do infrastruktury i za cenu dluhu?",
    "kontext": "Státní investice",
    "moznosti": {
      "A": { "text": "Ano, stát musí být hlavním investorem a motorem růstu, a to i na dluh.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Investovat do strategických projektů s využitím fondů EU bez nadměrného zadlužování.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ne, stát má hospodařit vyrovnaně. Do staveb maximálně zapojit soukromý kapitál.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_033",
    "tema": "Kultura",
    "otazka": "Veřejné symboly: Mají být ve státních institucích povinné pouze neutrální symboly?",
    "kontext": "Veřejné symboly",
    "moznosti": {
      "A": { "text": "Ne, tradiční symboly mají zůstat.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Zachovat současný stav.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, instituce mají být úplně neutrální.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_034",
    "tema": "Kultura",
    "otazka": "Výuka náboženství: Měla by být součástí veřejného školství?",
    "kontext": "Výuka náboženství",
    "moznosti": {
      "A": { "text": "Ano, jako součást kulturní výchovy.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Jen volitelně nebo mimo hlavní výuku.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ne, škola má být striktně sekulární.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_035",
    "tema": "Kultura",
    "otazka": "Homosexuální páry a rodičovství: Jak by k nim měl stát přistupovat?",
    "kontext": "Rodičovská práva",
    "moznosti": {
      "A": { "text": "Neměly by mít stejná rodičovská práva.", "ekonomika": 0, "kultura": -5, "evropa": 0, "styl": 0 },
      "B": { "text": "Uznat část práv, ale zachovat omezení.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Měly by mít plně stejná práva.", "ekonomika": 0, "kultura": 5, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_036",
    "tema": "Ekonomika",
    "otazka": "Odbory: Jak silné mají být odbory v ekonomice?",
    "kontext": "Síla odborů",
    "moznosti": {
      "A": { "text": "Velmi silné a chráněné státem.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Mít vyváženou roli v jednáních.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Mít co nejmenší vliv na trh práce.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_037",
    "tema": "Ekonomika",
    "otazka": "Veřejné zdravotnictví: Jak by mělo být financováno?",
    "kontext": "Financování zdravotnictví",
    "moznosti": {
      "A": { "text": "Hlavně z veřejných zdrojů a solidarity.", "ekonomika": -5, "kultura": 0, "evropa": 0, "styl": 0 },
      "B": { "text": "Kombinací veřejného a soukromého financování.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Více prostřednictvím soukromého pojištění a plateb.", "ekonomika": 5, "kultura": 0, "evropa": 0, "styl": 0 }
    }
  },
  {
    "id": "SVE_038",
    "tema": "Evropa",
    "otazka": "Společná měna: Měla by EU směřovat k hlubší fiskální unii?",
    "kontext": "Fiskální integrace",
    "moznosti": {
      "A": { "text": "Ne, státy si mají zachovat plnou suverenitu.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Jen omezená koordinace.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, EU má mít silnější společný rozpočet.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_039",
    "tema": "Evropa",
    "otazka": "Zahraniční politika EU: Má EU mluvit jedním hlasem navenek?",
    "kontext": "Společná zahraniční politika",
    "moznosti": {
      "A": { "text": "Ne, každý stát má mít vlastní politiku.", "ekonomika": 0, "kultura": 0, "evropa": -5, "styl": 0 },
      "B": { "text": "Jen v některých oblastech.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Ano, EU má vystupovat jednotně.", "ekonomika": 0, "kultura": 0, "evropa": 5, "styl": 0 }
    }
  },
  {
    "id": "SVE_040",
    "tema": "Styl politiky",
    "otazka": "Kompromis: Je lepší dosahovat změn postupně, nebo radikálně?",
    "kontext": "Styl změn",
    "moznosti": {
      "A": { "text": "Postupně, přes vyjednávání a kompromis.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": -5 },
      "B": { "text": "Podle situace kombinovat obě cesty.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 0 },
      "C": { "text": "Radikálně, bez zbytečných kompromisů.", "ekonomika": 0, "kultura": 0, "evropa": 0, "styl": 5 }
    }
  }
];
