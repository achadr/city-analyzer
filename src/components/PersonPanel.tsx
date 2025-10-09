import React, { useMemo } from "react";
import { Person, ActivityChainData, ActivityChainToggleCallback } from "../types";
import { PANEL_STYLES, BUTTON_STYLES, SPACING, FONT_SIZES, COLORS } from "../styles";
import { TIMELINE_ICON_SIZE, CHART_CONFIG, ACTIVITY_COLORS } from "../constants";
import ActivityIcon from "./icons/ActivityIcon";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { calculateZoneMetrics } from "../maps/utils/zoneMetrics";

type DrawnZone = {
  id: string;
  type: string;
  geometry: GeoJSON.Geometry;
  properties: any;
};

type Props = {
  person: Person | null;
  onClose: () => void;
  onActivityChainToggle?: ActivityChainToggleCallback;
  selectedZone?: DrawnZone | null;
  populationData?: Person[];
};

export default function PersonPanel({ person, onClose, onActivityChainToggle, selectedZone, populationData = [] }: Props): React.JSX.Element | null {
  const [showActivityChain, setShowActivityChain] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"person" | "zone">("person");

  // Calculate zone metrics when a zone is selected
  const zoneMetrics = useMemo(() => {
    if (selectedZone && populationData.length > 0) {
      return calculateZoneMetrics(selectedZone, populationData);
    }
    return null;
  }, [selectedZone, populationData]);

  // Show both person and zone: display tabs
  const showTabs = person && selectedZone && zoneMetrics;

  // Auto-switch to appropriate tab when only one is available
  React.useEffect(() => {
    if (person && !selectedZone) {
      setActiveTab("person");
    } else if (!person && selectedZone) {
      setActiveTab("zone");
    }
  }, [person, selectedZone]);

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
        {showTabs ? (
          // Show tabs when both person and zone are active
          <div style={{ display: "flex", gap: SPACING.xs, width: "100%" }}>
            <button
              onClick={() => setActiveTab("person")}
              style={{
                ...BUTTON_STYLES.secondary,
                flex: 1,
                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                background: activeTab === "person" ? COLORS.primary : COLORS.white,
                color: activeTab === "person" ? COLORS.white : COLORS.gray[700],
                fontWeight: activeTab === "person" ? 600 : 400,
                border: activeTab === "person" ? `1px solid ${COLORS.primary}` : `1px solid ${COLORS.gray[300]}`
              }}
            >
              Person
            </button>
            <button
              onClick={() => setActiveTab("zone")}
              style={{
                ...BUTTON_STYLES.secondary,
                flex: 1,
                padding: `${SPACING.xs}px ${SPACING.sm}px`,
                background: activeTab === "zone" ? COLORS.primary : COLORS.white,
                color: activeTab === "zone" ? COLORS.white : COLORS.gray[700],
                fontWeight: activeTab === "zone" ? 600 : 400,
                border: activeTab === "zone" ? `1px solid ${COLORS.primary}` : `1px solid ${COLORS.gray[300]}`
              }}
            >
              Zone
            </button>
          </div>
        ) : (
          // Show simple title when only one is active
          <strong>{selectedZone && zoneMetrics ? "Zone details" : "Person details"}</strong>
        )}
      </div>
      <div style={PANEL_STYLES.content}>
        {showTabs ? (
          // Show content based on active tab
          activeTab === "zone" ? (
            // Zone content
            <div>
            <div style={{ marginBottom: SPACING.md }}>
              <div style={{ fontSize: FONT_SIZES.lg, fontWeight: 600 }}>Zone Metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACING.sm, marginTop: SPACING.sm }}>
                <div style={{ padding: SPACING.sm, background: COLORS.gray[50], borderRadius: 4 }}>
                  <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.gray[600] }}>Total Activities</div>
                  <div style={{ fontSize: FONT_SIZES.xl, fontWeight: 600, color: COLORS.primary }}>{zoneMetrics.totalActivities}</div>
                </div>
                <div style={{ padding: SPACING.sm, background: COLORS.gray[50], borderRadius: 4 }}>
                  <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.gray[600] }}>Unique Visitors</div>
                  <div style={{ fontSize: FONT_SIZES.xl, fontWeight: 600, color: COLORS.success }}>{zoneMetrics.uniqueVisitors}</div>
                </div>
              </div>
            </div>

            {/* Activities by Hour Chart */}
            <div style={{ marginBottom: SPACING.md }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm}px 0`, fontSize: FONT_SIZES.base }}>Activities per Hour</h4>
              <ResponsiveContainer width="100%" height={CHART_CONFIG.defaultHeight}>
                <BarChart data={zoneMetrics.activitiesByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: CHART_CONFIG.tickFontSize }}
                    ticks={CHART_CONFIG.keyHours}
                    tickFormatter={(hour) => {
                      if (hour === 0) return '12 AM';
                      if (hour === 12) return '12 PM';
                      return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
                    }}
                  />
                  <YAxis tick={{ fontSize: CHART_CONFIG.tickFontSize }} />
                  <Tooltip
                    labelFormatter={(hour) => {
                      if (hour === 0) return '12:00 AM';
                      if (hour === 12) return '12:00 PM';
                      return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_CONFIG.neutralColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Age Distribution Chart */}
            <div style={{ marginBottom: SPACING.md }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm}px 0`, fontSize: FONT_SIZES.base }}>Age Distribution</h4>
              <ResponsiveContainer width="100%" height={CHART_CONFIG.defaultHeight}>
                <BarChart data={zoneMetrics.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" tick={{ fontSize: CHART_CONFIG.tickFontSize }} />
                  <YAxis tick={{ fontSize: CHART_CONFIG.tickFontSize }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_CONFIG.neutralColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Types Chart */}
            <div style={{ marginBottom: SPACING.md, marginTop: SPACING.lg }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm}px 0`, fontSize: FONT_SIZES.base }}>Activity Types</h4>
              <ResponsiveContainer width="100%" height={CHART_CONFIG.pieChartHeight}>
                <PieChart>
                  <Pie
                    data={zoneMetrics.activityTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.type}: ${entry.count}`}
                    outerRadius={CHART_CONFIG.pieChartRadius}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {zoneMetrics.activityTypes.map((entry, index) => {
                      const typeLower = entry.type.toLowerCase();
                      const color = typeLower in ACTIVITY_COLORS
                        ? ACTIVITY_COLORS[typeLower as keyof typeof ACTIVITY_COLORS]
                        : '#9ca3af';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          ) : person ? (
            // Person content when tabs are shown
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
                  transition: "all 0.2s ease-in-out",
                  boxShadow: showActivityChain
                    ? "0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.4)"
                    : "none"
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
          ) : null
        ) : selectedZone && zoneMetrics ? (
          // Only zone is active
          <div>
            <div style={{ marginBottom: SPACING.md }}>
              <div style={{ fontSize: FONT_SIZES.lg, fontWeight: 600 }}>Zone Metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACING.sm, marginTop: SPACING.sm }}>
                <div style={{ padding: SPACING.sm, background: COLORS.gray[50], borderRadius: 4 }}>
                  <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.gray[600] }}>Total Activities</div>
                  <div style={{ fontSize: FONT_SIZES.xl, fontWeight: 600, color: COLORS.primary }}>{zoneMetrics.totalActivities}</div>
                </div>
                <div style={{ padding: SPACING.sm, background: COLORS.gray[50], borderRadius: 4 }}>
                  <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.gray[600] }}>Unique Visitors</div>
                  <div style={{ fontSize: FONT_SIZES.xl, fontWeight: 600, color: COLORS.success }}>{zoneMetrics.uniqueVisitors}</div>
                </div>
              </div>
            </div>

            {/* Activities by Hour Chart */}
            <div style={{ marginBottom: SPACING.md }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm}px 0`, fontSize: FONT_SIZES.base }}>Activities per Hour</h4>
              <ResponsiveContainer width="100%" height={CHART_CONFIG.defaultHeight}>
                <BarChart data={zoneMetrics.activitiesByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: CHART_CONFIG.tickFontSize }}
                    ticks={CHART_CONFIG.keyHours}
                    tickFormatter={(hour) => {
                      if (hour === 0) return '12 AM';
                      if (hour === 12) return '12 PM';
                      return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
                    }}
                  />
                  <YAxis tick={{ fontSize: CHART_CONFIG.tickFontSize }} />
                  <Tooltip
                    labelFormatter={(hour) => {
                      if (hour === 0) return '12:00 AM';
                      if (hour === 12) return '12:00 PM';
                      return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_CONFIG.neutralColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Age Distribution Chart */}
            <div style={{ marginBottom: SPACING.md }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm}px 0`, fontSize: FONT_SIZES.base }}>Age Distribution</h4>
              <ResponsiveContainer width="100%" height={CHART_CONFIG.defaultHeight}>
                <BarChart data={zoneMetrics.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" tick={{ fontSize: CHART_CONFIG.tickFontSize }} />
                  <YAxis tick={{ fontSize: CHART_CONFIG.tickFontSize }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_CONFIG.neutralColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Types Chart */}
            <div style={{ marginBottom: SPACING.md, marginTop: SPACING.lg }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm}px 0`, fontSize: FONT_SIZES.base }}>Activity Types</h4>
              <ResponsiveContainer width="100%" height={CHART_CONFIG.pieChartHeight}>
                <PieChart>
                  <Pie
                    data={zoneMetrics.activityTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.type}: ${entry.count}`}
                    outerRadius={CHART_CONFIG.pieChartRadius}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {zoneMetrics.activityTypes.map((entry, index) => {
                      const typeLower = entry.type.toLowerCase();
                      const color = typeLower in ACTIVITY_COLORS
                        ? ACTIVITY_COLORS[typeLower as keyof typeof ACTIVITY_COLORS]
                        : '#9ca3af';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : !person ? (
          // No selection
          <div style={{ color: COLORS.gray[500] }}>Click an individual point to view details.</div>
        ) : (
          // Only person is active
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
                  transition: "all 0.2s ease-in-out",
                  boxShadow: showActivityChain
                    ? "0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.4)"
                    : "none"
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


