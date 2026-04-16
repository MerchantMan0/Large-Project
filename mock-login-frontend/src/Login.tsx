import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./apiBase.ts";

type LoginProps = {
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
};

type LoginResponse = {
  access_token: string;
};

function Login({ setToken }: LoginProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const navigate = useNavigate();

  const goToRegister = () => {
    navigate("/register");
  };

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

      setToken(data.access_token);

      console.log("Logged in, token:", data.access_token);

      navigate("/main");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>

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
          onClick={goToRegister}
          style={{ marginTop: "1rem" }}
        >
          Register
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Login;