import React from "react";

type Props = {
  minutes: number; // 0..1439
  onChange: (m: number) => void;
};

export default function TimeSlider({ minutes, onChange }: Props): React.JSX.Element {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", padding: 10, width: 520, pointerEvents: "auto", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span>Time</span>
          <strong>{hh}:{mm}</strong>
        </div>
        <input
          type="range"
          min={0}
          max={1439}
          step={15}
          value={minutes}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}


