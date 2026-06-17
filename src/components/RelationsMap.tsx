/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { STRANY } from "../data";
import { GameState, Party } from "../types";
import { HelpCircle, Info, Link, Eye, EyeOff, Users, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RelationsMapProps {
  state: GameState;
}

function RelationsMap({ state }: RelationsMapProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hideNeutral, setHideNeutral] = useState<boolean>(false);

  // Active node ID is either hovered (takes priority) or clicked/selected
  const activeNodeId = hoveredNodeId || selectedNodeId;

  // Gather active parties from state
  const activeParties = useMemo(() => {
    return Object.values(STRANY).map((p) => {
      const isPlayer = p.id === state.stranaId;
      const preference = isPlayer ? state.preference : (state.npcPreferred[p.id] ?? 0);
      return {
        ...p,
        preference,
        isPlayer,
      };
    }).sort((a, b) => b.preference - a.preference);
  }, [state]);

  // Map party ID to index for circle coordinates sorting
  const partiesMap = useMemo(() => {
    const map: Record<string, Party & { preference: number; isPlayer: boolean }> = {};
    activeParties.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [activeParties]);

  // Heuristic for dark background colors
  const isDarkColor = (color?: string) => {
    if (!color) return true;
    const hex = color.replace("#", "");
    if (hex.length !== 6) return true;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 160; 
  };

  // Polar layout computation
  const svgWidth = 500;
  const svgHeight = 500;
  const centerX = 250;
  const centerY = 250;
  const radius = 160;

  const nodes = useMemo(() => {
    const N = activeParties.length;
    return activeParties.map((p, i) => {
      const angle = (2 * Math.PI / N) * i - Math.PI / 2; // Start from top
      return {
        id: p.id,
        zkratka: p.zkratka,
        nazev: p.nazev,
        color: p.barva || "#7f8c8d",
        isPlayer: p.isPlayer,
        preference: p.preference,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [activeParties]);

  // Compute all links between nodes
  const links = useMemo(() => {
    const result: Array<{
      id: string;
      source: typeof nodes[0];
      target: typeof nodes[0];
      trustVal: number;
    }> = [];

    const playerID = state.stranaId;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const u = nodes[i];
        const v = nodes[j];

        let trustVal = 50;
        if (u.id === playerID) {
          trustVal = state.trust[v.id] ?? 50;
        } else if (v.id === playerID) {
          trustVal = state.trust[u.id] ?? 50;
        } else {
          const trustUV = state.npcTrust[u.id]?.[v.id] ?? 50;
          const trustVU = state.npcTrust[v.id]?.[u.id] ?? 50;
          // Use average for mutual link representation
          trustVal = Math.round((trustUV + trustVU) / 2);
        }

        result.push({
          id: `${u.id}-${v.id}`,
          source: u,
          target: v,
          trustVal,
        });
      }
    }
    return result;
  }, [nodes, state]);

  // Get current relations list of selected party to show in sidebar
  const currentRelationsDetail = useMemo(() => {
    const targetId = activeNodeId || state.stranaId;
    const targetParty = partiesMap[targetId];
    if (!targetParty) return null;

    const list = activeParties
      .filter((p) => p.id !== targetId)
      .map((p) => {
        let incoming = 50; // Trust from p towards targetId
        let outgoing = 50; // Trust from targetId towards p

        if (targetId === state.stranaId) {
          // Player is center
          incoming = state.trust[p.id] ?? 50;
          outgoing = state.trust[p.id] ?? 50; // Synergetic
        } else if (p.id === state.stranaId) {
          // p is player, targetId is NPC
          incoming = state.trust[targetId] ?? 50;
          outgoing = state.trust[targetId] ?? 50;
        } else {
          // Both are NPCs
          incoming = state.npcTrust[p.id]?.[targetId] ?? 50;
          outgoing = state.npcTrust[targetId]?.[p.id] ?? 50;
        }

        return {
          party: p,
          incoming,
          outgoing,
          average: Math.round((incoming + outgoing) / 2),
        };
      })
      .sort((a, b) => b.average - a.average);

    return {
      party: targetParty,
      relations: list,
    };
  }, [activeNodeId, activeParties, partiesMap, state]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Visual map: 7/12 width */}
      <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-3xl p-5 flex flex-col justify-between relative shadow-inner overflow-hidden select-none">
        
        {/* Toggle Panel & Help */}
        <div className="flex justify-between items-center z-10 gap-2 mb-4">
          <div className="flex items-center space-x-2 bg-white/80 border border-slate-150 px-3 py-1.5 rounded-xl shadow-sm">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider">
              Kuloární Sítě
            </span>
          </div>

          <button
            onClick={() => setHideNeutral((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border font-sans text-[11px] uppercase tracking-wider font-extrabold flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all duration-150 ${
              hideNeutral
                ? "bg-blue-650 text-white border-blue-700"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {hideNeutral ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{hideNeutral ? "Skrýt neutrální: ON" : "Skrýt neutrální"}</span>
          </button>
        </div>

        {/* SVG Container */}
        <div className="flex-1 flex items-center justify-center min-h-[350px] sm:min-h-[400px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full max-w-[420px] h-auto drop-shadow-sm transition-all overflow-visible"
          >
            {/* Draw Relationship Lines */}
            <g>
              {links.map((link) => {
                const { source, target, trustVal, id } = link;
                
                // Filtering neutral links if toggle active
                const isNeutral = trustVal >= 30 && trustVal <= 70;
                if (hideNeutral && isNeutral) return null;

                // Determine active state highlighting
                const isConnectedToActive = activeNodeId 
                  ? (source.id === activeNodeId || target.id === activeNodeId)
                  : false;

                // styling options
                let strokeColor = "#cbd5e1"; // Neutral
                let isDashed = false;
                let strokeWidth = 1.0;
                let baseOpacity = 0.12;

                if (trustVal >= 70) {
                  strokeColor = "#10b981"; // Strong friendship
                  strokeWidth = 2.2;
                  baseOpacity = 0.35;
                } else if (trustVal <= 30) {
                  strokeColor = "#ef4444"; // Strong enmity
                  strokeWidth = 1.5;
                  isDashed = true;
                  baseOpacity = 0.25;
                }

                // Opacity manipulation based on hover state
                let finalOpacity = baseOpacity;
                if (activeNodeId) {
                  finalOpacity = isConnectedToActive ? 0.85 : 0.04;
                  if (isConnectedToActive) {
                    strokeWidth += 0.8;
                  }
                }

                return (
                  <path
                    key={id}
                    d={`M ${source.x} ${source.y} Q ${centerX} ${centerY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isDashed ? "5,4" : undefined}
                    strokeLinecap="round"
                    style={{ transition: "all 0.25s ease" }}
                    opacity={finalOpacity}
                  />
                );
              })}
            </g>

            {/* Draw Parties Nodes */}
            <g>
              {nodes.map((node) => {
                const isActive = activeNodeId === node.id;
                const isSelected = selectedNodeId === node.id;
                const isDimmed = activeNodeId && activeNodeId !== node.id;
                const textColor = isDarkColor(node.color) ? "#ffffff" : "#0f172a";

                // Node size attributes
                const baseRadius = 23;
                const finalRadius = isActive ? 26 : baseRadius;

                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    className="cursor-pointer group select-none"
                  >
                    {/* Glowing ring for active hovered node */}
                    {(isActive || isSelected) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={finalRadius + 6}
                        fill="none"
                        stroke={node.color}
                        strokeWidth={1.8}
                        opacity={0.4}
                        className="animate-ping"
                        style={{ animationDuration: "1.8s" }}
                      />
                    )}

                    {/* Golden halo ring specifically highlighting Player's party */}
                    {node.isPlayer && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={finalRadius + 4}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2.2}
                        opacity={isDimmed ? 0.45 : 1}
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={finalRadius}
                      fill={node.color}
                      stroke={node.isPlayer ? "#fef3c7" : "#ffffff"}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-200 shadow-md group-hover:brightness-105"
                      opacity={isDimmed ? 0.45 : 1}
                    />

                    {/* Party abbreviation label */}
                    <text
                      x={node.x}
                      y={node.y}
                      dy="0.33em"
                      textAnchor="middle"
                      fill={textColor}
                      className="font-sans font-black text-[12px] tracking-wide select-none"
                      style={{ pointerEvents: "none" }}
                      opacity={isDimmed ? 0.45 : 1}
                    >
                      {node.zkratka}
                    </text>

                    {/* Preference label above/below node for extra context */}
                    <rect
                      x={node.x - 22}
                      y={node.y + finalRadius + 3}
                      width={44}
                      height={14}
                      rx={5}
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth={1}
                      opacity={isDimmed ? 0.35 : 0.9}
                    />
                    <text
                      x={node.x}
                      y={node.y + finalRadius + 12}
                      textAnchor="middle"
                      fill="#334155"
                      className="font-sans font-extrabold text-[9px] select-none"
                      opacity={isDimmed ? 0.45 : 1}
                    >
                      {node.preference.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-150 flex flex-wrap justify-center gap-x-5 gap-y-2 justify-items-center text-center text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wide">
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 bg-emerald-500 block" />
            <span>Spojenec (&ge; 70%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 bg-slate-300 block" />
            <span>Neutrální</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 bg-red-500 border-dashed block border-t" />
            <span>Chladné (&le; 30%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 border-2 border-amber-550 rounded-full block text-[8px] flex items-center justify-center text-amber-600 bg-amber-50">VY</span>
            <span>Vaše Strana</span>
          </div>
        </div>
      </div>

      {/* Details Side panel: 5/12 width */}
      <div className="lg:col-span-5 flex flex-col justify-between">
        {currentRelationsDetail && (
          <div className="flex-1 bg-white border border-slate-150 rounded-3xl p-5 flex flex-col h-full shadow-sm justify-between space-y-4">
            
            {/* Target party metadata header */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: currentRelationsDetail.party.barva }}
                />
                <span className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {currentRelationsDetail.party.isPlayer ? "Vaše Hlavní Strana" : "Konkurenční Strana"}
                </span>
              </div>
              <h3 className="font-sans text-lg font-black text-slate-800 uppercase mt-0.5 tracking-tight flex items-center flex-wrap gap-x-2">
                <span>{currentRelationsDetail.party.zkratka}</span>
                <span className="text-xs font-semibold text-slate-500 normal-case shrink-0">
                  — {currentRelationsDetail.party.lidr}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-sans italic mt-1 leading-normal">
                {currentRelationsDetail.party.popis}
              </p>
            </div>

            {/* List scrollbox */}
            <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-1.5 custom-scrollbar">
              <div className="text-[9.5px] text-slate-400 font-sans uppercase font-bold tracking-wider mb-2 flex justify-between px-1">
                <span>Vztah se stranou</span>
                <span className="text-right">Sympatie (Vzájemně)</span>
              </div>

              {currentRelationsDetail.relations.map(({ party, incoming, outgoing, average }) => {
                // Formatting trust values
                const isFriendly = average >= 70;
                const isHostile = average <= 30;

                let scoreBg = "bg-slate-50 border-slate-100 text-slate-650";
                if (isFriendly) {
                  scoreBg = "bg-emerald-50 border-emerald-100 text-emerald-700 font-bold";
                } else if (isHostile) {
                  scoreBg = "bg-red-50 border-red-100 text-red-600 font-bold";
                }

                return (
                  <div
                    key={party.id}
                    className="p-2 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    {/* Tiny visual card */}
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: party.barva }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-sans text-[11px] font-black text-slate-700 tracking-wide uppercase truncate">
                          {party.zkratka}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-sans truncate">
                          {party.nazev}
                        </span>
                      </div>
                    </div>

                    {/* Numeric trust scales - simplified to only contain the large average value aligned to the right */}
                    <div className="shrink-0 text-right">
                      <div className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center justify-center min-w-[44px] h-[30px] font-sans ${scoreBg}`}>
                        {average}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hint Box */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[10px] text-slate-650 font-sans flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-750 font-extrabold uppercase tracking-wide">Analytická nápověda: </strong>
                Kliknutím na libovolný uzel v síti získáte detailní rozbor kuloárního rozpoložení dané strany a podsvícení jejích vlastních diplomatických tahů.
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(RelationsMap);
