import { useNavigate } from "react-router-dom";
import { FOOTER_COLUMNS, performFooterAction } from "../lib/footerActions";

function LabLogo({ size = 32 }) {
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

export default function PortalFooter({ mobile }) {
  const navigate = useNavigate();

  return (
    <footer style={styles.footer}>
      <div
        style={{
          ...styles.inner,
          padding: mobile ? "0 16px 24px" : "0 28px 24px",
          gridTemplateColumns: mobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          gap: mobile ? 28 : 40,
        }}
      >
        <div style={{ gridColumn: mobile ? "1 / -1" : "auto" }}>
          <div style={styles.brandRow}>
            <div style={styles.logoWrap}>
              <LabLogo size={32} />
            </div>
            <span style={styles.brandName}>
              T-City <span style={styles.brandAccent}>Lab</span>
            </span>
          </div>
          <p style={styles.brandText}>Modern medical lab services online in Islamabad, Pakistan.</p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading}>
            <div style={styles.heading}>{column.heading}</div>
            {column.links.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => performFooterAction(item, navigate)}
                style={styles.linkButton}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div style={styles.bottom}>
        Copyright 2026 T-City Lab. Developed by Muhammad Fawad Aslam, BSCS-7, Quaid-e-Azam University, Islamabad.
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    marginTop: "auto",
    background: "#130202",
    borderTop: "1px solid rgba(139,0,0,0.5)",
    padding: "48px 0 0",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto 32px",
    display: "grid",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: "#fff",
    fontWeight: 800,
    fontSize: 17,
  },
  brandAccent: {
    color: "#fca5a5",
  },
  brandText: {
    margin: 0,
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 1.7,
  },
  heading: {
    color: "#fff",
    fontWeight: 700,
    marginBottom: 14,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  linkButton: {
    display: "block",
    width: "fit-content",
    padding: 0,
    border: "none",
    background: "transparent",
    fontSize: 13,
    marginBottom: 9,
    color: "#fca5a5",
    lineHeight: 1.5,
    cursor: "pointer",
    textAlign: "left",
  },
  bottom: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "20px 28px",
    textAlign: "center",
    fontSize: 12,
    color: "#fca5a5",
  },
};
