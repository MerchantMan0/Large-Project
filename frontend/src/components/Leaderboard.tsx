import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../apiBase.ts";

type Metric = "gas" | "memory_bytes" | "lines";

type LeaderboardRow = {
  submission_id: string;
  rank: number;
  user: {
    display_name: string;
  };
  metrics: {
    gas: number;
    memory_bytes: number;
    lines: number;
  };
};

type LeaderboardResponse = {
  items: LeaderboardRow[];
};

type Challenge = {
  id: string;
  title: string;
  week?: number;
  status?: string;
};

function Leaderboard() {
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeId, setChallengeId] = useState<string>("");

  const [metric, setMetric] = useState<Metric>("gas");

  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/challenges`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        const items: Challenge[] = data.items || [];
        setChallenges(items);

        // set default selected challenge
        if (items.length > 0) {
          setChallengeId(items[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchChallenges();
  }, []);

  useEffect(() => {
    if (!challengeId) return;

    const timeout = setTimeout(() => {
      const fetchLeaderboard = async () => {
        try {
          setLoading(true);

          const res = await fetch(
            `${API_BASE}/challenges/${challengeId}/leaderboard?search=${encodeURIComponent(
              search
            )}&metric=${metric}`
          );

          const data: LeaderboardResponse = await res.json();

          setRows(data.items || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchLeaderboard();
    }, 300);

    return () => clearTimeout(timeout);
  }, [challengeId, search, metric]);

  const getMetricLabel = () => {
    if (metric === "gas") return "⚡ Gas";
    if (metric === "memory_bytes") return "🧠 Memory";
    return "📏 Lines";
  };

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
          <h2>{getMetricLabel()} Leaderboard</h2>

          {/* Challenge Dropdown (DYNAMIC) */}
          <select
            value={challengeId}
            onChange={(e) => setChallengeId(e.target.value)}
            className="search-bar"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Metric Tabs */}
          <div className="metric-tabs">
            <button
              className={metric === "gas" ? "active" : ""}
              onClick={() => setMetric("gas")}
            >
              ⚡ Gas
            </button>

            <button
              className={metric === "memory_bytes" ? "active" : ""}
              onClick={() => setMetric("memory_bytes")}
            >
              🧠 Memory
            </button>

            <button
              className={metric === "lines" ? "active" : ""}
              onClick={() => setMetric("lines")}
            >
              📏 Lines
            </button>
          </div>

          {/* Search (SERVER-SIDE) */}
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar"
          />

          {loading ? (
            <p style={{ color: "#cbd5e1" }}>Loading...</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Value</th>
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

                    <td>{row.metrics[metric]}</td>
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