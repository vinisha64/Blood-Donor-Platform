import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite doesn't resolve Leaflet's default marker asset paths automatically — fix them explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const hospitalIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  className: "hospital-marker",
});

export default function DonorMap({ center, donors, radiusKm }) {
  if (!center || (center[0] === 0 && center[1] === 0)) {
    return (
      <div className="card empty-state" style={{ marginBottom: 20 }}>
        Your account doesn't have a valid location set, so the map can't be shown.
        Update your location from your profile first.
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden", marginBottom: 20, height: 340 }}
    >
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#C2273A", fillColor: "#C2273A", fillOpacity: 0.06 }}
        />
        <Marker position={center} icon={hospitalIcon}>
          <Popup>Your location</Popup>
        </Marker>
        {donors.map((d) => (
          <Marker key={d._id} position={[d.location.coordinates[1], d.location.coordinates[0]]}>
            <Popup>
              <strong>{d.name}</strong>
              <br />
              {d.bloodGroup} · {d.distanceKm} km away
              <br />
              {d.isAvailable ? "Available" : "Unavailable"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
