import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createChild } from "../api/childrenApi.js";
import { calcAgeMonths } from "../api/childrenApi.js";
import { useAuthStore } from "../auth/useAuth.js";

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

// Compute the allowed date-of-birth range for children aged 0–10.
const today = new Date();
const maxDob = today.toISOString().split("T")[0]; // today (newborns allowed)
const minDobDate = new Date(today);
minDobDate.setFullYear(minDobDate.getFullYear() - 10);
const minDob = minDobDate.toISOString().split("T")[0]; // exactly 10 years ago

export default function RegisterChild() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    dob: "",
    gender: "female",
    awc_code: "",
    parent_name: "",
    parent_contact: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.awc_code) {
      setForm((prev) => ({ ...prev, awc_code: user.awc_code }));
    }
  }, [user]);

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: "", type: "" });

    // Age validation — child must be 10 years old or younger.
    if (form.dob) {
      const dob = new Date(form.dob);
      const ageMs = Date.now() - dob.getTime();
      const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears > 10) {
        setMessage({ text: "❌ Only children aged 10 years or younger can be registered in this AWC programme.", type: "error" });
        return;
      }
    }

    setLoading(true);
    try {
      const created = await createChild(form);
      setMessage({ text: `✅ Registered ${created.name} (${created.child_id}) successfully.`, type: "success" });
      setForm({
        name: "",
        dob: "",
        gender: "female",
        awc_code: user?.awc_code || "",
        parent_name: "",
        parent_contact: "",
      });
    } catch (err) {
      setMessage({ text: err.response?.data?.detail || "Registration failed. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <button
            onClick={() => navigate("/children")}
            style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "14px", padding: "0 0 8px 0" }}
          >
            ← Back to Children
          </button>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Register Child</h1>
          <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>Enroll a new child into the AWC</p>
        </div>
      </div>

      {message.text && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            borderRadius: "6px",
            backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            borderLeft: `4px solid ${message.type === "success" ? "#22c55e" : "#dc2626"}`,
            fontSize: "14px",
          }}
        >
          {message.text}
        </div>
      )}

      <form
        className="card form-stack"
        onSubmit={handleSubmit}
        style={{ maxWidth: "600px" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              style={fieldStyle}
              placeholder="e.g., Kavya Lakshmi"
              value={form.name}
              onChange={update("name")}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Date of Birth *</label>
            <input
              style={fieldStyle}
              type="date"
              value={form.dob}
              onChange={update("dob")}
              min={minDob}
              max={maxDob}
              required
            />
            {form.dob && (() => {
              const months = calcAgeMonths(form.dob);
              const yrs = Math.floor(months / 12);
              const rem = months % 12;
              const label = yrs > 0
                ? `${yrs} yr${yrs > 1 ? "s" : ""} ${rem} month${rem !== 1 ? "s" : ""}`
                : `${months} month${months !== 1 ? "s" : ""}`;
              return (
                <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "600", color: "#0369a1" }}>
                  🗓️ Age: {months} months ({label})
                </p>
              );
            })()}
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
              Only children aged 0 – 10 years can be enrolled.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Gender *</label>
            <select
              style={fieldStyle}
              value={form.gender}
              onChange={update("gender")}
              required
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>AWC Code *</label>
            <input
              style={{
                ...fieldStyle,
                backgroundColor: user?.role === "worker" ? "#f9fafb" : "white",
                color: user?.role === "worker" ? "#6b7280" : "#111827",
              }}
              placeholder="e.g., TN-CBE-01-007"
              value={form.awc_code}
              onChange={update("awc_code")}
              readOnly={user?.role === "worker"}
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Parent / Guardian Name *</label>
            <input
              style={fieldStyle}
              placeholder="e.g., Lakshmi Devi"
              value={form.parent_name}
              onChange={update("parent_name")}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Parent Contact Number *</label>
            <input
              style={fieldStyle}
              placeholder="10-digit mobile number"
              value={form.parent_contact}
              onChange={update("parent_contact")}
              pattern="[0-9]{10}"
              title="Enter a 10-digit mobile number"
              required
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: loading ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "15px",
            }}
          >
            {loading ? "Registering..." : "Register Child"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/children")}
            style={{
              padding: "12px 20px",
              backgroundColor: "white",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "15px",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
