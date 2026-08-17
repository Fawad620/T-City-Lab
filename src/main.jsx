
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App          from "./App";
import Registration from "./pages/Registration";
import Login        from "./pages/Login";
import MedicalTest from "./pages/MedicalTest.jsx";
import Appointment from "./pages/Appointment";
import Report from "./pages/Report";
import Deliver from "./pages/Deliver";
import HomeSample from "./pages/HomeSample";
import PatientProfile from "./pages/PatientProfile";
import ProtectedRoute from "./components/ProtectedRoute";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<App />}          />
        <Route path="/registration" element={<Registration />} />
        <Route path="/login"        element={<Login />}        />
        <Route path="/patient-profile" element={<PatientProfile />} />
        <Route
          path="/medicaltest"
          element={
            <ProtectedRoute>
              <MedicalTest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointment"
          element={
            <ProtectedRoute>
              <Appointment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deliver"
          element={
            <ProtectedRoute>
              <Deliver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/homesample"
          element={
            <ProtectedRoute>
              <HomeSample />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
