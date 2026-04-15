import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE } from "./apiBase.ts";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("Invalid verification link");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/verify-email?token=${token}`
        );

        const data = await res.json();

        if (res.ok) {
          setStatus("Email verified! Redirecting to login...");
          setTimeout(() => navigate("/"), 2000);
        } else {
          setStatus(data.error || "Verification failed");
        }
      } catch {
        setStatus("Server error");
      }
    };

    run();
  }, []);

  return (
    <div className="login">
      <h2>Email Verification</h2>
      <p>{status}</p>
    </div>
  );
}

export default VerifyEmail;