import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { FoodAlertProvider } from "./FoodAlertContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { ThemeProvider } from "./ThemeContext.jsx";
import Layout from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyDonations from "./pages/MyDonations.jsx";
import Requests from "./pages/Requests.jsx";
import BrowseFood from "./pages/BrowseFood.jsx";
import MyRequests from "./pages/MyRequests.jsx";
import Tickets from "./pages/Tickets.jsx";
import Impact from "./pages/Impact.jsx";
import PickupHistory from "./pages/PickupHistory.jsx";
import Profile from "./pages/Profile.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminVerifications from "./pages/AdminVerifications.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import Help from "./pages/Help.jsx";
import ScanQRPage from "./pages/ScanQRPage.jsx";
import Home from "./pages/Home.jsx";
import PublicShell from "./components/PublicShell.jsx";

function Protected({ children, roles, requireVerified }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-wrap">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  if (requireVerified && (user.role === "beneficiary" || user.role === "farm") && !user.verified) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Layout>{children}</Layout>;
}

function BrowseRoute() {
  const { user } = useAuth();
  // Guests, beneficiaries/farms (verified or pending) and admins (read-only
  // oversight, from the dashboard's "Surplus listings live") can browse;
  // donors use their own dashboard.
  if (user && !["beneficiary", "farm", "admin"].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return user ? (
    <Layout>
      <BrowseFood />
    </Layout>
  ) : (
    <PublicShell>
      <BrowseFood />
    </PublicShell>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/scan" element={user && user.role === "donor" ? <ScanQRPage /> : <Navigate to="/login" replace />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/help" element={<Protected roles={["donor", "beneficiary", "farm"]}><Help /></Protected>} />
      <Route path="/impact" element={<Protected><Impact /></Protected>} />

      {/* Donor-only */}
      <Route path="/donations" element={<Protected roles={["donor"]}><MyDonations /></Protected>} />
      <Route path="/requests" element={<Protected roles={["donor"]}><Requests /></Protected>} />
      <Route path="/requests/beneficiary" element={<Navigate to="/requests" replace />} />
      <Route path="/requests/farm" element={<Navigate to="/requests" replace />} />
      <Route path="/pickups" element={<Protected roles={["donor"]}><PickupHistory /></Protected>} />

      {/* Beneficiary / farm — also public: guests and pending accounts can browse read-only */}
      <Route path="/browse" element={<BrowseRoute />} />
      <Route path="/my-requests" element={<Protected roles={["beneficiary", "farm"]} requireVerified><MyRequests /></Protected>} />
      <Route path="/tickets" element={<Protected roles={["beneficiary", "farm"]} requireVerified><Tickets /></Protected>} />

      {/* Admin */}
      <Route path="/admin/users" element={<Protected roles={["admin"]}><AdminUsers /></Protected>} />
      <Route path="/admin/beneficiaries" element={<Protected roles={["admin"]}><AdminVerifications /></Protected>} />
      <Route path="/admin/settings" element={<Protected roles={["admin"]}><AdminSettings /></Protected>} />
      <Route path="/admin/reports" element={<Protected roles={["admin"]}><AdminReports /></Protected>} />

      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      {/* Toasts wrap auth so AuthProvider can announce sign-ins. */}
      <ToastProvider>
        <AuthProvider>
          <FoodAlertProvider>
            <AppRoutes />
          </FoodAlertProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
