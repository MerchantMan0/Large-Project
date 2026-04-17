import React, { useState } from "react";
import { API_BASE } from "../apiBase.ts";

type LoginProps = {
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  onGoToRegister: () => void;
  onGoToForgotPassword: () => void;
};

type LoginResponse = {
  access_token: string;
};

function Login({
  setToken,
  onGoToRegister,
  onGoToForgotPassword,
}: LoginProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data: LoginResponse = await response.json();
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            required
          />
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>
          Login
        </button>

        <button
          type="button"
          onClick={onGoToRegister}
          style={{ marginTop: "1rem" }}
        >
          Register
        </button>

        <p className="forgot-password" onClick={onGoToForgotPassword}>
          Forgot Password?
        </p>
      </form>

      {error && <p className="auth-message auth-message--error">{error}</p>}
    </div>
  );
}

export default Login;
