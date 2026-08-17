import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveSession } from "../lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const pageStyles = {
  bg: "linear-gradient(135deg,#1c0000,#450a0a,#7f1d1d)",
  accent: "linear-gradient(135deg,#dc2626,#991b1b)",
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetForm, setResetForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [resetErrors, setResetErrors] = useState({});
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetApiError, setResetApiError] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isTablet = viewportWidth <= 900;
  const isMobile = viewportWidth <= 640;

  const change = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setApiError("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const changeReset = (field) => (event) => {
    const value = event.target.value;
    setResetForm((prev) => ({ ...prev, [field]: value }));
    setResetApiError("");
    setResetMessage("");
    setResetErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    const nextErrors = {};

    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      nextErrors.email = "Enter a valid email";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Minimum 8 characters";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.message || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      saveSession({
        token: data.token,
        user: data.user,
        loggedInAt: new Date().toISOString(),
      });

      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate("/medicaltest"), 700);
    } catch {
      setLoading(false);
      setApiError("Unable to connect to the server. Please check that the backend is running.");
    }
  };

  const submitForgotPassword = async () => {
    const nextErrors = {};

    if (!resetForm.name.trim()) {
      nextErrors.name = "Enter your full name";
    }

    if (!resetForm.email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      nextErrors.email = "Enter a valid email";
    }

    if (!resetForm.phone.match(/^[0-9+\- ]{7,15}$/)) {
      nextErrors.phone = "Enter a valid contact number";
    }

    if (resetForm.password.length < 8) {
      nextErrors.password = "Minimum 8 characters";
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(nextErrors).length) {
      setResetErrors(nextErrors);
      return;
    }

    setResetLoading(true);
    setResetApiError("");
    setResetMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resetForm.name.trim(),
          email: resetForm.email.trim(),
          phone: resetForm.phone.trim(),
          password: resetForm.password,
          confirmPassword: resetForm.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetApiError(data.message || "Unable to change password. Please try again.");
        setResetLoading(false);
        return;
      }

      setResetMessage(data.message || "Password changed successfully. You can now sign in.");
      setForm((prev) => ({ ...prev, email: resetForm.email.trim().toLowerCase(), password: "" }));
      setResetForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
      setResetLoading(false);
    } catch {
      setResetLoading(false);
      setResetApiError("Unable to connect to the server. Please check that the backend is running.");
    }
  };

  const input = (label, field, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
        {label}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={change(field)}
        placeholder={placeholder || label}
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 14,
          border: `1.5px solid ${errors[field] ? "#ef4444" : "#e2e8f0"}`,
          background: "#f8fafc",
          color: "#0f172a",
          outline: "none",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
      {errors[field] && (
        <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6, marginBottom: 0 }}>
          {errors[field]}
        </p>
      )}
    </div>
  );

  const resetInput = (label, field, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
        {label}
      </label>
      <input
        type={type}
        value={resetForm[field]}
        onChange={changeReset(field)}
        placeholder={placeholder || label}
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 14,
          border: `1.5px solid ${resetErrors[field] ? "#ef4444" : "#e2e8f0"}`,
          background: "#f8fafc",
          color: "#0f172a",
          outline: "none",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
      {resetErrors[field] && (
        <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6, marginBottom: 0 }}>
          {resetErrors[field]}
        </p>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: isTablet ? "1fr" : "minmax(280px, 440px) 1fr",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        style={{
          background: pageStyles.bg,
          color: "#fff",
          padding: isMobile ? "32px 20px" : isTablet ? "40px 24px" : "48px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: isTablet ? "100%" : 320 }}>
          <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,.12)", color: "#fecaca", fontSize: 12, fontWeight: 700, letterSpacing: ".05em", marginBottom: 18 }}>
            T-CITY LAB
          </div>
          <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", lineHeight: 1.05, margin: 0 }}>
            Welcome back.
          </h1>
          <p style={{ color: "#fecaca", lineHeight: 1.7, fontSize: 14, marginTop: 16 }}>
            Sign in to create a session and continue to the medical test page.
          </p>
        </div>
      </div>

      <div
        style={{
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "20px 14px 32px" : isTablet ? "24px 20px 40px" : "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: "#fff",
            borderRadius: isMobile ? 20 : 28,
            padding: isMobile ? "28px 18px" : isTablet ? "32px 24px" : "40px 32px",
            boxShadow: "0 20px 60px rgba(15,23,42,.08)",
          }}
        >
          {success ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", background: pageStyles.accent, color: "#fff", fontSize: 34, boxShadow: "0 8px 24px rgba(220,38,38,.35)" }}>
                ✓
              </div>
              <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 30, color: "#0f172a" }}>Login successful</h2>
              <p style={{ color: "#64748b", lineHeight: 1.7, marginTop: 12, marginBottom: 28 }}>
                Your session has been created successfully. Redirecting you to the medical test page.
              </p>
              <button
                onClick={() => navigate("/medicaltest")}
                style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: pageStyles.accent, color: "#fff", fontWeight: 800, cursor: "pointer" }}
              >
                Go to Medical Tests
              </button>
            </div>
          ) : (
            <>
              {showForgotPassword ? (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 30, color: "#0f172a" }}>Forgot Password</h2>
                    <p style={{ color: "#64748b", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                      Enter the same name, email, and contact number used during registration.
                    </p>
                  </div>

                  {resetApiError && (
                    <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
                      {resetApiError}
                    </div>
                  )}

                  {resetMessage && (
                    <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", fontSize: 13, fontWeight: 700 }}>
                      {resetMessage}
                    </div>
                  )}

                  {resetInput("Full Name", "name", "text", "Your registered name")}
                  {resetInput("Email Address", "email", "email", "you@example.com")}
                  {resetInput("Contact Number", "phone", "tel", "+92 300 1234567")}
                  {resetInput("New Password", "password", "password", "Minimum 8 characters")}
                  {resetInput("Confirm New Password", "confirmPassword", "password", "Re-enter new password")}

                  <button
                    onClick={submitForgotPassword}
                    disabled={resetLoading}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 14,
                      border: "none",
                      background: resetLoading ? "#f87171" : pageStyles.accent,
                      color: "#fff",
                      fontWeight: 800,
                      cursor: resetLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 10px 30px rgba(220,38,38,.25)",
                    }}
                  >
                    {resetLoading ? "Changing password..." : "Change Password"}
                  </button>

                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetApiError("");
                      setResetErrors({});
                    }}
                    style={{ width: "100%", marginTop: 12, padding: "12px", borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 800, cursor: "pointer" }}
                  >
                    Back to Sign In
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 28 }}>
                    <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 30, color: "#0f172a" }}>Sign In</h2>
                    <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
                      Enter your credentials to continue.
                    </p>
                  </div>

                  {apiError && (
                    <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
                      {apiError}
                    </div>
                  )}

                  {input("Email Address", "email", "email", "you@example.com")}
                  {input("Password", "password", "password", "Enter your password")}

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setResetForm((prev) => ({ ...prev, email: form.email }));
                      setApiError("");
                    }}
                    style={{ display: "block", margin: "-4px 0 18px auto", border: "none", background: "transparent", color: "#dc2626", fontSize: 13, fontWeight: 800, cursor: "pointer", padding: 0 }}
                  >
                    Forgot password?
                  </button>

                  <button
                    onClick={submit}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 14,
                      border: "none",
                      background: loading ? "#f87171" : pageStyles.accent,
                      color: "#fff",
                      fontWeight: 800,
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: "0 10px 30px rgba(220,38,38,.25)",
                    }}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>

                  <p style={{ textAlign: "center", marginTop: 22, color: "#64748b", fontSize: 14 }}>
                    Don't have an account?{" "}
                    <Link to="/registration" style={{ color: "#dc2626", fontWeight: 700, textDecoration: "none" }}>
                      Register now
                    </Link>
                  </p>
                  <p style={{ textAlign: "center", marginTop: 8 }}>
                    <Link to="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>
                      Back to Home
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
