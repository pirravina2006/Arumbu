import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listChildrenWithStatus } from "../api/childrenApi.js";

const STATUS_COLORS = {
  SAM: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  MAM: { bg: "#fed7aa", text: "#92400e", border: "#fdba74" },
  Normal: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
};

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: "#f3f4f6", text: "#6b7280", border: "#d1d5db" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "0.04em",
      }}
    >
      {status || "Not measured"}
    </span>
  );
}

export default function ChildrenList() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    listChildrenWithStatus()
      .then(setChildren)
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = children;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.child_id?.toLowerCase().includes(q) ||
          c.parent_name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      if (statusFilter === "unmeasured") {
        result = result.filter((c) => !c.latest_status);
      } else {
        result = result.filter((c) => c.latest_status === statusFilter);
      }
    }
    return result;
  }, [children, search, statusFilter]);

  const counts = useMemo(() => {
    const sam = children.filter((c) => c.latest_status === "SAM").length;
    const mam = children.filter((c) => c.latest_status === "MAM").length;
    const normal = children.filter((c) => c.latest_status === "Normal").length;
    const unmeasured = children.filter((c) => !c.latest_status).length;
    return { sam, mam, normal, unmeasured, total: children.length };
  }, [children]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Children</h1>
          <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
            {loading ? "Loading..." : `${counts.total} enrolled`}
          </p>
        </div>
        <button
          onClick={() => navigate("/children/new")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          + Register Child
        </button>
      </div>

      {/* Status Summary */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "SAM", count: counts.sam, colors: STATUS_COLORS.SAM, filter: "SAM" },
            { label: "MAM", count: counts.mam, colors: STATUS_COLORS.MAM, filter: "MAM" },
            { label: "Normal", count: counts.normal, colors: STATUS_COLORS.Normal, filter: "Normal" },
            { label: "Not Measured", count: counts.unmeasured, colors: { bg: "#f3f4f6", text: "#4b5563", border: "#d1d5db" }, filter: "unmeasured" },
          ].map(({ label, count, colors, filter }) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(statusFilter === filter ? "all" : filter)}
              style={{
                padding: "12px",
                backgroundColor: statusFilter === filter ? colors.bg : "#ffffff",
                border: `2px solid ${statusFilter === filter ? colors.border : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: "22px", fontWeight: "700", color: colors.text }}>{count}</div>
              <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name, ID, or parent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          <option value="all">All Status</option>
          <option value="SAM">SAM</option>
          <option value="MAM">MAM</option>
          <option value="Normal">Normal</option>
          <option value="unmeasured">Not Measured</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>Loading children...</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            color: "#6b7280",
          }}
        >
          {children.length === 0 ? "No children registered yet." : "No children match your search."}
        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Name</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Child ID</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Age / DOB</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#374151" }}>Last Measured</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((child, idx) => (
                <tr
                  key={child.child_id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#fafafa")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: "600" }}>
                    <div>{child.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "400" }}>{child.gender}</div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#374151", fontFamily: "monospace", fontSize: "13px" }}>
                    {child.child_id}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>
                    {formatDate(child.dob)}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <StatusBadge status={child.latest_status} />
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "13px" }}>
                    {formatDate(child.latest_measurement_date)}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <button
                      onClick={() => navigate(`/children/${child.child_id}`)}
                      style={{
                        display: "inline-block",
                        padding: "6px 14px",
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: "600",
                        border: "1px solid #bfdbfe",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#dbeafe";
                        e.currentTarget.style.borderColor = "#93c5fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#eff6ff";
                        e.currentTarget.style.borderColor = "#bfdbfe";
                      }}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "12px", color: "#9ca3af", fontSize: "13px" }}>
        Showing {filtered.length} of {counts.total} children
      </p>
    </div>
  );
}
