import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./apiBase.ts";

type User = {
  id: string;
  display_name: string;
  stats: {
    submissions: number;
    accepted: number;
    challenges_solved: number;
  };
};

type Submission = {
  id: string;
  challenge_id: string;
  display_name: string;
  language: string;
  status: string;
  submitted_at: string;
  metrics: {
    gas: number;
    memory_bytes: number;
    lines: number;
  };
};

type SubmissionResponse = {
  items: Submission[];
  page: number;
  page_size: number;
  total: number;
};

function Account() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/users/me/submissions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: SubmissionResponse = await res.json();

        setSubmissions(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Leetcode</h1>

        <nav className="header-nav">
          <button onClick={() => navigate("/main")}>Home</button>
          <button onClick={() => navigate("/leaderboard")}>Leaderboard</button>
          <button style={{ backgroundColor: "lightcoral" }} onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <main className="leaderboard-page">
        <div className="account-card">
          <h2>Account</h2>

          {loadingUser ? (
            <p style={{ color: "#cbd5e1" }}>Loading user...</p>
          ) : user ? (
            <>
              <div className="profile-box">
                <h2>{user.display_name}</h2>
                <p className="user-id">User ID: {user.id}</p>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{user.stats.submissions}</h3>
                  <p>Submissions</p>
                </div>

                <div className="stat-card">
                  <h3>{user.stats.accepted}</h3>
                  <p>Accepted</p>
                </div>

                <div className="stat-card">
                  <h3>{user.stats.challenges_solved}</h3>
                  <p>Solved</p>
                </div>
              </div>
            </>
          ) : (
            <p>Failed to load user.</p>
          )}
          <div className="profile-box">
            <h2>Submission History</h2>

            {loadingSubs ? (
              <p style={{ color: "#cbd5e1" }}>Loading submissions...</p>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Challenge</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Gas</th>
                    <th>Memory</th>
                    <th>Lines</th>
                  </tr>
                </thead>

                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>{sub.challenge_id}</td>
                      <td>{sub.status}</td>
                      <td>
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </td>
                      <td>{sub.metrics.gas}</td>
                      <td>{sub.metrics.memory_bytes}</td>
                      <td>{sub.metrics.lines}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        
      </main>
    </div>
  );
}

export default Account;