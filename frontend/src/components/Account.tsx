import React, { useEffect, useState } from "react";
import { API_BASE } from "../apiBase.ts";

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
    <div className="account-embedded">
      <div className="account-workspace-surface">
        {loadingUser ? (
          <p className="account-workspace-muted">Loading user…</p>
        ) : user ? (
          <>
            <div className="account-profile-block">
              <h3 className="account-workspace-subheading">
                User: {user.display_name}
              </h3>
              <p className="account-user-id">User ID: {user.id}</p>
            </div>

            <div className="account-stats-row">
              <div className="account-stat-cell">
                <p className="account-stat-value">{user.stats.submissions}</p>
                <p className="account-stat-label">Submissions</p>
              </div>
              <div className="account-stat-cell">
                <p className="account-stat-value">{user.stats.accepted}</p>
                <p className="account-stat-label">Accepted</p>
              </div>
              <div className="account-stat-cell">
                <p className="account-stat-value">
                  {user.stats.challenges_solved}
                </p>
                <p className="account-stat-label">Solved</p>
              </div>
            </div>
          </>
        ) : (
          <p className="account-workspace-muted">Failed to load user.</p>
        )}

        <h3 className="account-workspace-subheading account-workspace-subheading--section">
          Submission history
        </h3>

        {loadingSubs ? (
          <p className="account-workspace-muted">Loading submissions…</p>
        ) : (
          <div className="account-table-wrap">
            <table className="account-data-table">
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
                    <td>{new Date(sub.submitted_at).toLocaleDateString()}</td>
                    <td>{sub.metrics.gas}</td>
                    <td>{sub.metrics.memory_bytes}</td>
                    <td>{sub.metrics.lines}</td>
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

export default Account;
