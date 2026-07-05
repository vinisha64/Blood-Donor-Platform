import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LocationField from "../components/LocationField";

export default function RegisterHospital() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    hospitalName: "", licenseNumber: "", address: "",
    latitude: "", longitude: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.latitude || !form.longitude) {
      setError("Please provide the hospital's location so donors nearby can be found.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/hospital", form);
      login(data.token, data.user);
      setNotice(data.notice);
      setTimeout(() => navigate("/hospital/dashboard"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container">
      <div className="card auth-card" style={{ maxWidth: 560 }}>
        <h2 style={{ marginBottom: 4 }}>Register your hospital</h2>
        <p className="hint" style={{ marginBottom: 20 }}>
          Your account will need a quick admin verification before you can send requests.
        </p>
        {error && <div className="error-banner">{error}</div>}
        {notice && <div className="success-banner">{notice}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label>Contact person name</label>
              <input required value={form.name} onChange={update("name")} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input required value={form.phone} onChange={update("phone")} />
            </div>
          </div>
          <div className="field">
            <label>Hospital name</label>
            <input required value={form.hospitalName} onChange={update("hospitalName")} />
          </div>
          <div className="field">
            <label>License number</label>
            <input required value={form.licenseNumber} onChange={update("licenseNumber")} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={update("email")} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={update("password")} />
          </div>
          <div className="field">
            <label>Address</label>
            <input value={form.address} onChange={update("address")} placeholder="Street, city" />
          </div>
          <LocationField
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />
          <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Creating account..." : "Register hospital"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
