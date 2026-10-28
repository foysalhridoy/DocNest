"use client";

import { DriveSlotInfo } from "@/types";
import { formatBytes } from "@/lib/utils";
import { HardDrive, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface StorageStatsBarProps {
  drives: DriveSlotInfo[];
  activeSlot: 1 | 2;
  refreshing: boolean;
  onRefresh: () => void;
}

export function StorageStatsBar({ drives, activeSlot, refreshing, onRefresh }: StorageStatsBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {drives.map((drive) => {
        const isActive = drive.slot === activeSlot;
        const isFull = drive.usagePercent >= 90;
        const isUnconfigured = !drive.configured;

        return (
          <div
            key={drive.slot}
            className={`rounded-3xl border p-5 sm:p-6 transition-all ${
              isActive
                ? "bg-card border-primary/40 shadow-md shadow-primary/5 ring-1 ring-primary/20"
                : "bg-card/70 border-border/70"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`size-10 rounded-2xl flex items-center justify-center ${
                    drive.slot === 1
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                  }`}
                >
                  <HardDrive className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      Drive {drive.slot}
                    </h3>
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Active Upload Target
                      </span>
                    )}
                    {isFull && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        90%+ Full
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[260px]">
                    {drive.email}
                  </p>
                </div>
              </div>

              {/* Status icon */}
              <div>
                {isUnconfigured ? (
                  <span
                    title="Credentials not found in env"
                    className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Unset
                  </span>
                ) : isFull ? (
                  <span
                    title="Reached 90% threshold"
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Full
                  </span>
                ) : (
                  <span
                    title="Ready for storage"
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Ready
                  </span>
                )}
              </div>
            </div>

            {/* Quota Progress Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="font-semibold text-foreground">
                  {formatBytes(drive.usedBytes)} used
                </span>
                <span className="text-muted-foreground">
                  of {formatBytes(drive.totalBytes)} ({drive.usagePercent}%)
                </span>
              </div>

              {/* Meter bar */}
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    drive.usagePercent >= 90
                      ? "bg-rose-500"
                      : drive.usagePercent >= 75
                      ? "bg-amber-500"
                      : drive.slot === 1
                      ? "bg-primary"
                      : "bg-cyan-500"
                  }`}
                  style={{ width: `${Math.max(2, Math.min(100, drive.usagePercent))}%` }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground pt-1">
                {drive.slot === 1
                  ? "Automatic rollover to Drive 2 occurs when usage exceeds 90%."
                  : "Secondary fallback drive engaged when Drive 1 exceeds 90%."}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
