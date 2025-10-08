import React from "react";
import { Person, ActivityChainData, ActivityChainToggleCallback } from "../types";
import { PANEL_STYLES, BUTTON_STYLES, SPACING, FONT_SIZES, COLORS } from "../styles";
import { TIMELINE_ICON_SIZE } from "../constants";
import ActivityIcon from "./icons/ActivityIcon";

type Props = {
  person: Person | null;
  onClose: () => void;
  onActivityChainToggle?: ActivityChainToggleCallback;
};

export default function PersonPanel({ person, onClose, onActivityChainToggle }: Props): React.JSX.Element | null {
  const [showActivityChain, setShowActivityChain] = React.useState(false);
  function transportStyle(transport: string | undefined): { color: string; dashed: boolean; label: string } {
    const t = (transport || "").toLowerCase();
    if (t === "personal car") return { color: "#ef4444", dashed: false, label: "Personal car" };
    if (t === "public transport") return { color: "#0ea5e9", dashed: false, label: "Public transport" };
    if (t === "taxi") return { color: "#f59e0b", dashed: false, label: "Taxi" };
    if (t === "uber") return { color: "#111827", dashed: false, label: "Uber" };
    if (t === "bike") return { color: "#10b981", dashed: false, label: "Bike" };
    if (t === "walk") return { color: "#6b7280", dashed: true, label: "Walk" };
    return { color: "#9ca3af", dashed: true, label: transport || "" };
  }
  function transportIcon(transport: string | undefined): string {
    const t = (transport || "").toLowerCase();
    if (t === "personal car") return "🚗";
    if (t === "public transport") return "🚌"; // or 🚇
    if (t === "taxi") return "🚕";
    if (t === "uber") return "🚘";
    if (t === "bike") return "🚲";
    if (t === "walk") return "🚶";
    return "";
  }
  return (
    <div style={PANEL_STYLES.container}>
      <div style={PANEL_STYLES.header}>
        <strong>Person details</strong>
        {/* <button onClick={onClose} style={BUTTON_STYLES.close}>Close</button> */}
      </div>
      <div style={PANEL_STYLES.content}>
        {!person ? (
          <div style={{ color: COLORS.gray[500] }}>Click an individual point to view details.</div>
        ) : (
          <div>
            <div style={{ marginBottom: SPACING.md }}>
              <div style={{ fontSize: FONT_SIZES.lg, fontWeight: 600 }}>{person.firstName} {person.lastName}</div>
              <div><strong>Sex:</strong> {person.sex}</div>
              <div><strong>Age:</strong> {person.age}</div>
            </div>
            <div style={{ marginBottom: SPACING.md }}>
              <button
                onClick={() => {
                  const newShowState = !showActivityChain;
                  setShowActivityChain(newShowState);
                  if (onActivityChainToggle && person) {
                    onActivityChainToggle(
                      newShowState,
                      newShowState ? { id: person.id || 0, age: person.age, activities: person.activities } : null
                    );
                  }
                }}
                style={{
                  ...BUTTON_STYLES.secondary,
                  background: showActivityChain ? COLORS.gray[100] : COLORS.white,
                  width: "100%",
                  textAlign: "left",
                  transition: "all 0.2s ease-in-out"
                }}
              >
                {showActivityChain ? "Hide" : "Show"} Activity Chain
              </button>
            </div>
            {showActivityChain && (
              <div>
                <h4 style={{ margin: "12px 0 6px" }}>Activity chain</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "flex-start" }}>
                {person.activities.map((a, idx) => {
                  const next = person.activities[idx + 1];
                  const connector = transportStyle(next?.transport);
                  return (
                    <div key={idx} style={{ width: "100%" }}>
                      {/* Row 1: icon + activity name/time */}
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", alignItems: "center" }}>
                        <div style={{ width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          
                                  <div style={{ width: TIMELINE_ICON_SIZE, height: TIMELINE_ICON_SIZE, borderRadius: TIMELINE_ICON_SIZE/2, background: COLORS.white, color: COLORS.gray[900], display: "flex", alignItems: "center", justifyContent: "center", fontSize: FONT_SIZES.xs }}>
                                    <ActivityIcon name={a.name} size={20} />
                                  </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                          <strong style={{ textTransform: "capitalize" }}>{a.name}</strong>
                          <span style={{ color: "#374151", fontVariantNumeric: "tabular-nums" }}>{a.startTime}–{a.endTime}</span>
                        </div>
                      </div>
                      {/* Row 2: vertical connector line + transport label (one line) */}
                      {next && (
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", alignItems: "center", marginTop: 0, marginBottom: 12 }}>
                          <div style={{ width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ height: 32, borderLeftWidth: 2, borderLeftStyle: connector.dashed ? "dashed" : "solid", borderLeftColor: connector.color }} />
                          </div>
                          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.3, wordBreak: "break-word", display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{transportIcon(next?.transport)}</span>
                            <span>{connector.label}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


