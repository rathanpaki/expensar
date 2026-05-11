import React from "react";
import { X, Zap } from "lucide-react";

export const AISuggestionsModal = ({
  open,
  onClose,
  darkMode,
  insights,
  financialHealthScore,
  budgetRecommendations,
  savingsOpportunities,
  formatCurrency,
}) => {
  if (!open) return null;

  const scoreColor =
    financialHealthScore >= 80
      ? "#10b981"
      : financialHealthScore >= 60
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      className="modal-overlay ai-suggestions-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-content ai-suggestions-modal-content"
        style={{
          background: darkMode ? "#1f2937" : "#ffffff",
          color: darkMode ? "#e2e8f0" : "#1e293b",
          border: `1px solid ${darkMode ? "rgba(102, 126, 234, 0.35)" : "rgba(102, 126, 234, 0.2)"}`,
        }}
      >
        {/* Header */}
        <div
          className="ai-suggestions-modal-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div className="ai-suggestions-modal-header-copy">
            <h2
              style={{
                fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
                fontWeight: 800,
                marginBottom: "0.5rem",
                background: darkMode
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ⚡ AI Suggestions
            </h2>
            <p
              style={{
                fontSize: "0.9rem",
                color: darkMode ? "#cbd5e1" : "#64748b",
                margin: 0,
              }}
            >
              Smart insights to optimize your budget
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ai-suggestions-modal-close"
            style={{
              border: "none",
              background: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)",
              color: darkMode ? "#e2e8f0" : "#334155",
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode
                ? "rgba(255, 255, 255, 0.15)"
                : "rgba(0, 0, 0, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)";
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Grid Layout */}
        <div
          className="ai-suggestions-modal-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Health Score Card */}
          <div
            className="ai-suggestions-card"
            style={{
              padding: "1.1rem",
              borderRadius: "12px",
              background: darkMode
                ? "linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12))"
                : "linear-gradient(135deg, rgba(102, 126, 234, 0.06), rgba(118, 75, 162, 0.06))",
              border: `1px solid ${darkMode ? "rgba(102, 126, 234, 0.3)" : "rgba(102, 126, 234, 0.15)"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: darkMode ? "#e2e8f0" : "#1e293b",
                }}
              >
                💪 Health Score
              </span>
              <span
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 900,
                  color: scoreColor,
                }}
              >
                {financialHealthScore}
              </span>
            </div>
            <div
              style={{
                height: "8px",
                borderRadius: "4px",
                overflow: "hidden",
                background: darkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.08)",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: `${financialHealthScore}%`,
                  height: "100%",
                  background: scoreColor,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: darkMode ? "#cbd5e1" : "#64748b",
                textAlign: "center",
              }}
            >
              {financialHealthScore >= 80
                ? "✅ Excellent"
                : financialHealthScore >= 60
                  ? "👍 Good"
                  : "📈 Fair"}
            </div>
          </div>

          {/* Smart Insights Card */}
          <div
            className="ai-suggestions-card"
            style={{
              padding: "1.1rem",
              borderRadius: "12px",
              background: darkMode
                ? "rgba(30, 41, 59, 0.5)"
                : "rgba(248, 250, 252, 0.7)",
              border: `1px solid ${darkMode ? "rgba(102, 126, 234, 0.2)" : "rgba(102, 126, 234, 0.12)"}`,
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                marginBottom: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: darkMode ? "#e2e8f0" : "#1e293b",
              }}
            >
              <Zap size={18} /> Smart Insights
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {insights.slice(0, 4).map((insight, index) => (
                <div
                  key={index}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: darkMode
                      ? "rgba(102, 126, 234, 0.1)"
                      : "rgba(102, 126, 234, 0.06)",
                    borderLeft: `4px solid ${darkMode ? "#667eea" : "#4f46e5"}`,
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    color: darkMode ? "#e2e8f0" : "#1e293b",
                  }}
                >
                  {insight}
                </div>
              ))}
            </div>
          </div>

          {/* Budget Tips Card */}
          {budgetRecommendations.length > 0 && (
            <div
              className="ai-suggestions-card"
              style={{
                padding: "1.1rem",
                borderRadius: "12px",
                background: darkMode
                  ? "rgba(30, 41, 59, 0.5)"
                  : "rgba(248, 250, 252, 0.7)",
                border: `1px solid ${darkMode ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.12)"}`,
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.9rem",
                  color: darkMode ? "#fbbf24" : "#b45309",
                }}
              >
                🎯 Budget Tips
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {budgetRecommendations.slice(0, 3).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: darkMode
                        ? "rgba(217, 119, 6, 0.1)"
                        : "rgba(217, 119, 6, 0.06)",
                      borderLeft: `4px solid ${darkMode ? "#f59e0b" : "#d97706"}`,
                      fontSize: "0.82rem",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: "0.3rem",
                        color: darkMode ? "#fbbf24" : "#b45309",
                      }}
                    >
                      {item.category}
                    </div>
                    <div
                      style={{
                        color: darkMode ? "#cbd5e1" : "#64748b",
                        fontSize: "0.75rem",
                        marginBottom: "0.4rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.reason}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: darkMode ? "#fbbf24" : "#b45309",
                        fontSize: "0.85rem",
                      }}
                    >
                      → {formatCurrency(item.recommended)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Savings Opportunities Card */}
          {savingsOpportunities.length > 0 && (
            <div
              className="ai-suggestions-card"
              style={{
                padding: "1.1rem",
                borderRadius: "12px",
                background: darkMode
                  ? "rgba(30, 41, 59, 0.5)"
                  : "rgba(248, 250, 252, 0.7)",
                border: `1px solid ${darkMode ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.12)"}`,
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.9rem",
                  color: darkMode ? "#86efac" : "#16a34a",
                }}
              >
                💰 Savings
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {savingsOpportunities.slice(0, 3).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: darkMode
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(34, 197, 94, 0.06)",
                      borderLeft: `4px solid ${darkMode ? "#22c55e" : "#16a34a"}`,
                      fontSize: "0.82rem",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: "0.3rem",
                        color: darkMode ? "#86efac" : "#16a34a",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        color: darkMode ? "#cbd5e1" : "#64748b",
                        fontSize: "0.75rem",
                        marginBottom: "0.4rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.description}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: darkMode ? "#86efac" : "#16a34a",
                        fontSize: "0.85rem",
                      }}
                    >
                      ↑ +{formatCurrency(item.savings)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
