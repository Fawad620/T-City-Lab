import { useEffect, useMemo, useState } from "react";
import homeSampleBanner from "../assets/home-sample-banner.png";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../lib/auth";
import { FOOTER_COLUMNS, performFooterAction } from "../lib/footerActions";

const NAV_ITEMS  = ["MedicalTest", "Appointment", "Report", "Home Sample"];
const TIME_SLOTS = ["Morning (8amâ€“11am)", "Afternoon (12pmâ€“3pm)", "Evening (4pmâ€“7pm)"];
const HOME_CHARGE = 300; // PKR home collection fee
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// â”€â”€ Blood tests only (home collection) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BLOOD_TESTS = [
  { name:"Blood CP",        doctor:"Dr. Ayesha", price:1500, duration:"24 hrs", desc:"Complete blood picture â€” RBC, WBC, platelets, haemoglobin." },
  { name:"Blood Sugar",     doctor:"Dr. Ayesha", price:800,  duration:"2 hrs",  desc:"Fasting or random glucose level for diabetes screening."    },
  { name:"Liver Function",  doctor:"Dr. Saad",   price:3500, duration:"48 hrs", desc:"Liver enzymes, bilirubin, and protein level evaluation."    },
  { name:"Thyroid Profile", doctor:"Dr. Sana",   price:4500, duration:"48 hrs", desc:"TSH, T3 and T4 hormone levels for thyroid assessment."       },
  { name:"Lipid Profile",   doctor:"Dr. Saad",   price:2500, duration:"24 hrs", desc:"Cholesterol, HDL, LDL and triglycerides panel."             },
  { name:"Kidney Function", doctor:"Dr. Zubair", price:3000, duration:"24 hrs", desc:"Creatinine, BUN and uric acid for kidney health."            },
  { name:"HbA1c",           doctor:"Dr. Ayesha", price:2000, duration:"24 hrs", desc:"3-month average blood sugar for diabetes management."        },
  { name:"Vitamin D",       doctor:"Dr. Sana",   price:3500, duration:"48 hrs", desc:"25-OH Vitamin D level to check bone and immune health."      },
];

// â”€â”€ Coverage areas (within 50 km of T-City Lab, H-9 Islamabad) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COVERAGE_AREAS = [
  { city:"Islamabad",   areas:["F-6","F-7","F-8","F-9","F-10","F-11","G-6","G-7","G-8","G-9","G-10","G-11","H-8","H-9","H-10","H-11","I-8","I-9","I-10","E-7","E-8","Blue Area","Bahria Town","DHA","CDA Sectors"] },
  { city:"Rawalpindi",  areas:["Saddar","Chaklala","Gulraiz","Satellite Town","Dhoke Khabba","Raja Bazar","Liaquat Bagh","Committee Chowk","Westridge","Adiala Road"] },
  { city:"Nearby",      areas:["Taxila (35 km)","Wah Cantt (40 km)","Attock (48 km)","Murree (45 km)","Fateh Jang (50 km)"] },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const genRequestId = () => {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `HSC-${ts}-${rnd}`;
};

const today = new Date().toISOString().split("T")[0];

const toClientStatus = (status) => ({
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Rejected",
}[status] || status || "Pending");

const getStatusStyle = (status) => ({
  Confirmed: { icon:"âœ“", color:"#4ade80", bg:"rgba(34,197,94,0.14)", border:"rgba(34,197,94,0.35)" },
  Pending:   { icon:"â³", color:"#fbbf24", bg:"rgba(245,158,11,0.14)", border:"rgba(245,158,11,0.35)" },
  Rejected:  { icon:"âœ•", color:"#f87171", bg:"rgba(248,113,113,0.14)", border:"rgba(248,113,113,0.35)" },
  Completed: { icon:"âœ“", color:"#60a5fa", bg:"rgba(96,165,250,0.14)", border:"rgba(96,165,250,0.35)" },
}[status] || { icon:"â€¢", color:"#e5e7eb", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.1)" });

const formatHomeRequest = (appointment) => ({
  _id: appointment._id,
  reqId: appointment.appointmentId,
  name: appointment.patientName,
  whatsapp: appointment.phone,
  address: appointment.address,
  area: appointment.collectionArea || "",
  testName: appointment.testName,
  date: appointment.date,
  time: appointment.time,
  totalPrice: appointment.price,
  status: toClientStatus(appointment.status),
  collectorName: appointment.collectorName || "",
  bikeNumber: appointment.bikeNumber || "",
  collectorContact: appointment.collectorContact || "",
  reachTime: appointment.reachTime || "",
  submittedOn: appointment.bookedOn,
  createdAt: appointment.createdAt,
  updatedAt: appointment.updatedAt,
});

const makeTestId = (testName) => `HSC-${testName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase()}`;

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

// â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Request Form Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RequestModal({ user, mobile, submitting, onClose, onSubmit }) {
  const reqId = useState(() => genRequestId())[0];
  const [form, setForm] = useState({
    name:     user?.name    || "",
    whatsapp: user?.phone   || "",
    gender:   user?.gender  || "",
    age:      user?.age     || "",
    address:  user?.address || "",
    area:     "",
    testName: user?._preselect || "",
    date:     "",
    time:     TIME_SLOTS[0],
    notes:    "",
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); };

  const selectedTest = BLOOD_TESTS.find((t) => t.name === form.testName);
  const totalPrice   = selectedTest ? selectedTest.price + HOME_CHARGE : HOME_CHARGE;

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = "Name is required";
    if (!form.whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    else if (!/^03\d{9}$/.test(form.whatsapp.trim())) e.whatsapp = "Enter valid number (03XXXXXXXXX)";
    if (!form.gender)          e.gender   = "Select gender";
    if (!form.age || form.age < 1 || form.age > 120) e.age = "Enter valid age";
    if (!form.address.trim())  e.address  = "Full address is required";
    if (!form.area.trim())     e.area     = "Area / city is required";
    if (!form.testName)        e.testName = "Select a blood test";
    if (!form.date)            e.date     = "Select a date";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit({ reqId, ...form, test: selectedTest, totalPrice });
  };

  const renderError = (key) => errors[key] ? <span style={S.errText}>{errors[key]}</span> : null;
  const isReady = form.name && form.whatsapp && form.gender && form.age && form.address && form.area && form.testName && form.date;

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth:600, ...(mobile && S.modalMobile) }}>
        <div style={S.modalHeader}>
          <div>
            <h3 style={S.modalTitle}>ðŸ  Request Home Sample Collection</h3>
            <p style={S.modalSub}>Our phlebotomist will visit your address at the selected time</p>
          </div>
          <button onClick={onClose} style={S.iconBtn}>âœ•</button>
        </div>

        {/* Request ID */}
        <div style={S.apptIdBox}>
          <span style={S.apptIdLabel}>Request ID</span>
          <span style={S.apptIdValue}>{reqId}</span>
        </div>

        {/* â”€â”€ Patient Info â”€â”€ */}
        <div style={S.secDiv}>Patient Information</div>
        <div style={{ ...S.twoCol, ...(mobile && S.oneCol) }}>
          <div style={S.fg}>
            <label style={S.lbl}>Full Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Muhammad Fawad" style={{ ...S.inp, ...(errors.name && S.inpErr) }} />
            {renderError("name")}
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>WhatsApp Number *</label>
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="03XXXXXXXXX" maxLength={11} style={{ ...S.inp, ...(errors.whatsapp && S.inpErr) }} />
            {renderError("whatsapp")}
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Gender *</label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} style={{ ...S.inp, ...S.selectDark, ...(errors.gender && S.inpErr) }}>
              <option value="" style={S.selectDark}>Select gender</option>
              <option style={S.selectDark}>Male</option>
              <option style={S.selectDark}>Female</option>
              <option style={S.selectDark}>Other</option>
            </select>
            {renderError("gender")}
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Age *</label>
            <input type="number" min={1} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 25" style={{ ...S.inp, ...(errors.age && S.inpErr) }} />
            {renderError("age")}
          </div>
        </div>

        <div style={{ ...S.fg, marginBottom:12 }}>
          <label style={S.lbl}>Full Home Address *</label>
          <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House No, Street, Area, City" style={{ ...S.inp, ...(errors.address && S.inpErr) }} />
          {renderError("address")}
        </div>

        <div style={{ ...S.fg, marginBottom:16 }}>
          <label style={S.lbl}>Area / City *</label>
          <input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. F-10 Islamabad / Saddar Rawalpindi" style={{ ...S.inp, ...(errors.area && S.inpErr) }} />
          {renderError("area")}
          <span style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Must be within 50 km of H-9 Islamabad</span>
        </div>

        {/* â”€â”€ Test & Schedule â”€â”€ */}
        <div style={S.secDiv}>Blood Test & Schedule</div>

        <div style={{ ...S.fg, marginBottom:12 }}>
          <label style={S.lbl}>Select Blood Test *</label>
          <select
            value={form.testName}
            onChange={(e) => set("testName", e.target.value)}
            style={{ ...S.inp, ...S.selectDark, ...(errors.testName && S.inpErr) }}
          >
            <option value="" style={S.selectDark}>-- Choose a blood test --</option>
            {BLOOD_TESTS.map((t) => (
              <option key={t.name} value={t.name} style={S.selectDark}>
                {t.name} â€” PKR {t.price.toLocaleString()} + PKR {HOME_CHARGE} (collection)
              </option>
            ))}
          </select>
          {renderError("testName")}
        </div>

        {/* Selected test preview */}
        {selectedTest && (
          <div style={S.infoBox}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={S.infoName}>ðŸ©¸ {selectedTest.name}</div>
                <div style={S.infoMeta}>ðŸ‘¨â€âš•ï¸ {selectedTest.doctor} &nbsp;â€¢&nbsp; â± {selectedTest.duration}</div>
                <div style={{ color:"#d1d5db", fontSize:12, marginTop:4 }}>{selectedTest.desc}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ color:"#9ca3af", fontSize:11 }}>Test</div>
                <div style={{ color:"#fbbf24", fontWeight:700 }}>PKR {selectedTest.price.toLocaleString()}</div>
                <div style={{ color:"#9ca3af", fontSize:11, marginTop:4 }}>Collection fee</div>
                <div style={{ color:"#fbbf24", fontWeight:700 }}>PKR {HOME_CHARGE}</div>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:6, paddingTop:6, color:"#f59e0b", fontWeight:800, fontSize:15 }}>
                  Total: PKR {totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ ...S.twoCol, ...(mobile && S.oneCol), marginBottom:12 }}>
          <div style={S.fg}>
            <label style={S.lbl}>Preferred Date *</label>
            <input type="date" min={today} value={form.date} onChange={(e) => set("date", e.target.value)} style={{ ...S.inp, ...(errors.date && S.inpErr) }} />
            {renderError("date")}
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Preferred Time</label>
            <select value={form.time} onChange={(e) => set("time", e.target.value)} style={{ ...S.inp, ...S.selectDark }}>
              {TIME_SLOTS.map((s) => <option key={s} style={S.selectDark}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ ...S.fg, marginBottom:16 }}>
          <label style={S.lbl}>Special Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. fasting, elderly patient, gate code..."
            rows={2} style={{ ...S.inp, resize:"vertical" }} />
        </div>

        {/* Summary */}
        {isReady && selectedTest && (
          <div style={{ ...S.currentBox, flexDirection:"column", alignItems:"stretch", gap:0, marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Request Summary</div>
            {[
              ["Request ID",   reqId],
              ["Patient",      form.name],
              ["WhatsApp",     form.whatsapp],
              ["Gender / Age", `${form.gender}, ${form.age} yrs`],
              ["Address",      form.address],
              ["Area",         form.area],
              ["Test",         selectedTest.name],
              ["Doctor",       selectedTest.doctor],
              ["Date",         form.date],
              ["Time",         form.time],
              ["Test Price",   `PKR ${selectedTest.price.toLocaleString()}`],
              ["Collection Fee",`PKR ${HOME_CHARGE}`],
              ["Total Payable",`PKR ${totalPrice.toLocaleString()}`],
            ].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
                <span style={{ color:"#9ca3af" }}>{l}</span>
                <span style={{ fontWeight: l === "Total Payable" ? 800 : 500, color: l === "Total Payable" ? "#f59e0b" : l === "Request ID" ? "#60a5fa" : "#f3f4f6" }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:10, ...(mobile && { flexDirection:"column" }) }}>
          <button onClick={onClose} style={S.secondaryBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !isReady}
            style={{ ...S.primaryBtn, flex:1, opacity: isReady && !submitting ? 1 : 0.5, cursor: isReady && !submitting ? "pointer" : "not-allowed" }}>
            {submitting ? "Submitting..." : "âœ… Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Blood Test Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TestCard({ test, onRequest }) {
  const [hovered, setHovered] = useState(false);
  return (
    <article style={{ ...S.card, ...(hovered && S.cardHover) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={S.cardTop}>
        <span style={S.bloodIcon}>ðŸ©¸</span>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"#fca5a5", fontSize:11, fontWeight:600 }}>Test</div>
          <div style={S.cardPrice}>PKR {test.price.toLocaleString()}</div>
        </div>
      </div>
      <h3 style={S.cardTitle}>{test.name}</h3>
      <p style={S.cardDoctor}>ðŸ‘¨â€âš•ï¸ {test.doctor}</p>
      <p style={S.cardText}>{test.desc}</p>
      <div style={S.cardBottom}>
        <div>
          <span style={S.chip}>â± {test.duration}</span>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"#9ca3af", fontSize:10 }}>+ PKR {HOME_CHARGE} collection</div>
          <div style={{ color:"#f59e0b", fontWeight:800, fontSize:13 }}>Total PKR {(test.price + HOME_CHARGE).toLocaleString()}</div>
        </div>
      </div>
      <button onClick={() => onRequest(test)} style={S.requestBtn}>ðŸ  Request at Home</button>
    </article>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HomeSample() {
  const navigate = useNavigate();
  const [session,    setSession]    = useState(() => getSession());
  const [modalOpen,  setModalOpen]  = useState(false);
  const [preselect,  setPreselect]  = useState("");
  const [toast,      setToast]      = useState({ msg:"", type:"ok" });
  const [width,      setWidth]      = useState(() => window.innerWidth);
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = getSession();
    if (!saved?.token) { navigate("/login", { replace: true }); return; }
    setSession(saved);
  }, [navigate]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!toast.msg) return;
    const t = window.setTimeout(() => setToast({ msg:"", type:"ok" }), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadHomeRequests = async (email) => {
    if (!email) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/appointments?patientEmail=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load home sample requests.");
      }

      setRequests((data.appointments || [])
        .filter((appointment) => appointment.homeCollection)
        .map(formatHomeRequest));
    } catch (fetchError) {
      setError(fetchError.message || "Unable to connect to the server.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.email) {
      return undefined;
    }

    loadHomeRequests(session.user.email);

    const syncRequests = () => {
      const latestSession = getSession();
      loadHomeRequests(latestSession?.user?.email || session.user.email);
    };

    const intervalId = window.setInterval(syncRequests, 15000);
    const handleFocus = () => syncRequests();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncRequests();
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

  const mobile = width <= 720;
  const user   = session?.user ?? {};

  const stats = useMemo(() => [
    [String(requests.length),                                            "Requests"],
    [String(requests.filter((r) => r.status === "Pending").length),    "Pending" ],
    [String(requests.filter((r) => r.status === "Confirmed").length),  "Confirmed"],
  ], [requests]);

  const handleLogout = () => { clearSession(); setSession(null); navigate("/login", { replace: true }); };

  const openWithTest = (test) => { setPreselect(test.name); setModalOpen(true); };

  const handleSubmit = async (data) => {
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: data.reqId,
          patientName: data.name,
          patientEmail: user.email,
          phone: data.whatsapp,
          gender: data.gender,
          age: Number(data.age),
          address: data.address,
          collectionArea: data.area,
          testId: makeTestId(data.testName),
          testName: data.testName,
          category: "Blood Test",
          price: Number(data.totalPrice),
          date: data.date,
          time: data.time,
          homeCollection: true,
          bookedOn: today,
          notes: data.notes,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || "Unable to submit request.");
      }

      setRequests((p) => [formatHomeRequest(body.appointment), ...p]);
      setModalOpen(false);
      setPreselect("");
      setToast({ msg:`âœ… Request ${data.reqId} submitted! Our team will contact you on ${data.whatsapp} to confirm.`, type:"ok" });
    } catch (submitError) {
      setToast({ msg:submitError.message || "Unable to submit request.", type:"err" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`body,html{margin:0;padding:0;background:#1a0304 !important;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {/* â•â• NAVBAR â•â• */}
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
            <span key={item} onClick={() => navigate("/" + item.toLowerCase().replace(" ", "-"))}
              style={{ ...S.navLink, ...(item === "Home Sample" && S.navLinkActive) }}>
              {item}
            </span>
          ))}
        </div>
        <button onClick={handleLogout} style={{ ...S.logoutButton, ...(mobile && S.fullWidth) }}>Log Out</button>
      </nav>

      {/* â•â• SESSION BANNER â•â• */}
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

      {/* â•â• MAIN â•â• */}
      <main style={{ ...S.container, ...(mobile && S.containerMobile), paddingBottom:60 }}>

        {/* â”€â”€ Infographic Banner â”€â”€ */}
        <div style={S.bannerWrap}>
          <img
            src={homeSampleBanner}
            alt="T-City Lab Home Sample Collection by Bike â€” within 50 KM, 6-step process"
            style={{ ...S.bannerImg, ...(mobile && S.bannerImgMobile) }}
          />
          <div style={{ ...S.bannerOverlay, ...(mobile && { display:"none" }) }}>
            <button onClick={() => setModalOpen(true)} style={S.bannerBtn}>
              ðŸ  Request Home Collection
            </button>
          </div>
        </div>

        {mobile && (
          <div style={{ textAlign:"center", margin:"16px 0 8px" }}>
            <button onClick={() => setModalOpen(true)} style={{ ...S.heroBtn, width:"100%" }}>
              ðŸ  Request Home Collection
            </button>
          </div>
        )}

        {/* â”€â”€ Hero â”€â”€ */}
        <div style={{ ...S.hero, ...(mobile && S.heroMobile) }}>
          <div style={S.heroText}>
            <div style={S.heroBadge}>ðŸ  Home Collection Service</div>
            <h1 style={{ ...S.heroTitle, ...(mobile && { fontSize:26 }) }}>Blood Tests at Your Doorstep</h1>
            <p style={S.heroSub}>
              Skip the commute. Our certified phlebotomists collect your blood sample at home and deliver accurate results within the promised time â€” serving Islamabad, Rawalpindi and surrounding areas within <strong style={{ color:"#fbbf24" }}>50 km</strong> of our lab.
            </p>
            <button onClick={() => setModalOpen(true)} style={S.heroBtn}>
              ðŸ  Request Home Collection
            </button>
          </div>

          {/* Info cards */}
          <div style={{ ...S.heroCards, ...(mobile && { gridTemplateColumns: width <= 420 ? "1fr" : "1fr 1fr" }) }}>
            {[
              { icon:"ðŸ©¸", title:"Blood Tests Only",   desc:"We collect blood samples at home. Radiology tests require lab visit."  },
              { icon:"ðŸ“", title:"50 km Coverage",     desc:"Islamabad, Rawalpindi & surrounding areas within 50 km of H-9."        },
              { icon:"ðŸ’°", title:`PKR ${HOME_CHARGE} Fee`, desc:"A flat home collection charge applies on top of the test price." },
              { icon:"â±", title:"Same-Day Dispatch",  desc:"Your sample is dispatched to our lab immediately after collection."     },
            ].map((c) => (
              <div key={c.title} style={S.infoCard}>
                <div style={S.infoCardIcon}>{c.icon}</div>
                <div style={S.infoCardTitle}>{c.title}</div>
                <div style={S.infoCardDesc}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* â”€â”€ How it works â”€â”€ */}
        <div style={S.sectionHead}>
          <h2 style={S.sectionTitle}>How It Works</h2>
          <p style={S.sectionSub}>Simple 4-step process from request to results</p>
        </div>
        <div style={{ ...S.stepsRow, ...(mobile && { gridTemplateColumns: width <= 420 ? "1fr" : "1fr 1fr" }) }}>
          {[
            { n:"1", icon:"ðŸ“‹", title:"Submit Request",    desc:"Fill the form with your details, test, date & address."        },
            { n:"2", icon:"ðŸ“ž", title:"Confirmation Call", desc:"Our team confirms your appointment via WhatsApp within 2 hours." },
            { n:"3", icon:"ðŸš—", title:"Phlebotomist Visits",desc:"Our certified staff arrives at your address on time."           },
            { n:"4", icon:"ðŸ“„", title:"Get Results",       desc:"Report delivered via WhatsApp or downloadable from portal."     },
          ].map((s) => (
            <div key={s.n} style={S.stepCard}>
              <div style={S.stepNum}>{s.n}</div>
              <div style={S.stepIcon}>{s.icon}</div>
              <div style={S.stepTitle}>{s.title}</div>
              <div style={S.stepDesc}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* â”€â”€ Coverage areas â”€â”€ */}
        <div style={S.sectionHead}>
          <h2 style={S.sectionTitle}>ðŸ“ Coverage Areas (within 50 km)</h2>
          <p style={S.sectionSub}>We currently serve the following areas. Outside this range? Call us to check.</p>
        </div>
        <div style={{ ...S.coverageGrid, ...(mobile && { gridTemplateColumns:"1fr" }) }}>
          {COVERAGE_AREAS.map((zone) => (
            <div key={zone.city} style={S.coverageCard}>
              <div style={S.coverageCity}>{zone.city}</div>
              <div style={S.areaWrap}>
                {zone.areas.map((a) => (
                  <span key={a} style={S.areaChip}>{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* â”€â”€ Available blood tests â”€â”€ */}
        <div style={{ ...S.sectionHead, marginTop:40 }}>
          <h2 style={S.sectionTitle}>ðŸ©¸ Available Blood Tests</h2>
          <p style={S.sectionSub}>All prices shown include the PKR {HOME_CHARGE} home collection charge in the total</p>
        </div>
        <div style={S.grid}>
          {BLOOD_TESTS.map((test) => (
            <TestCard key={test.name} test={test} onRequest={openWithTest} />
          ))}
        </div>

        {/* â”€â”€ My Requests (if any submitted) â”€â”€ */}
        {error && (
          <div style={{ marginTop:24, padding:"12px 14px", borderRadius:10, background:"rgba(127,29,29,0.5)", border:"1px solid rgba(248,113,113,0.3)", color:"#fecaca", fontSize:13, fontWeight:700 }}>
            {error}
          </div>
        )}

        {(loading || requests.length > 0) && (
          <>
            <div style={{ ...S.sectionHead, marginTop:48 }}>
              <h2 style={S.sectionTitle}>ðŸ“‹ My Requests</h2>
              <p style={S.sectionSub}>Track your submitted home sample collection requests</p>
            </div>
            {loading ? (
              <div style={S.loadingBox}>Loading your home sample requests...</div>
            ) : <div style={S.grid}>
              {requests.map((r) => {
                const hasCollector = r.collectorName || r.bikeNumber || r.collectorContact || r.reachTime;

                return (
                <div key={r.reqId} style={S.requestCard}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ color:"#60a5fa", fontSize:12, fontWeight:700 }}>{r.reqId}</span>
                    <span style={{ ...S.statusPill, color:getStatusStyle(r.status).color, background:getStatusStyle(r.status).bg, borderColor:getStatusStyle(r.status).border }}>
                      {getStatusStyle(r.status).icon} {r.status}
                    </span>
                  </div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#f9fafb", marginBottom:4 }}>{r.testName}</div>
                  <div style={{ color:"#9ca3af", fontSize:13, marginBottom:10 }}>ðŸ“ {r.area} &nbsp;â€¢&nbsp; ðŸ“… {r.date} &nbsp;â€¢&nbsp; ðŸ• {r.time}</div>
                  {hasCollector && (
                    <div style={S.collectorBox}>
                      <div style={S.collectorTitle}>ASSIGNED COLLECTOR</div>
                      <div style={S.collectorGrid}>
                        <span>Name: {r.collectorName || "Not assigned"}</span>
                        <span>Bike: {r.bikeNumber || "Not assigned"}</span>
                        <span>Contact: {r.collectorContact || "Not assigned"}</span>
                        <span>Reach Time: {r.reachTime || "Not assigned"}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:10 }}>
                    <span style={{ color:"#9ca3af", fontSize:13 }}>Total Payable</span>
                    <span style={{ color:"#f59e0b", fontWeight:800, fontSize:15 }}>PKR {r.totalPrice?.toLocaleString()}</span>
                  </div>
                </div>
                );
              })}
            </div>}
          </>
        )}
      </main>

      {/* â•â• FOOTER â•â• */}
      <Footer mobile={mobile} />

      {/* â•â• MODAL â•â• */}
      {modalOpen && (
        <RequestModal
          user={{ ...user, ...(preselect && { _preselect: preselect }) }}
          mobile={mobile}
          submitting={submitting}
          onClose={() => { setModalOpen(false); setPreselect(""); }}
          onSubmit={handleSubmit}
        />
      )}

      {/* â•â• TOAST â•â• */}
      {toast.msg && (
        <div style={{ ...S.toast, ...(mobile && S.toastMobile) }}>{toast.msg}</div>
      )}
    </div>
  );
}

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const S = {
  page:             { minHeight:"100vh", background:"linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)", color:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif", display:"flex", flexDirection:"column" },
  container:        { maxWidth:1200, margin:"0 auto", padding:28 },
  containerMobile:  { padding:"20px 16px" },

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
  sessionBar:       { background:"linear-gradient(135deg,#5a0a0a 0%,#3b0505 60%,#4a0b0d 100%)", borderBottom:"1px solid rgba(248,113,113,0.25)" },
  sessionInner:     { display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" },
  avatar:           { width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#ef4444,#991b1b)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20, color:"#fff" },
  welcome:          { fontSize:17, fontWeight:700, marginBottom:4, color:"#f8fafc" },
  userMeta:         { color:"#fecaca", fontSize:12, lineHeight:1.7, wordBreak:"break-word" },
  statGrid:         { marginLeft:"auto", display:"flex", gap:10, flexWrap:"wrap" },
  statGridMobile:   { width:"100%", marginLeft:0 },
  statCard:         { minWidth:86, padding:"8px 14px", borderRadius:12, background:"rgba(69,10,10,0.4)", border:"1px solid rgba(252,165,165,0.16)", textAlign:"center", flex:1 },
  statValue:        { fontSize:20, fontWeight:800, color:"#fca5a5" },
  statLabel:        { fontSize:10, color:"#fecaca", textTransform:"uppercase", letterSpacing:0.6 },

  // Banner
  bannerWrap:       { position:"relative", borderRadius:20, overflow:"hidden", marginBottom:32, boxShadow:"0 16px 48px rgba(0,0,0,0.5)", border:"1px solid rgba(220,38,38,0.3)" },
  bannerImg:        { width:"100%", display:"block", borderRadius:20, objectFit:"cover" },
  bannerImgMobile:  { borderRadius:12 },
  bannerOverlay:    { position:"absolute", bottom:32, right:32, display:"flex" },
  bannerBtn:        { padding:"14px 32px", borderRadius:10, border:"none", background:"#991b1b", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 6px 20px rgba(0,0,0,0.5)", letterSpacing:"0.02em" },

  // Hero section
  hero:             { display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, alignItems:"start", padding:"40px 0 32px" },
  heroMobile:       { gridTemplateColumns:"1fr", gap:22, padding:"28px 0 24px" },
  heroText:         { display:"flex", flexDirection:"column", gap:16 },
  heroBadge:        { display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:999, background:"rgba(220,38,38,0.2)", border:"1px solid rgba(220,38,38,0.4)", color:"#fca5a5", fontSize:13, fontWeight:600, width:"fit-content" },
  heroTitle:        { margin:0, fontSize:34, fontWeight:900, color:"#f8fafc", lineHeight:1.2 },
  heroSub:          { margin:0, color:"#fecaca", fontSize:14, lineHeight:1.8 },
  heroBtn:          { padding:"13px 28px", borderRadius:10, border:"none", background:"#991b1b", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", width:"fit-content", letterSpacing:"0.02em" },
  heroCards:        { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  infoCard:         { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(220,38,38,0.25)", borderRadius:12, padding:"16px 14px" },
  infoCardIcon:     { fontSize:24, marginBottom:8 },
  infoCardTitle:    { fontWeight:800, fontSize:14, color:"#f9fafb", marginBottom:4 },
  infoCardDesc:     { fontSize:12, color:"#9ca3af", lineHeight:1.6 },

  // Section headings
  sectionHead:      { marginBottom:20, marginTop:36 },
  sectionTitle:     { margin:"0 0 6px", fontSize:22, fontWeight:800, color:"#f8fafc" },
  sectionSub:       { margin:0, color:"#fecaca", fontSize:13 },

  // How it works
  stepsRow:         { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:8 },
  stepCard:         { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:14, padding:"18px 14px", textAlign:"center" },
  stepNum:          { width:28, height:28, borderRadius:"50%", background:"#991b1b", color:"#fff", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" },
  stepIcon:         { fontSize:28, marginBottom:8 },
  stepTitle:        { fontWeight:800, fontSize:14, color:"#f9fafb", marginBottom:6 },
  stepDesc:         { fontSize:12, color:"#9ca3af", lineHeight:1.6 },

  // Coverage
  coverageGrid:     { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 },
  coverageCard:     { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:14, padding:"16px 14px" },
  coverageCity:     { fontWeight:800, fontSize:15, color:"#fca5a5", marginBottom:12, borderBottom:"1px solid rgba(255,255,255,0.07)", paddingBottom:8 },
  areaWrap:         { display:"flex", flexWrap:"wrap", gap:6 },
  areaChip:         { fontSize:11, color:"#d1d5db", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", padding:"3px 9px", borderRadius:999 },

  // Blood test cards
  grid:             { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,270px),1fr))", gap:18 },
  card:             { background:"#2a0608", border:"1px solid rgba(220,38,38,0.35)", borderRadius:16, padding:20, boxShadow:"0 8px 28px rgba(0,0,0,0.4)", transition:"all .2s", display:"flex", flexDirection:"column" },
  cardHover:        { transform:"translateY(-3px)", boxShadow:"0 14px 36px rgba(0,0,0,0.55)", borderColor:"rgba(252,165,165,0.4)" },
  cardTop:          { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 },
  bloodIcon:        { width:42, height:42, borderRadius:12, background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 },
  cardPrice:        { fontSize:18, fontWeight:800, color:"#fbbf24" },
  cardTitle:        { margin:"0 0 4px", fontSize:16, fontWeight:800, color:"#f9fafb" },
  cardDoctor:       { margin:"0 0 8px", color:"#9ca3af", fontSize:13 },
  cardText:         { margin:"0 0 14px", color:"#d1d5db", fontSize:13, lineHeight:1.6, flexGrow:1 },
  cardBottom:       { display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:10, marginBottom:12 },
  chip:             { fontSize:12, color:"#9ca3af", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", padding:"3px 10px", borderRadius:999 },
  requestBtn:       { width:"100%", padding:"10px", borderRadius:9, border:"none", background:"#991b1b", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" },

  // Request card (submitted)
  requestCard:      { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(139,0,0,0.35)", borderRadius:14, padding:18 },
  statusPill:       { display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:999, border:"1px solid", fontSize:12, fontWeight:700 },
  collectorBox:     { margin:"12px -18px 12px", padding:"12px 18px", background:"#ecfdf5", borderTop:"1px solid #86efac", borderBottom:"1px solid #86efac", color:"#065f46" },
  collectorTitle:   { marginBottom:10, color:"#008000", fontSize:12, fontWeight:900, textTransform:"uppercase", letterSpacing:0.5 },
  collectorGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"8px 18px", fontSize:12, color:"#065f46" },
  loadingBox:       { padding:"18px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(139,0,0,0.35)", color:"#fecaca", fontSize:13, fontWeight:700 },

  // Modal
  overlay:          { position:"fixed", inset:0, padding:18, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.8)", backdropFilter:"blur(5px)", zIndex:50 },
  modal:            { width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto", padding:24, borderRadius:18, background:"#1c0505", border:"1px solid rgba(139,0,0,0.5)" },
  modalMobile:      { padding:16 },
  modalHeader:      { display:"flex", justifyContent:"space-between", gap:12, marginBottom:18 },
  modalTitle:       { margin:0, fontSize:18, color:"#f9fafb", fontWeight:800 },
  modalSub:         { margin:"4px 0 0", color:"#9ca3af", fontSize:12 },
  iconBtn:          { width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", cursor:"pointer", flexShrink:0 },
  apptIdBox:        { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.25)", marginBottom:16 },
  apptIdLabel:      { fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 },
  apptIdValue:      { fontSize:13, fontWeight:800, color:"#60a5fa", letterSpacing:1 },
  secDiv:           { fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid rgba(255,255,255,0.07)", paddingBottom:6, marginBottom:14 },
  twoCol:           { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" },
  oneCol:           { gridTemplateColumns:"1fr" },
  fg:               { display:"flex", flexDirection:"column", gap:6, marginBottom:12 },
  lbl:              { fontSize:11, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 },
  inp:              { padding:"11px 12px", borderRadius:10, border:"1px solid rgba(139,0,0,0.4)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", outline:"none", fontFamily:"inherit", fontSize:14 },
  inpErr:           { borderColor:"rgba(248,113,113,0.6)", background:"rgba(248,113,113,0.05)" },
  // NEW: dark background for the "Select Blood Test" dropdown (and its option list)
  selectDark:       { backgroundColor:"#2a0608", color:"#f3f4f6" },
  errText:          { fontSize:11, color:"#f87171", marginTop:2 },
  infoBox:          { padding:"14px", borderRadius:12, border:"1px solid rgba(245,158,11,0.25)", background:"rgba(245,158,11,0.07)", marginBottom:14 },
  infoName:         { fontSize:16, fontWeight:800, color:"#fbbf24", marginBottom:4 },
  infoMeta:         { fontSize:13, color:"#9ca3af" },
  currentBox:       { display:"flex", gap:8, alignItems:"center", fontSize:13, color:"#9ca3af", padding:"10px 12px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" },
  primaryBtn:       { padding:"11px 14px", borderRadius:10, border:"none", background:"#22c55e", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 },
  secondaryBtn:     { flex:1, padding:"11px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.06)", color:"#f3f4f6", fontWeight:700, cursor:"pointer", fontSize:13 },

  // Footer
  footer:           { marginTop:"auto", background:"#130202", borderTop:"1px solid rgba(139,0,0,0.5)", padding:"48px 0 0" },
  footerLink:       { display:"block", width:"fit-content", padding:0, border:"none", background:"transparent", fontSize:13, marginBottom:9, cursor:"pointer", color:"#fca5a5", lineHeight:1.5, textAlign:"left" },
  footerBottom:     { borderTop:"1px solid rgba(255,255,255,0.08)", padding:"20px 28px", textAlign:"center", fontSize:12, color:"#fca5a5" },

  // Toast
  toast:            { position:"fixed", right:24, bottom:24, maxWidth:500, padding:"14px 18px", borderRadius:12, background:"#14532d", color:"#f0fdf4", border:"1px solid rgba(34,197,94,0.3)", boxShadow:"0 10px 24px rgba(0,0,0,0.4)", zIndex:60, fontSize:14, fontWeight:600 },
  toastMobile:      { left:16, right:16, bottom:16, maxWidth:"none" },
};
