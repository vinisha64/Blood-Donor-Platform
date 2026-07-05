import { useEffect, useState } from "react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { StatusBadge, BloodBadge } from "../components/Badges";

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [requests, setRequests] = useState([]);

  const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

  const loadStats = async () => {
    const { data } = await api.get("/admin/stats");
    setStats(data);
  };
  const loadUsers = async () => {
    const { data } = await api.get("/admin/users", { params: { role: roleFilter || undefined } });
    setUsers(data.users);
  };
  const loadRequests = async () => {
    const { data } = await api.get("/admin/requests");
    setRequests(data.requests);
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (tab === "users") loadUsers(); }, [tab, roleFilter]);
  useEffect(() => { if (tab === "requests") loadRequests(); }, [tab]);

  const verify = async (id) => {
    await api.put(`/admin/users/${id}/verify`);
    showToast("Hospital verified", "success");
    loadUsers();
    loadStats();
  };

  const toggleSuspend = async (id) => {
    await api.put(`/admin/users/${id}/suspend`);
    showToast("Status updated", "info");
    loadUsers();
  };

  const removeUser = async (id) => {
    if (!confirm("Delete this user and all related requests/notifications? This cannot be undone.")) return;
    await api.delete(`/admin/users/${id}`);
    showToast("User deleted", "info");
    loadUsers();
    loadStats();
  };

  return (
    <div className="page container">
      <div className="page-header">
        <h2>Admin dashboard</h2>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
        <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users</button>
        <button className={`tab ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>Requests</button>
      </div>

      {tab === "overview" && stats && (
        <div>
          <div className="stat-strip" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>
            <div className="stat-card"><b>{stats.totalDonors}</b><span>Total donors</span></div>
            <div className="stat-card"><b>{stats.totalHospitals}</b><span>Total hospitals</span></div>
            <div className="stat-card"><b>{stats.pendingVerification}</b><span>Pending verification</span></div>
            <div className="stat-card"><b>{stats.totalRequests}</b><span>Total requests</span></div>
          </div>
          <div className="grid-2">
  <div className="card">
    <h3 style={{ marginBottom: 12 }}>Requests by status</h3>
    {stats.requestsByStatus.length === 0 ? (
      <p className="hint">No requests yet.</p>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={stats.requestsByStatus.map((s) => ({ name: s._id, value: s.count }))}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(entry) => `${entry.name}: ${entry.value}`}
          >
            {stats.requestsByStatus.map((s, i) => (
              <Cell key={s._id} fill={
                s._id === "pending" ? "#C97A2B" :
                s._id === "accepted" ? "#2F6F6E" :
                s._id === "declined" ? "#971C2C" :
                s._id === "completed" ? "#1C1B29" : "#5B5968"
              } />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
  <div className="card">
    <h3 style={{ marginBottom: 12 }}>Donors by blood group</h3>
    {stats.donorsByBloodGroup.length === 0 ? (
      <p className="hint">No donors yet.</p>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stats.donorsByBloodGroup.map((s) => ({ name: s._id, count: s.count }))}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#C2273A" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
</div>
        </div>
      )}

      {tab === "users" && (
        <div>
          <div className="field" style={{ maxWidth: 220, marginBottom: 16 }}>
            <label>Filter by role</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All</option>
              <option value="donor">Donors</option>
              <option value="hospital">Hospitals</option>
              <option value="admin">Admins</option>
            </select>
            </div>
<button
  className="btn btn-secondary btn-sm"
  style={{ marginBottom: 12 }}
  onClick={() => exportToCSV(
    users.map((u) => ({
      name: u.role === "hospital" ? u.hospitalName : u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      verified: u.isVerified ?? "",
      joined: new Date(u.createdAt).toLocaleDateString(),
    })),
    "lifelink-users.csv"
  )}
>
  ⬇ Export CSV
</button>
<table className="admin-table">
  <thead>
    <tr>
      <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
          
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.role === "hospital" ? u.hospitalName : u.name}</td>
                  <td>{u.email}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                  <td>
                    {u.role === "hospital" && (
                      <span className={`badge ${u.isVerified ? "badge-available" : "badge-pending"}`}>
                        {u.isVerified ? "Verified" : "Unverified"}
                      </span>
                    )}
                    {u.role === "donor" && (
                      <span className={`badge ${u.isAvailable ? "badge-available" : "badge-unavailable"}`}>
                        {u.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    )}
                    {u.role === "admin" && <span className="badge badge-completed">Admin</span>}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {u.role === "hospital" && !u.isVerified && (
                      <button className="btn btn-primary btn-sm" onClick={() => verify(u._id)}>Verify</button>
                    )}
                    {u.role !== "admin" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleSuspend(u._id)}>
                        {u.role === "hospital" ? (u.isVerified ? "Unverify" : "Verify") : (u.isAvailable ? "Suspend" : "Reinstate")}
                      </button>
                    )}
                    {u.role !== "admin" && (
                      <button className="btn btn-danger btn-sm" onClick={() => removeUser(u._id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "requests" && (
        <table className="admin-table">
          <thead>
            <tr><th>Hospital</th><th>Donor</th><th>Blood group</th><th>Units</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id}>
                <td>{r.hospital?.hospitalName || r.hospital?.name}</td>
                <td>{r.donor?.name}</td>
                <td><BloodBadge group={r.bloodGroup} /></td>
                <td>{r.unitsNeeded}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No requests yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
