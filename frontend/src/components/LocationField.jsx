import { useState } from "react";

// Lets the user auto-detect their location via the browser, or type coordinates manually.
export default function LocationField({ latitude, longitude, onChange }) {
  const [status, setStatus] = useState("idle"); // idle | locating | done | error

  const detect = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
        setStatus("done");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="field">
      <label>Location</label>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => onChange(e.target.value, longitude)}
          required
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => onChange(latitude, e.target.value)}
          required
        />
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={detect}>
        {status === "locating" ? "Detecting..." : "Use my current location"}
      </button>
      {status === "error" && (
        <p className="hint" style={{ color: "var(--color-crimson-dark)" }}>
          Couldn't detect location automatically. Please enter latitude/longitude manually
          (you can find these by searching your address on Google Maps and copying the coordinates).
        </p>
      )}
      {status === "done" && <p className="hint">Location detected.</p>}
    </div>
  );
}
