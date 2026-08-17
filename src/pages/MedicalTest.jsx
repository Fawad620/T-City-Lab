import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PortalNavbar from "../components/PortalNavbar";
import { getSession } from "../lib/auth";
import aiLogo from "../assets/ai-chatbot-logo.png.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || "";
const QR_ORIGIN_STORAGE_KEY = "tcitylab_qr_public_origin";

function encodeQrPayload(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function getPublicAppOrigin() {
  const savedOrigin = localStorage.getItem(QR_ORIGIN_STORAGE_KEY);

  if (savedOrigin) {
    return savedOrigin.replace(/\/$/, "");
  }

  if (PUBLIC_APP_URL) {
    return PUBLIC_APP_URL.replace(/\/$/, "");
  }

  return window.location.origin;
}

function normalizeOrigin(value) {
  const trimmed = String(value || "").trim().replace(/\/$/, "");

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

// ─── QR Code Generator (pure JS, no external lib) ────────────────────────────
// Minimal QR encoder for URL strings using the qrcodejs-style canvas approach.
// We use a lightweight self-contained implementation via a <canvas> element.
function QRCanvas({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Dynamically load qrcode library from CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Clear previous
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, size, size);

      // Generate QR via the library into a temp div, then copy to canvas
      const tempDiv = document.createElement("div");
      tempDiv.style.display = "none";
      document.body.appendChild(tempDiv);

      try {
        new window.QRCode(tempDiv, {
          text: value,
          width: size,
          height: size,
          colorDark: "#ffffff",
          colorLight: "#1c0505",
          correctLevel: window.QRCode.CorrectLevel.M,
        });

        setTimeout(() => {
          const img = tempDiv.querySelector("img") || tempDiv.querySelector("canvas");
          if (img) {
            if (img.tagName === "IMG") {
              const image = new Image();
              image.onload = () => ctx.drawImage(image, 0, 0, size, size);
              image.src = img.src;
            } else {
              ctx.drawImage(img, 0, 0, size, size);
            }
          }
          document.body.removeChild(tempDiv);
        }, 100);
      } catch {
        document.body.removeChild(tempDiv);
      }
    };

    if (!window.QRCode) {
      document.head.appendChild(script);
    } else {
      script.onload();
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: 10, display: "block" }}
    />
  );
}

// ─── Patient QR Card ──────────────────────────────────────────────────────────
function PatientQRCard({ user, mobile }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicOrigin, setPublicOrigin] = useState(() => getPublicAppOrigin());
  const [originDraft, setOriginDraft] = useState(() => getPublicAppOrigin());

  // The QR carries only a lookup key. The mobile scan page fetches the fresh
  // profile, appointments, and reports from MongoDB through the API.
  const profilePayload = useMemo(() => {
    const data = {
      email: (user.email || "").trim().toLowerCase(),
      lab: "T-City Lab",
      generated: new Date().toISOString().slice(0, 10),
    };
    return encodeQrPayload(data);
  }, [user]);

  const qrUrl = `${publicOrigin}/patient-profile?${new URLSearchParams({ data: profilePayload }).toString()}`;
  const isLocalhostQr = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(qrUrl);

  const handleSaveOrigin = () => {
    const nextOrigin = normalizeOrigin(originDraft);

    if (!nextOrigin) {
      return;
    }

    localStorage.setItem(QR_ORIGIN_STORAGE_KEY, nextOrigin);
    setPublicOrigin(nextOrigin);
    setOriginDraft(nextOrigin);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const canvas = document.querySelector("#patient-qr-canvas canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `tcitylab-qr-${user.name || "patient"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <>
      {/* ── QR Banner ── */}
      <section
        style={{
          padding: mobile ? "18px 16px" : "22px 28px",
          borderBottom: "1px solid rgba(248,113,113,0.15)",
          background: "linear-gradient(135deg,rgba(30,8,8,0.85),rgba(60,10,10,0.6))",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            gap: 24,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.28)",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fbbf24",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              <span>◈</span> Patient Digital ID
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: mobile ? 18 : 22, fontWeight: 900, lineHeight: 1.3 }}>
              Your Personal <span style={{ color: "#fca5a5" }}>QR Code</span>
            </h2>
            <p style={{ margin: "0 0 14px", color: "#d1d5db", fontSize: 13, lineHeight: 1.7 }}>
              Scan this code from a phone on the same WiFi to load your profile, appointments, and test reports from the lab database.
            </p>
            {isLocalhostQr && (
              <p style={{ margin: "0 0 14px", color: "#fde68a", fontSize: 12, lineHeight: 1.6 }}>
                For phone scanning, open this site with your computer LAN IP or set VITE_PUBLIC_APP_URL, because localhost only works on this computer.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <input
                value={originDraft}
                onChange={(event) => setOriginDraft(event.target.value)}
                placeholder="http://192.168.0.108:5175"
                style={{
                  flex: "1 1 240px",
                  minWidth: 0,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(252,165,165,0.25)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f8fafc",
                  outline: "none",
                  fontSize: 12,
                }}
              />
              <button
                onClick={handleSaveOrigin}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(251,191,36,0.28)",
                  background: "rgba(251,191,36,0.12)",
                  color: "#fbbf24",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Use for QR
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#d97706,#b45309)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>⊞</span> View Full QR
              </button>
              <button
                onClick={handleCopy}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(252,165,165,0.25)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fca5a5",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ Copied!" : "⎘ Copy Link"}
              </button>
            </div>
          </div>

          {/* Right: mini QR preview */}
          <div
            id="patient-qr-canvas"
            style={{
              background: "#1c0505",
              border: "2px solid rgba(220,38,38,0.35)",
              borderRadius: 16,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <QRCanvas value={qrUrl} size={mobile ? 100 : 120} />
            <div style={{ maxWidth: 180, color: "#9ca3af", fontSize: 9, textAlign: "center", wordBreak: "break-all", lineHeight: 1.4 }}>
              {qrUrl}
            </div>
            <div style={{ fontSize: 10, color: "#fca5a5", fontWeight: 700, textAlign: "center", letterSpacing: 0.5 }}>
              {user.name || "Patient"} · T-City Lab
            </div>
          </div>
        </div>
      </section>

      {/* ── Full QR Modal ── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#1c0505",
              border: "1px solid rgba(139,0,0,0.55)",
              borderRadius: 22,
              padding: 28,
              color: "#f8fafc",
              textAlign: "center",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#ef4444,#991b1b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 22,
                  margin: "0 auto 12px",
                }}
              >
                {(user.name || "P").charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{user.name || "Patient"}</div>
              {user.email && (
                <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 4 }}>{user.email}</div>
              )}
            </div>

            {/* Large QR */}
            <div
              style={{
                background: "#1c0505",
                border: "2px solid rgba(220,38,38,0.4)",
                borderRadius: 18,
                padding: 16,
                display: "inline-block",
                marginBottom: 20,
              }}
            >
              <QRCanvas value={qrUrl} size={220} />
            </div>

            {/* Info pills */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              {[
                ["Patient ID", user._id ? user._id.slice(-8).toUpperCase() : "—"],
                ["Phone", user.phone || "—"],
                ["Gender", user.gender || "—"],
                ["DOB", user.dob || "—"],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5", marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, marginBottom: 20 }}>
              Scan this QR code to view your profile, appointments &amp; reports on any device — no login required.
            </p>

            {isLocalhostQr && (
              <p style={{ fontSize: 12, color: "#fde68a", lineHeight: 1.6, marginBottom: 20 }}>
                This QR currently uses localhost. Start Vite with npm run dev:host and open the app using your computer LAN IP before scanning from mobile.
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#22c55e,#15803d)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ↓ Download QR
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#f8fafc",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const isActive = status === "active";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: isActive ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
        color: isActive ? "#4ade80" : "#fbbf24",
        border: `1px solid ${isActive ? "rgba(34,197,94,0.35)" : "rgba(245,158,11,0.35)"}`,
      }}
    >
      {isActive ? "Available" : "Inactive"}
    </span>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ mobile }) {
  const cols = [
    { h: "Services", ls: ["Book Appointment", "Home Collection", "View Reports", "Test List"] },
    { h: "Company", ls: ["About Us", "Contact", "Privacy Policy", "Terms"] },
    { h: "Reach Us", ls: ["H-9, Islamabad", "info@tcitylab.pk", "+92 300 1234567", "Mon-Sat 8am-8pm"] },
  ];

  return (
    <footer style={{ marginTop: "auto", background: "#130202", borderTop: "1px solid rgba(139,0,0,0.5)", padding: "48px 0 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "0 16px 24px" : "0 28px 24px", display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 28 : 40, marginBottom: 32 }}>
        <div style={{ gridColumn: mobile ? "1 / -1" : "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={32} height={32} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="50" cy="68" rx="28" ry="7" fill="none" stroke="#22c55e" strokeWidth="4" />
                <path d="M30 72 Q15 60 22 45" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" />
                <rect x="44" y="18" width="12" height="36" rx="3" fill="#1e293b" />
                <rect x="46" y="20" width="8" height="28" rx="2" fill="#38bdf8" />
                <rect x="34" y="56" width="32" height="4" rx="2" fill="#1e293b" />
                <rect x="36" y="72" width="28" height="5" rx="2" fill="#111827" />
              </svg>
            </div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>T-City <span style={{ color: "#fca5a5" }}>Lab</span></span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#fca5a5", margin: 0 }}>Modern medical lab services online - Islamabad, Pakistan.</p>
        </div>
        {cols.map((col) => (
          <div key={col.h}>
            <div style={{ color: "#fff", fontWeight: 700, marginBottom: 14, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6 }}>{col.h}</div>
            {col.ls.map((l) => (
              <div key={l} style={{ fontSize: 13, marginBottom: 9, cursor: "pointer", color: "#fca5a5", lineHeight: 1.5 }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "20px 28px", textAlign: "center", fontSize: 12, color: "#fca5a5" }}>
        © 2026 T-City Lab · Developed by Muhammad Fawad Aslam · BSCS-7, Quaid-e-Azam University, Islamabad
      </div>
    </footer>
  );
}

// ─── AI Chatbot ─────────────────────────────────────────────────────────────
// Gradient "AI sparkle" logo opens a glass-styled assistant panel with
// voice input (Web Speech API SpeechRecognition) and voice output
// (SpeechSynthesis), plus avatar bubbles, timestamps, and richer motion.

// Unique keyframes/utility classes injected once for this widget.
const AI_CHATBOT_STYLES = `
@keyframes tcl-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes tcl-msg-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes tcl-mic-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); } 70% { box-shadow: 0 0 0 12px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
@keyframes tcl-glow-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
.tcl-ring { animation: tcl-spin-slow 6s linear infinite; }
.tcl-msg-in { animation: tcl-msg-in .28s ease-out; }
.tcl-mic-live { animation: tcl-mic-pulse 1.4s ease-out infinite; }
.tcl-glow { animation: tcl-glow-pulse 2.6s ease-in-out infinite; }
`;

function MicIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18v4M8 22h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ size = 16, muted, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill={color} />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

const CHAT_QUICK_REPLIES = ["Book an appointment", "Test prices", "Home collection", "Talk to a human"];

function chatbotLocalReply(text) {
  const q = text.toLowerCase();
  if (q.includes("appointment") || q.includes("book")) {
    return "You can book any test right from this page — hit \u201cBook Now\u201d on a test card and pick a slot that works for you.";
  }
  if (q.includes("price") || q.includes("cost") || q.includes("fee")) {
    return "Prices are listed on each test card in PKR. Open a test's Details for the full breakdown, including turnaround time.";
  }
  if (q.includes("home") || q.includes("collection") || q.includes("sample")) {
    return "Home sample collection is available across Islamabad. Choose the home collection option while booking your appointment.";
  }
  if (q.includes("report") || q.includes("result")) {
    return "Your reports show up in your patient portal once ready — scan your QR code above to pull them up on any device.";
  }
  if (q.includes("human") || q.includes("agent") || q.includes("call")) {
    return "Of course — you can reach our team at +92 300 1234567 or info@tcitylab.pk, Mon-Sat 8am-8pm.";
  }
  if (q.includes("hi") || q.includes("hello") || q.includes("salam") || q.includes("hey")) {
    return "Hi! I'm the T-City Lab AI assistant. Ask me about tests, prices, appointments, or your reports — you can also just talk to me using the mic.";
  }
  return "I can help with test info, pricing, appointments, home collection, or your reports. What would you like to know?";
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatTypingDots() {
  return (
    <span className="inline-flex gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#fca5a5] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function AiChatbot({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm the T-City Lab AI assistant. Ask me about tests, prices, appointments, or your reports — you can also just talk to me using the mic.",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Speech recognition setup (voice input) ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      // Auto-send what was spoken.
      sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    if (!voiceSupported || !recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // recognition already running — ignore
      }
    }
  };

  // ── Speech synthesis (voice output) ──
  const speak = useCallback(
    (text) => {
      if (!voiceOn || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [voiceOn]
  );

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages, typing]);

  const pushBotMessage = (text) => {
    setMessages((prev) => [...prev, { role: "bot", text, time: new Date() }]);
    if (!open) setUnread((n) => n + 1);
    speak(text);
  };

  const sendMessage = async (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text, time: new Date() }]);
    setInput("");
    setTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to answer right now.");
      }

      pushBotMessage(data.answer || "I do not have that information in T-City Lab data.");
    } catch (chatError) {
      pushBotMessage(chatError.message || "Unable to connect to the T-City Lab assistant right now.");
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[999] font-[Segoe_UI,system-ui,sans-serif]">
      <style>{AI_CHATBOT_STYLES}</style>

      {/* ── Chat Panel ── */}
      {open && (
        <div
          className="mb-3 flex h-[560px] w-[92vw] max-w-[370px] flex-col overflow-hidden rounded-3xl border backdrop-blur-xl shadow-2xl"
          style={{
            borderColor: "rgba(251,191,36,0.25)",
            background: "linear-gradient(160deg,rgba(34,4,5,0.97) 0%,rgba(74,11,13,0.96) 42%,rgba(26,3,4,0.98) 100%)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,38,0.15)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 border-b px-4 py-3.5"
            style={{
              borderColor: "rgba(248,113,113,0.18)",
              background: "linear-gradient(90deg,rgba(69,10,10,0.5),rgba(120,40,10,0.25))",
            }}
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <span
                className="tcl-ring absolute inset-0 rounded-full"
                style={{
                  background: "conic-gradient(from 0deg,#fbbf24,#f97316,#dc2626,#fbbf24)",
                  padding: 2,
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#1c0505]">
                <img src={aiLogo} alt="AI assistant" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate text-sm font-extrabold text-[#f8fafc]">
                T-City AI Assistant
                <span
                  className="rounded-full px-1.5 py-[1px] text-[9px] font-black tracking-wide"
                  style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
                >
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#4ade80]">
                <span className="tcl-glow h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                Online{voiceSupported ? " · Voice enabled" : ""}
              </div>
            </div>

            {voiceSupported && (
              <button
                onClick={() => setVoiceOn((v) => !v)}
                aria-label={voiceOn ? "Mute voice replies" : "Enable voice replies"}
                title={voiceOn ? "Voice replies on" : "Voice replies off"}
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-white/10"
                style={{
                  borderColor: voiceOn ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.12)",
                  background: voiceOn ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.06)",
                  color: voiceOn ? "#fbbf24" : "#f8fafc",
                }}
              >
                <SpeakerIcon size={15} muted={!voiceOn} color="currentColor" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-lg border text-[#f8fafc] transition hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`tcl-msg-in flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1c0505]">
                    <img src={aiLogo} alt="AI" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className={`flex max-w-[76%] flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm border text-[#f1f5f9]"
                    }`}
                    style={
                      m.role === "user"
                        ? { background: "linear-gradient(135deg,#d97706,#b45309)" }
                        : { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)" }
                    }
                  >
                    {m.text}
                  </div>
                  <span
                    className={`px-1 text-[10px] text-[#9ca3af] ${m.role === "user" ? "text-right" : "text-left"}`}
                  >
                    {formatTime(m.time)}
                  </span>
                </div>
                {m.role === "user" && (
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)" }}
                  >
                    {(user?.name || "P").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="tcl-msg-in flex items-end gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1c0505]">
                  <img src={aiLogo} alt="AI" className="h-full w-full object-cover" />
                </div>
                <div
                  className="rounded-2xl rounded-bl-sm border px-3.5 py-2.5"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <ChatTypingDots />
                </div>
              </div>
            )}

            {messages.length <= 1 && !typing && (
              <div className="flex flex-wrap gap-2 pt-1">
                {CHAT_QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border px-3 py-1.5 text-[12px] font-semibold text-[#fca5a5] transition hover:bg-white/5 hover:border-[#fbbf24]/40"
                    style={{ borderColor: "rgba(252,165,165,0.3)" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 border-t px-3 py-3"
            style={{ borderColor: "rgba(248,113,113,0.18)", background: "rgba(28,5,5,0.65)" }}
          >
            {voiceSupported && (
              <button
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : "Speak your question"}
                title={listening ? "Listening... tap to stop" : "Tap to speak"}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${listening ? "tcl-mic-live" : ""}`}
                style={{
                  borderColor: listening ? "rgba(239,68,68,0.55)" : "rgba(252,165,165,0.25)",
                  background: listening ? "linear-gradient(135deg,#ef4444,#991b1b)" : "rgba(255,255,255,0.05)",
                  color: listening ? "#fff" : "#fca5a5",
                }}
              >
                <MicIcon size={17} color="currentColor" />
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? "Listening..." : "Type or tap the mic..."}
              className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-[13px] text-[#f8fafc] outline-none placeholder:text-[#9ca3af]"
              style={{ borderColor: "rgba(252,165,165,0.25)", background: "rgba(255,255,255,0.05)" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#f97316,#b45309)" }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ── AI Logo Toggle Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{ boxShadow: "0 10px 34px rgba(220,38,38,0.45)" }}
      >
        {/* Ambient pulse ring */}
        {!open && (
          <span
            className="absolute inset-0 -z-10 animate-ping rounded-full"
            style={{ background: "rgba(251,191,36,0.3)" }}
          />
        )}
        {/* Rotating gradient ring */}
        <span
          className="tcl-ring absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg,#fbbf24,#f97316,#dc2626,#fbbf24)" }}
        />
        <span className="absolute inset-[3px] rounded-full bg-[#1c0505]" />

        {open ? (
          <span className="relative text-2xl font-bold text-[#fca5a5]">×</span>
        ) : (
          <span className="relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full">
            <img src={aiLogo} alt="Open AI assistant" className="h-full w-full object-cover" />
          </span>
        )}

        {unread > 0 && !open && (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)", boxShadow: "0 0 0 2px #1a0304" }}
          >
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MedicalTest() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getSession());
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [detailTarget, setDetailTarget] = useState(null);
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const saved = getSession();
    if (!saved?.token) {
      navigate("/login", { replace: true });
      return;
    }
    setSession(saved);
  }, [navigate]);

  useEffect(() => {
    const loadTests = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_URL}/api/medical-tests`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load medical tests.");
        setTests(data.tests || []);
      } catch (fetchError) {
        setError(fetchError.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    loadTests();

    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const mobile = width <= 720;
  const user = session?.user ?? {};

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tests;
    return tests.filter((test) =>
      [test.id, test.name, test.category, test.doctorName, test.description, test.time]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [search, tests]);

  const stats = useMemo(
    () => [
      ["Total", String(tests.length)],
      ["Available", String(tests.filter((t) => t.status === "active").length)],
      ["Categories", String(new Set(tests.map((t) => t.category)).size)],
    ],
    [tests]
  );

  const handleBook = (test) => navigate("/appointment", { state: { selectedTest: test } });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#220405 0%,#4a0b0d 42%,#1a0304 100%)",
        color: "#f8fafc",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`body,html{margin:0;padding:0;background:#1a0304 !important;}`}</style>
      <PortalNavbar mobile={mobile} />

      {/* ── Welcome / Session Banner ── */}
      <section
        style={{
          padding: mobile ? "20px 16px" : "24px 28px",
          borderBottom: "1px solid rgba(248,113,113,0.2)",
          background: "linear-gradient(135deg,rgba(127,29,29,0.24),rgba(69,10,10,0.18))",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg,#ef4444,#991b1b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 20, flexShrink: 0,
            }}
          >
            {(user.name || "P").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Welcome back, <span style={{ color: "#fbbf24" }}>{user.name || "Patient"}</span>
            </div>
            <div style={{ marginTop: 6, color: "#fecaca", fontSize: 13, lineHeight: 1.7 }}>
              Browse live test records from the lab database and book your appointment online.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: mobile ? "100%" : "auto" }}>
            {stats.map(([label, value]) => (
              <div
                key={label}
                style={{
                  minWidth: 94, flex: mobile ? 1 : "unset", textAlign: "center",
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(69,10,10,0.4)",
                  border: "1px solid rgba(252,165,165,0.16)",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fca5a5" }}>{value}</div>
                <div style={{ fontSize: 10, color: "#fecaca", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR Code Section (inserted right below session banner) ── */}
      <PatientQRCard user={user} mobile={mobile} />

      {/* ── Main Content ── */}
      <main style={{ maxWidth: 1180, margin: "0 auto", width: "100%", padding: mobile ? "20px 16px 34px" : "28px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: mobile ? 27 : 34, fontWeight: 900 }}>Available Medical Tests</h1>
          <p style={{ margin: "10px 0 0", color: "#fecaca", fontSize: 14, lineHeight: 1.7 }}>
            These tests are loaded from MongoDB through the lab backend.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by test name, id, category, doctor, or time"
            style={{
              width: "100%", maxWidth: 580, padding: "13px 14px", borderRadius: 12,
              border: "1px solid rgba(252,165,165,0.25)",
              background: "rgba(255,255,255,0.06)",
              color: "#f8fafc", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(252,165,165,0.3)", background: "rgba(127,29,29,0.5)", color: "#fecaca", fontSize: 13, fontWeight: 700 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#fecaca", padding: "48px 0", fontSize: 15 }}>Loading medical tests...</div>
        ) : filteredTests.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 18 }}>
            {filteredTests.map((test) => (
              <article
                key={test._id || test.id}
                style={{ background: "#2a0608", border: "1px solid rgba(220,38,38,0.35)", borderRadius: 18, padding: 20, boxShadow: "0 8px 28px rgba(0,0,0,0.45)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#fdf2f8", color: "#7c3aed" }}>
                    {test.category}
                  </span>
                  <StatusPill status={test.status} />
                </div>
                <div style={{ fontSize: 12, color: "#fca5a5", fontFamily: "monospace", marginBottom: 8 }}>{test.id}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>{test.name}</h3>
                <div style={{ margin: "0 0 10px", color: "#fca5a5", fontSize: 13, fontWeight: 700 }}>
                  Doctor: {test.doctorName || "Not assigned"}
                </div>
                <p style={{ margin: "0 0 14px", color: "#d1d5db", lineHeight: 1.7, fontSize: 14 }}>
                  {test.description || "No description provided for this test yet."}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)", fontSize: 12 }}>{test.time}</span>
                  <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)", fontSize: 12 }}>PKR {Number(test.price).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexDirection: mobile ? "column" : "row" }}>
                  <button onClick={() => setDetailTarget(test)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#f8fafc", fontWeight: 700, cursor: "pointer" }}>
                    Details
                  </button>
                  <button onClick={() => handleBook(test)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "none", background: "#d97706", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    Book Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#fecaca", padding: "48px 0" }}>No tests matched your search.</div>
        )}
      </main>

      {/* ── Test Detail Modal ── */}
      {detailTarget && (
        <div onClick={() => setDetailTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#1c0505", border: "1px solid rgba(139,0,0,0.5)", borderRadius: 18, padding: mobile ? 18 : 24, color: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, color: "#fca5a5", fontFamily: "monospace", marginBottom: 6 }}>{detailTarget.id}</div>
                <h2 style={{ margin: 0, fontSize: 25 }}>{detailTarget.name}</h2>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ padding: "5px 10px", borderRadius: 999, background: "#fdf2f8", color: "#7c3aed", fontSize: 12, fontWeight: 700 }}>{detailTarget.category}</span>
                  <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(252,165,165,0.12)", color: "#fecaca", fontSize: 12, fontWeight: 700 }}>Doctor: {detailTarget.doctorName || "Not assigned"}</span>
                  <StatusPill status={detailTarget.status} />
                </div>
              </div>
              <button onClick={() => setDetailTarget(null)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#f8fafc", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700 }}>Price</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: "#fbbf24" }}>PKR {Number(detailTarget.price).toLocaleString()}</div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700 }}>Turnaround Time</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: "#fca5a5" }}>{detailTarget.time}</div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 7 }}>Description</div>
              <div style={{ color: "#d1d5db", lineHeight: 1.7, fontSize: 14 }}>{detailTarget.description || "No description provided."}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", borderLeft: "3px solid #f59e0b", marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: "#fbbf24", textTransform: "uppercase", fontWeight: 700, marginBottom: 7 }}>Preparation</div>
              <div style={{ color: "#fde68a", lineHeight: 1.7, fontSize: 14 }}>{detailTarget.preparation || "No preparation instructions provided."}</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexDirection: mobile ? "column" : "row" }}>
              <button onClick={() => { setDetailTarget(null); handleBook(detailTarget); }} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Book This Test
              </button>
              <button onClick={() => setDetailTarget(null)} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#f8fafc", fontWeight: 700, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer mobile={mobile} />

      {/* ── AI Chatbot (logo opens/closes it) ── */}
      <AiChatbot user={user} />
    </div>
  );
}
