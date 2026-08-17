import { useEffect, useMemo, useState } from "react";
import { getSession } from "../lib/auth";
import PortalFooter from "./PortalFooter";
import PortalNavbar from "./PortalNavbar";

function LabLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="68" rx="28" ry="7" fill="none" stroke="#22c55e" strokeWidth="4" />
      <path d="M30 72 Q15 60 22 45" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="44" y="18" width="12" height="36" rx="3" fill="#1e293b" />
      <rect x="46" y="20" width="8" height="28" rx="2" fill="#38bdf8" />
      <rect x="34" y="56" width="32" height="4" rx="2" fill="#1e293b" />
      <rect x="36" y="72" width="28" height="5" rx="2" fill="#111827" />
    </svg>
  );
}

export default function PortalLayout({ children, stats = [] }) {
  const [session, setSession] = useState(() => getSession());
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    setSession(getSession());

    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mobile = width <= 720;
  const user = session?.user || {};

  const summaryStats = useMemo(() => {
    if (stats.length) {
      return stats;
    }

    return [
      ["1", "Session"],
      ["4", "Sections"],
      ["24/7", "Access"],
    ];
  }, [stats]);

  return (
    <div style={portalStyles.page}>
      <PortalNavbar mobile={mobile} />
      <section style={portalStyles.sessionBar}>
        <div style={{ ...portalStyles.container, ...(mobile ? portalStyles.containerMobile : null), ...portalStyles.sessionInner }}>
          <div style={portalStyles.avatar}>{(user.name || "P").charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: mobile ? "100%" : 220 }}>
            <div style={portalStyles.welcome}>
              Welcome back, <span style={{ color: "#fbbf24" }}>{user.name || "Patient"}</span>
            </div>
            <div style={portalStyles.userMeta}>{[user.email, user.phone, user.address, user.gender].filter(Boolean).join(" | ")}</div>
          </div>
          <div style={{ ...portalStyles.statGrid, ...(mobile ? portalStyles.statGridMobile : null) }}>
            {summaryStats.map(([value, label]) => (
              <div key={label} style={portalStyles.statCard}>
                <div style={portalStyles.statValue}>{value}</div>
                <div style={portalStyles.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main style={{ ...portalStyles.container, ...portalStyles.main, ...(mobile ? portalStyles.containerMobile : null) }}>
        {children({ mobile })}
      </main>

      <PortalFooter mobile={mobile} />
    </div>
  );
}

export const portalStyles = {
  page: { minHeight: "100vh", background: "linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)", color: "#f3f4f6", fontFamily: "'Segoe UI',system-ui,sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" },
  container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "28px" },
  main: { width: "100%", flex: 1, boxSizing: "border-box" },
  containerMobile: { padding: "20px 16px 40px" },
  sessionBar: { background: "linear-gradient(135deg,rgba(127,29,29,0.24),rgba(69,10,10,0.18))", borderBottom: "1px solid rgba(248,113,113,0.2)" },
  sessionInner: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  avatar: { width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#ef4444,#991b1b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 },
  welcome: { fontSize: 17, fontWeight: 700, marginBottom: 4, color: "#f8fafc" },
  userMeta: { color: "#fecaca", fontSize: 12, lineHeight: 1.7, wordBreak: "break-word" },
  statGrid: { marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" },
  statGridMobile: { width: "100%", marginLeft: 0 },
  statCard: { minWidth: 86, padding: "8px 14px", borderRadius: 12, background: "rgba(69,10,10,0.4)", border: "1px solid rgba(252,165,165,0.16)", textAlign: "center", flex: 1 },
  statValue: { fontSize: 20, fontWeight: 800, color: "#fca5a5" },
  statLabel: { fontSize: 10, color: "#fecaca", textTransform: "uppercase", letterSpacing: 0.6 },
  topPanel: { background: "#ffffff", borderRadius: 24, padding: "clamp(20px,4vw,28px) clamp(16px,4vw,24px)", marginBottom: 28, boxShadow: "0 16px 40px rgba(0,0,0,0.12)" },
  headerBlock: { marginBottom: 20, textAlign: "center" },
  pageTitle: { margin: 0, fontSize: 30, fontWeight: 800, color: "#991b1b" },
  pageTitleMobile: { fontSize: 24 },
  pageText: { margin: "8px 0 0", color: "#b91c1c", fontSize: 14, lineHeight: 1.7 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,270px),1fr))", gap: 18 },
  card: { background: "#ffffff", border: "1px solid rgba(153,27,27,0.12)", borderRadius: 18, padding: "clamp(16px,3vw,20px)", boxShadow: "0 12px 30px rgba(0,0,0,0.12)", minWidth: 0 },
  sectionCard: { background: "#ffffff", borderRadius: 22, padding: "clamp(18px,3vw,24px)", boxShadow: "0 16px 40px rgba(0,0,0,0.12)" },
  sectionTitle: { margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#991b1b" },
  sectionText: { margin: 0, color: "#7f1d1d", fontSize: 14, lineHeight: 1.7 },
};
