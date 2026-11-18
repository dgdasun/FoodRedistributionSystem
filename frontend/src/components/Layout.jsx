import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Chatbot from "./Chatbot.jsx";
import BottomNav from "./BottomNav.jsx";
import { useAuth } from "../AuthContext.jsx";
import { useLiveData } from "../hooks/useLiveData.js";
import { useToast } from "./Toast.jsx";

/**
 * The signed-in user is a snapshot from login, so an admin blocking the
 * account wouldn't take effect until the next sign-in. Re-read it in the
 * background and sign the user out as soon as it is blocked.
 */
function useBlockedSignOut(user, logout) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data } = useLiveData(user ? `/auth/me/${user.id}` : "", {
    intervalMs: 30000,
    enabled: !!user && user.role !== "admin",
  });
  const blocked = !!data?.user?.blocked;

  useEffect(() => {
    if (!blocked) return;
    toast.error("Your account has been blocked by an administrator.");
    logout();
    navigate("/login", { replace: true });
  }, [blocked]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  useBlockedSignOut(user, logout);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        {children}
      </div>
      {user?.role !== "admin" && <Chatbot />}
      <BottomNav />
    </div>
  );
}
