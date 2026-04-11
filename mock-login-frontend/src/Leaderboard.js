import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Leaderboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/challenges/Hardest-Challenge/leaderboard"
        );
        const data = await res.json();

        // only top 15
        setRows((data.items || []).slice(0, 15));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Leetcode</h1>

        <nav className="header-nav">
          <button onClick={() => navigate("/main")}>Home</button>
          <button onClick={() => navigate("/account")}>Account</button>
        </nav>
      </header>

      <main className="leaderboard-page">
        <div className="leaderboard-card">
          <h2>🏆 Leaderboard</h2>

          {loading ? (
            <p style={{ color: "#cbd5e1" }}>Loading...</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Gas</th>
                  <th>Memory</th>
                  <th>Lines</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.submission_id}>
                    <td>
                      <span className={`rank rank-${row.rank}`}>
                        #{row.rank}
                      </span>
                    </td>
                    <td>{row.user.display_name}</td>
                    <td>{row.metrics.gas}</td>
                    <td>{row.metrics.memory_bytes}</td>
                    <td>{row.metrics.lines}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default Leaderboard;