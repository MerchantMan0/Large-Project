import React, { useEffect, useState } from "react";
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

  return (
    <div className="leaderboard-embedded">
      <div className="leaderboard-workspace-surface">
        <select
          value={challengeId}
          onChange={(e) => setChallengeId(e.target.value)}
          className="leaderboard-workspace-select"
          aria-label="Challenge"
        >
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <div className="leaderboard-metric-row" role="tablist" aria-label="Metric">
          <button
            type="button"
            className={
              metric === "gas"
                ? "leaderboard-metric-btn leaderboard-metric-btn--active"
                : "leaderboard-metric-btn"
            }
            onClick={() => setMetric("gas")}
          >
             Gas
          </button>
          <button
            type="button"
            className={
              metric === "memory_bytes"
                ? "leaderboard-metric-btn leaderboard-metric-btn--active"
                : "leaderboard-metric-btn"
            }
            onClick={() => setMetric("memory_bytes")}
          >
             Memory
          </button>
          <button
            type="button"
            className={
              metric === "lines"
                ? "leaderboard-metric-btn leaderboard-metric-btn--active"
                : "leaderboard-metric-btn"
            }
            onClick={() => setMetric("lines")}
          >
             Lines
          </button>
        </div>

        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="leaderboard-workspace-search"
        />

        {loading ? (
          <p className="leaderboard-workspace-muted">Loading…</p>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-data-table">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
