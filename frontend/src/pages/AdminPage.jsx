import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient.js";
import { useAuthStore } from "../auth/useAuth.js";

const ROLES = ["worker", "supervisor", "cdpo", "district", "admin"];

const fieldStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "600",
  fontSize: "13px",
  color: "#374151",
};

const ROLE_BADGE = {
  admin: { bg: "#fce7f3", text: "#9d174d" },
  worker: { bg: "#eff6ff", text: "#1e40af" },
  supervisor: { bg: "#f0fdf4", text: "#166534" },
  cdpo: { bg: "#fef3c7", text: "#92400e" },
  district: { bg: "#f5f3ff", text: "#5b21b6" },
};

function RoleBadge({ role }) {
  const s = ROLE_BADGE[role] || { bg: "#f3f4f6", text: "#4b5563" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        backgroundColor: s.bg,
        color: s.text,
        borderRadius: "10px",
        fontSize: "12px",
        fontWeight: "700",
        textTransform: "capitalize",
      }}
    >
      {role}
    </span>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "worker",
    awc_code: "",
    phone: "",
  });
  const [formMsg, setFormMsg] = useState({ text: "", type: "" });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormMsg({ text: "", type: "" });
    setCreating(true);
    try {
      await api.post("/admin/users", formData);
      setFormMsg({ text: `✅ User "${formData.name}" created successfully.`, type: "success" });
      setFormData({ name: "", email: "", password: "", role: "worker", awc_code: "", phone: "" });
      await fetchUsers();
    } catch (err) {
      setFormMsg({ text: err.response?.data?.detail || "Failed to create user.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !search.trim() ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.awc_code?.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  return (
    <div className="page">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>⚙️ Admin Panel</h1>
        <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
          Manage users and AWC assignments
        </p>
      </div>

      {/* Role Summary */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        {ROLES.map((role) => (
          <div
            key={role}
            style={{
              padding: "8px 16px",
              backgroundColor: ROLE_BADGE[role]?.bg || "#f3f4f6",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            <span style={{ fontWeight: "700", color: ROLE_BADGE[role]?.text || "#4b5563" }}>
              {roleCounts[role] || 0}
            </span>{" "}
            <span style={{ color: "#6b7280", textTransform: "capitalize" }}>{role}s</span>
          </div>
        ))}
        <div style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", borderRadius: "8px", fontSize: "13px" }}>
          <span style={{ fontWeight: "700", color: "#111827" }}>{users.length}</span>{" "}
          <span style={{ color: "#6b7280" }}>total users</span>
        </div>
      </div>

      {/* Create User */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "24px", overflow: "hidden" }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            width: "100%",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9fafb",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            color: "#374151",
          }}
        >
          <span>➕ Create New User</span>
          <span>{showForm ? "▲" : "▼"}</span>
        </button>

        {showForm && (
          <div style={{ padding: "20px" }}>
            {formMsg.text && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: "16px",
                  borderRadius: "6px",
                  backgroundColor: formMsg.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: formMsg.type === "success" ? "#166534" : "#991b1b",
                  fontSize: "14px",
                  borderLeft: `4px solid ${formMsg.type === "success" ? "#22c55e" : "#dc2626"}`,
                }}
              >
                {formMsg.text}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input style={fieldStyle} value={formData.name} onChange={updateForm("name")} placeholder="Priya Devi" required />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={fieldStyle} type="email" value={formData.email} onChange={updateForm("email")} placeholder="priya@arumbu.tn" required />
                </div>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input style={fieldStyle} type="password" value={formData.password} onChange={updateForm("password")} placeholder="Min 8 chars" minLength={8} required />
                </div>
                <div>
                  <label style={labelStyle}>Role *</label>
                  <select style={fieldStyle} value={formData.role} onChange={updateForm("role")} required>
                    {ROLES.map((r) => (
                      <option key={r} value={r} style={{ textTransform: "capitalize" }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>AWC Code</label>
                  <input style={fieldStyle} value={formData.awc_code} onChange={updateForm("awc_code")} placeholder="TN-CBE-01-007" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={fieldStyle} value={formData.phone} onChange={updateForm("phone")} placeholder="9876543210" />
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: "10px 24px",
                  backgroundColor: creating ? "#9ca3af" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: creating ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>All Users</h3>
          <input
            type="text"
            placeholder="Search by name, email, AWC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...fieldStyle, width: "260px" }}
          />
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No users found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Name</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Email</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Role</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>AWC Code</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Phone</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr
                    key={u.id || u.email}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: "500" }}>{u.name}</td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <RoleBadge role={u.role} />
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6b7280", fontFamily: "monospace", fontSize: "13px" }}>
                      {u.awc_code || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>{u.phone || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          backgroundColor: u.is_active !== false ? "#dcfce7" : "#fee2e2",
                          color: u.is_active !== false ? "#166534" : "#991b1b",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {u.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", color: "#9ca3af", fontSize: "13px" }}>
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>
    </div>
  );
}
