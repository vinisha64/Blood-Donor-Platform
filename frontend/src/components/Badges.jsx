export function StatusBadge({ status }) {
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

export function UrgencyBadge({ urgency }) {
  const labels = { normal: "Normal", urgent: "Urgent", critical: "Critical" };
  return <span className={`badge badge-${urgency}`}>{labels[urgency] || urgency}</span>;
}

export function BloodBadge({ group }) {
  return <span className="badge badge-blood">{group}</span>;
}
