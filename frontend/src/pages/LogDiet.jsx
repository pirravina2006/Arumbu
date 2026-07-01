import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logDiet, fetchNutritionLog } from "../api/nutritionApi.js";
import { getChildById, calcAgeMonths } from "../api/childrenApi.js";

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "600",
  fontSize: "14px",
  color: "#374151",
};

const COMMON_FOODS = [
  "Rice", "Dal", "Ragi porridge", "Egg", "Banana", "Milk",
  "Sambar", "Moringa leaves", "Horsegram", "Sesame seeds", "Drumstick",
];

const SEVERITY_COLORS = {
  severe: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  moderate: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  mild: { bg: "#fefce8", text: "#854d0e", border: "#fde047" },
};

function ScoreBadge({ score }) {
  const color = score >= 7 ? "#15803d" : score >= 5 ? "#b45309" : "#dc2626";
  const bg = score >= 7 ? "#dcfce7" : score >= 5 ? "#fef3c7" : "#fee2e2";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "4px 12px", borderRadius: "20px", fontWeight: "700",
      fontSize: "15px", backgroundColor: bg, color,
    }}>
      Diet Score: {score}/10
    </span>
  );
}

function AnalysisCard({ analysis }) {
  const [showMealPlan, setShowMealPlan] = useState(false);

  return (
    <div style={{ marginTop: "24px" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        backgroundColor: "#f0fdf4",
        borderRadius: "10px 10px 0 0",
        borderTop: "3px solid #22c55e",
        borderLeft: "1px solid #bbf7d0",
        borderRight: "1px solid #bbf7d0",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px",
      }}>
        <div>
          <p style={{ margin: "0 0 2px 0", fontWeight: "700", fontSize: "16px", color: "#166534" }}>
            ✅ AI Nutrition Analysis Complete
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#4b7c5e" }}>
            {analysis.model_used && `Powered by ${analysis.model_used}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {analysis.score != null && <ScoreBadge score={analysis.score} />}
          {analysis.caloric_adequacy_pct != null && (
            <span style={{
              padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
              backgroundColor: "#eff6ff", color: "#1d4ed8",
            }}>
              Calories: {analysis.caloric_adequacy_pct}% of daily need
            </span>
          )}
        </div>
      </div>

      <div style={{
        padding: "20px",
        border: "1px solid #bbf7d0",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        backgroundColor: "white",
        display: "flex", flexDirection: "column", gap: "20px",
      }}>
        {/* Referral Warning */}
        {analysis.referral_needed && (
          <div style={{
            padding: "14px 16px",
            backgroundColor: "#fee2e2",
            borderLeft: "4px solid #dc2626",
            borderRadius: "6px",
            color: "#7f1d1d",
          }}>
            <strong>⚠️ Medical Referral Required</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>{analysis.referral_reason}</p>
          </div>
        )}

        {/* Summary */}
        <div>
          <p style={{ margin: "0 0 6px 0", fontWeight: "600", fontSize: "14px", color: "#374151" }}>Summary</p>
          <p style={{ margin: 0, fontSize: "14px", color: "#4b5563", lineHeight: "1.6" }}>{analysis.summary}</p>
        </div>

        {/* Deficiencies */}
        {analysis.deficiencies?.length > 0 && (
          <div>
            <p style={{ margin: "0 0 10px 0", fontWeight: "600", fontSize: "14px", color: "#374151" }}>
              Nutrient Deficiencies
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {analysis.deficiencies.map((def, i) => {
                const colors = SEVERITY_COLORS[def.severity?.toLowerCase()] || SEVERITY_COLORS.mild;
                return (
                  <div key={i} style={{
                    padding: "12px 14px",
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: colors.text }}>{def.nutrient}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                        backgroundColor: colors.border, color: colors.text, textTransform: "capitalize",
                      }}>
                        {def.severity}
                      </span>
                    </div>
                    {def.foods?.length > 0 && (
                      <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>
                        <span style={{ fontWeight: "600" }}>Recommended foods: </span>
                        {def.foods.join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Meal Plan Toggle */}
        {analysis.meal_plan?.length > 0 && (
          <div>
            <button
              onClick={() => setShowMealPlan(v => !v)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f0f9ff",
                color: "#0369a1",
                border: "1px solid #bae6fd",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              {showMealPlan ? "▲ Hide" : "▼ View"} 7-Day Meal Plan
            </button>
            {showMealPlan && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {analysis.meal_plan.map((day, i) => (
                  <div key={i} style={{
                    padding: "12px 14px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}>
                    <p style={{ margin: "0 0 8px 0", fontWeight: "700", fontSize: "13px", color: "#1e40af" }}>{day.day}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "6px" }}>
                      {["breakfast", "lunch", "snack", "dinner"].map(meal => day[meal] && (
                        <div key={meal}>
                          <span style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{meal}</span>
                          <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#374151" }}>{day[meal]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisPending({ elapsedPolls }) {
  const dots = ".".repeat((elapsedPolls % 3) + 1);
  return (
    <div style={{
      marginTop: "24px",
      padding: "20px",
      backgroundColor: "#fffbeb",
      border: "1px solid #fde68a",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
    }}>
      <div style={{
        width: "36px", height: "36px", flexShrink: 0,
        border: "3px solid #fbbf24", borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <div>
        <p style={{ margin: "0 0 4px 0", fontWeight: "700", color: "#92400e", fontSize: "15px" }}>
          AI is analysing the diet{dots}
        </p>
        <p style={{ margin: 0, fontSize: "13px", color: "#b45309" }}>
          Usually takes 15–30 seconds. Results will appear here automatically.
        </p>
      </div>
    </div>
  );
}

export default function LogDiet() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    child_id: "",
    log_date: new Date().toISOString().split("T")[0],
    food_items: [{ name: "", quantity_g: "" }],
  });
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [childInfo, setChildInfo] = useState(null);
  const [childLookupError, setChildLookupError] = useState("");

  // Analysis polling state
  const [submittedLog, setSubmittedLog] = useState(null); // { logId, childId, analysisQueued }
  const [pollState, setPollState] = useState("idle"); // idle | polling | done | error | timeout | no_measurement
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const pollCount = useRef(0);
  const intervalRef = useRef(null);
  const childIdRef = useRef(""); // always holds latest child_id (avoids stale closure)

  useEffect(() => {
    if (!submittedLog || pollState !== "polling") return;

    intervalRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > 30) { // 30 * 3s = 90s timeout
        clearInterval(intervalRef.current);
        setPollState("timeout");
        return;
      }
      try {
        const log = await fetchNutritionLog(submittedLog.logId);
        if (log.ai_analysis) {
          clearInterval(intervalRef.current);
          setAnalysis(log.ai_analysis);
          setPollState("done");
        } else if (log.ai_analysis_error) {
          clearInterval(intervalRef.current);
          setAnalysisError(log.ai_analysis_error);
          setPollState("error");
        }
      } catch {
        // ignore transient network errors during polling
      }
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [submittedLog, pollState]);

  const updateField = (field, value) => setForm({ ...form, [field]: value });

  /** Fetch child info + auto-calculate age when the Child ID field is left. */
  const handleChildIdBlur = async () => {
    const id = childIdRef.current.trim(); // use ref to avoid stale closure
    if (!id) return;
    setChildLookupError("");
    setChildInfo(null);
    try {
      const child = await getChildById(id);
      setChildInfo(child);
    } catch {
      setChildLookupError("Child ID not found. Please verify and re-enter.");
    }
  };

  const addFoodItem = () =>
    setForm({ ...form, food_items: [...form.food_items, { name: "", quantity_g: "" }] });

  const removeFoodItem = (index) => {
    if (form.food_items.length === 1) return;
    setForm({ ...form, food_items: form.food_items.filter((_, i) => i !== index) });
  };

  const updateFoodItem = (index, field, value) => {
    const items = [...form.food_items];
    items[index] = { ...items[index], [field]: value };
    setForm({ ...form, food_items: items });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const validItems = form.food_items.filter((item) => item.name.trim());
    if (!validItems.length) {
      setSubmitError("Please add at least one food item.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        food_items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity_g: item.quantity_g ? Number(item.quantity_g) : 0,
        })),
      };
      const result = await logDiet(payload);

      const childId = form.child_id;
      setForm({
        child_id: "",
        log_date: new Date().toISOString().split("T")[0],
        food_items: [{ name: "", quantity_g: "" }],
      });
      setAnalysis(null);
      setAnalysisError("");
      pollCount.current = 0;

      if (result.analysis_queued) {
        setSubmittedLog({ logId: result.log_id, childId });
        setPollState("polling");
      } else {
        setSubmittedLog({ logId: result.log_id, childId });
        setPollState("no_measurement");
      }
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to save diet log.");
    } finally {
      setLoading(false);
    }
  };

  const logAnother = () => {
    clearInterval(intervalRef.current);
    setSubmittedLog(null);
    setPollState("idle");
    setAnalysis(null);
    setAnalysisError("");
    setChildInfo(null);
    setChildLookupError("");
  };

  return (
    <div className="page">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "14px", padding: "0 0 8px 0" }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>🍎 Log Diet</h1>
        <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
          Record food intake — AI will analyse nutrients and suggest improvements
        </p>
      </div>

      {/* Diet Log Form */}
      {submitError && (
        <div style={{
          padding: "12px 16px", marginBottom: "16px", borderRadius: "6px",
          backgroundColor: "#fee2e2", color: "#991b1b", borderLeft: "4px solid #dc2626", fontSize: "14px",
        }}>
          {submitError}
        </div>
      )}

      {/* Success banner */}
      {pollState !== "idle" && (
        <div style={{
          padding: "12px 16px", marginBottom: "16px", borderRadius: "6px",
          backgroundColor: "#dcfce7", color: "#166534", borderLeft: "4px solid #22c55e", fontSize: "14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>✅ Diet log saved successfully.</span>
          <button
            onClick={logAnother}
            style={{ background: "none", border: "1px solid #16a34a", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", color: "#15803d", fontSize: "13px", fontWeight: "600" }}
          >
            + Log Another
          </button>
        </div>
      )}

      <form className="card form-stack" onSubmit={handleSubmit} style={{ maxWidth: "640px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "4px" }}>
          <div>
            <label style={labelStyle}>Child ID *</label>
            <input
              style={fieldStyle}
              placeholder="e.g., TN-CBE-01-007-0001"
              value={form.child_id}
              onChange={(e) => {
                childIdRef.current = e.target.value; // keep ref in sync
                updateField("child_id", e.target.value);
                setChildInfo(null);
                setChildLookupError("");
              }}
              onBlur={handleChildIdBlur}
              required
            />
            {childLookupError && (
              <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#dc2626" }}>{childLookupError}</p>
            )}
            {childInfo && (() => {
              const months = childInfo.age_months != null ? childInfo.age_months : calcAgeMonths(childInfo.dob);
              const yrs = Math.floor(months / 12);
              const rem = months % 12;
              const label = yrs > 0
                ? `${yrs} yr${yrs > 1 ? "s" : ""} ${rem} mo`
                : `${months} month${months !== 1 ? "s" : ""}`;
              return (
                <div style={{
                  marginTop: "6px", padding: "8px 12px",
                  backgroundColor: "#f0f9ff", border: "1px solid #bae6fd",
                  borderRadius: "6px", fontSize: "12px", color: "#0369a1",
                }}>
                  <strong>{childInfo.name}</strong> &nbsp;·&nbsp;
                  DOB: {childInfo.dob} &nbsp;·&nbsp;
                  <span style={{ fontWeight: "700" }}>Age: {months} months ({label})</span>
                </div>
              );
            })()}
          </div>
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              style={fieldStyle}
              type="date"
              value={form.log_date}
              onChange={(e) => updateField("log_date", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Food Items */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Food Items *</label>
            <button
              type="button"
              onClick={addFoodItem}
              style={{
                padding: "6px 14px", backgroundColor: "#f0fdf4", color: "#15803d",
                border: "1px solid #86efac", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
              }}
            >
              + Add Food
            </button>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 6px 0" }}>Quick add:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {COMMON_FOODS.map((food) => (
                <button
                  key={food}
                  type="button"
                  onClick={() => {
                    const emptyIdx = form.food_items.findIndex((i) => !i.name.trim());
                    if (emptyIdx !== -1) {
                      updateFoodItem(emptyIdx, "name", food);
                    } else {
                      setForm((f) => ({
                        ...f,
                        food_items: [...f.food_items, { name: food, quantity_g: "" }],
                      }));
                    }
                  }}
                  style={{
                    padding: "4px 10px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb",
                    borderRadius: "12px", cursor: "pointer", fontSize: "12px", color: "#374151",
                  }}
                >
                  {food}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {form.food_items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ flex: 2 }}>
                  {idx === 0 && (
                    <label style={{ ...labelStyle, marginBottom: "4px", fontSize: "12px", color: "#9ca3af" }}>
                      Food Name
                    </label>
                  )}
                  <input
                    style={fieldStyle}
                    placeholder="Food name"
                    value={item.name}
                    onChange={(e) => updateFoodItem(idx, "name", e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {idx === 0 && (
                    <label style={{ ...labelStyle, marginBottom: "4px", fontSize: "12px", color: "#9ca3af" }}>
                      Quantity (g)
                    </label>
                  )}
                  <input
                    style={fieldStyle}
                    type="number"
                    placeholder="grams"
                    value={item.quantity_g}
                    onChange={(e) => updateFoodItem(idx, "quantity_g", e.target.value)}
                    min="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFoodItem(idx)}
                  disabled={form.food_items.length === 1}
                  style={{
                    marginTop: idx === 0 ? "22px" : "0",
                    padding: "10px",
                    backgroundColor: form.food_items.length === 1 ? "#f9fafb" : "#fee2e2",
                    color: form.food_items.length === 1 ? "#d1d5db" : "#dc2626",
                    border: "1px solid",
                    borderColor: form.food_items.length === 1 ? "#e5e7eb" : "#fca5a5",
                    borderRadius: "6px",
                    cursor: form.food_items.length === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1, padding: "12px",
              backgroundColor: loading ? "#9ca3af" : "#8b5cf6",
              color: "white", border: "none", borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "15px",
            }}
          >
            {loading ? "Saving..." : "💾 Save Diet Log"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "12px 20px", backgroundColor: "white", color: "#374151",
              border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: "600",
            }}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Analysis panel */}
      {pollState === "polling" && (
        <div style={{ maxWidth: "640px" }}>
          <AnalysisPending elapsedPolls={pollCount.current} />
        </div>
      )}

      {pollState === "done" && analysis && (
        <div style={{ maxWidth: "640px" }}>
          <AnalysisCard
            analysis={analysis}
          />
        </div>
      )}

      {pollState === "error" && (
        <div style={{
          maxWidth: "640px", marginTop: "20px", padding: "16px",
          backgroundColor: "#fee2e2", borderLeft: "4px solid #dc2626",
          borderRadius: "6px", color: "#7f1d1d", fontSize: "14px",
        }}>
          <strong>AI analysis failed.</strong>
          <p style={{ margin: "4px 0 0 0" }}>{analysisError || "An unexpected error occurred."}</p>
        </div>
      )}

      {pollState === "timeout" && (
        <div style={{
          maxWidth: "640px", marginTop: "20px", padding: "16px",
          backgroundColor: "#fff7ed", borderLeft: "4px solid #f97316",
          borderRadius: "6px", color: "#7c2d12", fontSize: "14px",
        }}>
          <strong>Analysis is taking longer than usual.</strong>
          <p style={{ margin: "4px 0 0 0" }}>
            Check the child's nutrition history page in a few minutes to see the results.
          </p>
        </div>
      )}

      {pollState === "no_measurement" && (
        <div style={{
          maxWidth: "640px", marginTop: "20px", padding: "16px",
          backgroundColor: "#eff6ff", borderLeft: "4px solid #3b82f6",
          borderRadius: "6px", color: "#1e3a5f", fontSize: "14px",
        }}>
          <strong>Diet logged, but AI analysis is unavailable.</strong>
          <p style={{ margin: "4px 0 0 0" }}>
            Please add at least one growth measurement for this child first, then log the diet again to enable AI analysis.
          </p>
        </div>
      )}
    </div>
  );
}
