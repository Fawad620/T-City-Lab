import { useLocation, useNavigate } from "react-router-dom";
import { clearSession } from "../lib/auth";

const NAV_ITEMS = [
  { label: "MedicalTest", path: "/medicaltest" },
  { label: "Appointment", path: "/appointment" },
  { label: "Report", path: "/report" },
  { label: "Home Sample", path: "/homesample" },
];

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

export default function PortalNavbar({ mobile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <nav style={{ ...styles.nav, ...(mobile ? styles.navMobile : null) }}>
      <div style={styles.brand}>
        <div style={styles.logoWrap}>
          <LabLogo />
        </div>
        <div>
          <div style={styles.brandName}>
            T-City <span style={styles.brandAccent}>Lab</span>
          </div>
          <div style={styles.brandTag}>Islamabad's modern medical lab</div>
        </div>
      </div>

      <div style={{ ...styles.navLinks, ...(mobile ? styles.navLinksMobile : null) }}>
        {NAV_ITEMS.map((item) => (
          <span
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...styles.navLink,
              ...(mobile ? styles.navLinkMobile : null),
              ...(location.pathname === item.path ? styles.navLinkActive : null),
            }}
          >
            {item.label}
          </span>
        ))}
      </div>

      <button onClick={handleLogout} style={{ ...styles.logoutButton, ...(mobile ? styles.fullWidth : null) }}>
        Log Out
      </button>
    </nav>
  );
}

const styles = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 28px",
    flexWrap: "wrap",
    background: "linear-gradient(90deg,#520809 0%,#6b0d0e 52%,#7b1113 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(28,0,0,0.28)",
    backdropFilter: "blur(14px)",
  },
  navMobile: {
    padding: "14px 16px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 22,
    fontWeight: 800,
    color: "#f8fafc",
  },
  brandAccent: {
    color: "#fca5a5",
  },
  brandTag: {
    fontSize: 11,
    color: "rgba(254,202,202,0.82)",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    flexWrap: "wrap",
    flex: 1,
    minWidth: 0,
  },
  navLinksMobile: {
    width: "100%",
    justifyContent: "flex-start",
    gap: 10,
    flexWrap: "nowrap",
    overflowX: "auto",
    paddingBottom: 4,
    scrollbarWidth: "none",
  },
  navLink: {
    color: "#fecaca",
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  navLinkMobile: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  navLinkActive: {
    color: "#ffffff",
  },
  logoutButton: {
    padding: "10px 22px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.3)",
    background: "linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  fullWidth: {
    width: "100%",
  },
};
