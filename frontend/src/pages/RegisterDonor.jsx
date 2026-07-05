import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LocationField from "../components/LocationField";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegisterDonor() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    bloodGroup: "O+", age: "", gender: "male", address: "",
    latitude: "", longitude: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.latitude || !form.longitude) {
      setError("Please provide your location so hospitals can find you nearby.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/donor", form);
      login(data.token, data.user);
      navigate("/donor/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container">
      <div className="card auth-card" style={{ maxWidth: 560 }}>
        <h2 style={{ marginBottom: 4 }}>Register as a donor</h2>
        <p className="hint" style={{ marginBottom: 20 }}>
          Takes two minutes. You control your availability at any time.
        </p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label>Full name</label>
              <input required value={form.name} onChange={update("name")} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input required value={form.phone} onChange={update("phone")} />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={update("email")} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={update("password")} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Blood group</label>
              <select value={form.bloodGroup} onChange={update("bloodGroup")}>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Age</label>
              <input type="number" min={18} max={65} required value={form.age} onChange={update("age")} />
            </div>
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={form.gender} onChange={update("gender")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Address (optional, for display only)</label>
            <input value={form.address} onChange={update("address")} placeholder="City, area" />
          </div>
          <LocationField
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />
          <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Creating account..." : "Create donor account"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
