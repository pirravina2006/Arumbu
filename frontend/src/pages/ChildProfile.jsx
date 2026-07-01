import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import GrowthChart from "../components/GrowthChart.jsx";
import NutritionAnalysisSummary from "../components/NutritionAnalysisSummary.jsx";
import VaccinationRecord from "../components/VaccinationRecord.jsx";
import { fetchGrowthChart, fetchLatestMeasurement } from "../api/growthApi.js";
import { fetchNutritionHistory } from "../api/nutritionApi.js";
import { alertsApi } from "../api/alertsApi.js";
import api from "../api/axiosClient.js";

function AlertSeverityDot({ severity }) {
  const color = severity === "high" ? "#ef4444" : severity === "medium" ? "#f59e0b" : "#3b82f6";
  return (
    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, marginTop: "4px" }} />
  );
}

const STATUS_STYLE = {
  SAM: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  MAM: { bg: "#fed7aa", text: "#92400e", border: "#fdba74" },
  Normal: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: "#f3f4f6", text: "#6b7280", border: "#d1d5db" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 16px",
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: "20px",
        fontSize: "13px",
        fontWeight: "700",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
      }}
    >
      {status || "Not measured"}
    </span>
  );
}

function InfoRow({ label, value, highlight = false }) {
  return (
    <div style={{ 
      display: "flex", 
      gap: "12px", 
      padding: "12px 0", 
      borderBottom: "1px solid rgba(0,0,0,0.04)",
      alignItems: "center"
    }}>
      <span style={{ width: "140px", flexShrink: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>{label}</span>
      <span style={{ 
        fontWeight: highlight ? "700" : "500", 
        fontSize: highlight ? "16px" : "15px",
        color: highlight ? "#111827" : "#374151" 
      }}>{value || "—"}</span>
    </div>
  );
}

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [child, setChild] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [recentNutrition, setRecentNutrition] = useState(null);
  const [nutritionPending, setNutritionPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    let retries = 0;
    let timer = null;

    const loadNutrition = async () => {
      try {
        const logs = await fetchNutritionHistory(id);
        const withAnalysis = logs.find((log) => log.ai_analysis);
        if (withAnalysis) {
          setRecentNutrition(withAnalysis.ai_analysis);
          setNutritionPending(false);
          return;
        }
        setRecentNutrition(null);
        setNutritionPending(logs.length > 0);
        if (logs.length > 0 && retries < 3) {
          retries += 1;
          timer = setTimeout(loadNutrition, 4000);
        }
      } catch {
        setRecentNutrition(null);
        setNutritionPending(false);
      }
    };

    api
      .get(`/children/${id}`)
      .then((res) => {
        setChild(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch child profile:", err);
        setChild({ error: true, message: err.message || "Failed to load" });
      })
      .finally(() => setLoading(false));

    fetchGrowthChart(id).then(setChartData).catch(() => setChartData([]));
    fetchLatestMeasurement(id).then(setLatest).catch(() => setLatest(null));
    alertsApi.getChildAlerts(id).then(res => setAlerts(res.data || [])).catch(() => setAlerts([])).finally(() => setAlertsLoading(false));
    loadNutrition();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "#6b7280", fontSize: "18px", fontWeight: "500" }}>Loading child details...</p>
      </div>
    );
  }

  if (!child || child.error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "#ef4444", fontSize: "18px", fontWeight: "500", marginBottom: "16px" }}>
          ⚠️ Failed to load child details. {child?.message || "Please ensure the backend is running."}
        </p>
        <button 
          onClick={() => navigate("/children")}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN");
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return "—";
    const diff = Date.now() - new Date(dob).getTime();
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 24) return `${months} months`;
    return `${Math.floor(months / 12)} years ${months % 12} months`;
  };

  return (
    <div className="page" style={{ padding: "0 20px 40px" }}>
      {/* Dynamic Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "32px",
        padding: "32px",
        background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
        borderRadius: "24px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
        border: "1px solid rgba(255,255,255,0.6)"
      }}>
        <div>
          <button
            onClick={() => navigate("/children")}
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1px solid #e2e8f0",
              color: "#3b82f6",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 12px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "16px",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#fff"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.7)"}
          >
            ← Back to Children
          </button>
          
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)" }}>
              {child?.name ? child.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>
                {child?.name || "Child Profile"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <p style={{ margin: 0, color: "#475569", fontSize: "15px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🎂</span> {child?.age_months ? `${Math.floor(child.age_months / 12)}y ${child.age_months % 12}m` : calculateAge(child?.dob)}
                </p>
                <span style={{ color: "#cbd5e1" }}>•</span>
                <p style={{ margin: 0, color: "#475569", fontSize: "15px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>👤</span> {child?.gender === "M" || child?.gender?.toLowerCase() === "male" ? "Boy" : "Girl"}
                </p>
              </div>
              <p style={{ margin: "6px 0 0 0", color: "#64748b", fontFamily: "monospace", fontSize: "14px", fontWeight: "600", background: "rgba(0,0,0,0.05)", display: "inline-block", padding: "4px 8px", borderRadius: "6px" }}>
                ID: {child?.child_id}
              </p>
            </div>
          </div>
        </div>
        
        {latest && (
          <div style={{ textAlign: "right", background: "rgba(255,255,255,0.6)", padding: "16px 24px", borderRadius: "20px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.8)" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Status</p>
            <StatusBadge status={latest.status || latest.wfh_status} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
        {[
          { label: "⚖️ Log Measurement", path: `/growth/new?child=${id}`, bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", color: "#1d4ed8", border: "#bfdbfe" },
          { label: "🍎 Log Diet", path: `/nutrition/log?child=${id}`, bg: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)", color: "#7e22ce", border: "#f5d0fe" },
          { label: "🥗 Meal Plan", path: `/mealplan/${id}`, bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", color: "#15803d", border: "#bbf7d0" },
        ].map(({ label, path, bg, color, border }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              padding: "14px 24px",
              background: bg,
              color,
              border: `1px solid ${border}`,
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "15px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05)"; }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* Child Details */}
        <div className="surface" style={{ padding: "28px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👤</span> Child Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Full Name" value={child.name} highlight />
            <InfoRow label="Date of Birth" value={formatDate(child.dob)} />
            <InfoRow label="Age" value={calculateAge(child.dob)} highlight />
            <InfoRow label="Gender" value={child.gender ? child.gender.charAt(0).toUpperCase() + child.gender.slice(1) : "—"} />
            <InfoRow label="AWC Code" value={child.awc_code} />
            <InfoRow label="Enrolled" value={formatDate(child.created_at)} />
          </div>
        </div>

        {/* Parent Details */}
        <div className="surface" style={{ padding: "28px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👨‍👩‍👧</span> Parent / Guardian
          </h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Parent Name" value={child.parent_name} highlight />
            <InfoRow label="Contact" value={child.parent_contact} />
          </div>

          {latest && (
            <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "2px dashed #e2e8f0" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📈</span> Latest Measurement
              </h3>
              <InfoRow label="Date" value={formatDate(latest.measurement_date)} />
              <InfoRow label="Weight" value={latest.weight_kg ? `${latest.weight_kg} kg` : "—"} highlight />
              <InfoRow label="Height" value={latest.height_cm ? `${latest.height_cm} cm` : "—"} highlight />
              <InfoRow label="MUAC" value={latest.muac_cm ? `${latest.muac_cm} cm` : "—"} />
              {latest.z_scores && (
                <InfoRow
                  label="Z-scores"
                  value={`WAZ: ${latest.z_scores.waz?.toFixed(2) ?? "—"} | WHZ: ${latest.z_scores.whz?.toFixed(2) ?? "—"}`}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        {/* Growth Chart */}
        <div className="surface" style={{ padding: "28px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📊</span> Growth History
          </h3>
          {chartData.length > 0 ? (
            <div style={{ marginTop: "16px" }}>
              <GrowthChart data={chartData} />
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "16px", color: "#64748b" }}>
              No growth records found.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Nutrition Analysis */}
          <div className="surface" style={{ padding: "28px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🧠</span> AI Nutrition Analysis
            </h3>
            <NutritionAnalysisSummary analysis={recentNutrition} pending={nutritionPending} />
          </div>

          {/* Vaccination Record */}
          <VaccinationRecord dob={child.dob} completedVaccines={child.vaccinations || []} />

    </div>
    </div>
    </div>
  );
}
