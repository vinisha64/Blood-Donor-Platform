import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { StatusBadge, UrgencyBadge, BloodBadge } from "../components/Badges";
import DonorMap from "../components/DonorMap";
import LocationField from "../components/LocationField";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HospitalDashboard() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("search");
  const [donors, setDonors] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [lastSearched, setLastSearched] = useState(null);
  const [filters, setFilters] = useState({ bloodGroup: "", maxDistance: 25, onlyAvailable: true });

  // Search location defaults to the hospital's registered location, but can be overridden
  // (useful for hospitals with multiple branches or a specific ward's need).
  const [hospLng, hospLat] = user.location?.coordinates || [0, 0];
  const [searchLocation, setSearchLocation] = useState({
    latitude: hospLat || "",
    longitude: hospLng || "",
  });
  const [showLocationOverride, setShowLocationOverride] = useState(false);

  const [sentRequests, setSentRequests] = useState([]);
  const [modalDonor, setModalDonor] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ unitsNeeded: 1, urgency: "critical", message: "" });
  const [broadcastError, setBroadcastError] = useState("");
  const [requestForm, setRequestForm] = useState({ unitsNeeded: 1, urgency: "normal", message: "" });
  const [sendError, setSendError] = useState("");

  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    hospitalName: user.hospitalName, phone: user.phone, address: user.address || "",
    latitude: "", longitude: "",
  });

  const validLocation = searchLocation.latitude && searchLocation.longitude &&
    !(parseFloat(searchLocation.latitude) === 0 && parseFloat(searchLocation.longitude) === 0);

  const search = async () => {
    if (!validLocation) {
      setSearchError("Set a valid search location first (see 'Search from a different location' below, or update your profile location).");
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    try {
      const { data } = await api.get("/donors/search", {
        params: {
          latitude: searchLocation.latitude,
          longitude: searchLocation.longitude,
          bloodGroup: filters.bloodGroup || undefined,
          maxDistance: filters.maxDistance,
          onlyAvailable: filters.onlyAvailable,
        },
      });
      const sorted = data.donors.sort((a, b) => a.distanceKm - b.distanceKm);
      setDonors(sorted);
      setLastSearched(new Date());
      showToast(`Found ${sorted.length} donor${sorted.length === 1 ? "" : "s"} nearby`, "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Search failed";
      setSearchError(msg);
      showToast(msg, "error");
    } finally {
      setSearchLoading(false);
    }
  };

  const loadSent = async () => {
    const { data } = await api.get("/requests/my");
    setSentRequests(data.requests);
  };

  useEffect(() => {
    if (validLocation) search();
    loadSent();
    const interval = setInterval(loadSent, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (donor) => {
    if (!user.isVerified) {
      showToast("Your hospital account needs admin verification before you can send requests.", "error");
      return;
    }
    setModalDonor(donor);
    setRequestForm({ unitsNeeded: 1, urgency: "normal", message: "" });
    setSendError("");
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    setSendError("");
    try {
      await api.post("/requests", {
        donorId: modalDonor._id,
        bloodGroup: modalDonor.bloodGroup,
        ...requestForm,
      });
      showToast(`Request sent to ${modalDonor.name}`, "success");
      loadSent();
      setModalDonor(null);
    } catch (err) {
      setSendError(err.response?.data?.message || "Failed to send request");
    }
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    setBroadcastError("");
    try {
      const { data } = await api.post("/requests/broadcast", {
        bloodGroup: filters.bloodGroup,
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        maxDistance: filters.maxDistance,
        ...broadcastForm,
      });
      showToast(data.message, "success");
      loadSent();
      setShowBroadcast(false);
    } catch (err) {
      setBroadcastError(err.response?.data?.message || "Broadcast failed");
    }
  };

  const markCompleted = async (id) => {
    await api.put(`/requests/${id}/complete`);
    showToast("Marked as completed. Thank you for confirming!", "success");
    loadSent();
  };

  const cancelRequest = async (id) => {
    if (!confirm("Cancel this pending request?")) return;
    await api.put(`/requests/${id}/cancel`);
    showToast("Request cancelled", "info");
    loadSent();
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const payload = { hospitalName: profileForm.hospitalName, phone: profileForm.phone, address: profileForm.address };
    if (profileForm.latitude && profileForm.longitude) {
      payload.latitude = profileForm.latitude;
      payload.longitude = profileForm.longitude;
    }
    const { data } = await api.put("/hospitals/profile/update", payload);
    setUser(data.user);
    showToast("Profile updated", "success");
    setShowProfileEdit(false);
  };

  const pending = sentRequests.filter((r) => r.status === "pending");

  return (
    <div className="page container">
      <div className="page-header">
        <div>
          <h2>{user.hospitalName}</h2>
          <p className="hint" style={{ marginTop: 6 }}>
            {user.isVerified ? (
              <span className="badge badge-available">✓ Verified hospital</span>
            ) : (
              <span className="badge badge-pending">
                Pending admin verification — you can search donors, but "Send request" is locked until an admin approves your account
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowProfileEdit((s) => !s)}>
          Edit hospital profile
        </button>
      </div>

      {showProfileEdit && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Edit profile</h3>
          <form onSubmit={saveProfile}>
            <div className="field-row">
              <div className="field">
                <label>Hospital name</label>
                <input value={profileForm.hospitalName} onChange={(e) => setProfileForm({ ...profileForm, hospitalName: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Address</label>
              <input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
            </div>
            <LocationField
              latitude={profileForm.latitude}
              longitude={profileForm.longitude}
              onChange={(lat, lng) => setProfileForm({ ...profileForm, latitude: lat, longitude: lng })}
            />
            <p className="hint" style={{ marginBottom: 12 }}>Leave location blank to keep your current registered address.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary">Save changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProfileEdit(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>Find donors</button>
        <button className={`tab ${tab === "sent" ? "active" : ""}`} onClick={() => setTab("sent")}>
          Sent requests {pending.length > 0 && `(${pending.length} pending)`}
        </button>
      </div>

      {tab === "search" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="field-row" style={{ alignItems: "end" }}>
              <div className="field">
                <label>Blood group</label>
                <select value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
                  <option value="">Any</option>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Radius: {filters.maxDistance} km</label>
                <input
                  type="range" min={5} max={100} step={5}
                  value={filters.maxDistance}
                  onChange={(e) => setFilters({ ...filters, maxDistance: e.target.value })}
                />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={filters.onlyAvailable}
                onChange={(e) => setFilters({ ...filters, onlyAvailable: e.target.checked })}
              />
              Only show available donors
            </label>

            <button
              type="button"
              className="link"
              style={{ fontSize: "0.85rem", marginBottom: 12, display: "block" }}
              onClick={() => setShowLocationOverride((s) => !s)}
            >
              {showLocationOverride ? "Hide" : "Search from a different location"} (e.g. another branch)
            </button>
            {showLocationOverride && (
              <LocationField
                latitude={searchLocation.latitude}
                longitude={searchLocation.longitude}
                onChange={(lat, lng) => setSearchLocation({ latitude: lat, longitude: lng })}
              />
            )}

            <button className="btn btn-primary" onClick={search} disabled={searchLoading}>
              {searchLoading ? "Searching..." : "Search"}
            </button>
            {filters.bloodGroup && donors.length > 0 && (
              <button
                className="btn btn-danger btn-sm"
                style={{ marginLeft: 8 }}
                onClick={() => { setShowBroadcast(true); setBroadcastError(""); }}
              >
                🚨 Broadcast to all {donors.length} matching donors
              </button>
            )}
            {lastSearched && !searchLoading && (
              <span className="hint" style={{ marginLeft: 12 }}>
                {donors.length} donor{donors.length === 1 ? "" : "s"} found · updated {lastSearched.toLocaleTimeString()}
              </span>
            )}
          </div>

          {searchError && <div className="error-banner">{searchError}</div>}

          {validLocation && donors.length > 0 && (
            <DonorMap
              center={[parseFloat(searchLocation.latitude), parseFloat(searchLocation.longitude)]}
              donors={donors}
              radiusKm={Number(filters.maxDistance)}
            />
          )}

          {!searchLoading && donors.length === 0 && !searchError && (
            <div className="card empty-state">No donors found in this radius. Try increasing the search distance.</div>
          )}
          <div className="donor-list">
            {donors.map((d) => (
              <div className="donor-row" key={d._id}>
                <div className="who">
                  <div className="avatar">{d.name.charAt(0)}</div>
                  <div>
                    <strong>{d.name}</strong>
                    <div className="meta-row">
                      <BloodBadge group={d.bloodGroup} />
                      <span>{d.distanceKm} km away</span>
                      <span className={`badge ${d.isAvailable ? "badge-available" : "badge-unavailable"}`}>
                        {d.isAvailable ? "Available" : "Unavailable"}
                      </span>
                      <span className={`badge ${d.eligibleToDonate ? "badge-available" : "badge-pending"}`}>
                        {d.eligibleToDonate ? "Eligible" : "In cooldown"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className={`btn btn-sm ${user.isVerified ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => openModal(d)}
                >
                  {user.isVerified ? "Send request" : "Verification required"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "sent" && (
        <div>
          {sentRequests.length === 0 && <div className="card empty-state">You haven't sent any requests yet.</div>}
          {sentRequests.map((r) => (
            <div className="request-card" key={r._id}>
              <div className="top-row">
                <div>
                  <strong>{r.donor?.name}</strong>
                  <div className="meta-row">
                    <BloodBadge group={r.bloodGroup} /> · {r.unitsNeeded} unit(s)
                    <UrgencyBadge urgency={r.urgency} />
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="hint">{r.donor?.phone}</p>
              <div className="actions">
                {r.status === "accepted" && (
                  <button className="btn btn-teal btn-sm" onClick={() => markCompleted(r._id)}>
                    Mark donation completed
                  </button>
                )}
                {r.status === "pending" && (
                  <button className="btn btn-danger btn-sm" onClick={() => cancelRequest(r._id)}>
                    Cancel request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalDonor && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(28,27,41,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div className="card" style={{ width: 420 }}>
            <h3>Request blood from {modalDonor.name}</h3>
            <p className="hint" style={{ marginBottom: 16 }}>{modalDonor.bloodGroup} · {modalDonor.distanceKm} km away</p>
            {sendError && <div className="error-banner">{sendError}</div>}
            <form onSubmit={sendRequest}>
              <div className="field-row">
                <div className="field">
                  <label>Units needed</label>
                  <input
                    type="number" min={1} value={requestForm.unitsNeeded}
                    onChange={(e) => setRequestForm({ ...requestForm, unitsNeeded: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Urgency</label>
                  <select
                    value={requestForm.urgency}
                    onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Message (optional)</label>
                <textarea
                  rows={3}
                  value={requestForm.message}
                  onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>Send request</button>
                <button type="button" className="btn btn-secondary" onClick={() => setModalDonor(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBroadcast && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(28,27,41,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div className="card" style={{ width: 440 }}>
            <h3>🚨 Broadcast emergency request</h3>
            <p className="hint" style={{ marginBottom: 16 }}>
              This sends the same request to all {donors.length} matching {filters.bloodGroup || "selected"} donor(s)
              within {filters.maxDistance}km at once — use for urgent, time-critical needs.
            </p>
            {broadcastError && <div className="error-banner">{broadcastError}</div>}
            <form onSubmit={sendBroadcast}>
              <div className="field-row">
                <div className="field">
                  <label>Units needed</label>
                  <input
                    type="number" min={1} value={broadcastForm.unitsNeeded}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, unitsNeeded: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Urgency</label>
                  <select
                    value={broadcastForm.urgency}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, urgency: e.target.value })}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Message (optional)</label>
                <textarea
                  rows={3}
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-danger" style={{ flex: 1 }}>Send to all {donors.length} donors</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBroadcast(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}