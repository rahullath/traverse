import React from "react";

interface Block {
  id: string;
  title: string;
  duration_minutes: number;
  type: "keystone" | "ramp" | "transit" | "anchor" | "free";
  start_time?: string;
  end_time?: string;
}

interface Anchor {
  id: string;
  title: string;
  start: string;
  location?: string;
}

interface ChainMirrorProps {
  currentTime: Date;
  anchor: Anchor;
  blocks: Block[];
  completionDeadline?: string;
}

export default function ChainMirror({
  currentTime,
  anchor,
  blocks,
}: ChainMirrorProps) {
  // Format time
  const formatTime = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Calculate time until anchor
  const getTimeUntilAnchor = (): string => {
    const anchorTime = new Date(anchor.start);
    const diff = anchorTime.getTime() - currentTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 0) return "now";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  };

  // Format duration
  const formatDuration = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  // Get block styling based on type
  const getBlockStyle = (type: Block["type"]): string => {
    switch (type) {
      case "anchor":
        return "border-l-4 border-rose-500 bg-rose-500/10";
      case "keystone":
        return "border-l-4 border-emerald-500 bg-emerald-500/10";
      case "transit":
        return "border-l-4 border-blue-500 bg-blue-500/10";
      default:
        return "border-l-4 border-slate-600 bg-slate-800/50";
    }
  };

  // Get step name (simplified)
  const getStepName = (block: Block): string => {
    // Map existing step names to simpler versions
    const title = block.title.toLowerCase();

    if (title.includes("coffee") || title.includes("drink")) return "Coffee";
    if (title.includes("shower") || title.includes("bath")) return "Shower";
    if (title.includes("breakfast") || title.includes("meal")) return "Eat";
    if (title.includes("pack") || title.includes("bag")) return "Pack";
    if (
      title.includes("travel") ||
      title.includes("walk") ||
      title.includes("bus") ||
      title.includes("train")
    )
      return "Travel";
    if (
      title.includes("meet") ||
      title.includes("class") ||
      title.includes("appoint")
    )
      return anchor.title;

    return block.title;
  };

  const anchorTime = new Date(anchor.start);
  const isAnchorPast = anchorTime < currentTime;

  return (
    <div className="flex flex-col h-full">
      {/* Current Time - Prominent */}
      <div className="text-center py-4">
        <div className="text-4xl font-light text-text-primary">
          {currentTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
        <div className="text-sm text-text-muted mt-1">
          {currentTime.toLocaleDateString("en-US", { weekday: "long" })}
        </div>
      </div>

      {/* Next Anchor - Prominent Box */}
      <div
        className={`rounded-xl p-4 mb-4 ${isAnchorPast ? "bg-slate-800/50 border border-slate-700" : "bg-rose-500/20 border border-rose-500/40"}`}
      >
        <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
          {isAnchorPast ? "Current" : "Next"}
        </div>
        <div className="text-xl font-semibold text-text-primary">
          {anchor.title}
        </div>
        <div className="text-lg text-rose-400 font-medium mt-1">
          {isAnchorPast ? "underway" : `in ${getTimeUntilAnchor()}`}
        </div>
        {anchor.location && (
          <div className="text-sm text-text-muted mt-1">
            📍 {anchor.location}
          </div>
        )}
      </div>

      {/* Simple Chain Steps - Vertical List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={`rounded-lg p-3 ${getBlockStyle(block.type)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-4">{index + 1}</span>
                <span className="text-sm text-text-primary">
                  {getStepName(block)}
                </span>
              </div>
              <span className="text-xs text-text-muted">
                {formatDuration(block.duration_minutes)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button - Bottom, Prominent */}
      <div className="pt-4 mt-auto">
        <button
          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-lg transition-colors active:scale-95"
          onClick={() => {
            // Simple action: just scroll or acknowledge
            // No completion tracking - stateless
          }}
        >
          {isAnchorPast ? "Go" : "Start"}
        </button>
      </div>
    </div>
  );
}
