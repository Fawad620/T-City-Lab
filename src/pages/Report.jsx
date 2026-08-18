import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../lib/auth";
import PortalNavbar from "../components/PortalNavbar";
import { FOOTER_COLUMNS, performFooterAction } from "../lib/footerActions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// â”€â”€ Mock reports (replace with: fetch("/api/reports/my")) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MOCK_REPORTS = [
  {
    _id: "r1",
    apptId:    "TCL-M2K9F1A-R4T",
    testName:  "Complete Blood Count",
    doctor:    "Dr. Ayesha",
    category:  "Haematology",
    date:      "2026-04-05",
    status:    "Ready",
    note:      "All values within normal range. No further action required.",
    fileUrl:   "#", // replace with real S3 / GridFS URL
  },
  {
    _id: "r2",
    apptId:    "TCL-M2K9F1A-X9P",
    testName:  "Liver Function Test",
    doctor:    "Dr. Saad",
    category:  "Biochemistry",
    date:      "2026-04-04",
    status:    "Processing",
    note:      "Lab verification is in progress. Please check back tomorrow.",
    fileUrl:   null,
  },
  {
    _id: "r3",
    apptId:    "TCL-M2K9F1A-Q2W",
    testName:  "Thyroid Profile",
    doctor:    "Dr. Sana",
    category:  "Biochemistry",
    date:      "2026-04-02",
    status:    "Ready",
    note:      "TSH elevated slightly. Consult your doctor for follow-up.",
    fileUrl:   "#",
  },
  {
    _id: "r4",
    apptId:    "TCL-M2K9F1A-B7K",
    testName:  "MRI Scan",
    doctor:    "Dr. Ali",
    category:  "Radiology",
    date:      "2026-03-28",
    status:    "Ready",
    note:      "No abnormalities detected. Report shared with referring doctor.",
    fileUrl:   "#",
  },
  {
    _id: "r5",
    apptId:    "TCL-M2K9F1A-C3N",
    testName:  "Blood Sugar",
    doctor:    "Dr. Ayesha",
    category:  "Biochemistry",
    date:      "2026-04-07",
    status:    "Pending",
    note:      "Sample received. Processing will begin shortly.",
    fileUrl:   null,
  },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const statusMeta = (s) => ({
  Ready:      { color:"#22c55e", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)",   icon:"âœ…", label:"Ready"      },
  Processing: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)",  icon:"â³", label:"Processing" },
  Pending:    { color:"#60a5fa", bg:"rgba(96,165,250,0.12)",  border:"rgba(96,165,250,0.3)",  icon:"ðŸ•", label:"Pending"    },
}[s] || { color:"#9ca3af", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)", icon:"â€¢", label:s });

const catIcon = (c) => ({ Radiology:"ðŸ©»", Haematology:"ðŸ©¸", Biochemistry:"âš—ï¸" }[c] || "ðŸ§ª");

const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-PK", { day:"numeric", month:"short", year:"numeric" });

const buildStats = (reports) => [
  [String(reports.filter((r) => r.status === "Ready").length),      "Ready"     ],
  [String(reports.filter((r) => r.status === "Processing").length), "Processing"],
  [String(reports.filter((r) => r.status === "Delivered").length),  "Delivered" ],
];

const mapReportFromApi = (report) => ({
  _id: report.id || report._id,
  apptId: report.apptId || report.appointmentId,
  testName: report.testName || report.test,
  doctor: "T-City Lab",
  category: report.category || "Medical Test",
  date: report.date,
  status: report.statusLabel || (report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1) : "Processing"),
  note: report.note || report.result || "Report is being processed by the lab.",
  fileUrl: report.fileUrl || report.downloadUrl,
});

// â”€â”€ LabLogo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LabLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="68" rx="28" ry="7" fill="none" stroke="#22c55e" strokeWidth="4" />
      <path d="M30 72 Q15 60 22 45" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="44" y="18" width="12" height="36" rx="3" fill="#1e293b" />
      <rect x="46" y="20" width="8"  height="28" rx="2" fill="#38bdf8" />
      <rect x="34" y="56" width="32" height="4"  rx="2" fill="#1e293b" />
      <rect x="36" y="72" width="28" height="5"  rx="2" fill="#111827" />
    </svg>
  );
}

// â”€â”€ Footer (identical to MedicalTest) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Footer({ mobile }) {
  const navigate = useNavigate();
  return (
    <footer style={S.footer}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding: mobile ? "0 16px 24px" : "0 28px 24px", display:"grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 28 : 40, marginBottom:32 }}>
        <div style={{ gridColumn: mobile ? "1 / -1" : "auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={S.logoWrap}><LabLogo size={32} /></div>
            <span style={{ color:"#fff", fontWeight:800, fontSize:17 }}>T-City <span style={{ color:"#fca5a5" }}>Lab</span></span>
          </div>
          <p style={{ fontSize:13, lineHeight:1.7, color:"#fca5a5", margin:0 }}>Modern medical lab services online â€” Islamabad, Pakistan.</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading}>
            <div style={{ color:"#fff", fontWeight:700, marginBottom:14, fontSize:14, textTransform:"uppercase", letterSpacing:0.6 }}>{col.heading}</div>
            {col.links.map((link) => (
              <button key={link.label} type="button" onClick={() => performFooterAction(link, navigate)} style={S.footerLink}>
                {link.label}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={S.footerBottom}>Â© 2026 T-City Lab Â· Developed by Muhammad Fawad Aslam Â· BSCS-7, Quaid-e-Azam University, Islamabad</div>
    </footer>
  );
}

// â”€â”€ Report Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReportModal({ report, mobile, onClose }) {
  const meta = statusMeta(report.status);
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, ...(mobile && S.modalMobile) }}>
        {/* Header */}
        <div style={S.modalHeader}>
          <div>
            <h3 style={S.modalTitle}>ðŸ“„ Report Details</h3>
            <p style={S.modalSub}>Appointment ID: <span style={{ color:"#60a5fa", fontWeight:700 }}>{report.apptId}</span></p>
          </div>
          <button onClick={onClose} style={S.iconBtn}>âœ•</button>
        </div>

        {/* Test Info */}
        <div style={S.modalInfoBox}>
          <div style={{ ...S.cardIconBox, width:48, height:48, fontSize:22, marginBottom:12 }}>{catIcon(report.category)}</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#111827", marginBottom:4 }}>{report.testName}</div>
          <div style={{ fontSize:13, color:"#6b7280" }}>ðŸ‘¨â€âš•ï¸ {report.doctor} &nbsp;â€¢&nbsp; {report.category}</div>
        </div>

        {/* Details grid */}
        <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap:10, marginBottom:16 }}>
          {[["ðŸ“… Date", fmt(report.date)], ["ðŸ“‹ Status", report.status]].map(([l, v]) => (
            <div key={l} style={S.detailBox}>
              <div style={S.detailBoxLabel}>{l}</div>
              <div style={{ ...S.detailBoxValue, ...(l.includes("Status") && { color: meta.color }) }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={S.noteBox}>
          <div style={S.noteLabel}>ðŸ©º Doctor's Note</div>
          <p style={S.noteText}>{report.note}</p>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10, ...(mobile && { flexDirection:"column" }) }}>
          <button onClick={onClose} style={S.secondaryBtn}>Close</button>
          {report.status === "Ready" && report.fileUrl ? (
            <a href={report.fileUrl} download style={{ ...S.downloadBtn, textDecoration:"none", textAlign:"center" }}>
              â¬‡ Download Report
            </a>
          ) : (
            <button disabled style={{ ...S.downloadBtn, opacity:0.4, cursor:"not-allowed" }}>
              {report.status === "Ready" ? "No File Available" : "Not Ready Yet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Report Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReportCard({ report, mobile, onView }) {
  const [hovered, setHovered] = useState(false);
  const meta = statusMeta(report.status);

  return (
    <article
      style={{ ...S.card, ...(hovered && S.cardHover) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Top row: icon + status */}
      <div style={S.cardTopRow}>
        <div style={S.cardIconBox}>{catIcon(report.category)}</div>
        <span style={{ ...S.statusPill, color:meta.color, background:meta.bg, borderColor:meta.border }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      {/* Title + doctor */}
      <h3 style={S.cardTitle}>{report.testName}</h3>
      <p style={S.cardDoctor}>ðŸ‘¨â€âš•ï¸ {report.doctor} &nbsp;â€¢&nbsp; {report.category}</p>

      {/* Note */}
      <p style={S.cardNote}>{report.note.length > 80 ? report.note.slice(0, 80) + "â€¦" : report.note}</p>

      {/* Date + Appt ID */}
      <div style={S.cardMeta}>
        <span style={S.metaChip}>ðŸ“… {fmt(report.date)}</span>
        <span style={S.metaChip}>ðŸ†” {report.apptId}</span>
      </div>

      {/* Actions */}
      <div style={{ ...S.cardActions, ...(mobile && { flexDirection:"column" }) }}>
        <button onClick={() => onView(report)} style={S.viewBtn}>View Details</button>
        {report.status === "Ready" && report.fileUrl ? (
          <a href={report.fileUrl} download style={{ ...S.downloadBtnSmall, textDecoration:"none", textAlign:"center" }}>
            â¬‡ Download
          </a>
        ) : (
          <button disabled style={{ ...S.downloadBtnSmall, opacity:0.35, cursor:"not-allowed" }}>
            â¬‡ {report.status === "Ready" ? "No File" : "Pending"}
          </button>
        )}
      </div>
    </article>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Report() {
  const navigate = useNavigate();
  const [session,     setSession]     = useState(() => getSession());
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("All");
  const [viewTarget,  setViewTarget]  = useState(null);
  const [toast,       setToast]       = useState("");
  const [width,       setWidth]       = useState(() => window.innerWidth);

  // Auth guard
  useEffect(() => {
    const saved = getSession();
    if (!saved?.token) { navigate("/login", { replace: true }); return; }
    setSession(saved);
  }, [navigate]);

  // Fetch reports + resize
  useEffect(() => {
    let active = true;

    async function loadReports() {
      const saved = getSession();

      if (!saved?.user?.email) {
        setReports([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/reports?patientEmail=${encodeURIComponent(saved.user.email)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load reports.");
        }

        if (active) {
          setReports((data.reports || []).map(mapReportFromApi));
        }
      } catch (error) {
        if (active) {
          setToast(error.message || "Unable to load reports.");
          setReports([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReports();
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => { active = false; window.removeEventListener("resize", onResize); };
  }, []);

  // Toast dismiss
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const mobile = width <= 720;
  const user   = session?.user ?? {};
  const stats  = useMemo(() => buildStats(reports), [reports]);

  const STATUS_FILTERS = ["All", "Ready", "Processing", "Delivered"];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      const matchSearch = !q ||
        r.testName.toLowerCase().includes(q) ||
        r.doctor.toLowerCase().includes(q)   ||
        r.apptId.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [reports, search, statusFilter]);

  return (
    <div style={S.page}>
      <style>{`body,html{margin:0;padding:0;background:#f8f9fa !important;}`}</style>

      {/* â•â• NAVBAR (unchanged) â•â• */}
      <PortalNavbar mobile={mobile} />

      {/* â•â• SESSION BANNER (unchanged) â•â• */}
      <section style={S.sessionBar}>
        <div style={{ ...S.container, ...(mobile && S.containerMobile), ...S.sessionInner }}>
          <div style={S.avatar}>{(user.name || "P").charAt(0).toUpperCase()}</div>
          <div style={{ flex:1, minWidth: mobile ? "100%" : 220 }}>
            <div style={S.welcome}>Welcome back, <span style={{ color:"#fbbf24" }}>{user.name || "Patient"}</span></div>
            <div style={S.userMeta}>{[user.email, user.phone, user.address, user.gender].filter(Boolean).join(" | ")}</div>
          </div>
          <div style={{ ...S.statGrid, ...(mobile && S.statGridMobile) }}>
            {stats.map(([value, label]) => (
              <div key={label} style={S.statCard}>
                <div style={S.statValue}>{value}</div>
                <div style={S.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â• MAIN CONTENT â•â• */}
      <main style={{ ...S.main, ...(mobile && S.mainMobile) }}>

        {/* â”€â”€ Hero search panel â”€â”€ */}
        <div style={S.heroPanel}>
          <h1 style={{ ...S.heroTitle, ...(mobile && { fontSize:22 }) }}>My Test Reports</h1>
          <p style={S.heroSub}>Search and download your medical test reports. Track processing status in real time.</p>
          <div style={{ position:"relative", maxWidth:500, margin:"0 auto" }}>
            <span style={S.searchIcon}>ðŸ”</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test name, doctor, or appointment IDâ€¦"
              style={S.searchInput}
            />
            {search && (
              <button onClick={() => setSearch("")} style={S.clearBtn}>âœ•</button>
            )}
          </div>
        </div>

        {/* â”€â”€ Status filter chips â”€â”€ */}
        <div style={{ ...S.filterRow, ...(mobile && { gap:6 }) }}>
          {STATUS_FILTERS.map((f) => {
            const meta = f !== "All" ? statusMeta(f) : null;
            const active = statusFilter === f;
            return (
              <button key={f} onClick={() => setStatusFilter(f)}
                style={{
                  ...S.chip,
                  ...(active && {
                    background: f === "All" ? "#dc2626" : meta.bg,
                    borderColor: f === "All" ? "#dc2626" : meta.border,
                    color: f === "All" ? "#fff" : meta.color,
                    fontWeight: 700,
                  }),
                }}>
                {f !== "All" && statusMeta(f).icon + " "}{f}
                <span style={{ ...S.chipCount, ...(active && { background:"rgba(255,255,255,0.25)", color:"#fff" }) }}>
                  {f === "All" ? reports.length : reports.filter((r) => r.status === f).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* â”€â”€ Result count â”€â”€ */}
        {!loading && (
          <p style={S.resultCount}>
            Showing <strong>{filtered.length}</strong> report{filtered.length !== 1 ? "s" : ""}
            {statusFilter !== "All" && ` Â· ${statusFilter}`}
            {search && ` Â· matching "${search}"`}
          </p>
        )}

        {/* â”€â”€ Loading skeletons â”€â”€ */}
        {loading && (
          <div style={S.grid}>
            {Array.from({ length: 4 }, (_, i) => <div key={i} style={S.skeletonCard} />)}
          </div>
        )}

        {/* â”€â”€ Report cards â”€â”€ */}
        {!loading && filtered.length > 0 && (
          <div style={S.grid}>
            {filtered.map((r) => (
              <ReportCard key={r._id} report={r} mobile={mobile} onView={setViewTarget} />
            ))}
          </div>
        )}

        {/* â”€â”€ Empty state â”€â”€ */}
        {!loading && filtered.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize:52, marginBottom:14 }}>ðŸ“‹</div>
            <div style={S.emptyTitle}>No reports found</div>
            <p style={{ color:"#6b7280", fontSize:14, margin:"0 0 20px" }}>
              {search ? `No results for "${search}".` : "No reports match the selected filter."}
            </p>
            <button onClick={() => { setSearch(""); setStatusFilter("All"); }}
              style={{ padding:"10px 22px", borderRadius:8, border:"1px solid #d1d5db", background:"#fff", color:"#374151", fontWeight:600, cursor:"pointer", fontSize:13 }}>
              Clear Filters
            </button>
          </div>
        )}
      </main>

      {/* â•â• FOOTER (unchanged) â•â• */}
      <Footer mobile={mobile} />

      {/* â•â• MODAL â•â• */}
      {viewTarget && (
        <ReportModal report={viewTarget} mobile={mobile} onClose={() => setViewTarget(null)} />
      )}

      {/* â•â• TOAST â•â• */}
      {toast && (
        <div style={{ ...S.toast, ...(mobile && S.toastMobile) }}>{toast}</div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
    </div>
  );
}

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const S = {
  // â”€â”€ Page â”€â”€
  page:            { minHeight:"100vh", background:"linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)", color:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif", display:"flex", flexDirection:"column" },
  container:       { maxWidth:1200, margin:"0 auto", padding:28 },
  main:            { maxWidth:1200, margin:"0 auto", padding:"0 28px 56px", width:"100%", boxSizing:"border-box" },
  mainMobile:      { padding:"0 16px 40px" },
  containerMobile: { padding:"16px" },

  // â”€â”€ Navbar ref â”€â”€
  logoWrap:        { width:36, height:36, borderRadius:8, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" },

  // â”€â”€ Session bar (UNCHANGED) â”€â”€
  sessionBar:      { background:"linear-gradient(135deg,#5a0a0a 0%,#3b0505 60%,#4a0b0d 100%)", borderBottom:"1px solid rgba(248,113,113,0.25)" },
  sessionInner:    { display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" },
  avatar:          { width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#ef4444,#991b1b)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20, color:"#fff" },
  welcome:         { fontSize:17, fontWeight:700, marginBottom:4, color:"#f8fafc" },
  userMeta:        { color:"#fecaca", fontSize:12, lineHeight:1.7, wordBreak:"break-word" },
  statGrid:        { marginLeft:"auto", display:"flex", gap:10, flexWrap:"wrap" },
  statGridMobile:  { width:"100%", marginLeft:0 },
  statCard:        { minWidth:86, padding:"8px 14px", borderRadius:12, background:"rgba(69,10,10,0.4)", border:"1px solid rgba(252,165,165,0.16)", textAlign:"center", flex:1 },
  statValue:       { fontSize:20, fontWeight:800, color:"#fca5a5" },
  statLabel:       { fontSize:10, color:"#fecaca", textTransform:"uppercase", letterSpacing:0.6 },

  // â”€â”€ Hero panel (dark crimson) â”€â”€
  heroPanel:       { textAlign:"center", padding:"44px 16px 32px", marginBottom:0 },
  heroTitle:       { margin:"0 0 8px", fontSize:30, fontWeight:800, color:"#f8fafc" },
  heroSub:         { margin:"0 auto 22px", color:"#fecaca", fontSize:14, maxWidth:500, lineHeight:1.7 },
  searchIcon:      { position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#9ca3af", pointerEvents:"none" },
  searchInput:     { width:"100%", padding:"13px 40px 13px 42px", borderRadius:12, border:"1px solid rgba(252,165,165,0.2)", background:"rgba(255,255,255,0.07)", color:"#f3f4f6", fontSize:14, outline:"none", boxSizing:"border-box" },
  clearBtn:        { position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:14, padding:"2px 6px" },

  // â”€â”€ Filters â”€â”€
  filterRow:       { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", padding:"18px 0 8px" },
  chip:            { padding:"7px 14px", borderRadius:999, border:"1px solid rgba(252,165,165,0.2)", background:"rgba(255,255,255,0.05)", color:"#fecaca", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all .15s" },
  chipCount:       { fontSize:11, padding:"1px 7px", borderRadius:999, background:"rgba(255,255,255,0.1)", color:"#fca5a5" },
  resultCount:     { color:"#fca5a5", fontSize:13, margin:"2px 0 16px" },

  // â”€â”€ Grid & Cards â”€â”€
  grid:            { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:20 },
  card:            { position:"relative", background:"#2a0608", border:"1px solid rgba(220,38,38,0.35)", borderRadius:16, padding:22, boxShadow:"0 8px 28px rgba(0,0,0,0.45)", transition:"all .2s ease", display:"flex", flexDirection:"column" },
  cardHover:       { boxShadow:"0 14px 36px rgba(0,0,0,0.6)", transform:"translateY(-3px)", borderColor:"rgba(252,165,165,0.4)" },
  cardTopRow:      { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  cardIconBox:     { width:44, height:44, borderRadius:12, background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  statusPill:      { display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:999, border:"1px solid", fontSize:12, fontWeight:700 },
  cardTitle:       { margin:"0 0 4px", fontSize:16, fontWeight:800, color:"#f9fafb", lineHeight:1.35 },
  cardDoctor:      { margin:"0 0 10px", color:"#9ca3af", fontSize:13 },
  cardNote:        { margin:"0 0 14px", color:"#d1d5db", fontSize:13, lineHeight:1.65, flexGrow:1 },
  cardMeta:        { display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 },
  metaChip:        { fontSize:11, color:"#9ca3af", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", padding:"3px 10px", borderRadius:999 },
  cardActions:     { display:"flex", gap:8, marginTop:"auto" },
  viewBtn:         { flex:1, padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", fontWeight:600, fontSize:13, cursor:"pointer" },
  downloadBtnSmall:{ flex:1, padding:"9px 12px", borderRadius:8, border:"none", background:"#dc2626", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" },

  skeletonCard:    { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(139,0,0,0.3)", borderRadius:16, minHeight:220, animation:"pulse 1.5s infinite" },

  // â”€â”€ Empty â”€â”€
  emptyState:      { textAlign:"center", padding:"64px 0", display:"flex", flexDirection:"column", alignItems:"center" },
  emptyTitle:      { fontSize:22, fontWeight:800, color:"#f8fafc", marginBottom:8 },

  // â”€â”€ Modal (dark) â”€â”€
  overlay:         { position:"fixed", inset:0, padding:18, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(5px)", zIndex:50 },
  modal:           { width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto", padding:28, borderRadius:20, background:"#1c0505", border:"1px solid rgba(139,0,0,0.5)", boxShadow:"0 24px 60px rgba(0,0,0,0.5)" },
  modalMobile:     { padding:18 },
  modalHeader:     { display:"flex", justifyContent:"space-between", gap:12, marginBottom:20 },
  modalTitle:      { margin:0, fontSize:18, fontWeight:800, color:"#f9fafb" },
  modalSub:        { margin:"4px 0 0", color:"#9ca3af", fontSize:12 },
  iconBtn:         { width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", cursor:"pointer", flexShrink:0 },
  modalInfoBox:    { textAlign:"center", padding:"18px 14px", background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.3)", borderRadius:12, marginBottom:16 },
  detailBox:       { padding:"12px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10 },
  detailBoxLabel:  { fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 },
  detailBoxValue:  { fontSize:15, fontWeight:700, color:"#f9fafb" },
  noteBox:         { padding:"14px 16px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, marginBottom:18 },
  noteLabel:       { fontSize:11, color:"#fbbf24", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 },
  noteText:        { margin:0, fontSize:13, color:"#d1d5db", lineHeight:1.7 },
  secondaryBtn:    { flex:1, padding:"11px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", fontWeight:600, cursor:"pointer", fontSize:13 },
  downloadBtn:     { flex:1, padding:"11px 14px", borderRadius:10, border:"none", background:"#dc2626", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", display:"block" },

  // â”€â”€ Footer (UNCHANGED) â”€â”€
  footer:          { marginTop:"auto", background:"#130202", borderTop:"1px solid rgba(139,0,0,0.5)", padding:"48px 0 0" },
  footerLink:      { display:"block", width:"fit-content", padding:0, border:"none", background:"transparent", fontSize:13, marginBottom:9, cursor:"pointer", color:"#fca5a5", lineHeight:1.5, textAlign:"left" },
  footerBottom:    { borderTop:"1px solid rgba(255,255,255,0.08)", padding:"20px 28px", textAlign:"center", fontSize:12, color:"#fca5a5" },

  // â”€â”€ Toast â”€â”€
  toast:           { position:"fixed", right:24, bottom:24, maxWidth:440, padding:"13px 18px", borderRadius:12, background:"#14532d", color:"#f0fdf4", border:"1px solid rgba(34,197,94,0.3)", boxShadow:"0 10px 24px rgba(0,0,0,0.3)", zIndex:60, fontSize:14, fontWeight:600 },
  toastMobile:     { left:16, right:16, bottom:16, maxWidth:"none" },
};
