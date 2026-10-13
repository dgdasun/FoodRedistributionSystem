import React, { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "./components/Toast.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("zerowaste_user") || localStorage.getItem("foodshare_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(false);
  }, []);

  /**
   * Stores the signed-in user. Also used to swap in a refreshed user object
   * (document uploads, verification polling), so the welcome toast is opt-in:
   * pass { announce: true } only from an actual sign-in.
   */
  const login = (u, { announce = false } = {}) => {
    setUser(u);
    localStorage.setItem("zerowaste_user", JSON.stringify(u));
    if (announce) {
      toast.success(`Welcome back, ${u.name}! You have successfully logged in.`, { duration: 3500 });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("zerowaste_user");
    localStorage.removeItem("foodshare_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
