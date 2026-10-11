/**
 * Calendar Source Manager Component
 * Manages calendar sources with CRUD operations and OAuth integrations
 */

import React, { useState } from "react";
import type {
  CalendarSource,
  CreateCalendarSourceRequest,
  UpdateCalendarSourceRequest,
} from "../../types/calendar";
import { CSVImporter } from "../import/CSVImporter";
import { parseCsvData } from "../../lib/import/csv-parser";
import { addCsvEvents } from "../../lib/calendar/importer-service";
import { authService } from "../../lib/auth/service";
import "../../styles/calendar-source-manager.css";

interface CalendarSourceManagerProps {
  sources: CalendarSource[];
  onAddSource: (source: CreateCalendarSourceRequest) => Promise<void>;
  onUpdateSource: (
    id: string,
    updates: UpdateCalendarSourceRequest,
  ) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onSyncSource: (id: string) => Promise<void>;
}

export const CalendarSourceManager: React.FC<CalendarSourceManagerProps> = ({
  sources,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onSyncSource,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [editingSource, setEditingSource] = useState<CalendarSource | null>(
    null,
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleAddSource = async (formData: FormData) => {
    const sourceData: CreateCalendarSourceRequest = {
      name: formData.get("name") as string,
      type: formData.get("type") as CreateCalendarSourceRequest["type"],
      url: (formData.get("url") as string) || undefined,
      color: formData.get("color") as string,
      sync_frequency: parseInt(formData.get("sync_frequency") as string),
    };
    await onAddSource(sourceData);
    setShowAddModal(false);
  };

  const handleCsvImport = async (data: any[]) => {
    const user = await authService.getCurrentUser();
    if (!user) return;

    const events = parseCsvData(data);
    const sourceData: CreateCalendarSourceRequest = {
      name: "CSV Import",
      type: "manual",
      color: "#8b5cf6",
      sync_frequency: 1440,
    };
    await addCsvEvents(sourceData, events, user.id);
  };

  const handleSync = async (sourceId: string) => {
    setLoading((prev) => ({ ...prev, [sourceId]: true }));
    try {
      await onSyncSource(sourceId);
    } finally {
      setLoading((prev) => ({ ...prev, [sourceId]: false }));
    }
  };

  const handleToggleActive = async (source: CalendarSource) => {
    await onUpdateSource(source.id, { is_active: !source.is_active });
  };

  const getSourceTypeLabel = (type: CalendarSource["type"]) => {
    const labels = {
      google: "Google Calendar",
      ical: "iCal Feed",
      outlook: "Outlook / Microsoft 365",
      manual: "Manual",
    };
    return labels[type] || type;
  };

  const getSourceTypeIcon = (type: CalendarSource["type"]) => {
    const icons = {
      google: "🔵",
      ical: "📡",
      outlook: "🔷",
      manual: "✏️",
    };
    return icons[type] || "📅";
  };

  const formatLastSync = (lastSync?: Date) => {
    if (!lastSync) return "Never";
    return new Date(lastSync).toLocaleString();
  };

  const isOAuthSource = (source: CalendarSource) =>
    (source.type === "google" || source.type === "outlook") &&
    !source.credentials?.access_token;

  if (sources.length === 0) {
    return (
      <>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Calendar Sources</h3>
          <p>
            Connect Google Calendar, Outlook, or add an iCal feed to get
            started.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Add Calendar Source
          </button>
        </div>

        {showAddModal && (
          <AddSourceModal
            onSubmit={handleAddSource}
            onClose={() => setShowAddModal(false)}
            setShowCsvImporter={setShowCsvImporter}
          />
        )}

        {showCsvImporter && (
          <CSVImporter
            onImport={handleCsvImport}
            onClose={() => setShowCsvImporter(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="calendar-source-manager">
      <div className="manager-header">
        <h2>Calendar Sources</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <span className="icon">➕</span>
          Add Source
        </button>
      </div>

      <div className="sources-grid">
        {sources.map((source) => (
          <div key={source.id} className="source-card">
            <div className="source-header">
              <div className="source-info">
                <div
                  className="source-color"
                  style={{ backgroundColor: source.color }}
                />
                <div>
                  <h3>
                    {getSourceTypeIcon(source.type)} {source.name}
                  </h3>
                  <span className="source-type">
                    {getSourceTypeLabel(source.type)}
                  </span>
                </div>
              </div>
              <div
                className={`source-status ${source.is_active ? "active" : "inactive"}`}
              >
                {source.is_active ? "🟢 Active" : "🔴 Inactive"}
              </div>
            </div>

            {isOAuthSource(source) && (
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #f59e0b",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "0.8rem",
                  color: "#92400e",
                  marginBottom: "8px",
                }}
              >
                ⚠️ Not connected — credentials missing. Delete and re-add to
                authorize.
              </div>
            )}

            <div className="source-details">
              <div className="detail-row">
                <strong>Sync:</strong> Every {source.sync_frequency} minutes
              </div>
              <div className="detail-row">
                <strong>Last Sync:</strong> {formatLastSync(source.last_sync)}
              </div>
              {source.type === "ical" && source.url && (
                <div className="detail-row">
                  <strong>URL:</strong>{" "}
                  {source.url.length > 50
                    ? source.url.substring(0, 50) + "..."
                    : source.url}
                </div>
              )}
            </div>

            <div className="source-actions">
              {!isOAuthSource(source) && (
                <button
                  onClick={() => handleSync(source.id)}
                  disabled={loading[source.id]}
                  className="btn btn-sm btn-secondary"
                >
                  {loading[source.id] ? "⏳ Syncing..." : "🔄 Sync"}
                </button>
              )}

              <button
                onClick={() => handleToggleActive(source)}
                className={`btn btn-sm ${source.is_active ? "btn-warning" : "btn-success"}`}
              >
                {source.is_active ? "Disable" : "Enable"}
              </button>

              <button
                onClick={() => setEditingSource(source)}
                className="btn btn-sm btn-secondary"
              >
                Edit
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(
                      `Delete "${source.name}"? This will also delete all associated events.`,
                    )
                  ) {
                    onDeleteSource(source.id);
                  }
                }}
                className="btn btn-sm btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddSourceModal
          onSubmit={handleAddSource}
          onClose={() => setShowAddModal(false)}
          setShowCsvImporter={setShowCsvImporter}
        />
      )}

      {editingSource && (
        <EditSourceModal
          source={editingSource}
          onSubmit={async (updates) => {
            await onUpdateSource(editingSource.id, updates);
            setEditingSource(null);
          }}
          onClose={() => setEditingSource(null)}
        />
      )}

      {showCsvImporter && (
        <CSVImporter
          onImport={handleCsvImport}
          onClose={() => setShowCsvImporter(false)}
        />
      )}
    </div>
  );
};

// Add Source Modal Component
interface AddSourceModalProps {
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  setShowCsvImporter: (show: boolean) => void;
}

const AddSourceModal: React.FC<AddSourceModalProps> = ({
  onSubmit,
  onClose,
  setShowCsvImporter,
}) => {
  const [sourceType, setSourceType] = useState<
    "google" | "ical" | "outlook" | "manual"
  >("google");
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const isOAuthType = sourceType === "google" || sourceType === "outlook";

  const handleOAuthConnect = async (
    name: string,
    color: string,
    syncFrequency: number,
  ) => {
    setLoading(true);
    setOauthError(null);

    try {
      // 1. Create the source record first
      const createRes = await fetch("/api/calendar/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: sourceType,
          color,
          sync_frequency: syncFrequency,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create calendar source");
      }

      const { source } = await createRes.json();

      // 2. Get the OAuth authorization URL
      const authRes = await fetch(`/api/calendar/${sourceType}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id }),
      });

      if (!authRes.ok) {
        const err = await authRes.json();
        // Clean up the created source if auth URL generation fails
        await fetch(`/api/calendar/sources?id=${source.id}`, {
          method: "DELETE",
        });
        throw new Error(err.error || "Failed to get authorization URL");
      }

      const { authUrl } = await authRes.json();

      // 3. Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      setOauthError(
        error instanceof Error ? error.message : "Authorization failed",
      );
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    if (isOAuthType) {
      const name =
        (formData.get("name") as string) ||
        (sourceType === "google" ? "Google Calendar" : "Outlook Calendar");
      const color = (formData.get("color") as string) || "#3B82F6";
      const syncFrequency = parseInt(
        (formData.get("sync_frequency") as string) || "60",
      );
      await handleOAuthConnect(name, color, syncFrequency);
      return;
    }

    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const typeCards: {
    type: "google" | "outlook" | "ical" | "manual";
    label: string;
    icon: string;
    desc: string;
    color: string;
  }[] = [
    {
      type: "google",
      label: "Google Calendar",
      icon: "🔵",
      desc: "Connect via OAuth",
      color: "#4285F4",
    },
    {
      type: "outlook",
      label: "Outlook / Office 365",
      icon: "🔷",
      desc: "Connect via OAuth",
      color: "#0078D4",
    },
    {
      type: "ical",
      label: "iCal Feed",
      icon: "📡",
      desc: "Any .ics URL",
      color: "#10B981",
    },
    {
      type: "manual",
      label: "Manual",
      icon: "✏️",
      desc: "Create events yourself",
      color: "#8B5CF6",
    },
  ];

  const selectedTypeInfo = typeCards.find((c) => c.type === sourceType)!;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "480px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Add Calendar Source</h3>
          <button onClick={onClose} className="modal-close">
            &times;
          </button>
        </div>

        {/* Type selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          {typeCards.map((card) => (
            <button
              key={card.type}
              type="button"
              onClick={() => setSourceType(card.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                border: `2px solid ${sourceType === card.type ? card.color : "#e5e7eb"}`,
                borderRadius: "8px",
                background:
                  sourceType === card.type ? `${card.color}18` : "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>{card.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: sourceType === card.type ? card.color : "inherit",
                  }}
                >
                  {card.label}
                </div>
                <div style={{ fontSize: "0.72rem", opacity: 0.6 }}>
                  {card.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Hidden type field for non-OAuth types */}
          <input type="hidden" name="type" value={sourceType} />

          <div className="form-group">
            <label>Calendar Name</label>
            <input
              type="text"
              name="name"
              placeholder={
                sourceType === "google"
                  ? "My Google Calendar"
                  : sourceType === "outlook"
                    ? "My Outlook Calendar"
                    : sourceType === "ical"
                      ? "e.g., University Schedule"
                      : "Personal Events"
              }
            />
          </div>

          {/* iCal-specific: URL input */}
          {sourceType === "ical" && (
            <div className="form-group">
              <label>iCal Feed URL *</label>
              <input
                type="text"
                name="url"
                required
                placeholder="https://example.com/calendar.ics  or  webcal://..."
              />
              <small>
                Supports https:// and webcal:// URLs. Most calendar apps
                provide an "Export" or "Share" link ending in .ics
              </small>
            </div>
          )}

          {/* OAuth info panel */}
          {isOAuthType && (
            <div
              style={{
                background: `${selectedTypeInfo.color}12`,
                border: `1px solid ${selectedTypeInfo.color}40`,
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "16px",
                fontSize: "0.85rem",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
                {sourceType === "google"
                  ? "🔵 Sign in with Google"
                  : "🔷 Sign in with Microsoft"}
              </p>
              <p style={{ margin: "0", opacity: 0.8 }}>
                You'll be redirected to{" "}
                {sourceType === "google" ? "Google" : "Microsoft"} to authorize
                read access to your calendar. No events will be modified.
              </p>
            </div>
          )}

          {oauthError && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #f87171",
                borderRadius: "6px",
                padding: "10px",
                color: "#b91c1c",
                fontSize: "0.85rem",
                marginBottom: "12px",
              }}
            >
              ❌ {oauthError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label>Color</label>
              <input
                type="color"
                name="color"
                defaultValue={selectedTypeInfo.color}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Sync Frequency</label>
              <select name="sync_frequency" defaultValue="60">
                <option value="30">Every 30 min</option>
                <option value="60">Every hour</option>
                <option value="120">Every 2 hours</option>
                <option value="360">Every 6 hours</option>
                <option value="1440">Daily</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => {
                setShowCsvImporter(true);
                onClose();
              }}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
            >
              📂 Import from CSV instead
            </button>
          </div>

          <div className="modal-actions" style={{ marginTop: "20px" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={
                isOAuthType
                  ? { background: selectedTypeInfo.color, border: "none" }
                  : {}
              }
            >
              {loading ? (
                "⏳ Connecting..."
              ) : isOAuthType ? (
                <>
                  {selectedTypeInfo.icon} Connect with{" "}
                  {sourceType === "google" ? "Google" : "Microsoft"}
                </>
              ) : (
                "Add Calendar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Source Modal Component
interface EditSourceModalProps {
  source: CalendarSource;
  onSubmit: (updates: UpdateCalendarSourceRequest) => Promise<void>;
  onClose: () => void;
}

const EditSourceModal: React.FC<EditSourceModalProps> = ({
  source,
  onSubmit,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const updates: UpdateCalendarSourceRequest = {
        name: formData.get("name") as string,
        url: (formData.get("url") as string) || undefined,
        color: formData.get("color") as string,
        sync_frequency: parseInt(formData.get("sync_frequency") as string),
        is_active: formData.get("is_active") === "on",
      };
      await onSubmit(updates);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Calendar Source</h3>
          <button onClick={onClose} className="modal-close">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Calendar Name</label>
            <input
              type="text"
              name="name"
              defaultValue={source.name}
              required
            />
          </div>

          {source.type === "ical" && (
            <div className="form-group">
              <label>iCal Feed URL</label>
              <input type="url" name="url" defaultValue={source.url} required />
            </div>
          )}

          <div className="form-group">
            <label>Color</label>
            <input type="color" name="color" defaultValue={source.color} />
          </div>

          <div className="form-group">
            <label>Sync Frequency</label>
            <select
              name="sync_frequency"
              defaultValue={source.sync_frequency.toString()}
            >
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
              <option value="120">Every 2 hours</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Daily</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={source.is_active}
              />{" "}
              Active
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarSourceManager;
