import React, { useState, useEffect, ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./Login.tsx";
import Register from "./Register.tsx";
import MainPage from "./MainPage.tsx";
import Account from "./Account.tsx";
import Leaderboard from "./Leaderboard.tsx";
import VerifyEmail from "./VerifyEmail.tsx";
import "./App.css";

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
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={<Login setToken={setToken} />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/main"
          element={
            <ProtectedRoute token={token}>
              <MainPage />
            </ProtectedRoute>
          }
        />

        <Route path="/account" element={<Account />} />
        <Route path="/leaderboard" element={<Leaderboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;