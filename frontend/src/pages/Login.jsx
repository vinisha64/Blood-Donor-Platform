import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
      const dest =
        data.user.role === "donor" ? "/donor/dashboard" :
        data.user.role === "hospital" ? "/hospital/dashboard" : "/admin/dashboard";
      navigate(dest);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container">
      <div className="card auth-card">
        <h2 style={{ marginBottom: 4 }}>Welcome back</h2>
        <p className="hint" style={{ marginBottom: 20 }}>Log in to your LifeLink account.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
          New here? <Link to="/register/donor">Register as a donor</Link> or{" "}
          <Link to="/register/hospital">as a hospital</Link>.
        </p>
      </div>
    </div>
  );
}
