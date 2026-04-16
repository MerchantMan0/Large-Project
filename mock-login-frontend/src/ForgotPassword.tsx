import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./apiBase.ts";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const goToLogin = () => {
    navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setMessage(data.message || "Something went wrong");
    } catch (err) {
      console.error(err);
      setMessage("Server error");
    }
  };

  return (
    <div className="login">
      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit">Send Reset Link</button>
                <button type="button" onClick={goToLogin} style={{ marginLeft: "1rem" }}>
          Back to Login
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default ForgotPassword;