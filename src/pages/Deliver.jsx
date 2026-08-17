import PortalLayout, { portalStyles } from "../components/PortalLayout";

const DELIVERIES = [
  {
    title: "WhatsApp Delivery",
    eta: "Within 15 minutes",
    status: "Active",
    note: "Receive your completed reports directly on your registered number.",
  },
  {
    title: "Email Backup",
    eta: "Same day",
    status: "Available",
    note: "A secure PDF copy is also sent to your email for easy download.",
  },
  {
    title: "Collection Desk",
    eta: "9:00 AM - 8:00 PM",
    status: "Open",
    note: "Printed reports can be collected from the lab front desk if needed.",
  },
];

export default function Deliver() {
  const stats = [
    ["3", "Channels"],
    ["15m", "Fastest ETA"],
    ["24/7", "Tracking"],
  ];

  return (
    <PortalLayout stats={stats}>
      {({ mobile }) => (
        <>
          <div style={portalStyles.topPanel}>
            <div style={portalStyles.headerBlock}>
              <h1 style={{ ...portalStyles.pageTitle, ...(mobile ? portalStyles.pageTitleMobile : null) }}>
                Deliver
              </h1>
              <p style={portalStyles.pageText}>
                Manage how your reports are delivered and track the available handoff options.
              </p>
            </div>
          </div>

          <div style={portalStyles.grid}>
            {DELIVERIES.map((item) => (
              <article key={item.title} style={portalStyles.card}>
                <div style={{ ...styles.badge, ...styles[item.status.toLowerCase().replace(/[^a-z]/g, "")] }}>
                  {item.status}
                </div>
                <h2 style={styles.cardTitle}>{item.title}</h2>
                <p style={styles.cardLine}>ETA: {item.eta}</p>
                <p style={styles.cardLine}>{item.note}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </PortalLayout>
  );
}

const styles = {
  badge: {
    display: "inline-flex",
    marginBottom: 14,
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
    border: "1px solid transparent",
  },
  active: {
    background: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.35)",
    color: "#86efac",
  },
  available: {
    background: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.35)",
    color: "#93c5fd",
  },
  open: {
    background: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.35)",
    color: "#fcd34d",
  },
  cardTitle: {
    margin: "0 0 12px",
    fontSize: 22,
    fontWeight: 800,
    color: "#111827",
  },
  cardLine: {
    margin: "0 0 8px",
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 1.7,
  },
};
