import { useState, useEffect, useRef } from "react";
import { growthApi } from "../api/growthApi.js";
import { getChildById, calcAgeMonths } from "../api/childrenApi.js";
import { saveMeasurementOffline, getOfflineStats } from "../utils/offlineDB.js";
import { getSyncStatus } from "../utils/offlineSync.js";

export default function LogMeasurement() {
  const [form, setForm] = useState({
    child_id: "",
    measurement_date: new Date().toISOString().split('T')[0],
    age_months: "",
    weight_kg: "",
    height_cm: "",
    muac_cm: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error, warning
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineStats, setOfflineStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [childInfo, setChildInfo] = useState(null);   // fetched child record
  const [childLookupError, setChildLookupError] = useState("");
  const childIdRef = useRef(""); // always holds latest child_id value (avoids stale closure)

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Update offline stats periodically
    const statsInterval = setInterval(async () => {
      const stats = await getOfflineStats();
      setOfflineStats(stats);
    }, 2000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(statsInterval);
    };
  }, []);

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  /** When the worker finishes typing the child ID, fetch DOB and auto-fill age. */
  const handleChildIdBlur = async () => {
    const id = childIdRef.current.trim(); // use ref to avoid stale closure
    if (!id) return;
    setChildLookupError("");
    setChildInfo(null);
    try {
      const child = await getChildById(id);
      setChildInfo(child);
      // Prefer server-computed age_months; fall back to client calc
      const months = child.age_months != null ? child.age_months : calcAgeMonths(child.dob);
      setForm(prev => ({ ...prev, age_months: String(months) }));
    } catch {
      setChildLookupError("Child ID not found. Please check and re-enter.");
      setForm(prev => ({ ...prev, age_months: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const measurementData = {
        child_id: form.child_id,
        measurement_date: form.measurement_date,
        age_months: Number(form.age_months),
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        muac_cm: Number(form.muac_cm),
      };

      if (isOnline) {
        // Try to sync online
        await growthApi.addMeasurement(measurementData);
        setMessageType("success");
        setMessage("✅ Measurement saved successfully.");
        // Reset form
        setForm({
          child_id: "",
          measurement_date: new Date().toISOString().split('T')[0],
          age_months: "",
          weight_kg: "",
          height_cm: "",
          muac_cm: "",
        });
        setChildInfo(null);
        setChildLookupError("");
      } else {
        // Save offline
        await saveMeasurementOffline(measurementData);
        setMessageType("warning");
        setMessage("📱 You are offline. Measurement saved locally. It will sync when you reconnect.");
      }
    } catch (err) {
      if (!isOnline) {
        // Fallback to offline save if online save fails
        try {
          const measurementData = {
            child_id: form.child_id,
            measurement_date: form.measurement_date,
            age_months: Number(form.age_months),
            weight_kg: Number(form.weight_kg),
            height_cm: Number(form.height_cm),
            muac_cm: Number(form.muac_cm),
          };
          await saveMeasurementOffline(measurementData);
          setMessageType("warning");
          setMessage("📱 Network error. Measurement saved locally for later sync.");
        } catch (offlineErr) {
          setMessageType("error");
          setMessage("❌ Failed to save measurement: " + offlineErr.message);
        }
      } else {
        setMessageType("error");
        setMessage("❌ Failed to save measurement: " + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "24px" }}>
        ⚖️ Log Measurement
      </h1>

      {/* Online/Offline Status */}
      <div
        style={{
          padding: "12px",
          marginBottom: "24px",
          borderRadius: "6px",
          backgroundColor: isOnline ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${isOnline ? "#86efac" : "#fecaca"}`,
          color: isOnline ? "#166534" : "#991b1b",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        {isOnline ? "✅ Online Mode" : "📱 Offline Mode"}
        {offlineStats.pending > 0 && (
          <span style={{ marginLeft: "12px" }}>
            ({offlineStats.pending} pending measurements)
          </span>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div
          style={{
            padding: "12px",
            marginBottom: "24px",
            borderRadius: "6px",
            backgroundColor:
              messageType === "success"
                ? "#dcfce7"
                : messageType === "warning"
                ? "#fef3c7"
                : "#fee2e2",
            color:
              messageType === "success"
                ? "#166534"
                : messageType === "warning"
                ? "#92400e"
                : "#991b1b",
            borderLeft: `4px solid ${
              messageType === "success"
                ? "#22c55e"
                : messageType === "warning"
                ? "#eab308"
                : "#dc2626"
            }`,
          }}
        >
          {message}
        </div>
      )}

      <form className="card form-stack" onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
            Child ID *
          </label>
          <input
            type="text"
            placeholder="e.g., TN-BNG-001-0001"
            value={form.child_id}
            onChange={(e) => {
              childIdRef.current = e.target.value; // keep ref in sync
              setForm({ ...form, child_id: e.target.value });
              setChildInfo(null);
              setChildLookupError("");
            }}
            onBlur={handleChildIdBlur}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
          {childLookupError && (
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#dc2626" }}>{childLookupError}</p>
          )}
          {childInfo && (() => {
            const months = calcAgeMonths(childInfo.dob);
            const yrs = Math.floor(months / 12);
            const rem = months % 12;
            const label = yrs > 0
              ? `${yrs} yr${yrs > 1 ? "s" : ""} ${rem} mo`
              : `${months} month${months !== 1 ? "s" : ""}`;
            return (
              <div style={{
                marginTop: "8px", padding: "10px 12px",
                backgroundColor: "#f0f9ff", border: "1px solid #bae6fd",
                borderRadius: "6px", fontSize: "13px", color: "#0369a1",
              }}>
                <strong>{childInfo.name}</strong> &nbsp;·&nbsp;
                DOB: {childInfo.dob} &nbsp;·&nbsp;
                <span style={{ fontWeight: "700" }}>Age: {months} months ({label})</span>
              </div>
            );
          })()}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
            Measurement Date *
          </label>
          <input
            type="date"
            value={form.measurement_date}
            onChange={update("measurement_date")}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
            Age (months) *
          </label>
          <input
            type="number"
            placeholder={childInfo ? "Auto-filled from DOB" : "Enter child ID first"}
            value={form.age_months}
            onChange={childInfo ? undefined : update("age_months")}
            readOnly={!!childInfo}
            required
            min="0"
            max="120"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              boxSizing: "border-box",
              backgroundColor: childInfo ? "#f9fafb" : "white",
              color: childInfo ? "#6b7280" : "#111827",
              fontWeight: childInfo ? "700" : "400",
            }}
          />
          {childInfo && (
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
              Auto-calculated from date of birth.
            </p>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
            Weight (kg) *
          </label>
          <input
            type="number"
            placeholder="7.5"
            value={form.weight_kg}
            onChange={update("weight_kg")}
            required
            step="0.1"
            min="0"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
            Height (cm) *
          </label>
          <input
            type="number"
            placeholder="65"
            value={form.height_cm}
            onChange={update("height_cm")}
            required
            step="0.1"
            min="0"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
            MUAC - Mid Upper Arm Circumference (cm) *
          </label>
          <input
            type="number"
            placeholder="12.5"
            value={form.muac_cm}
            onChange={update("muac_cm")}
            required
            step="0.1"
            min="0"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "16px",
          }}
        >
          {loading ? "Saving..." : "💾 Save Measurement"}
        </button>
      </form>
    </div>
  );
}
