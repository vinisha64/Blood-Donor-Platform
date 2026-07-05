import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);   // hamburger (mobile nav links)
  const [profileOpen, setProfileOpen] = useState(false); // profile dropdown
  const profileRef = useRef(null);
  const menuRef = useRef(null);

  const dashboardPath =
    user?.role === "donor" ? "/donor/dashboard" :
    user?.role === "hospital" ? "/hospital/dashboard" :
    user?.role === "admin" ? "/admin/dashboard" : "/";

  const displayName = user ? (user.role === "hospital" ? user.hospitalName : user.name) : "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    html.setAttribute("data-theme", isDark ? "light" : "dark");
    localStorage.setItem("theme", isDark ? "light" : "dark");
  };

  // Close dropdowns when clicking outside them
  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <svg className="brand-pulse" viewBox="0 0 24 24" fill="none">
            <path d="M12 21s-7.5-4.9-10-9.8C0.3 7.6 2.3 3.5 6 3c2.2-.3 4 .9 6 3.3C14 3.9 15.8 2.7 18 3c3.7.5 5.7 4.6 4 8.2C19.5 16.1 12 21 12 21z" fill="var(--color-crimson)"/>
          </svg>
          LifeLink
        </Link>

        {/* Desktop links */}
        <div className="nav-links nav-links-desktop">
          {!user && (
            <>
              <button className="link" onClick={toggleTheme} title="Toggle dark mode">🌓</button>
              <Link to="/register/donor">Become a donor</Link>
              <Link to="/register/hospital">For hospitals</Link>
              <Link to="/login" className="btn btn-primary btn-sm">Log in</Link>
            </>
          )}
          {user && (
            <>
              <button className="link" onClick={toggleTheme} title="Toggle dark mode">🌓</button>
              <NotificationBell />
              <div className="profile-wrap" ref={profileRef}>
                <button className="profile-trigger" onClick={() => setProfileOpen((o) => !o)}>
                  <span className="avatar avatar-sm">{initial}</span>
                  <span className="profile-name">{displayName.split(" ")[0]}</span>
                  <span className={`chevron ${profileOpen ? "open" : ""}`}>▾</span>
                </button>
                {profileOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <span className="avatar">{initial}</span>
                      <div>
                        <div className="profile-dropdown-name">{displayName}</div>
                        <div className="profile-dropdown-email">{user.email}</div>
                        <span className="badge badge-completed" style={{ marginTop: 6, textTransform: "capitalize" }}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <Link to={dashboardPath} className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                      🏠 Dashboard
                    </Link>
                    <button className="profile-dropdown-item danger" onClick={handleLogout}>
                      ⎋ Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="nav-mobile" ref={menuRef}>
          {user && <NotificationBell />}
          <button className="hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          {menuOpen && (
            <div className="mobile-menu">
              <button className="mobile-menu-item" onClick={() => { toggleTheme(); setMenuOpen(false); }}>
                🌓 Toggle dark mode
              </button>
              {!user && (
                <>
                  <Link to="/register/donor" onClick={() => setMenuOpen(false)}>Become a donor</Link>
                  <Link to="/register/hospital" onClick={() => setMenuOpen(false)}>For hospitals</Link>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
                </>
              )}
              {user && (
                <>
                  <div className="mobile-menu-user">
                    <span className="avatar">{initial}</span>
                    <div>
                      <div className="profile-dropdown-name">{displayName}</div>
                      <div className="profile-dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <Link to={dashboardPath} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <button className="mobile-menu-item danger" onClick={handleLogout}>Log out</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}