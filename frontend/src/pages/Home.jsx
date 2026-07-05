import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page">
      <section className="hero container">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">● Live donor network</span>
            <h1>Find the right blood donor in minutes, not days.</h1>
            <p className="lede">
              LifeLink connects verified hospitals with nearby, eligible blood donors using
              real-time location matching — so urgent requests reach the right people fast.
            </p>
            <div className="hero-actions">
              <Link to="/register/donor" className="btn btn-primary">Become a donor</Link>
              <Link to="/register/hospital" className="btn btn-secondary">Register your hospital</Link>
            </div>
            <div className="stat-strip">
              <div className="stat"><b>25km</b><span>default search radius</span></div>
              <div className="stat"><b>90 days</b><span>minimum donation gap tracked</span></div>
              <div className="stat"><b>3</b><span>request states: sent, accepted, done</span></div>
            </div>
          </div>
          <div className="card" style={{ background: "var(--color-crimson-tint)", border: "none" }}>
            <h3 style={{ marginBottom: 12 }}>How it works</h3>
            <ol style={{ paddingLeft: 18, color: "var(--color-ink-soft)", lineHeight: 2 }}>
              <li>Donors register once with blood group and location.</li>
              <li>Verified hospitals search nearby donors by blood group and radius.</li>
              <li>Hospitals send a request; the donor gets notified instantly.</li>
              <li>Donor accepts or declines — hospital sees the response live.</li>
              <li>After donation, the hospital marks it complete and the donor's 90-day cooldown starts.</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
