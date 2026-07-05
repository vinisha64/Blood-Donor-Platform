import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page container empty-state">
      <h2>Page not found</h2>
      <p className="hint">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Go home</Link>
    </div>
  );
}
