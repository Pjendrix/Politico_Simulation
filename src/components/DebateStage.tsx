import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Tv, 
  Users, 
  TrendingUp, 
  ArrowRight, 
  Award, 
  Sparkles, 
  Info,
  Radio,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { DEBATE_QUESTIONS, DebateQuestion, DebateOption } from "../dataDebates";
import { STRANY, PORADCI } from "../data";
import { GameState } from "../types";
import { normalizePreferencesTo100 } from "../gameUtils";
import { useRng } from "../rngContext";

interface DebateStageProps {
  state: GameState;
  onCompleteDebate: (
    updatedPreference: number,
    updatedNpcPrefs: Record<string, number>,
    updatedAttributes: {
      ekonomika: number;
      kultura: number;
      evropa: number;
      stylPolitiky: number;
    },
    summaryChanges: string[]
  ) => void;
}

// Tick-headlines for the Czech Satirical News Ticker at the bottom of the TV stage
const SATIRICAL_HEADLINES = [
  "🔥 Miroslav Kalousek ostře zkritizoval osvětlení dnešního studia na svém X účtu.",
  "🍩 Andrej Babiš prý vylovil z kapsy saka zapomenutou koblihu ze srpna 2021 a snědl ji.",
  "🎒 Vít Rakušan rozkládá debatní stan bez cenzury v suterénu studia.",
  "💻 Ivan Bartoš zahájil digitalizaci rychlovarné konvice v maskérně, horká voda stále nenačtena.",
  "🌶️ Tomio Okamura varuje před nadměrným užíváním kari a jiného nepůvodního koření.",
  "🍺 Průzkum: Čechům chybí pivo v poslanecké sněmovně, návrh na výčepní kohouty u řečniště získává podporu.",
  "🚌 ODS si pronajala dvoupatrový autobus pro zbylé členy, kteří se nevešli do koaliční limuzíny.",
  "🕊️ Jindřich Rajchl svolává mimořádnou tiskovou konferenci hned po reklamní přestávce.",
  "📊 Voličské jádro SOCDEM hlásí nárůst o jednoho člověka, předseda mluví o historickém obratu.",
  "🪙 Komunisti navrhují návrat ke spartakiádě jako ekologickému způsobu dopravy."
];

function DebateStage({ state, onCompleteDebate }: DebateStageProps) {
  const rng = useRng();
  const isRound10 = state.turn === 10;
  
  // Select 5 random questions exactly and keep them stable
  const [questions] = useState<DebateQuestion[]>(() => {
    const shuffled = [...DEBATE_QUESTIONS].sort(() => rng() - 0.5);
    return shuffled.slice(0, 5);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Snapshots before starting the debate
  const [initialPreference] = useState(state.preference);
  const [initialNpcPrefs] = useState({ ...state.npcPreferred });
  const [initialAttributes] = useState({ ...state.atributy });

  // Running states throughout questions
  const [currentPreference, setCurrentPreference] = useState(state.preference);
  const [currentNpcPreferred, setCurrentNpcPreferred] = useState(() => ({ ...state.npcPreferred }));
  const [currentAttributes, setCurrentAttributes] = useState(() => ({ ...state.atributy }));
  
  // Custom records of performance rolls generated at the end
  const [debatePerformanceDeltas, setDebatePerformanceDeltas] = useState<Record<string, number>>({});

  // Logging of attribute modifications per question
  const [historyOfSteps, setHistoryOfSteps] = useState<Array<{
    qTitle: string;
    chosenLetter: "A" | "B" | "C" | "D";
    optionText: string;
    attrChanges: string[];
  }>>([]);

  const [activeHeadline, setActiveHeadline] = useState(0);
  const [revealedOptions, setRevealedOptions] = useState<Record<string, boolean>>({});

  // Roll 100% reveal of options if the advisor has debate impact clamp (e.g. Jaromír Soukup)
  useEffect(() => {
    if (PORADCI[state.poradceId]?.effects?.debateImpactClamp) {
      setRevealedOptions({ A: true, B: true, C: true, D: true });
    } else {
      setRevealedOptions({});
    }
  }, [currentIndex, state.poradceId]);

  // Rotating satirical news ticker interval
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeadline((prev) => (prev + 1) % SATIRICAL_HEADLINES.length);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentOptionSet = currentQuestion ? currentQuestion.moznosti : null;

  const handleSelectOption = (letter: "A" | "B" | "C" | "D") => {
    if (isAnswered || !currentOptionSet) return;
    setSelectedLetter(letter);
  };

  const handleConfirmAnswer = () => {
    if (isAnswered || !selectedLetter || !currentOptionSet) return;

    const opt: DebateOption = currentOptionSet[selectedLetter] as DebateOption;

    // 1. Calculate and update Player Attributes
    const nextAttributes = {
      ekonomika: Math.max(0, Math.min(100, currentAttributes.ekonomika + opt.ekonomika)),
      kultura: Math.max(0, Math.min(100, currentAttributes.kultura + opt.kultura)),
      evropa: Math.max(0, Math.min(100, currentAttributes.evropa + opt.evropa)),
      stylPolitiky: Math.max(0, Math.min(100, currentAttributes.stylPolitiky + opt.styl))
    };

    // Keep track of attribute drift texts
    const changesTexts: string[] = [];
    if (opt.ekonomika !== 0) changesTexts.push(`Ekonomika: ${opt.ekonomika > 0 ? "+" : ""}${opt.ekonomika.toFixed(1)}`);
    if (opt.kultura !== 0) changesTexts.push(`Kultura: ${opt.kultura > 0 ? "+" : ""}${opt.kultura.toFixed(1)}`);
    if (opt.evropa !== 0) changesTexts.push(`Evropa: ${opt.evropa > 0 ? "+" : ""}${opt.evropa.toFixed(1)}`);
    if (opt.styl !== 0) changesTexts.push(`Styl politiky: ${opt.styl > 0 ? "+" : ""}${opt.styl.toFixed(1)}`);

    setHistoryOfSteps((prev) => [
      ...prev,
      {
        qTitle: `${currentQuestion.tema}: ${currentQuestion.otazka}`,
        chosenLetter: selectedLetter,
        optionText: opt.text,
        attrChanges: changesTexts
      }
    ]);

    // Apply live updates for player attributes
    setCurrentAttributes(nextAttributes);

    // 2. If it is the 5th (final) question, we roll the overall debate performance for ALL parties!
    if (currentIndex === 4) {
      const deltas: Record<string, number> = {};
      const parties = Object.keys(STRANY);
      const playerClamp = PORADCI[state.poradceId]?.effects?.debateImpactClamp;
      
      // Perfect Box-Muller Gaussian normal distribution centered at 0 with standard deviation ~1.5%
      const gaussianRandom = () => {
        let u = 0, v = 0;
        while(u === 0) u = rng(); 
        while(v === 0) v = rng();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return num * 1.5;
      };

      let sumDeltas = 0;
      parties.forEach((id) => {
        const beforeVal = id === state.stranaId ? currentPreference : (currentNpcPreferred[id] ?? 0.1);
        let minLimit = Math.max(-5.0, 0.1 - beforeVal);
        let maxLimit = 5.0;
        if (id === state.stranaId && playerClamp) {
          minLimit = Math.max(minLimit, playerClamp.min);
          maxLimit = Math.min(maxLimit, playerClamp.max);
        }
        
        const rawRoll = gaussianRandom();
        const clampedRoll = Math.max(minLimit, Math.min(maxLimit, rawRoll));
        const rounded = Math.round(clampedRoll * 10) / 10;
        deltas[id] = rounded;
        sumDeltas += rounded;
      });

      // Resolve any remaining sum discrepancy so the sum of deltas is exactly 0.0
      sumDeltas = Math.round(sumDeltas * 10) / 10;
      let iterations = 0;
      while (Math.abs(sumDeltas) > 0.01 && iterations < 1000) {
        const step = sumDeltas > 0 ? -0.1 : 0.1;
        const id = parties[iterations % parties.length];
        const beforeVal = id === state.stranaId ? currentPreference : (currentNpcPreferred[id] ?? 0.1);
        let minLimit = Math.max(-5.0, 0.1 - beforeVal);
        let maxLimit = 5.0;
        if (id === state.stranaId && playerClamp) {
          minLimit = Math.max(minLimit, playerClamp.min);
          maxLimit = Math.min(maxLimit, playerClamp.max);
        }

        const currentVal = deltas[id];
        const newVal = Math.round((currentVal + step) * 10) / 10;
        if (newVal >= minLimit && newVal <= maxLimit) {
          deltas[id] = newVal;
          sumDeltas = Math.round((sumDeltas + step) * 10) / 10;
        }
        iterations++;
      }

      // Apply these deltas
      const nextPlayerPref = Math.round((currentPreference + deltas[state.stranaId]) * 10) / 10;
      const nextNpcPreferred: Record<string, number> = {};
      parties.forEach((id) => {
        if (id !== state.stranaId) {
          const beforeVal = currentNpcPreferred[id] ?? 0.1;
          nextNpcPreferred[id] = Math.round((beforeVal + deltas[id]) * 10) / 10;
        }
      });

      // Ensure total sum matches 100.0% exactly down to floating-point rounding
      let totalSum = nextPlayerPref + Object.values(nextNpcPreferred).reduce((a, b) => a + b, 0);
      totalSum = Math.round(totalSum * 10) / 10;
      if (Math.abs(totalSum - 100.0) > 0.01) {
        const diff = Math.round((100.0 - totalSum) * 10) / 10;
        const targetParty = parties[0] === state.stranaId ? parties[1] : parties[0];
        nextNpcPreferred[targetParty] = Math.round((nextNpcPreferred[targetParty] + diff) * 10) / 10;
        deltas[targetParty] = Math.round((deltas[targetParty] + diff) * 10) / 10;
      }

      setDebatePerformanceDeltas(deltas);
      setCurrentPreference(nextPlayerPref);
      setCurrentNpcPreferred(nextNpcPreferred);
    }

    setIsAnswered(true);
  };

  const handleNextStep = () => {
    setSelectedLetter(null);
    setIsAnswered(false);

    if (currentIndex < 4) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleFinishDebateStage = () => {
    // Generate summarized changes array for parent logger history
    const playerDelta = currentPreference - initialPreference;
    const summaryChanges = [
      `Televizní debata odbavena s čistým dopadem na vaše preference: ${playerDelta >= 0 ? "+" : ""}${playerDelta.toFixed(1)} %`,
      `Ideové posuny vaší strany:`,
      `• Ekonomika: ${currentAttributes.ekonomika - initialAttributes.ekonomika >= 0 ? "+" : ""}${(currentAttributes.ekonomika - initialAttributes.ekonomika).toFixed(1)}`,
      `• Kultura: ${currentAttributes.kultura - initialAttributes.kultura >= 0 ? "+" : ""}${(currentAttributes.kultura - initialAttributes.kultura).toFixed(1)}`,
      `• Evropa: ${currentAttributes.evropa - initialAttributes.evropa >= 0 ? "+" : ""}${(currentAttributes.evropa - initialAttributes.evropa).toFixed(1)}`,
      `• Styl politiky: ${currentAttributes.stylPolitiky - initialAttributes.stylPolitiky >= 0 ? "+" : ""}${(currentAttributes.stylPolitiky - initialAttributes.stylPolitiky).toFixed(1)}`
    ];

    onCompleteDebate(currentPreference, currentNpcPreferred, currentAttributes, summaryChanges);
  };

  // Helper calculating net shifts for indicator badges
  const getShiftBadge = (val: number) => {
    if (val === 0) return <span className="text-zinc-500 text-xs font-semibold">Beze změn</span>;
    const isPos = val > 0;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${isPos ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
        {isPos ? "+" : ""}{val.toFixed(1)} %
      </span>
    );
  };

  return (
    <div 
      id="debate-stage-root"
      className={
        isRound10 
          ? "p-0 rounded-none border-2 border-[#1E3B70] shadow-2xl relative flex flex-col justify-between transition-all duration-350 min-h-[580px] select-none text-white overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d3f8a] via-[#0b1736] to-[#040817]" 
          : "p-1.5 rounded-[32px] border-[5px] border-[#B30F1A] bg-[#0A1128] text-zinc-100 relative flex flex-col justify-between transition-all duration-350 min-h-[580px] select-none shadow-none"
      }
    >
      {/* Decorative Brand Top Bar */}
      <div 
        className={
          isRound10 
            ? "px-5 py-3.5 flex flex-col sm:flex-row gap-3 justify-between items-center z-10 shrink-0 bg-[#E30613] text-white rounded-none border-b border-black/20" 
            : "px-5 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center z-10 shrink-0 bg-[#0A1128] border-b-2 border-[#B30F1A]"
        }
      >
        {/* CNN Prima News Brand styling vs Česká televize */}
        {isRound10 ? (
          <div className="flex items-center gap-3">
            {/* CSS Crafted CNN Prima News Logo Badge */}
            <div className="flex items-center space-x-[2px] font-sans overflow-hidden rounded-none border border-white/30 shadow-md scale-95 sm:scale-100">
              <span className="bg-[#D6001C] text-white font-extrabold text-[12px] sm:text-[13px] px-2.5 py-1 tracking-wider leading-none shrink-0 flex items-center justify-center font-sans uppercase">
                CNN
              </span>
              <span className="bg-white text-black font-black text-[12px] sm:text-[13px] px-2 py-1 tracking-tight leading-none shrink-0 flex items-center justify-center font-sans">
                Prima NEWS
              </span>
            </div>
            <span className="w-px h-5 bg-white/30 hidden sm:inline" />
            <span className="text-[10px] sm:text-xs uppercase font-sans font-black tracking-widest text-white/95">
              🔴 ŽIVĚ - CELOSTÁTNÍ REPREZENTATIVNÍ SUPERDEBATA
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* CSS Crafted Česká televize Logo Badge */}
            <div className="flex items-center space-x-2.5 font-sans scale-95 sm:scale-100">
              <div className="relative w-6 h-5 flex items-center justify-center font-black shrink-0">
                <span className="absolute left-0 top-0 bottom-0 w-3 border-l-[5px] border-t-[4px] border-b-[4px] border-[#B30F1A] rounded-l-md" />
                <span className="absolute right-0 top-0 bottom-0 w-3 border-r-[5px] border-t-[4px] border-b-[4px] border-white rounded-r-md" />
              </div>
              <span className="font-extrabold tracking-tight text-white text-xs sm:text-sm font-sans uppercase">
                Česká televize
              </span>
            </div>
            <span className="w-px h-5 bg-[#B30F1A]/55 hidden sm:inline" />
            <span className="text-[10px] sm:text-xs uppercase font-sans font-black tracking-widest text-[#B30F1A]">
              📺 FINÁLOVÁ DEBATA ČT ČR
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <span 
            className={
              isRound10 
                ? "text-[10px] font-sans font-black uppercase rounded-none px-3 py-1 bg-white text-slate-950 border border-slate-300" 
                : "text-[10px] font-sans font-black uppercase rounded-[8px] px-3 py-1 bg-[#B30F1A] text-white"
            }
          >
            {showResults ? "VYHODNOCENÍ" : `Otázka ${currentIndex + 1} z 5`}
          </span>
          <span className={isRound10 ? "text-white/80 font-mono text-xs hidden md:inline" : "text-zinc-400 font-mono text-xs hidden md:inline"}>
            Volby Kolo {state.turn}/25
          </span>
        </div>
      </div>

      {/* Subtle Red Shadow bar under the header section in CNN Prima News broadcast frame */}
      {isRound10 && (
        <div className="h-[5px] bg-[#8a000e] shadow-[0_4px_16px_rgba(0,0,0,0.7)] z-20 relative w-full" />
      )}

      <AnimatePresence mode="wait">
        {!showResults ? (
          <motion.div
            key="question-box"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className={`p-5 sm:p-7 space-y-6 flex-1 flex flex-col justify-between ${
              isRound10 
                ? "bg-transparent" 
                : "bg-transparent"
            }`}
          >
            {/* Visual Header Grid indicating progress */}
            <div 
              className={
                isRound10 
                  ? "p-4 rounded-none border border-white/10 flex items-center justify-between gap-4 bg-slate-950/60" 
                  : "p-4 rounded-[16px] border-[3px] border-[#B30F1A] flex items-center justify-between gap-4 bg-[#0A1128]"
              }
            >
              <span className={isRound10 ? "text-[10px] sm:text-xs text-slate-300 font-semibold uppercase tracking-wider font-sans shrink-0" : "text-[10px] sm:text-xs text-zinc-300 font-black uppercase tracking-wider font-sans shrink-0"}>
                PROSTŘIH DO STUDIA:
              </span>
              <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const isActive = idx === currentIndex;
                  const isCompleted = idx < currentIndex;
                  return (
                    <div
                      key={idx}
                      className={`h-2 transition-all duration-300 ${
                        isRound10 ? "rounded-none" : "rounded-full"
                      } ${
                        isActive 
                          ? isRound10 
                            ? "bg-[#E30613] w-10 shadow-[0_0_12px_rgba(227,6,19,0.7)]"
                            : "bg-[#B30F1A] w-10"
                          : isCompleted 
                          ? isRound10 ? "bg-[#1E3B70] w-6" : "bg-[#B30F1A]/40 w-6"
                          : isRound10 ? "bg-white/10 w-4" : "bg-zinc-700 w-4"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Moderator Interface Design */}
            <div 
              className={
                isRound10 
                  ? "p-5 sm:p-6 rounded-none border border-slate-350 bg-gradient-to-b from-[#FFFFFF] to-[#EBECEF] text-slate-900 shadow-md relative overflow-hidden" 
                  : "p-6 sm:p-7 rounded-[24px] border-[3px] border-transparent bg-[#111C38] text-white relative"
              }
            >
              {/* Česká televize thick, blocky brackets with gaps around the moderator card */}
              {!isRound10 && (
                <>
                  <div className="absolute -left-[14px] top-0 bottom-0 w-6 flex flex-col justify-between pointer-events-none">
                    <div className="w-6 h-12 border-t-[5px] border-l-[5px] border-[#B30F1A] rounded-tl-[18px]" />
                    <div className="w-6 h-12 border-b-[5px] border-l-[5px] border-[#B30F1A] rounded-bl-[18px]" />
                  </div>
                  <div className="absolute -right-[14px] top-0 bottom-0 w-6 flex flex-col justify-between pointer-events-none">
                    <div className="w-6 h-12 border-t-[5px] border-r-[5px] border-[#B30F1A] rounded-tr-[18px]" />
                    <div className="w-6 h-12 border-b-[5px] border-r-[5px] border-[#B30F1A] rounded-br-[18px]" />
                  </div>
                </>
              )}

              {/* Highlight badge overlay */}
              <div className="flex items-center justify-between gap-2">
                <span 
                  className={
                    isRound10 
                      ? "inline-flex items-center gap-1.5 uppercase text-[9px] sm:text-[10px] font-sans font-black tracking-widest rounded-none px-3 py-1 text-white bg-[#E30613]" 
                      : "inline-flex items-center gap-1.5 uppercase text-[9px] sm:text-[10px] font-sans font-black tracking-widest rounded-none p-0 text-[#B30F1A]"
                  }
                >
                  {!isRound10 && <span className="w-2.5 h-2.5 rounded-full bg-[#B30F1A] shrink-0" />}
                  MODERÁTORSKÝ DOTAZ
                </span>
                <span className={isRound10 ? "font-sans text-[11px] font-bold text-slate-600" : "font-sans text-[11px] text-zinc-400 uppercase font-black"}>
                  Sektor: <span className={isRound10 ? "text-slate-900 font-extrabold" : "text-[#B30F1A] font-black"}>{currentQuestion.tema}</span>
                </span>
              </div>
              
              <h2 
                className={
                  isRound10 
                    ? "font-sans text-base sm:text-[17px] text-slate-900 font-bold leading-relaxed pt-3 tracking-tight" 
                    : "font-serif text-base sm:text-lg text-white font-black leading-relaxed pt-3"
                }
              >
                "{currentQuestion.otazka}"
              </h2>

              <div className={isRound10 ? "pt-3 border-t border-slate-300 mt-4 flex items-center space-x-2 text-slate-600 text-xs" : "pt-3 border-t border-zinc-700/65 mt-4 flex items-center space-x-2 text-zinc-300 text-xs"}>
                <Info className={isRound10 ? "w-4 h-4 text-[#1E3B70] shrink-0" : "w-4 h-4 text-[#B30F1A] shrink-0"} />
                <span className="italic leading-normal select-text">
                  Strategická analýza štábu: {currentQuestion.kontext}
                </span>
              </div>
            </div>

            {/* Answer Options Selector Layout */}
            <div className="grid grid-cols-1 gap-3 mt-1">
              {currentOptionSet && Object.entries(currentQuestion.moznosti).map(([letter, rawOption]) => {
                const option = rawOption as DebateOption;
                const isSelected = selectedLetter === letter;
                
                // Color strategies
                let optionStyleClasses = "";
                if (isAnswered) {
                  if (isSelected) {
                    optionStyleClasses = isRound10 
                      ? "bg-[#E30613]/10 border-2 border-[#E30613] text-[#E30613] font-bold" 
                      : "bg-[#B30F1A] border-[3px] border-[#B30F1A] text-white";
                  } else {
                    optionStyleClasses = isRound10
                      ? "bg-black/10 border border-slate-350 opacity-20 text-slate-500 cursor-not-allowed"
                      : "bg-[#0A1128]/50 border border-zinc-800 opacity-20 text-zinc-600 cursor-not-allowed";
                  }
                } else {
                  if (isSelected) {
                    optionStyleClasses = isRound10 
                      ? "bg-slate-100 border-[3px] border-[#E30613] text-slate-950 font-black shadow-md scale-[1.01]" 
                      : "bg-[#B30F1A] border-[3px] border-[#B30F1A] text-white font-extrabold";
                  } else {
                    optionStyleClasses = isRound10 
                      ? "bg-[#E8ECF2] hover:bg-[#DCE3EC] border-2 border-slate-400 text-slate-950 font-extrabold shadow-sm" 
                      : "bg-[#111C38] hover:bg-[#1b2b52] border-[3px] border-transparent text-zinc-100";
                  }
                }

                return (
                  <button
                    key={letter}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(letter as "A" | "B" | "C" | "D")}
                    className={
                      isRound10
                        ? `p-4 text-left rounded-none border transition-all duration-150 flex items-start gap-4 cursor-pointer select-none leading-relaxed ${optionStyleClasses}`
                        : `p-4 text-left rounded-[16px] transition-all duration-150 flex items-start gap-4 cursor-pointer select-none leading-relaxed ${optionStyleClasses}`
                    }
                  >
                    <span 
                      className={
                        isRound10 
                          ? `w-7 h-7 flex items-center justify-center rounded-none font-sans text-xs font-black shrink-0 ${
                              isSelected ? "bg-[#E30613] text-white" : "bg-slate-700 text-white"
                            }`
                          : `w-7 h-7 flex items-center justify-center rounded-[8px] font-sans text-xs font-black shrink-0 ${
                              isSelected ? "bg-white text-black" : "bg-[#0A1128] text-white"
                            }`
                      }
                    >
                      {letter}
                    </span>
                    <div className="flex-1 text-xs font-sans font-medium">
                      <div>{option.text}</div>
                      {revealedOptions[letter] && (
                        <div className={`mt-2 text-[10px] font-sans flex flex-wrap items-center gap-1.5 tracking-wider uppercase ${isRound10 ? 'text-amber-900 font-extrabold' : 'text-amber-400 font-extrabold'}`}>
                          <span>✨ Schopnost Soukupa:</span>
                          <span className="flex gap-1.5 flex-wrap">
                            {option.ekonomika !== 0 && (
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${isRound10 ? 'bg-amber-100 border border-amber-200 text-amber-950' : 'bg-white/10 border border-white/10 text-white'}`}>
                                Eko {option.ekonomika > 0 ? "+" : ""}{option.ekonomika.toFixed(0)}
                              </span>
                            )}
                            {option.kultura !== 0 && (
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${isRound10 ? 'bg-amber-100 border border-amber-200 text-amber-950' : 'bg-white/10 border border-white/10 text-white'}`}>
                                Kul {option.kultura > 0 ? "+" : ""}{option.kultura.toFixed(0)}
                              </span>
                            )}
                            {option.evropa !== 0 && (
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${isRound10 ? 'bg-amber-100 border border-amber-200 text-amber-950' : 'bg-white/10 border border-white/10 text-white'}`}>
                                Evr {option.evropa > 0 ? "+" : ""}{option.evropa.toFixed(0)}
                              </span>
                            )}
                            {option.styl !== 0 && (
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${isRound10 ? 'bg-amber-100 border border-amber-200 text-amber-950' : 'bg-white/10 border border-white/10 text-white'}`}>
                                Styl {option.styl > 0 ? "+" : ""}{option.styl.toFixed(0)}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions Row */}
            <div className={isRound10 ? "pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4" : "pt-4 border-t-2 border-[#B30F1A] flex flex-col sm:flex-row justify-between items-center gap-4"}>
              <div className="text-[10px] sm:text-[11px] text-zinc-300 font-sans text-center sm:text-left leading-normal flex items-center gap-2">
                {isAnswered ? (
                  <span className={isRound10 ? "text-[#E30613] font-black flex items-center gap-1.5 justify-center sm:justify-start uppercase" : "text-zinc-200 uppercase font-black flex items-center gap-1.5 justify-center sm:justify-start"}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Stanovisko uloženo do ideové matrice strany.</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#B30F1A]" />
                    Vybrané konstatování natrvalo rekalibruje volební preference.
                  </span>
                )}
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                {!isAnswered ? (
                  <button
                    disabled={!selectedLetter}
                    onClick={handleConfirmAnswer}
                    className={
                      isRound10
                        ? `w-full sm:w-auto px-7 py-3 font-sans text-xs uppercase tracking-widest font-black rounded-none transition-all cursor-pointer ${
                            selectedLetter 
                              ? "bg-[#E30613] hover:bg-[#ff1e2d] text-white shadow-lg" 
                              : "bg-white/10 text-slate-500 cursor-not-allowed"
                          }`
                        : `w-full sm:w-auto px-7 py-3 font-sans text-xs uppercase tracking-widest font-black rounded-[14px] transition-all cursor-pointer ${
                            selectedLetter 
                              ? "bg-[#B30F1A] hover:bg-[#d41c28] text-white" 
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`
                    }
                  >
                    Odpovědět národu
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    className={
                      isRound10
                        ? "w-full sm:w-auto px-7 py-3 text-white font-sans text-xs uppercase tracking-widest font-black rounded-none transition-all cursor-pointer flex items-center justify-center space-x-1.5 bg-[#1E3B70] hover:bg-[#284f94]"
                        : "w-full sm:w-auto px-7 py-3 text-white font-sans text-xs uppercase tracking-widest font-black rounded-[14px] transition-all cursor-pointer flex items-center justify-center space-x-1.5 bg-[#B30F1A] hover:bg-[#940c15]"
                    }
                  >
                    <span>{currentIndex < 4 ? "Další otázka" : "Klávesové vyhodnocení"}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results-box"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-5 sm:p-7 space-y-6 flex-1 ${
              isRound10 
                ? "bg-transparent" 
                : "bg-transparent"
            }`}
          >
            {/* Title Header Celebration */}
            <div className={`text-center pb-5 space-y-2 ${isRound10 ? "border-b border-slate-300" : "border-b border-white/10"}`}>
              <div 
                className={
                  isRound10 
                    ? "inline-flex items-center space-x-2 bg-[#E30613]/10 border border-[#E30613]/25 text-slate-800 rounded-none px-4 py-1" 
                    : "inline-flex items-center space-x-2 bg-[#B30F1A] text-white rounded-[8px] px-4 py-1"
                }
              >
                <Award className={`w-4 h-4 ${isRound10 ? "text-[#E30613]" : "text-white"}`} />
                <span className="font-sans text-[10px] font-black uppercase tracking-widest">Přenos vysílání zakončen</span>
              </div>
              <h2 className={`text-lg sm:text-2xl font-sans font-black uppercase tracking-tight ${isRound10 ? "text-slate-950" : "text-white"}`}>
                VÝSLEDEK BLESKOVÝCH PRŮZKUMŮ
              </h2>
              <p className={`text-xs font-sans max-w-lg mx-auto leading-relaxed ${isRound10 ? "text-slate-600" : "text-zinc-350"}`}>
                Hlasování televizních diváků skončilo. Vaše pohotové argumentační salvy překreslily ideové vektory a ovlivnily sympatie voličských skupin.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Attribute shifts */}
              <div 
                className={
                  isRound10 
                    ? "lg:col-span-5 bg-slate-950/60 border border-white/10 rounded-none p-4 sm:p-5 space-y-4" 
                    : "lg:col-span-5 bg-[#111C38] border-[3px] border-[#B30F1A] rounded-[24px] p-4 sm:p-5 space-y-4"
                }
              >
                <div>
                  <h4 className="font-sans text-xs uppercase text-white font-black tracking-widest mb-1">
                    Ideologické drifty strany
                  </h4>
                  <p className="text-[10px] text-zinc-350 leading-snug">
                    Výsledek zpovědi kandidáta na čtyřech základních osách politického kompasu ČR.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Axis 1 */}
                  <div className={isRound10 ? "flex bg-white/5 border border-white/5 rounded-none p-3 items-center justify-between" : "flex bg-[#0A1128] border border-[#B30F1A]/20 rounded-[14px] p-3 items-center justify-between"}>
                    <div>
                      <span className="text-xs text-zinc-250 font-bold block">Ekonomika</span>
                      <span className="text-[9.5px] text-zinc-400 font-medium">Levice vs Pravice</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-semibold text-zinc-400">{initialAttributes.ekonomika.toFixed(1)} &rarr; {currentAttributes.ekonomika.toFixed(1)}</span>
                      {getShiftBadge(currentAttributes.ekonomika - initialAttributes.ekonomika)}
                    </div>
                  </div>

                  {/* Axis 2 */}
                  <div className={isRound10 ? "flex bg-white/5 border border-white/5 rounded-none p-3 items-center justify-between" : "flex bg-[#0A1128] border border-[#B30F1A]/20 rounded-[14px] p-3 items-center justify-between"}>
                    <div>
                      <span className="text-xs text-zinc-250 font-bold block">Kultura</span>
                      <span className="text-[9.5px] text-zinc-400 font-medium">Konzervativní vs Liberální</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-semibold text-zinc-400">{initialAttributes.kultura.toFixed(1)} &rarr; {currentAttributes.kultura.toFixed(1)}</span>
                      {getShiftBadge(currentAttributes.kultura - initialAttributes.kultura)}
                    </div>
                  </div>

                  {/* Axis 3 */}
                  <div className={isRound10 ? "flex bg-white/5 border border-white/5 rounded-none p-3 items-center justify-between" : "flex bg-[#0A1128] border border-[#B30F1A]/20 rounded-[14px] p-3 items-center justify-between"}>
                    <div>
                      <span className="text-xs text-zinc-250 font-bold block">Evropská integrace</span>
                      <span className="text-[9.5px] text-zinc-400 font-medium">Skeptická vs Eurooptimistická</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-semibold text-zinc-400">{initialAttributes.evropa.toFixed(1)} &rarr; {currentAttributes.evropa.toFixed(1)}</span>
                      {getShiftBadge(currentAttributes.evropa - initialAttributes.evropa)}
                    </div>
                  </div>

                  {/* Axis 4 */}
                  <div className={isRound10 ? "flex bg-white/5 border border-white/5 rounded-none p-3 items-center justify-between" : "flex bg-[#0A1128] border border-[#B30F1A]/20 rounded-[14px] p-3 items-center justify-between"}>
                    <div>
                      <span className="text-xs text-zinc-250 font-bold block">Styl politiky</span>
                      <span className="text-[9.5px] text-zinc-400 font-medium">Tradiční vs Populistický</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-semibold text-zinc-400">{initialAttributes.stylPolitiky.toFixed(1)} &rarr; {currentAttributes.stylPolitiky.toFixed(1)}</span>
                      {getShiftBadge(currentAttributes.stylPolitiky - initialAttributes.stylPolitiky)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Preferences output table */}
              <div 
                className={
                  isRound10 
                    ? "lg:col-span-7 bg-slate-950/60 border border-white/10 rounded-none p-4 sm:p-5 flex flex-col justify-between" 
                    : "lg:col-span-7 bg-[#111C38] border-[3px] border-[#B30F1A] rounded-[24px] p-4 sm:p-5 flex flex-col justify-between"
                }
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-sans text-xs uppercase text-zinc-200 font-black tracking-widest">
                      Bleskový Volební Průzkum po debatě
                    </h4>
                    <span className="text-[9.5px] text-zinc-400 font-sans uppercase italic">
                      Dopad na národní preference
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-350 mb-3 leading-relaxed">
                    Srovnání silových preferencí jednotlivých politických subjektů z období bezprostředně před startem televizní debaty a po ní. Hodnota výkonu vyjadřuje úspěšnost vystoupení v debatě v rozsahu od -5% do +5% pro každou stranu.
                  </p>

                  <div className={isRound10 ? "border border-white/10 rounded-none overflow-hidden text-xs" : "border border-[#B30F1A]/45 rounded-[16px] overflow-hidden text-xs"}>
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className={isRound10 ? "bg-white/5 text-zinc-300 border-b border-white/10 font-bold" : "bg-[#0A1128] text-zinc-300 border-b border-[#B30F1A]/40 font-bold"}>
                          <th className="p-2.5 pl-3">Strana</th>
                          <th className="p-2.5 text-center">Před debatou</th>
                          <th className="p-2.5 text-center">Výkon v Debatě</th>
                          <th className="p-2.5 text-right pr-3">Po debatě</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {Object.entries(STRANY)
                          .map(([id, party]) => {
                            const isPlayer = id === state.stranaId;
                            const beforePref = isPlayer ? initialPreference : (initialNpcPrefs[id] ?? 0);
                            const afterPref = isPlayer ? currentPreference : (currentNpcPreferred[id] ?? 0);
                            const delta = debatePerformanceDeltas[id] ?? 0;
                            return { id, party, beforePref, afterPref, delta, isPlayer };
                          })
                          .sort((a, b) => b.afterPref - a.afterPref)
                          .map(({ id, party, beforePref, afterPref, delta, isPlayer }) => (
                            <tr key={id} className={`hover:bg-white/5 transition-colors ${isPlayer ? (isRound10 ? "bg-white/10 font-bold" : "bg-[#B30F1A]/20 font-bold") : ""}`}>
                              <td className="p-2.5 pl-3 flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: party.barva }} />
                                <span className="text-zinc-200 font-semibold">
                                  {party.zkratka} {isPlayer && <span className={isRound10 ? "text-[8px] uppercase font-sans font-black tracking-wider text-[#E30613] bg-white px-1.5 py-0.5 rounded-none border border-slate-300 ml-1" : "text-[8px] uppercase font-sans font-black tracking-wider text-white bg-[#B30F1A] px-1.5 py-0.5 rounded-[4px] ml-1"}>Hráč</span>}
                                </span>
                              </td>
                              <td className="p-2.5 text-center text-zinc-305 font-mono">
                                {beforePref.toFixed(1)} %
                              </td>
                              <td className="p-2.5 text-center font-mono font-extrabold">
                                {delta === 0 ? (
                                  <span className="text-zinc-500">-</span>
                                ) : delta > 0 ? (
                                  <span className="text-emerald-400">+{delta.toFixed(1)} %</span>
                                ) : (
                                  <span className="text-red-400">{delta.toFixed(1)} %</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right pr-3 text-white font-mono font-black">
                                {afterPref.toFixed(1)} %
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={isRound10 ? "mt-4 pt-3 border-t border-white/10" : "mt-4 pt-3 border-t border-[#B30F1A]/40"}>
                  <button
                    onClick={handleFinishDebateStage}
                    className={
                      isRound10
                        ? "w-full py-3.5 bg-[#E30613] hover:bg-[#ff1e2d] text-white font-sans text-xs uppercase tracking-widest font-black rounded-none shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
                        : "w-full py-3.5 bg-[#B30F1A] hover:bg-[#d41c28] text-white font-sans text-xs uppercase tracking-widest font-black rounded-[14px] transition-all cursor-pointer flex items-center justify-center space-x-2"
                    }
                  >
                    <span>Ukončit debatu a pokračovat do dalšího kola</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcasting Style Ticker Banner */}
      <div 
        className={
          isRound10 
            ? "border-t border-[#1E3B70] px-4 py-3 z-10 shrink-0 font-sans select-none overflow-hidden relative flex items-center space-x-3 text-xs bg-slate-950 text-white rounded-none" 
            : "border-t-[3px] border-[#B30F1A] px-4 py-3.5 z-10 shrink-0 font-sans select-none overflow-hidden relative flex items-center space-x-3 text-xs bg-[#0A1128] text-zinc-100 rounded-b-[24px]"
        }
      >
        <span 
          className={
            isRound10 
              ? "px-2.5 py-1 rounded-none font-black tracking-widest uppercase text-[9.5px] text-white shrink-0 flex items-center text-center leading-none bg-[#D10014]" 
              : "px-2.5 py-1 rounded-none font-black tracking-widest uppercase text-[9.5px] text-white shrink-0 flex items-center text-center leading-none bg-[#B30F1A]"
          }
        >
          {isRound10 ? "MIMOŘÁDNÉ ZPRÁVY" : "MIMOŘÁDNÝ VSTUP ČT24"}
        </span>
        <div className="flex-1 w-full truncate font-medium whitespace-nowrap overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeHeadline}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="m-0 select-none cursor-default font-semibold text-zinc-100"
            >
              {SATIRICAL_HEADLINES[activeHeadline]}
            </motion.p>
          </AnimatePresence>
        </div>
        <Radio className={isRound10 ? "w-4 h-4 animate-pulse shrink-0 hidden sm:inline text-[#E30613]" : "w-4 h-4 animate-pulse shrink-0 hidden sm:inline text-[#B30F1A]"} />
      </div>
    </div>
  );
}

export default React.memo(DebateStage);
