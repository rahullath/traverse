import React, { useState, useEffect } from "react";
import ChainMirror from "./ChainMirror";
import type { ExecutionChain } from "../../lib/chains/types";

interface TimeBlock {
  id: string;
  title: string;
  duration_minutes: number;
  type: "keystone" | "ramp" | "transit" | "anchor" | "free";
  start_time?: string;
  end_time?: string;
}

interface MirrorChain {
  anchor: {
    id: string;
    title: string;
    start: string;
    location?: string;
  };
  blocks: TimeBlock[];
  completion_deadline?: string;
}

export default function ChainPageContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chain, setChain] = useState<MirrorChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch chain data
  useEffect(() => {
    fetchChain();
  }, [currentTime]);

  const fetchChain = async () => {
    try {
      setLoading(true);

      // Get today's plan with chains
      const response = await fetch("/api/daily-plan/today");

      if (!response.ok) {
        if (response.status === 404) {
          setError("No plan for today. Generate one first.");
          setChain(null);
          return;
        }
        throw new Error("Failed to fetch plan");
      }

      const data = await response.json();
      const plan = data.plan;

      if (!plan || !plan.chains || plan.chains.length === 0) {
        setError("No chains found. Add an anchor and generate a plan.");
        setChain(null);
        return;
      }

      // Get first (next) chain only
      const nextChain = plan.chains[0];

      // Transform to simplified format
      const simplifiedChain: MirrorChain = {
        anchor: {
          id: nextChain.anchor.id,
          title: nextChain.anchor.title,
          start: nextChain.anchor.start,
          location: nextChain.anchor.location,
        },
        blocks: nextChain.steps.map((step: any) => ({
          id: step.step_id,
          title: step.name,
          duration_minutes: step.duration,
          type: mapStepType(step.type),
          start_time: step.start_time,
          end_time: step.end_time,
        })),
        completion_deadline: nextChain.chain_completion_deadline,
      };

      setChain(simplifiedChain);
      setError(null);
    } catch (err) {
      console.error("Error fetching chain:", err);
      setError("Failed to load chain");
    } finally {
      setLoading(false);
    }
  };

  const mapStepType = (type: string): TimeBlock["type"] => {
    switch (type) {
      case "keystone":
      case "prep":
        return "keystone";
      case "travel":
      case "travel_there":
        return "transit";
      case "anchor":
      case "commitment":
        return "anchor";
      case "recovery":
      case "travel_back":
        return "ramp";
      default:
        return "free";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  if (error || !chain) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted mb-4">{error || "No chain available"}</p>
        <a
          href="/daily-plan"
          className="text-cyan-500 hover:text-cyan-400 text-sm"
        >
          Go to Daily Plan →
        </a>
      </div>
    );
  }

  return (
    <ChainMirror
      currentTime={currentTime}
      anchor={chain.anchor}
      blocks={chain.blocks}
      completionDeadline={chain.completion_deadline}
    />
  );
}
