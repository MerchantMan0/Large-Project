import React, { useState, useEffect, ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./components/Login.tsx";
import Register from "./components/Register.tsx";
import MainPage from "./components/MainPage.tsx";
import Account from "./components/Account.tsx";
import Leaderboard from "./components/Leaderboard.tsx";
import VerifyEmail from "./components/VerifyEmail.tsx";
import ForgotPassword from "./components/ForgotPassword.tsx";
import ResetPassword from "./components/ResetPassword.tsx";

import "./styles/App.css";

type ProtectedRouteProps = {
  children: ReactNode;
  token: string | null;
};

function ProtectedRoute({ children, token }: ProtectedRouteProps) {
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login setToken={setToken} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes, requires login */}
        <Route
          path="/main"
          element={
            <ProtectedRoute token={token}>
              <MainPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute token={token}>
              <Account />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute token={token}>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>

  );
}

export default App;