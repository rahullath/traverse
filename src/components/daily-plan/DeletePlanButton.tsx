import { useState } from "react";
import { resilientMutationFetch } from "@/lib/triage/retry-handler";

interface DeletePlanButtonProps {
  planId: string;
  onDeleted: () => void;
}

export default function DeletePlanButton({
  planId,
  onDeleted,
}: DeletePlanButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await resilientMutationFetch(
        `/api/daily-plan/${planId}/delete`,
        {
          method: "DELETE",
          headers: {
            "x-idempotency-key": `${planId}:delete`,
          },
        },
        {
          maxRetries: 1,
          initialDelay: 1500,
        },
      );

      if (response.status === 202) {
        onDeleted();
        return;
      }

      if (response.status === 404) {
        onDeleted();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || payload.error || "Failed to delete plan");
      }

      // Notify parent component
      onDeleted();
    } catch (error) {
      console.error("Error deleting plan:", error);
      setError(error instanceof Error ? error.message : "Failed to delete plan.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-surface-secondary border border-border rounded-lg p-4">
        <p className="text-text-primary mb-4">
          Are you sure you want to delete today's plan? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Plan"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="px-4 py-2 bg-surface-hover text-text-primary rounded-lg hover:bg-surface-tertiary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-accent-error">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setError(null);
        setShowConfirm(true);
      }}
      className="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg hover:bg-surface-hover border border-border transition-colors"
    >
      🗑️ Delete Today's Plan
    </button>
  );
}
