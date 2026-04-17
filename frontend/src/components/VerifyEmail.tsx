import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../apiBase.ts";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verificationToken = searchParams.get("token");

  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    if (!verificationToken) {
      setStatus("Invalid verification link");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/verify-email?token=${verificationToken}`
        );

        const data = await res.json();

        if (res.ok) {
          setStatus("Email verified! Redirecting...");
          setTimeout(() => navigate("/main", { replace: true }), 2000);
        } else {
          setStatus(data.error || "Verification failed");
        }
      } catch {
        setStatus("Server error");
      }
    };

    run();
  }, [navigate, verificationToken]);

  return (
    <div className="auth-page">
      <h2>Email Verification</h2>
      <p className="auth-message">{status}</p>
    </div>
  );
}

export default VerifyEmail;