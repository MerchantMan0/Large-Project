import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5000/users/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch account data");
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Leetcode</h1>

        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/main")}>Home</button>
          <button onClick={() => navigate("/leaderboard")}>Leaderboard</button>
        </div>
      </header>

      <main className="account-page">
        <div className="account-card">
          <h2>Account</h2>

          {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

          {!user && !error && <p>Loading...</p>}

          {user && (
            <div className="account-info">
              <div className="profile-box">
                <h3>{user.display_name}</h3>
                <p>ID: {user.id}</p>
              </div>

              <div className="stats-grid">
                <div className="stat">
                  <h4>{user.stats.submissions}</h4>
                  <p>Submissions</p>
                </div>

                <div className="stat">
                  <h4>{user.stats.accepted}</h4>
                  <p>Accepted</p>
                </div>

                <div className="stat">
                  <h4>{user.stats.challenges_solved}</h4>
                  <p>Solved</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Account;