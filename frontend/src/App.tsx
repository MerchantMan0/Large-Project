import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import MainPage from "./components/MainPage.tsx";
import VerifyEmail from "./components/VerifyEmail.tsx";
import ResetPassword from "./components/ResetPassword.tsx";

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
        <Route
          path="/register"
          element={<Navigate to="/main?auth=register" replace />}
        />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route
          path="/forgot-password"
          element={<Navigate to="/main?auth=forgot" replace />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/main"
          element={<MainPage token={token} setToken={setToken} />}
        />

        <Route path="/" element={<Navigate to="/main" replace />} />
        <Route path="*" element={<Navigate to="/main" replace />} />
      </Routes>
    </Router>

  );
}

export default App;