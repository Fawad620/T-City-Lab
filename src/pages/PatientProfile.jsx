/**
 * PatientProfile.jsx
 * Route: /patient-profile?data=<base64>
 *
 * This page is shown when a patient scans their QR code on any device.
 * It decodes the base64 payload from the URL, then fetches their
 * appointments and reports from the backend using their patient ID.
 *
 * Register this route in your router:
 *   <Route path="/patient-profile" element={<PatientProfile />} />
 *
 * No login is required — the QR code carries the patient identity.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const CONFIGURED_API_URL = import.meta.env.VITE_API_URL || "";

function getApiUrl() {
  const { protocol, hostname } = window.location;
  const isLocalhostPage = hostname === "localhost" || hostname === "127.0.0.1";

  if (CONFIGURED_API_URL) {
    try {
      const configuredUrl = new URL(CONFIGURED_API_URL);
      const isLocalhostApi = configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";

      if (isLocalhostApi && !isLocalhostPage) {
        configuredUrl.hostname = hostname;
        return configuredUrl.toString().replace(/\/$/, "");
      }

      return configuredUrl.toString().replace(/\/$/, "");
    } catch {
      return CONFIGURED_API_URL.replace(/\/$/, "");
    }
  }

  return isLocalhostPage ? "http://localhost:5000" : `${protocol}//${hostname}:5000`;
}

const API_URL = getApiUrl();

// ── Helpers ───────────────────────────────────────────────────────────────────
function decodePayload(raw) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch {
    try {
      return JSON.parse(atob(raw));
    } catch {
      return null;
    }
  }
}

function titleCaseStatus(status) {
  if (!status) return "Pending";
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
}

function reportLink(fileUrl) {
  if (!fileUrl) return "";

  if (/^https?:\/\//i.test(fileUrl)) {
    try {
      const url = new URL(fileUrl);
      const pageHost = window.location.hostname;
      const isLocalhostPage = pageHost === "localhost" || pageHost === "127.0.0.1";
      const isLocalhostFile = url.hostname === "localhost" || url.hostname === "127.0.0.1";

      if (isLocalhostFile && !isLocalhostPage) {
        url.hostname = pageHost;
      }

      return url.toString();
    } catch {
      return fileUrl;
    }
  }

  return `${API_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}

function Badge({ label, color = "#fca5a5", bg = "rgba(252,165,165,0.12)" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: bg,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}

function Section({ title, icon, children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(220,38,38,0.2)",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(220,38,38,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(127,29,29,0.2)",
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: "#fca5a5", textTransform: "uppercase", letterSpacing: 0.7 }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PatientProfile() {
  const [searchParams] = useSearchParams();
  const [patient, setPatient] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile"); // profile | appointments | reports

  useEffect(() => {
    const raw = searchParams.get("data");
    if (!raw) {
      setError("Invalid or missing QR code data.");
      return;
    }
    const decoded = decodePayload(raw);
    if (!decoded) {
      setError("Could not decode patient data from QR code.");
      return;
    }
    setQrData({
      ...decoded,
      email: (decoded.email || "").trim().toLowerCase(),
    });
  }, [searchParams]);

  // Fetch patient profile, appointments, and reports from the database.
  useEffect(() => {
    if (!qrData?.email) return;

    const load = async () => {
      setLoadingAppointments(true);
      setLoadingReports(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/api/patients/portal?email=${encodeURIComponent(qrData.email)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Unable to load patient data from database.");
        }

        setPatient({
          ...data.patient,
          generated: qrData.generated,
          _loadedFromPortal: true,
        });
        setAppointments(data.appointments || []);
        setReports(data.reports || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to connect to the lab server on this WiFi network.");
      } finally {
        setLoadingAppointments(false);
        setLoadingReports(false);
      }
    };

    load();
  }, [qrData?.email, qrData?.generated]);

  // Fetch appointments after scanning. The API stores appointments by email.
  useEffect(() => {
    if (!patient?.email || patient?._loadedFromPortal) return;

    const load = async () => {
      setLoadingAppointments(true);
      try {
        const res = await fetch(`${API_URL}/api/appointments?patientEmail=${encodeURIComponent(patient.email)}`);
        const data = await res.json();
        setAppointments(data.appointments || []);
      } catch {
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };
    load();
  }, [patient?.email]);

  // Fetch reports after scanning. Reports are derived from appointments.
  useEffect(() => {
    if (!patient?.email || patient?._loadedFromPortal) return;

    const load = async () => {
      setLoadingReports(true);
      try {
        const res = await fetch(`${API_URL}/api/reports?patientEmail=${encodeURIComponent(patient.email)}`);
        const data = await res.json();
        setReports(data.reports || []);
      } catch {
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };
    load();
  }, [patient?.email]);

  const tabs = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "appointments", label: "Appointments", icon: "📅" },
    { id: "reports", label: "Reports", icon: "🧪" },
  ];

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "'Segoe UI',system-ui,sans-serif",
          color: "#fecaca",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Invalid QR Code</div>
          <div style={{ fontSize: 14, color: "#9ca3af" }}>{error}</div>
        </div>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!patient) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Segoe UI',system-ui,sans-serif",
          color: "#fecaca",
        }}
      >
        Loading patient data…
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)",
        color: "#f8fafc",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        padding: "0 0 80px",
      }}
    >
      <style>{`*{box-sizing:border-box;} body,html{margin:0;padding:0;background:#1a0304!important;}`}</style>

      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg,rgba(127,29,29,0.5),rgba(69,10,10,0.4))",
          borderBottom: "1px solid rgba(220,38,38,0.25)",
          padding: "28px 20px 20px",
          textAlign: "center",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#ef4444,#991b1b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 30,
            margin: "0 auto 14px",
            boxShadow: "0 0 0 4px rgba(239,68,68,0.2)",
          }}
        >
          {(patient.name || "P").charAt(0).toUpperCase()}
        </div>

        <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 4 }}>{patient.name}</div>
        {patient.email && (
          <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{patient.email}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Badge label="T-City Lab Patient" color="#fbbf24" bg="rgba(251,191,36,0.12)" />
          {patient.gender && <Badge label={patient.gender} />}
          <Badge label={`${appointments.length} Appointments`} color="#60a5fa" bg="rgba(96,165,250,0.12)" />
          <Badge label={`${reports.length} Reports`} color="#4ade80" bg="rgba(34,197,94,0.12)" />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#9ca3af",
            letterSpacing: 0.5,
          }}
        >
          Generated: {patient.generated || "—"}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          background: "#1c0505",
          borderBottom: "1px solid rgba(220,38,38,0.2)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "13px 8px",
              border: "none",
              background: "none",
              color: activeTab === tab.id ? "#fca5a5" : "#6b7280",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              borderBottom: `2px solid ${activeTab === tab.id ? "#ef4444" : "transparent"}`,
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: "20px 16px" }}>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <>
            <Section title="Personal Info" icon="👤">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 12 }}>
                {[
                  ["Full Name", patient.name],
                  ["Email", patient.email || "—"],
                  ["Phone", patient.phone || "—"],
                  ["Date of Birth", patient.dob || "—"],
                  ["Gender", patient.gender || "—"],
                  ["Patient ID", patient.id ? patient.id.slice(-8).toUpperCase() : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5", wordBreak: "break-all" }}>{value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Lab Info" icon="🏥">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 12 }}>
                {[
                  ["Lab", "T-City Lab"],
                  ["Location", "H-9, Islamabad"],
                  ["Phone", "+92 300 1234567"],
                  ["Hours", "Mon-Sat 8am-8pm"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5" }}>{value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(245,158,11,0.08)",
                borderLeft: "3px solid #f59e0b",
                fontSize: 13,
                color: "#fde68a",
                lineHeight: 1.7,
              }}
            >
              <strong>Note:</strong> This QR code is for identification purposes at T-City Lab. Please present it at the reception desk for quick check-in.
            </div>
          </>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === "appointments" && (
          <>
            {loadingAppointments ? (
              <div style={{ textAlign: "center", color: "#fecaca", padding: "40px 0" }}>Loading appointments…</div>
            ) : appointments.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No Appointments Found</div>
                <div style={{ fontSize: 13 }}>Book a test from the portal to see your appointments here.</div>
              </div>
            ) : (
              appointments.map((appt, i) => (
                <div
                  key={appt._id || i}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{appt.testName || "Medical Test"}</div>
                    <Badge
                      label={titleCaseStatus(appt.status)}
                      color={appt.status === "completed" ? "#4ade80" : appt.status === "confirmed" ? "#60a5fa" : "#fbbf24"}
                      bg={appt.status === "completed" ? "rgba(34,197,94,0.12)" : appt.status === "confirmed" ? "rgba(96,165,250,0.12)" : "rgba(251,191,36,0.12)"}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 8 }}>
                    {[
                      ["Date", appt.date || "—"],
                      ["Time", appt.time || "—"],
                      ["Type", appt.homeCollection ? "Home Collection" : "Walk-in"],
                      ["Price", appt.price ? `PKR ${Number(appt.price).toLocaleString()}` : "—"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <>
            {loadingReports ? (
              <div style={{ textAlign: "center", color: "#fecaca", padding: "40px 0" }}>Loading reports…</div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🧪</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No Reports Available</div>
                <div style={{ fontSize: 13 }}>Your test reports will appear here once processed by the lab.</div>
              </div>
            ) : (
              reports.map((report, i) => (
                <div
                  key={report._id || i}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{report.testName || "Lab Report"}</div>
                    <Badge
                      label={report.statusLabel || titleCaseStatus(report.status || "ready")}
                      color={report.status === "ready" || report.status === "completed" ? "#4ade80" : "#fbbf24"}
                      bg={report.status === "ready" || report.status === "completed" ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)"}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 8, marginBottom: 10 }}>
                    {[
                      ["Report ID", report.reportId || report._id?.slice(-6).toUpperCase() || "—"],
                      ["Date", report.date || "—"],
                      ["Category", report.category || "—"],
                      ["Appointment", report.apptId || report.appointmentId || "—"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {(report.remarks || report.note || report.result) && (
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(245,158,11,0.08)", borderLeft: "2px solid #f59e0b", fontSize: 12, color: "#fde68a", lineHeight: 1.6 }}>
                      <strong>Remarks:</strong> {report.remarks || report.note || report.result}
                    </div>
                  )}
                  {report.fileUrl && (
                    <a
                      href={reportLink(report.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        marginTop: 10,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "linear-gradient(135deg,#22c55e,#15803d)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: "none",
                        textAlign: "center",
                      }}
                    >
                      ↓ Download Report PDF
                    </a>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Bottom branding ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          padding: "10px 16px",
          background: "#130202",
          borderTop: "1px solid rgba(139,0,0,0.4)",
          textAlign: "center",
          fontSize: 11,
          color: "#fca5a5",
        }}
      >
        T-City Lab · H-9, Islamabad · info@tcitylab.pk
      </div>
    </div>
  );
}
