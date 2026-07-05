import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { StatusBadge, UrgencyBadge, BloodBadge } from "../components/Badges";
import LocationField from "../components/LocationField";

export default function DonorDashboard() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [showLocationEdit, setShowLocationEdit] = useState(false);
  const [coords, setCoords] = useState({ latitude: "", longitude: "" });

  const loadRequests = async () => {
    try {
      const { data } = await api.get("/requests/my");
      setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 20000);
    return () => clearInterval(interval);
  }, []);

  const toggleAvailability = async () => {
    const { data } = await api.put("/donors/profile/update", { isAvailable: !user.isAvailable });
    setUser(data.user);
    showToast(data.user.isAvailable ? "You're marked as available" : "You're marked as unavailable", "info");
  };

  const respond = async (id, action) => {
    setActionError("");
    try {
      await api.put(`/requests/${id}/respond`, { action });
      showToast(action === "accept" ? "Request accepted" : "Request declined", action === "accept" ? "success" : "info");
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.message || "Action failed";
      setActionError(msg);
      showToast(msg, "error");
    }
  };

  const saveLocation = async (e) => {
    e.preventDefault();
    const { data } = await api.put("/donors/profile/update", coords);
    setUser(data.user);
    setShowLocationEdit(false);
    showToast("Location updated", "success");
  };

  const eligible = (() => {
    if (!user.lastDonationDate) return true;
    const days = (Date.now() - new Date(user.lastDonationDate).getTime()) / 86400000;
    return days >= 90;
  })();

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  return (
    <div className="page container">
      <div className="page-header">
        <div>
          <h2>Hi, {user.name.split(" ")[0]}</h2>
          <p className="hint">Your donor dashboard</p>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <h3 style={{ marginBottom: 12 }}>
            Requests waiting for your response {pending.length > 0 && `(${pending.length})`}
          </h3>
          {actionError && <div className="error-banner">{actionError}</div>}
          {loading && <p className="hint">Loading...</p>}
          {!loading && pending.length === 0 && (
            <div className="card empty-state">No pending requests right now.</div>
          )}
          {pending.map((r) => (
            <div className="request-card" key={r._id}>
              <div className="top-row">
                <div>
                  <strong>{r.hospital?.hospitalName || r.hospital?.name}</strong>
                  <div className="meta-row">
                    <BloodBadge group={r.bloodGroup} /> · {r.unitsNeeded} unit(s)
                    <UrgencyBadge urgency={r.urgency} />
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.message && <p style={{ marginTop: 8, fontSize: "0.9rem" }}>{r.message}</p>}
              <p className="hint">{r.hospital?.phone} · {r.hospital?.address}</p>
              <div className="actions">
                <button className="btn btn-primary btn-sm" onClick={() => respond(r._id, "accept")}>Accept</button>
                <button className="btn btn-danger btn-sm" onClick={() => respond(r._id, "decline")}>Decline</button>
              </div>
            </div>
          ))}

          <h3 style={{ margin: "28px 0 12px" }}>History</h3>
          {history.length === 0 && <div className="card empty-state">No past requests yet.</div>}
          {history.map((r) => (
            <div className="request-card" key={r._id}>
              <div className="top-row">
                <div>
                  <strong>{r.hospital?.hospitalName || r.hospital?.name}</strong>
                  <div className="meta-row">
                    <BloodBadge group={r.bloodGroup} /> · {r.unitsNeeded} unit(s)
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card">
            <h3>Your profile</h3>
            <div style={{ margin: "16px 0", display: "flex", gap: 10, alignItems: "center" }}>
              <span className="badge badge-blood">{user.bloodGroup}</span>
              <span className={`badge ${user.isAvailable ? "badge-available" : "badge-unavailable"}`}>
                {user.isAvailable ? "Available" : "Not available"}
              </span>
              <span className={`badge ${eligible ? "badge-available" : "badge-pending"}`}>
                {eligible ? "Eligible to donate" : "In cooldown period"}
              </span>
            </div>
            <p className="hint">
              Last donation: {user.lastDonationDate ? new Date(user.lastDonationDate).toLocaleDateString() : "No record yet"}
            </p>
            <p className="hint">Address: {user.address || "Not set"}</p>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={toggleAvailability}>
              {user.isAvailable ? "Mark myself unavailable" : "Mark myself available"}
            </button>
            <button
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8 }}
              onClick={() => setShowLocationEdit((s) => !s)}
            >
              Update my location
            </button>
            {showLocationEdit && (
              <form onSubmit={saveLocation} style={{ marginTop: 12 }}>
                <LocationField
                  latitude={coords.latitude}
                  longitude={coords.longitude}
                  onChange={(lat, lng) => setCoords({ latitude: lat, longitude: lng })}
                />
                <button className="btn btn-primary btn-block">Save location</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
