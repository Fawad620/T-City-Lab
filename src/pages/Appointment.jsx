import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../lib/auth";
import { FOOTER_COLUMNS, performFooterAction } from "../lib/footerActions";

const NAV_ITEMS   = ["MedicalTest", "Appointment", "Report", "HomeSample"];
const TIME_SLOTS  = ["Morning", "Afternoon", "Evening"];
const STATUS_OPTS = ["Confirmed", "Pending", "Completed", "Cancelled"];
const ALL_FILTERS = ["All", ...STATUS_OPTS];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const toClientStatus = (status) => ({
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
}[status] || status);
const statusMessage = (status) => ({
  Pending: "Waiting for admin response.",
  Confirmed: "Confirmed by admin. Please arrive on time.",
  Completed: "This appointment has been completed.",
  Cancelled: "This appointment was cancelled by admin.",
}[status] || "Appointment status updated.");
const formatAppointmentForClient = (appointment) => ({
  ...appointment,
  status: toClientStatus(appointment.status),
});

// ── Mock data (replace with fetch("/api/appointments")) ───────────────────────
const MOCK_APPOINTMENTS = [
  { _id:"a1", patientName:"Muhammad Fawad", testName:"MRI Scan",        doctor:"Dr. Ali",     price:12000, date:"2025-05-10", time:"Morning",   homeCollection:false, status:"Confirmed",  bookedOn:"2025-04-20" },
  { _id:"a2", patientName:"Muhammad Fawad", testName:"Blood CP",        doctor:"Dr. Ayesha",  price:1500,  date:"2025-05-12", time:"Afternoon", homeCollection:true,  status:"Pending",    bookedOn:"2025-04-21" },
  { _id:"a3", patientName:"Muhammad Fawad", testName:"Blood Sugar",     doctor:"Dr. Ayesha",  price:800,   date:"2025-05-08", time:"Morning",   homeCollection:false, status:"Completed",  bookedOn:"2025-04-15" },
  { _id:"a4", patientName:"Hamza Ali",      testName:"Liver Function",  doctor:"Dr. Saad",    price:3500,  date:"2025-05-20", time:"Evening",   homeCollection:false, status:"Confirmed",  bookedOn:"2025-04-22" },
  { _id:"a5", patientName:"Sara Khan",      testName:"X-Ray",           doctor:"Dr. Murtaza", price:2000,  date:"2025-04-30", time:"Morning",   homeCollection:false, status:"Cancelled",  bookedOn:"2025-04-10" },
  { _id:"a6", patientName:"Muhammad Fawad", testName:"Thyroid Profile", doctor:"Dr. Sana",    price:4500,  date:"2025-05-25", time:"Afternoon", homeCollection:true,  status:"Pending",    bookedOn:"2025-04-23" },
  { _id:"a7", patientName:"Kiran Naz",      testName:"CT Scan",         doctor:"Dr. Zubair",  price:15000, date:"2025-05-18", time:"Morning",   homeCollection:false, status:"Pending",    bookedOn:"2025-04-24" },
  { _id:"a8", patientName:"Hamza Ali",      testName:"Ultrasound",      doctor:"Dr. Kamran",  price:5000,  date:"2025-05-22", time:"Evening",   homeCollection:true,  status:"Confirmed",  bookedOn:"2025-04-25" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusMeta = (s) => ({
  Confirmed: { color:"#4ade80", bg:"rgba(34,197,94,0.14)",  border:"rgba(34,197,94,0.35)",  icon:"✅" },
  Pending:   { color:"#fbbf24", bg:"rgba(245,158,11,0.14)", border:"rgba(245,158,11,0.35)", icon:"⏳" },
  Completed: { color:"#60a5fa", bg:"rgba(96,165,250,0.14)", border:"rgba(96,165,250,0.35)", icon:"🏁" },
  Cancelled: { color:"#f87171", bg:"rgba(248,113,113,0.14)",border:"rgba(248,113,113,0.35)",icon:"❌" },
}[s] || { color:"#e2e8f0", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)", icon:"•" });

const fmt    = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-PK", { day:"numeric", month:"short", year:"numeric" });
const isPast = (d) => new Date(d + "T00:00:00") < new Date(new Date().toDateString());
const today  = new Date().toISOString().split("T")[0];

// ── LabLogo ───────────────────────────────────────────────────────────────────
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
          <p style={{ fontSize:13, lineHeight:1.7, color:"#fca5a5", margin:0 }}>Modern medical lab services online - Islamabad, Pakistan.</p>
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
      <div style={S.footerBottom}>© 2026 T-City Lab · Developed by Muhammad Fawad Aslam · BSCS-7, Quaid-e-Azam University, Islamabad</div>
    </footer>
  );
}

// ── Auto-generate Appointment ID ──────────────────────────────────────────────
const genApptId = () => {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `TCL-${ts}-${rnd}`;
};

// ── Book Appointment Modal ────────────────────────────────────────────────────
function BookApptModal({ user, tests, initialSelectedTest, mobile, booking, onClose, onBook }) {
  const apptId = useState(() => genApptId())[0];

  const [form, setForm] = useState({
    name:     user?.name    || "",
    whatsapp: user?.phone   || "",
    gender:   user?.gender  || "",
    age:      user?.age     || "",
    address:  user?.address || "",
    testName: initialSelectedTest?.name || "",
    date:     "",
    time:     TIME_SLOTS[0],
    home:     false,
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); };

  const selectedTest = tests.find((t) => t.name === form.testName);

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = "Patient name is required";
    if (!form.whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    else if (!/^03\d{9}$/.test(form.whatsapp.trim())) e.whatsapp = "Enter valid number (03XXXXXXXXX)";
    if (!form.gender)          e.gender   = "Please select gender";
    if (!form.age || form.age < 1 || form.age > 120) e.age = "Enter valid age (1–120)";
    if (!form.address.trim())  e.address  = "Address is required";
    if (!form.testName)        e.testName = "Please select a test";
    if (!form.date)            e.date     = "Please select a date";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onBook({ apptId, ...form, test: selectedTest });
  };

  const Err = ({ k }) => errors[k] ? <span style={S.errText}>{errors[k]}</span> : null;

  const isReady = form.name && form.whatsapp && form.gender && form.age &&
                  form.address && form.testName && form.date;

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth:580, ...(mobile && S.modalMobile) }}>
        <div style={S.modalHeader}>
          <div>
            <h3 style={S.modalTitle}>📋 Book Appointment</h3>
            <p style={S.modalSub}>Fill in all details to confirm your booking</p>
          </div>
          <button onClick={onClose} style={S.iconBtn}>✕</button>
        </div>

        {/* Auto ID */}
        <div style={S.apptIdBox}>
          <span style={S.apptIdLabel}>Appointment ID</span>
          <span style={S.apptIdValue}>{apptId}</span>
        </div>

        {/* ── Patient Info ── */}
        <div style={S.secDiv}>Patient Information</div>
        <div style={{ ...S.twoCol, ...(mobile && S.oneCol) }}>
          <div style={S.fg}>
            <label style={S.lbl}>Full Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Muhammad Fawad"
              style={{ ...S.inp, ...(errors.name && S.inpErr) }} />
            <Err k="name" />
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>WhatsApp Number *</label>
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="03XXXXXXXXX" maxLength={11}
              style={{ ...S.inp, ...(errors.whatsapp && S.inpErr) }} />
            <Err k="whatsapp" />
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Gender *</label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
              style={{ ...S.inp, ...(errors.gender && S.inpErr) }}>
              <option value="">Select gender</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            <Err k="gender" />
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Age *</label>
            <input type="number" min={1} max={120} value={form.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="e.g. 25"
              style={{ ...S.inp, ...(errors.age && S.inpErr) }} />
            <Err k="age" />
          </div>
        </div>

        <div style={S.fg}>
          <label style={S.lbl}>Home Address *</label>
          <input value={form.address} onChange={(e) => set("address", e.target.value)}
            placeholder="Street, Area, City"
            style={{ ...S.inp, ...(errors.address && S.inpErr) }} />
          <Err k="address" />
        </div>

        {/* ── Test & Schedule ── */}
        <div style={{ ...S.secDiv, marginTop:16 }}>Test & Schedule</div>

        <div style={S.fg}>
          <label style={S.lbl}>Select Medical Test *</label>
          {/* ── RED background, WHITE text select ── */}
          <select
            value={form.testName}
            onChange={(e) => set("testName", e.target.value)}
            style={{
              ...S.inp,
              background: "#991b1b",
              color: "#ffffff",
              borderColor: "#7f1d1d",
              fontWeight: 600,
              ...(errors.testName && { borderColor: "rgba(248,113,113,0.8)", outline: "2px solid rgba(248,113,113,0.4)" }),
            }}
          >
            <option value="" style={{ background:"#991b1b", color:"#fff" }}>
              -- Choose a test --
            </option>
            {tests.map((t) => (
              <option
                key={t._id || t.id}
                value={t.name}
                style={{ background:"#991b1b", color:"#ffffff" }}
              >
                {t.name} — PKR {Number(t.price).toLocaleString()} ({t.time})
              </option>
            ))}
          </select>
          <Err k="testName" />
        </div>

        {/* Show selected test info */}
        {selectedTest && (
          <div style={S.infoBox}>
            <div style={S.infoName}>{selectedTest.name}</div>
            <div style={S.infoMeta}>
              🧪 {selectedTest.category} &nbsp;•&nbsp; ⏱ {selectedTest.time} &nbsp;•&nbsp;
              <span style={{ color:"#fbbf24", fontWeight:700 }}>PKR {Number(selectedTest.price).toLocaleString()}</span>
            </div>
            <div style={{ ...S.infoMeta, marginTop:4 }}>
              Doctor: {selectedTest.doctorName || "Not assigned"}
            </div>
          </div>
        )}

        <div style={{ ...S.twoCol, ...(mobile && S.oneCol) }}>
          <div style={S.fg}>
            <label style={S.lbl}>Appointment Date *</label>
            <input type="date" min={today} value={form.date}
              onChange={(e) => set("date", e.target.value)}
              style={{ ...S.inp, ...(errors.date && S.inpErr) }} />
            <Err k="date" />
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Preferred Timing</label>
            <select value={form.time} onChange={(e) => set("time", e.target.value)} style={S.inp}>
              {TIME_SLOTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Home collection */}
        <label style={{ ...S.checkboxRow, marginTop:12 }}>
          <input type="checkbox" checked={form.home} onChange={(e) => set("home", e.target.checked)} />
          <div>
            <span style={{ fontWeight:600, color:"#d1fae5" }}>Request Home Sample Collection</span>
            <span style={{ display:"block", fontSize:11, color:"#6b7280", marginTop:2 }}>
              Available in Islamabad & Rawalpindi only — extra charges apply
            </span>
          </div>
        </label>

        {/* Booking summary */}
        {isReady && selectedTest && (
          <div style={{ ...S.currentBox, flexDirection:"column", alignItems:"stretch", gap:0, marginTop:14 }}>
            <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>
              Booking Summary
            </div>
            {[
              ["Appointment ID", apptId],
              ["Patient",        form.name],
              ["WhatsApp",       form.whatsapp],
              ["Gender / Age",   `${form.gender}, ${form.age} yrs`],
              ["Address",        form.address],
              ["Test",           selectedTest.name],
              ["Category",       selectedTest.category],
              ["Doctor",         selectedTest.doctorName || "Not assigned"],
              ["Date",           form.date],
              ["Timing",         form.time],
              ["Collection",     form.home ? "🏠 Home" : "🏥 Visit Lab"],
              ["Total Fee",      `PKR ${Number(selectedTest.price).toLocaleString()}`],
            ].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13, color:"#d1d5db" }}>
                <span style={{ color:"#9ca3af" }}>{l}</span>
                <span style={{ fontWeight: l === "Total Fee" ? 800 : 500, color: l === "Total Fee" ? "#fbbf24" : l === "Appointment ID" ? "#60a5fa" : "#f3f4f6" }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...S.row, ...(mobile && S.col), marginTop:20 }}>
          <button onClick={onClose} style={S.secondaryBtn}>Cancel</button>
          <button onClick={handleSubmit}
            disabled={!isReady || booking}
            style={{ ...S.primaryBtn, flex:1, opacity: isReady ? 1 : 0.5, cursor: isReady && !booking ? "pointer" : "not-allowed" }}>
            {booking ? "Saving..." : "✅ Confirm Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({ appt, mobile, onClose, onConfirm }) {
  const [date, setDate] = useState(appt.date);
  const [time, setTime] = useState(appt.time);

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, ...(mobile && S.modalMobile) }}>
        <div style={S.modalHeader}>
          <div>
            <h3 style={S.modalTitle}>🔄 Reschedule Appointment</h3>
            <p style={S.modalSub}>Choose a new date and time slot</p>
          </div>
          <button onClick={onClose} style={S.iconBtn}>✕</button>
        </div>

        <div style={S.infoBox}>
          <div style={S.infoName}>{appt.testName}</div>
          <div style={S.infoMeta}>{appt.category || "Medical Test"} &nbsp;•&nbsp; PKR {appt.price.toLocaleString()}</div>
        </div>

        <div style={S.currentBox}>
          <span style={{ color:"#6b7280", fontWeight:700 }}>Current:</span>
          <span style={{ color:"#fbbf24" }}>{fmt(appt.date)} — {appt.time}</span>
        </div>

        <div style={S.fg}>
          <label style={S.lbl}>New Date</label>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} style={S.inp} />
        </div>
        <div style={{ ...S.fg, marginTop:12 }}>
          <label style={S.lbl}>New Time Slot</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} style={S.inp}>
            {TIME_SLOTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ ...S.row, ...(mobile && S.col), marginTop:20 }}>
          <button onClick={onClose} style={S.secondaryBtn}>Cancel</button>
          <button
            onClick={() => onConfirm(appt._id, date, time)}
            style={{ ...S.primaryBtn, opacity:date ? 1 : 0.5, cursor:date ? "pointer" : "not-allowed" }}
            disabled={!date}>
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patient Appointment Card ──────────────────────────────────────────────────
function PatientCard({ appt, mobile, onReschedule }) {
  const meta   = statusMeta(appt.status);
  const canAct = appt.status === "Confirmed" || appt.status === "Pending";
  const hasCollector = appt.collectorName || appt.bikeNumber || appt.collectorContact || appt.reachTime;

  return (
    <article style={S.card}>
      <div style={S.cardHead}>
        <div>
          <div style={S.cardEyebrow}>Appointment {appt.appointmentId}</div>
          <h3 style={S.cardTitle}>{appt.testName}</h3>
          <p style={S.cardDoctor}>🧪 {appt.category || "Medical Test"}</p>
        </div>
        <div style={{ ...S.cardTop, marginBottom:0 }}>
          <span style={{ ...S.statusPill, color:meta.color, background:meta.bg, borderColor:meta.border }}>
            {meta.icon} {appt.status}
          </span>
          {appt.homeCollection && <span style={S.homePill}>🏠 Home Collection</span>}
        </div>
      </div>

      <div style={S.detailRow}>
        {[
          ["📅", fmt(appt.date),                       "Appointment Date"],
          ["🕐", appt.time,                            "Time Slot"],
          ["💰", `PKR ${appt.price.toLocaleString()}`, "Fee"],
          ["📍", appt.homeCollection ? "Home Visit" : "Visit Lab", "Collection"],
        ].map(([icon, val, sub]) => (
          <div key={sub} style={S.detailItem}>
            <span style={S.dIcon}>{icon}</span>
            <div>
              <div style={{ ...S.dVal, ...(sub === "Fee" && { color:"#fbbf24" }) }}>{val}</div>
              <div style={S.dSub}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {appt.homeCollection && hasCollector && (
        <div style={S.collectorBox}>
          <div style={S.collectorTitle}>ASSIGNED COLLECTOR</div>
          <div style={S.collectorGrid}>
            <span>Name: {appt.collectorName || "Not assigned"}</span>
            <span>Bike: {appt.bikeNumber || "Not assigned"}</span>
            <span>Contact: {appt.collectorContact || "Not assigned"}</span>
            <span>Reach Time: {appt.reachTime || "Not assigned"}</span>
          </div>
        </div>
      )}

      <div style={S.metaStrip}>
        <span style={S.metaChip}>Booked on {fmt(appt.bookedOn)}</span>
        {appt.patientName && <span style={S.metaChip}>{appt.patientName}</span>}
      </div>

      <div style={S.statusNote}>{statusMessage(appt.status)}</div>

      {canAct && isPast(appt.date) && (
        <div style={S.warnBox}>This date has passed. Please reschedule.</div>
      )}

      {canAct && (
        <div style={{ marginTop:14 }}>
          <button onClick={() => onReschedule(appt)} style={{ ...S.rescheduleBtn, width:"100%" }}>
            Reschedule Appointment
          </button>
        </div>
      )}
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Appointment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session,       setSession]      = useState(() => getSession());
  const [appts,         setAppts]        = useState([]);
  const [tests,         setTests]        = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [booking,       setBooking]      = useState(false);
  const [error,         setError]        = useState("");
  const [filter,        setFilter]       = useState("All");
  const [reschedTarget, setReschedTarget] = useState(null);
  const [bookOpen,      setBookOpen]      = useState(false);
  const [toast,         setToast]        = useState({ msg:"", type:"ok" });
  const [width,         setWidth]        = useState(() => window.innerWidth);

  // Auth guard
  useEffect(() => {
    const saved = getSession();
    if (!saved?.token) { navigate("/login", { replace: true }); return; }
    setSession(saved);
  }, [navigate]);

  const loadAppointments = async (email) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/appointments?patientEmail=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load appointments.");
      }

      setAppts((data.appointments || []).map(formatAppointmentForClient));
    } catch (fetchError) {
      setError(fetchError.message || "Unable to connect to the server.");
      setAppts([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAppointments = async (email) => {
    if (!email) {
      setAppts([]);
      setLoading(false);
      return;
    }

    await loadAppointments(email);
  };

  // Fetch + resize
  useEffect(() => {
    const loadData = async () => {
      try {
        const testResponse = await fetch(`${API_URL}/api/medical-tests?status=active`);
        const testData = await testResponse.json();

        if (testResponse.ok) {
          setTests(testData.tests || []);
        }
      } catch {
        setTests([]);
      }

      const saved = getSession();
      if (saved?.user?.email) {
        await refreshAppointments(saved.user.email);
      } else {
        setLoading(false);
      }
    };

    loadData();
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); };
  }, []);

  useEffect(() => {
    if (!session?.user?.email) {
      return undefined;
    }

    const syncAppointments = () => {
      const latestSession = getSession();
      refreshAppointments(latestSession?.user?.email || session.user.email);
    };

    const intervalId = window.setInterval(syncAppointments, 15000);
    const handleFocus = () => syncAppointments();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncAppointments();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.user?.email]);

  // Toast dismiss
  useEffect(() => {
    if (!toast.msg) return;
    const t = window.setTimeout(() => setToast({ msg:"", type:"ok" }), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const mobile = width <= 720;
  const user   = session?.user ?? {};

  const myAppts = useMemo(() => appts, [appts]);

  const filtered = useMemo(() =>
    filter === "All" ? myAppts : myAppts.filter((a) => a.status === filter),
  [myAppts, filter]);

  const stats = useMemo(() => [
    [String(myAppts.filter((a) => a.status === "Confirmed").length),  "Confirmed"],
    [String(myAppts.filter((a) => a.status === "Pending").length),    "Pending"  ],
    [String(myAppts.filter((a) => a.status === "Completed").length),  "Completed"],
    [String(myAppts.filter((a) => a.status === "Cancelled").length),  "Cancelled"],
  ], [myAppts]);

  const handleLogout = () => { clearSession(); setSession(null); navigate("/login", { replace: true }); };

  const handleReschedule = async (id, date, time) => {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, status: "pending" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reschedule appointment.");
      }

      setAppts((current) => current.map((appt) => appt._id === data.appointment._id ? formatAppointmentForClient(data.appointment) : appt));
      setReschedTarget(null);
      setError("");
      setToast({ msg:`Rescheduled to ${fmt(date)} — ${time}.`, type:"ok" });
    } catch (updateError) {
      setToast({ msg:updateError.message || "Unable to reschedule appointment.", type:"err" });
    }
  };

  const handleBookNew = async ({ apptId, test, name, whatsapp, gender, age, address, date, time, home }) => {
    setBooking(true);

    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: apptId,
          patientName: name,
          patientEmail: user.email,
          phone: whatsapp,
          gender,
          age: Number(age),
          address,
          testId: test.id,
          testName: test.name,
          category: test.category,
          price: Number(test.price),
          date,
          time,
          homeCollection: home,
          bookedOn: today,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to book appointment.");
      }

      setAppts((current) => [formatAppointmentForClient(data.appointment), ...current]);
      setBookOpen(false);
      setToast({ msg:`✅ Appointment ${apptId} booked for ${test.name} on ${date} (${time})${home ? " 🏠 Home" : ""}.`, type:"ok" });
    } catch (createError) {
      setToast({ msg:createError.message || "Unable to book appointment.", type:"err" });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div style={S.page}>

      {/* ══ NAVBAR ══ */}
      <nav style={{ ...S.nav, ...(mobile && S.navMobile) }}>
        <div style={S.brand}>
          <div style={S.logoWrap}><LabLogo /></div>
          <div>
            <div style={S.brandName}>T-City <span style={S.brandAccent}>Lab</span></div>
            <div style={S.brandTag}>Islamabad's modern medical lab</div>
          </div>
        </div>
        <div style={{ ...S.navLinks, ...(mobile && S.navLinksMobile) }}>
          {NAV_ITEMS.map((item) => (
            <span key={item}
              onClick={() => navigate("/" + item.toLowerCase().replace(" ", "-"))}
              style={{ ...S.navLink, ...(item === "Appointment" && S.navLinkActive) }}>
              {item}
            </span>
          ))}
        </div>
        <button onClick={handleLogout} style={{ ...S.logoutButton, ...(mobile && S.fullWidth) }}>
          Log Out
        </button>
      </nav>

      {/* ══ SESSION BANNER ══ */}
      <section style={S.sessionBar}>
        <div style={{ ...S.container, ...(mobile && S.containerMobile), ...S.sessionInner }}>
          <div style={S.avatar}>{(user.name || "P").charAt(0).toUpperCase()}</div>
          <div style={{ flex:1, minWidth: mobile ? "100%" : 220 }}>
            <div style={S.welcome}>
              Welcome back, <span style={{ color:"#fbbf24" }}>{user.name || "Patient"}</span>
            </div>
            <div style={S.userMeta}>
              {[user.email, user.phone, user.address, user.gender].filter(Boolean).join(" | ")}
            </div>
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

      {/* ══ MAIN ══ */}
      <main style={{ ...S.container, ...(mobile && S.containerMobile) }}>

        {/* Page title + Book button */}
        <div style={{ ...S.pageHead, ...(mobile && S.col) }}>
          <div>
            <h1 style={{ ...S.pageTitle, ...(mobile && S.pageTitleMobile) }}>My Appointments</h1>
            <p style={S.pageText}>View and reschedule your booked medical tests.</p>
          </div>
          <button onClick={() => setBookOpen(true)} style={S.bookNewBtn}>
            + Book Appointment
          </button>
        </div>

        {error && (
          <div style={{ marginBottom:16, padding:"12px 14px", borderRadius:10, background:"rgba(127,29,29,0.5)", border:"1px solid rgba(248,113,113,0.3)", color:"#fecaca", fontSize:13, fontWeight:700 }}>
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ ...S.filterRow, ...(mobile && S.filterRowMobile) }}>
          {ALL_FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...S.filterBtn, ...(filter === f && S.filterBtnActive) }}>
              {f}
              {f !== "All" && (
                <span style={{ ...S.filterCount, ...(filter === f && S.filterCountActive) }}>
                  {myAppts.filter((a) => a.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Patient Cards ── */}
        {loading && (
          <div style={S.grid}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ ...S.card, opacity:0.4, minHeight:220 }} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={S.grid}>
            {filtered.map((a) => (
              <PatientCard key={a._id} appt={a} mobile={mobile} onReschedule={setReschedTarget} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize:52, marginBottom:12 }}>📋</div>
            <div style={S.emptyTitle}>No {filter !== "All" ? filter.toLowerCase() : ""} appointments</div>
            <p style={S.pageText}>You have no appointments to show.</p>
            <button onClick={() => setBookOpen(true)} style={{ ...S.primaryBtn, marginTop:16, maxWidth:220, width:"100%" }}>
              + Book Appointment
            </button>
          </div>
        )}
      </main>

      {/* ══ MODALS ══ */}
      {bookOpen && (
        <BookApptModal user={user} tests={tests} initialSelectedTest={location.state?.selectedTest} booking={booking} mobile={mobile}
          onClose={() => setBookOpen(false)} onBook={handleBookNew} />
      )}
      {reschedTarget && (
        <RescheduleModal appt={reschedTarget} mobile={mobile}
          onClose={() => setReschedTarget(null)} onConfirm={handleReschedule} />
      )}

      {/* ══ TOAST ══ */}
      {toast.msg && (
        <div style={{
          ...S.toast, ...(mobile && S.toastMobile),
          background:  toast.type === "err" ? "#7f1d1d" : "#14532d",
          borderColor: toast.type === "err" ? "rgba(248,113,113,0.3)" : "rgba(34,197,94,0.3)",
        }}>
          {toast.msg}
        </div>
      )}

      <Footer mobile={mobile} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:             { minHeight:"100vh", background:"linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)", color:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif" },
  container:        { maxWidth:1200, margin:"0 auto", padding:28 },
  containerMobile:  { padding:"20px 16px 40px" },
  row:              { display:"flex", gap:10 },
  col:              { flexDirection:"column" },

  // Navbar
  nav:              { position:"sticky", top:0, zIndex:20, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, padding:"14px 28px", flexWrap:"wrap", background:"linear-gradient(90deg,#520809 0%,#6b0d0e 52%,#7b1113 100%)", borderBottom:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 10px 30px rgba(28,0,0,0.28)", backdropFilter:"blur(14px)" },
  navMobile:        { padding:"14px 16px" },
  brand:            { display:"flex", alignItems:"center", gap:12, minWidth:0 },
  logoWrap:         { width:44, height:44, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" },
  brandName:        { fontSize:22, fontWeight:800, color:"#f8fafc" },
  brandAccent:      { color:"#fca5a5" },
  brandTag:         { fontSize:11, color:"rgba(254,202,202,0.82)" },
  navLinks:         { display:"flex", alignItems:"center", justifyContent:"center", gap:18, flexWrap:"wrap", flex:1 },
  navLinksMobile:   { width:"100%", justifyContent:"flex-start", gap:12 },
  navLink:          { color:"#fecaca", fontSize:14, fontWeight:600, whiteSpace:"nowrap", cursor:"pointer" },
  navLinkActive:    { color:"#ffffff" },
  logoutButton:     { padding:"10px 22px", borderRadius:999, border:"1px solid rgba(255,255,255,0.3)", background:"linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))", color:"#fff", fontWeight:700, cursor:"pointer" },
  fullWidth:        { width:"100%" },

  // Session bar
  sessionBar:       { background:"linear-gradient(135deg,#5a0a0a 0%,#3b0505 60%,#4a0b0d 100%)", borderBottom:"1px solid rgba(248,113,113,0.2)" },
  sessionInner:     { display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" },
  avatar:           { width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#ef4444,#991b1b)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20 },
  welcome:          { fontSize:17, fontWeight:700, marginBottom:4, color:"#f8fafc" },
  userMeta:         { color:"#fecaca", fontSize:12, lineHeight:1.7, wordBreak:"break-word" },
  statGrid:         { marginLeft:"auto", display:"flex", gap:10, flexWrap:"wrap" },
  statGridMobile:   { width:"100%", marginLeft:0 },
  statCard:         { minWidth:86, padding:"8px 14px", borderRadius:12, background:"rgba(69,10,10,0.4)", border:"1px solid rgba(252,165,165,0.16)", textAlign:"center", flex:1 },
  statValue:        { fontSize:20, fontWeight:800, color:"#fca5a5" },
  statLabel:        { fontSize:10, color:"#fecaca", textTransform:"uppercase", letterSpacing:0.6 },

  // Page head
  pageHead:         { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:22, flexWrap:"wrap" },
  pageTitle:        { margin:"0 0 4px", fontSize:28, fontWeight:800, color:"#f8fafc" },
  pageTitleMobile:  { fontSize:22 },
  pageText:         { margin:0, color:"#fecaca", fontSize:13, lineHeight:1.7 },

  // Filters
  filterRow:        { display:"flex", gap:8, flexWrap:"wrap", marginBottom:22 },
  filterRowMobile:  { gap:6 },
  filterBtn:        { padding:"7px 16px", borderRadius:999, border:"1px solid rgba(252,165,165,0.2)", background:"rgba(255,255,255,0.04)", color:"#fecaca", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
  filterBtnActive:  { background:"rgba(220,38,38,0.25)", borderColor:"rgba(252,165,165,0.5)", color:"#fff" },
  filterCount:      { fontSize:11, padding:"1px 7px", borderRadius:999, background:"rgba(255,255,255,0.08)", color:"#9ca3af" },
  filterCountActive:{ background:"rgba(255,255,255,0.2)", color:"#fff" },

  // Patient cards
  grid:             { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,300px),1fr))", gap:18 },
  card:             { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(139,0,0,0.35)", borderRadius:18, padding:22, boxShadow:"0 8px 28px rgba(0,0,0,0.24)" },
  cardHead:         { display:"flex", justifyContent:"space-between", gap:14, flexWrap:"wrap", alignItems:"flex-start", marginBottom:14 },
  cardEyebrow:      { fontSize:11, color:"#fca5a5", fontWeight:800, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 },
  cardTop:          { display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 },
  statusPill:       { display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:999, border:"1px solid", fontSize:12, fontWeight:700 },
  homePill:         { display:"inline-flex", alignItems:"center", padding:"4px 12px", borderRadius:999, border:"1px solid rgba(96,165,250,0.3)", background:"rgba(96,165,250,0.1)", color:"#93c5fd", fontSize:12, fontWeight:600 },
  cardTitle:        { margin:"0 0 4px", fontSize:20, fontWeight:800, color:"#f9fafb" },
  cardDoctor:       { margin:"0 0 14px", color:"#9ca3af", fontSize:13 },
  detailRow:        { display:"flex", gap:10, flexWrap:"wrap", padding:"12px 14px", borderRadius:12, background:"rgba(0,0,0,0.22)", border:"1px solid rgba(255,255,255,0.06)", marginBottom:10 },
  detailItem:       { display:"flex", alignItems:"flex-start", gap:8, flex:1, minWidth:70 },
  dIcon:            { fontSize:15, flexShrink:0, marginTop:1 },
  dVal:             { fontSize:13, fontWeight:700, color:"#f3f4f6", lineHeight:1.3 },
  dSub:             { fontSize:11, color:"#6b7280", marginTop:1 },
  bookedOn:         { fontSize:11, color:"#6b7280", marginBottom:2 },
  metaStrip:        { display:"flex", gap:8, flexWrap:"wrap", marginTop:12 },
  metaChip:         { display:"inline-flex", alignItems:"center", padding:"6px 10px", borderRadius:999, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", color:"#d1d5db", fontSize:11, fontWeight:700 },
  collectorBox:     { marginTop:12, padding:"12px 14px", background:"#ecfdf5", borderTop:"1px solid #86efac", borderBottom:"1px solid #86efac", color:"#065f46" },
  collectorTitle:   { marginBottom:10, color:"#008000", fontSize:12, fontWeight:900, textTransform:"uppercase", letterSpacing:0.5 },
  collectorGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"8px 18px", fontSize:12, color:"#065f46" },
  statusNote:       { marginTop:12, color:"#fecaca", fontSize:12, lineHeight:1.6 },
  warnBox:          { marginTop:10, padding:"8px 12px", borderRadius:8, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", color:"#fbbf24", fontSize:12 },
  rescheduleBtn:    { padding:"11px 14px", borderRadius:10, border:"none", background:"#d97706", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 },

  // Empty
  emptyState:       { textAlign:"center", padding:"60px 0", display:"flex", flexDirection:"column", alignItems:"center" },
  emptyTitle:       { fontSize:22, fontWeight:800, marginBottom:8, color:"#f8fafc" },

  // Modal
  overlay:          { position:"fixed", inset:0, padding:18, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", zIndex:50 },
  modal:            { width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto", padding:24, borderRadius:18, background:"#1c0505", border:"1px solid rgba(139,0,0,0.5)" },
  modalMobile:      { padding:18 },
  modalHeader:      { display:"flex", justifyContent:"space-between", gap:12, marginBottom:18 },
  modalTitle:       { margin:0, fontSize:19, color:"#f9fafb", fontWeight:800 },
  modalSub:         { margin:"4px 0 0", color:"#9ca3af", fontSize:13 },
  iconBtn:          { width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", cursor:"pointer", flexShrink:0 },
  infoBox:          { padding:"12px 14px", borderRadius:12, border:"1px solid rgba(245,158,11,0.2)", background:"rgba(245,158,11,0.08)", marginBottom:16 },
  infoName:         { fontSize:17, fontWeight:800, color:"#fbbf24", marginBottom:4 },
  infoMeta:         { fontSize:13, color:"#9ca3af" },
  currentBox:       { display:"flex", gap:8, alignItems:"center", fontSize:13, color:"#9ca3af", marginBottom:16, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" },
  fg:               { display:"flex", flexDirection:"column", gap:6 },
  lbl:              { fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 },
  inp:              { padding:"11px 12px", borderRadius:10, border:"1px solid rgba(139,0,0,0.4)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", outline:"none", fontFamily:"inherit", fontSize:14 },

  // Buttons
  primaryBtn:       { padding:"11px 14px", borderRadius:10, border:"none", background:"#22c55e", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 },
  secondaryBtn:     { flex:1, padding:"11px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", fontWeight:700, cursor:"pointer", fontSize:13 },
  bookNewBtn:       { padding:"11px 24px", borderRadius:10, border:"none", background:"#991b1b", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", whiteSpace:"nowrap", letterSpacing:"0.02em" },

  // Book form extras
  apptIdBox:        { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.25)", marginBottom:16 },
  apptIdLabel:      { fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 },
  apptIdValue:      { fontSize:13, fontWeight:800, color:"#60a5fa", letterSpacing:1 },
  secDiv:           { fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid rgba(255,255,255,0.07)", paddingBottom:6, marginBottom:14 },
  twoCol:           { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" },
  oneCol:           { gridTemplateColumns:"1fr" },
  inpErr:           { borderColor:"rgba(248,113,113,0.6)", background:"rgba(248,113,113,0.05)" },
  errText:          { fontSize:11, color:"#f87171", marginTop:3 },
  checkboxRow:      { display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:12, border:"1px solid rgba(34,197,94,0.2)", background:"rgba(34,197,94,0.08)", cursor:"pointer" },

  // Toast
  toast:            { position:"fixed", right:24, bottom:24, maxWidth:440, padding:"14px 18px", borderRadius:12, color:"#f0fdf4", boxShadow:"0 10px 24px rgba(0,0,0,0.35)", zIndex:60, border:"1px solid" },
  toastMobile:      { left:16, right:16, bottom:16, maxWidth:"none" },
  footer:           { marginTop:"auto", background:"#130202", borderTop:"1px solid rgba(139,0,0,0.5)", padding:"48px 0 0" },
  footerLink:       { display:"block", width:"fit-content", padding:0, border:"none", background:"transparent", fontSize:13, marginBottom:9, cursor:"pointer", color:"#fca5a5", lineHeight:1.5, textAlign:"left" },
  footerBottom:     { borderTop:"1px solid rgba(255,255,255,0.08)", padding:"20px 28px", textAlign:"center", fontSize:12, color:"#fca5a5" },
};
