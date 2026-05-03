import { useState } from "react";
import { features, categories, tierInfo } from "../data/features";
import type { Feature } from "../data/features";

interface FeatureChecklistProps {
  onFeatureSelect: (f: Feature) => void;
  selectedFeatureId: string | null;
}

export default function FeatureChecklist({ onFeatureSelect, selectedFeatureId }: FeatureChecklistProps) {
  const [filter, setFilter] = useState<"all" | 1 | 2 | 3 | 4>("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  const filtered = features.filter(f => {
    if (filter !== "all" && f.tier !== filter) return false;
    if (catFilter !== "all" && f.category !== catFilter) return false;
    return true;
  });

  const done  = features.filter(f => f.done).length;
  const total = features.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-gray-400">
          <span>Overall Progress</span>
          <span className="text-emerald-400">{done}/{total} features ({pct}%)</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tier filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
            filter === "all" ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          All
        </button>
        {([1, 2, 3, 4] as const).map(t => {
            const tierDone  = features.filter(f => f.tier === t && f.done).length;
          const tierTotal = features.filter(f => f.tier === t).length;
          const info = tierInfo[t];
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2 py-1 text-xs rounded font-mono transition-colors flex items-center gap-1 ${
                filter === t
                  ? `bg-${info.color}-900 text-${info.color}-300 border border-${info.color}-700`
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {info.icon} {info.label}
              <span className="text-gray-500">({tierDone}/{tierTotal})</span>
            </button>
          );
        })}
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setCatFilter("all")}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            catFilter === "all" ? "bg-gray-600 text-white" : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
          }`}
        >
          All categories
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              catFilter === c ? "bg-gray-600 text-white" : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Feature list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1">
        {filtered.map(f => {
          const isSelected = selectedFeatureId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFeatureSelect(f)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group ${
                isSelected
                  ? "bg-gray-700 border-gray-500 shadow-lg"
                  : "bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/80"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${
                  f.done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-600 group-hover:border-gray-400"
                }`}>
                  {f.done && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M1 5l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono ${f.done ? "text-gray-300" : "text-gray-400"} truncate`}>
                    {f.label}
                  </div>
                  {isSelected && (
                    <div className="text-xs text-gray-500 mt-1 font-mono leading-relaxed">
                      {f.description}
                    </div>
                  )}
                </div>

                {/* Tier badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0
                  ${f.tier === 1 ? "bg-emerald-900/60 text-emerald-400" :
                    f.tier === 2 ? "bg-blue-900/60 text-blue-400" :
                    f.tier === 3 ? "bg-violet-900/60 text-violet-400" :
                    "bg-amber-900/60 text-amber-400"}`}>
                  T{f.tier}
                </span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-600 font-mono text-sm">
            No features match filter
          </div>
        )}
      </div>
    </div>
  );
}
