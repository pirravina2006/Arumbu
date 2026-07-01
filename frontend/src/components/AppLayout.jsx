import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/useAuth.js";

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);

  const handleLogout = () => {
    clear();
    navigate("/login");
  };

  const navLinks = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/children", label: "Children" },
    { to: "/growth/new", label: "Measurements" },
    { to: "/nutrition/log", label: "Nutrition" },
    { to: "/reports", label: "Reports" },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img 
              src="/arumbu-logo.jpg" 
              alt="Arumbu Logo" 
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            Arumbu
          </div>
          <nav className="nav-links">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
                to={to}
                end={end}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-user">
            <span className="user-pill">
              {user?.name || "User"} · {user?.role || "worker"}
            </span>
            <button type="button" className="button-ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
