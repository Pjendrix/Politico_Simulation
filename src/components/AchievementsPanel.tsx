import React, { useState, useMemo } from "react";
import { ACHIEVEMENTS, Achievement, AchievementCategory } from "../achievements";
import { UnlockedAchievementRecord } from "../achievementsStorage";
import { Lock, ArrowLeft, Award, Sparkles, Info } from "lucide-react";
import { motion } from "motion/react";
import { STRANY } from "../data";

interface AchievementsPanelProps {
  unlockedRecords: UnlockedAchievementRecord[];
  onBack: () => void;
}

const CATEGORY_LABELS: Record<AchievementCategory | "all", string> = {
  all: "Vše",
  meta: "Celkové",
  prestizni: "Prestižní",
  vysledek: "Výsledkové",
  styl: "Styl",
  poradce: "Poradci",
  daily: "Denní výzva",
  skryte: "Skryté",
};

function AchievementsPanel({ unlockedRecords, onBack }: AchievementsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");

  const prestigeProgress = useMemo(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return {};
    }
    try {
      const raw = localStorage.getItem("prestigeAchievementsProgress");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const unlockedIdsSet = useMemo(() => {
    return new Set(unlockedRecords.map((r) => r.id));
  }, [unlockedRecords]);

  const unlockedDatesMap = useMemo(() => {
    const map = new Map<string, string>();
    unlockedRecords.forEach((r) => {
      if (r.unlockedAt) {
        try {
          const date = new Date(r.unlockedAt);
          const formatted = date.toLocaleDateString("cs-CZ", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          map.set(r.id, formatted);
        } catch {
          map.set(r.id, "");
        }
      }
    });
    return map;
  }, [unlockedRecords]);

  const filteredAchievements = useMemo(() => {
    const list = activeCategory === "all"
      ? [...ACHIEVEMENTS]
      : ACHIEVEMENTS.filter((a) => a.kategorie === activeCategory);

    // Sort: Meta always first. Then non-skryte first, skryte last. Among skryte: unlocked first, locked last.
    list.sort((a, b) => {
      // Meta vždy první
      const aMeta = a.kategorie === "meta";
      const bMeta = b.kategorie === "meta";
      if (aMeta !== bMeta) return aMeta ? -1 : 1;

      // Stávající logika: non-skryte před skryte, mezi skrytymi: odemčené dříve
      const aSkryty = !!a.skryty;
      const bSkryty = !!b.skryty;
      if (aSkryty !== bSkryty) {
        return aSkryty ? 1 : -1;
      }
      if (aSkryty) {
        const aUnlocked = unlockedIdsSet.has(a.id);
        const bUnlocked = unlockedIdsSet.has(b.id);
        if (aUnlocked !== bUnlocked) {
          return aUnlocked ? -1 : 1;
        }
      }
      return 0;
    });

    return list;
  }, [activeCategory, unlockedIdsSet]);

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIdsSet.has(a.id)).length;
  const percentUnlocked = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          id="achieved-btn-back"
          onClick={onBack}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět do hry
        </button>
        <div className="text-right sm:text-left">
          <h2 className="text-xl font-sans tracking-tight font-black uppercase text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            Volební Síně Úspěchů
          </h2>
          <p className="text-slate-500 text-xs">
            Tvůj postup v odemykání herních milníků a politických výzev.
          </p>
        </div>
      </div>

      {/* Progress Bar Board */}
      <div className="w-full p-6 bg-slate-55 border border-slate-200 rounded-[24px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Celkový postup
          </div>
          <div className="text-2xl font-black text-slate-800">
            Odemčeno <span className="text-blue-650">{unlockedCount}</span> z {totalCount} achievementů
          </div>
          <p className="text-xs text-slate-450 italic">
            Odemkni skryté výzvy a staň se absolutní legendou české politické scény!
          </p>
        </div>
        <div className="w-full md:w-1/3 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-500">Postup</span>
            <span className="text-blue-660 font-mono">{percentUnlocked}%</span>
          </div>
          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-650 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentUnlocked}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap bg-slate-100 p-1 border border-slate-200 rounded-[14px] text-xs gap-1 shadow-sm w-full">
        {(Object.keys(CATEGORY_LABELS) as (AchievementCategory | "all")[]).map((cat) => (
          <button
            key={cat}
            id={`ach-tab-${cat}`}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 px-2 py-2 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
              activeCategory === cat
                ? "bg-blue-600 text-white shadow-sm shadow-blue-100"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedIdsSet.has(achievement.id);
          const isSecretState = achievement.skryty && !isUnlocked;
          const unlockDate = unlockedDatesMap.get(achievement.id);

          const cardName = isSecretState ? "???" : achievement.nazev;
          const cardDesc = isSecretState
            ? "Tento achievement je skrytý. Splň podmínku, abys ho odhalil."
            : achievement.popis;
          const cardEmoji = isSecretState ? "🔒" : achievement.emoji;

          return (
            <motion.div
              layout
              key={achievement.id}
              id={`ach-card-${achievement.id}`}
              className={`p-5 rounded-[22px] border transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                isUnlocked
                  ? "bg-white border-blue-150 hover:border-blue-250 shadow-sm"
                  : "bg-slate-50/50 border-slate-200/80"
              }`}
            >
              {/* Card top/main part */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span
                    className={`text-4xl p-2.5 rounded-2xl inline-block ${
                      isUnlocked
                        ? "bg-amber-50"
                        : "bg-slate-100 text-slate-350 select-none grayscale"
                    }`}
                  >
                    {cardEmoji}
                  </span>
                  {!isUnlocked && (
                    <div className="text-slate-400 p-1.5 bg-slate-100 rounded-lg">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                  {isUnlocked && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded text-[9px] font-sans font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Odemčeno
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4
                    className={`font-sans tracking-tight text-sm font-black transition-colors ${
                      isUnlocked ? "text-slate-900" : "text-slate-500 font-bold"
                    }`}
                  >
                    {cardName}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {cardDesc}
                  </p>
                </div>
              </div>

              {/* Card bottom metadata */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                {isUnlocked ? (
                  <span className="text-emerald-600/90 font-semibold font-mono">
                    Odemčeno: {unlockDate || "--"}
                  </span>
                ) : (
                  <span className="text-slate-400/80 font-semibold flex items-center w-full relative">
                    {achievement.kategorie === "prestizni" ? (
                      (() => {
                        const progress = prestigeProgress[achievement.id];
                        const completedPartyIds = progress?.completedPartyIds ?? [];
                        const completed = completedPartyIds.length;
                        const missingParties = Object.keys(STRANY)
                          .filter((pid) => !completedPartyIds.includes(pid))
                          .map((pid) => STRANY[pid]);

                        return (
                          <div className="flex items-center justify-between w-full">
                            <span>Splněno: {completed}/{achievement.cilovyPocetStran || 12}</span>
                            <div className="relative group/tooltip inline-block ml-1.5 font-sans">
                              <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600 active:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-help flex items-center justify-center"
                                title="Nápověda k chybějícím stranám"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Tooltip Content */}
                              <div className="absolute z-35 bottom-full right-0 mb-2 w-56 bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none text-left">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-800 pb-1 normal-case">
                                  Chybí ti odehrát za:
                                </div>
                                {missingParties.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1.5 max-h-36 overflow-y-auto">
                                    {missingParties.map((p) => (
                                      <div key={p.id} className="flex items-center text-[10px] text-slate-300 font-semibold truncate normal-case">
                                        <span
                                          className="w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0"
                                          style={{ backgroundColor: p.barva }}
                                        />
                                        <span className="truncate" title={p.nazev}>{p.zkratka}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-emerald-400 font-semibold mt-1 normal-case">
                                    Všechny strany splněny!
                                  </div>
                                )}
                                {/* Tiny arrow indicator */}
                                <div className="absolute top-full right-3 -mt-1 w-2 h-2 bg-slate-900 border-r border-b border-slate-800 rotate-45" />
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="capitalize">
                        Sekce: {CATEGORY_LABELS[achievement.kategorie] || achievement.kategorie}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(AchievementsPanel);
