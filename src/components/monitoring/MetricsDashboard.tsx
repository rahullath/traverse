// src/components/monitoring/MetricsDashboard.tsx
// Dashboard component for displaying monitoring metrics

import { useState, useEffect } from "react";

interface MetricsData {
  performance: {
    runway_calculation: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      count: number;
    };
    recalculation: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      count: number;
    };
  };
  engagement: {
    triage_activation_rate: number;
    state_declaration_usage: Record<string, number>;
    completion_rate: number;
  };
  errors: {
    mirror_api: number;
    recalculate_api: number;
    state_api: number;
    triage_api: number;
  };
  time_window_ms: number;
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(86400000); // 24 hours

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeWindow]);

  async function loadMetrics() {
    try {
      const response = await fetch(
        `/api/monitoring/metrics?timeWindow=${timeWindow}`,
      );
      if (!response.ok) throw new Error("Failed to load metrics");
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-secondary">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded-lg">
        <p className="text-error">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  const timeWindowHours = metrics.time_window_ms / 3600000;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">
          Triage Mirror Metrics
        </h2>
        <select
          value={timeWindow}
          onChange={(e) => setTimeWindow(parseInt(e.target.value))}
          className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary"
        >
          <option value={3600000}>Last 1 hour</option>
          <option value={86400000}>Last 24 hours</option>
          <option value={604800000}>Last 7 days</option>
        </select>
      </div>

      {/* Performance Metrics */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-text-primary">Performance</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Runway Calculation"
            metrics={metrics.performance.runway_calculation}
            unit="ms"
          />
          <MetricCard
            title="Recalculation"
            metrics={metrics.performance.recalculation}
            unit="ms"
          />
        </div>
      </section>

      {/* Engagement Metrics */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-text-primary">Engagement</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface border border-border rounded-lg">
            <div className="text-sm text-text-secondary mb-1">
              Triage Activation Rate
            </div>
            <div className="text-3xl font-bold text-text-primary">
              {(metrics.engagement.triage_activation_rate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 bg-surface border border-border rounded-lg">
            <div className="text-sm text-text-secondary mb-1">
              Completion Rate
            </div>
            <div className="text-3xl font-bold text-text-primary">
              {(metrics.engagement.completion_rate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 bg-surface border border-border rounded-lg">
            <div className="text-sm text-text-secondary mb-2">
              State Declarations
            </div>
            <div className="space-y-1 text-sm">
              {Object.entries(metrics.engagement.state_declaration_usage).map(
                ([state, count]) => (
                  <div key={state} className="flex justify-between">
                    <span className="text-text-secondary">
                      {formatStateName(state)}
                    </span>
                    <span className="text-text-primary font-medium">
                      {count}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Error Rates */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-text-primary">Error Rates</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ErrorRateCard title="Mirror API" rate={metrics.errors.mirror_api} />
          <ErrorRateCard
            title="Recalculate API"
            rate={metrics.errors.recalculate_api}
          />
          <ErrorRateCard title="State API" rate={metrics.errors.state_api} />
          <ErrorRateCard title="Triage API" rate={metrics.errors.triage_api} />
        </div>
      </section>

      <div className="text-xs text-text-secondary text-center">
        Showing data from the last {timeWindowHours} hours • Auto-refreshes
        every minute
      </div>
    </div>
  );
}

function MetricCard({
  title,
  metrics,
  unit,
}: {
  title: string;
  metrics: { p50_ms: number; p95_ms: number; p99_ms: number; count: number };
  unit: string;
}) {
  return (
    <div className="p-4 bg-surface border border-border rounded-lg">
      <div className="text-sm text-text-secondary mb-3">{title}</div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-text-secondary">p50</div>
          <div className="text-lg font-semibold text-text-primary">
            {metrics.p50_ms.toFixed(0)}
            {unit}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary">p95</div>
          <div className="text-lg font-semibold text-text-primary">
            {metrics.p95_ms.toFixed(0)}
            {unit}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary">p99</div>
          <div className="text-lg font-semibold text-text-primary">
            {metrics.p99_ms.toFixed(0)}
            {unit}
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-text-secondary">
        {metrics.count} samples
      </div>
    </div>
  );
}

function ErrorRateCard({ title, rate }: { title: string; rate: number }) {
  const percentage = (rate * 100).toFixed(2);
  const isHigh = rate > 0.05; // 5% threshold

  return (
    <div className="p-4 bg-surface border border-border rounded-lg">
      <div className="text-sm text-text-secondary mb-1">{title}</div>
      <div
        className={`text-2xl font-bold ${
          isHigh ? "text-error" : "text-success"
        }`}
      >
        {percentage}%
      </div>
    </div>
  );
}

function formatStateName(state: string): string {
  return state
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
