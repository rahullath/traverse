import React, { useState } from "react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { DisplayIntent } from "@/lib/display/display-mode-service";

export interface MirrorHeaderProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  onRecalculate: () => void;
  isRecalculating?: boolean;
  tokenBalance?: number | null;
  onRealityCheck?: () => void; // V2: User-initiated reality check
  // V2: Display mode props (Req 11.5, 17.2, 17.5)
  displayMode?: DisplayIntent;
  onDisplayModeChange?: (mode: DisplayIntent) => void;
  keystoneActivity?: string | null;
  onKeystoneShortcut?: () => void;
}

export function MirrorHeader({
  editMode,
  onToggleEditMode,
  onRecalculate,
  isRecalculating = false,
  tokenBalance = null,
  onRealityCheck,
  displayMode,
  onDisplayModeChange,
  keystoneActivity,
  onKeystoneShortcut,
}: MirrorHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDisplayModeMenu, setShowDisplayModeMenu] = useState(false);
  const isV2Enabled = isFeatureEnabled("MIRROR_V2_ENABLED");

  return (
    <header className="md:sticky md:top-0 z-50 bg-surface border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Title and Navigation */}
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
              Mirror View
            </h1>

            {/* Desktop Navigation Links */}
            <nav
              className="hidden md:flex items-center gap-2"
              aria-label="Main navigation"
            >
              <a
                href="/daily-plan"
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                Full View
              </a>
              <a
                href="/settings"
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                Settings
              </a>
            </nav>
          </div>

          {/* Right: Controls and Token Balance */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Token Balance */}
            {tokenBalance !== null && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
                <svg
                  className="w-4 h-4 text-accent-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-text-primary">
                  {tokenBalance.toLocaleString()}
                </span>
              </div>
            )}

            {/* V2: Keystone Shortcut (Req 17.2, 17.5) */}
            {isV2Enabled && keystoneActivity && onKeystoneShortcut && (
              <button
                onClick={onKeystoneShortcut}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/40 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label={`Just show ${keystoneActivity}`}
              >
                <span className="text-lg" aria-hidden="true">
                  🌟
                </span>
                <span>Just {keystoneActivity}</span>
              </button>
            )}

            {/* V2: Display Mode Switcher (Req 11.5) */}
            {isV2Enabled && displayMode && onDisplayModeChange && (
              <div className="relative">
                <button
                  onClick={() => setShowDisplayModeMenu(!showDisplayModeMenu)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-background hover:bg-surface border border-border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                  aria-label="Change display mode"
                  aria-expanded={showDisplayModeMenu}
                  aria-haspopup="true"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <span className="hidden sm:inline">View</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Display Mode Dropdown */}
                {showDisplayModeMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-surface-primary border border-border rounded-lg shadow-lg z-50">
                    <div className="py-1" role="menu">
                      <button
                        onClick={() => {
                          onDisplayModeChange("full_chain");
                          setShowDisplayModeMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors ${
                          displayMode === "full_chain"
                            ? "text-accent-primary font-medium"
                            : "text-text-primary"
                        }`}
                        role="menuitem"
                      >
                        Full chain
                      </button>
                      <button
                        onClick={() => {
                          onDisplayModeChange("keystone_focus");
                          setShowDisplayModeMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors ${
                          displayMode === "keystone_focus"
                            ? "text-accent-primary font-medium"
                            : "text-text-primary"
                        }`}
                        role="menuitem"
                      >
                        Keystone focus
                      </button>
                      <button
                        onClick={() => {
                          onDisplayModeChange("anchor_only");
                          setShowDisplayModeMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors ${
                          displayMode === "anchor_only"
                            ? "text-accent-primary font-medium"
                            : "text-text-primary"
                        }`}
                        role="menuitem"
                      >
                        Anchors only
                      </button>
                      <button
                        onClick={() => {
                          onDisplayModeChange("rest_of_day");
                          setShowDisplayModeMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors ${
                          displayMode === "rest_of_day"
                            ? "text-accent-primary font-medium"
                            : "text-text-primary"
                        }`}
                        role="menuitem"
                      >
                        Rest of day
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode Toggle */}
            {isFeatureEnabled("INLINE_EDITING_ENABLED") && (
              <button
                onClick={onToggleEditMode}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-colors
                  min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
                  focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface
                  ${
                    editMode
                      ? "bg-accent-primary text-white hover:bg-accent-secondary"
                      : "bg-background text-text-secondary hover:text-text-primary hover:bg-surface border border-border"
                  }
                `}
                aria-pressed={editMode}
                aria-label={editMode ? "Disable edit mode" : "Enable edit mode"}
                role="switch"
              >
                <span className="hidden sm:inline">
                  {editMode ? "Lock" : "Edit"}
                </span>
                <svg
                  className="w-5 h-5 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {editMode ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  )}
                </svg>
              </button>
            )}

            {/* Recalculate Button */}
            {isFeatureEnabled("STATELESS_RECALC_ENABLED") && (
              <button
                onClick={onRecalculate}
                disabled={isRecalculating}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-colors
                  min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
                  focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface
                  ${
                    isRecalculating
                      ? "bg-background text-text-tertiary cursor-not-allowed"
                      : "bg-accent-primary text-white hover:bg-accent-secondary"
                  }
                `}
                aria-label="Recalculate plan from now"
                aria-busy={isRecalculating}
              >
                {isRecalculating ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Recalculating...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span className="hidden sm:inline">Recalculate</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav
            id="mobile-menu"
            className="md:hidden py-4 border-t border-border"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-2" role="menu">
              <a
                href="/daily-plan"
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
              >
                Full View
              </a>
              <a
                href="/settings"
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
              >
                Settings
              </a>
              {tokenBalance !== null && (
                <div className="px-3 py-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-accent-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-text-primary">
                    {tokenBalance.toLocaleString()} tokens
                  </span>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
