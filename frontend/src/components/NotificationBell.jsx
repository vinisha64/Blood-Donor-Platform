import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { unreadCount, setUnreadCount } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/requests/notifications/all");
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter((n) => !n.read).length);
    } catch (err) {
      // silent fail, bell stays with previous state
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // poll every 15s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    await api.put("/requests/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id) => {
    await api.put(`/requests/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="link" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔{unreadCount > 0 && <span className="bell-dot" />}
      </button>
      {open && (
        <div className="notif-panel">
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--color-border)" }}>
            <strong style={{ fontSize: "0.9rem" }}>Notifications</strong>
            {unreadCount > 0 && (
              <button className="link" style={{ fontSize: "0.8rem" }} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <div className="empty-state" style={{ padding: 24 }}>No notifications yet.</div>
          )}
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`notif-item ${n.read ? "" : "unread"}`}
              onClick={() => !n.read && markOneRead(n._id)}
              style={{ cursor: n.read ? "default" : "pointer" }}
            >
              <div>{n.message}</div>
              <div className="time">{timeAgo(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
