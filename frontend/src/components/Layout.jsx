import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Chatbot from "./Chatbot.jsx";
import BottomNav from "./BottomNav.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function Layout({ children }) {
  const { user } = useAuth();

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
