import React, { useState } from "react";
import { API_BASE } from "../apiBase.ts";

type RegisterProps = {
  onBackToLogin: () => void;
};

function Register({ onBackToLogin }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [user_id, setUser_id] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setUser_id(data.user_id);

      setSuccess(
        "Account created! Check your email to verify your account before logging in."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleRegister}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>
          Register
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          style={{ marginTop: "1rem" }}
        >
          Login
        </button>
      </form>

      {user_id && (
        <p className="auth-message auth-message--success">
          Registered user ID: {user_id}
        </p>
      )}

      {success && <p className="auth-message auth-message--success">{success}</p>}

      {error && <p className="auth-message auth-message--error">{error}</p>}
    </div>
  );
}

export default Register;