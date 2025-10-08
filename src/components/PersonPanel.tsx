import React from "react";

type Coordinates = { lat: number; lng: number };
type Activity = {
  name: string;
  startTime: string;
  endTime: string;
  zone: string;
  coordinates: Coordinates;
  transport: string;
};

type Person = {
  id?: number;
  age: number;
  sex: "male" | "female";
  firstName: string;
  lastName: string;
  activities: Activity[];
};

type Props = {
  person: Person | null;
  onClose: () => void;
  onActivityChainToggle?: (show: boolean, activityChainData: { id: number; age: number; activities: any[] } | null) => void;
};

export default function PersonPanel({ person, onClose, onActivityChainToggle }: Props): React.JSX.Element | null {
  const [showActivityChain, setShowActivityChain] = React.useState(false);
  function activityIcon(name: string): React.JSX.Element {
    const key = name.toLowerCase();
    const iconStyle = { width: 20, height: 20, stroke: "currentColor", strokeWidth: 2, fill: "none" };
    
    if (key === "home") {
      return (
        <img src="/src/components/icons/home.svg" alt="home" style={iconStyle} />
      );
    }
    if (key === "work") {
      return (
        <img src="/src/components/icons/work.svg" alt="work" style={iconStyle} />
      );
    }
    if (key === "school" || key === "education") {
      return (
        <img src="/src/components/icons/school.svg" alt="school" style={iconStyle} />
      );
    }
    if (key === "leisure") {
      return (
        <img src="/src/components/icons/leisure.svg" alt="leisure" style={iconStyle} />
      );
    }
    return (
      <img src="/src/components/icons/default.svg" alt="default" style={iconStyle} />
    );
  }
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
    <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 360, background: "#fff", boxShadow: "-4px 0 16px rgba(0,0,0,0.15)", zIndex: 1000, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong>Person details</strong>
        <button onClick={onClose} style={{ border: "none", background: "#f3f4f6", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>Close</button>
      </div>
      <div style={{ padding: 12, overflow: "auto" }}>
        {!person ? (
          <div style={{ color: "#6b7280" }}>Click an individual point to view details.</div>
        ) : (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{person.firstName} {person.lastName}</div>
              <div><strong>Sex:</strong> {person.sex}</div>
              <div><strong>Age:</strong> {person.age}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
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
                  border: "1px solid #d1d5db", 
                  background: showActivityChain ? "#f3f4f6" : "#fff", 
                  padding: "8px 12px", 
                  borderRadius: 6, 
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left"
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
                          
                          <div style={{ width: 28, height: 28, borderRadius: 14, background: "#fff", color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                            {activityIcon(a.name)}
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


