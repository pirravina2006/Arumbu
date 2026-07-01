import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signup, login, fetchMe } from "../api/authApi.js";
import { useAuthStore } from "./useAuth.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    awc_code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(form);
      const data = await login({ email: form.email, password: form.password });
      setAccessToken(data.access_token);
      const me = await fetchMe();
      setUser(me);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <img 
            src="/arumbu-logo.jpg" 
            alt="Arumbu Logo" 
            style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem' }} 
          />
          <h2 style={{ margin: 0, color: "var(--primary-600)" }}>Arumbu</h2>
        </div>
        <div className="badge">Create Account</div>
        <h1 className="auth-title">Join the Arumbu network</h1>
        <p className="auth-subtitle">
          Set up a worker account to start logging growth and nutrition data.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Full name</label>
            <input id="name" value={form.name} onChange={update("name")} required />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={form.password}
              onChange={update("password")}
              required
            />
          </div>
          <div>
            <label htmlFor="phone">Phone (optional)</label>
            <input id="phone" value={form.phone} onChange={update("phone")} />
          </div>
          <div>
            <label htmlFor="awc">AWC code</label>
            <input id="awc" value={form.awc_code} onChange={update("awc_code")} required />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        {error ? <p className="text-muted">{error}</p> : null}
        <p className="text-muted">
          Already have an account? <Link className="link" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
