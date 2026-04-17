import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

const SUBMISSIONS_PAGE_SIZE = 10;

/** Pixels from bottom of scroll container to trigger loading the next page. */
const SCROLL_LOAD_THRESHOLD_PX = 80;

function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingMoreSubs, setLoadingMoreSubs] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [subsTotal, setSubsTotal] = useState<number | null>(null);

  const historyBoxRef = useRef<HTMLDivElement>(null);
  const submissionsRef = useRef<Submission[]>([]);
  const subsTotalRef = useRef<number | null>(null);
  const loadMoreInFlightRef = useRef(false);
  /** Highest submissions API page number successfully loaded (1-based). */
  const highestSubsPageLoadedRef = useRef(0);

  submissionsRef.current = submissions;
  subsTotalRef.current = subsTotal;

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
        if (res.ok) {
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error(err);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (loadingUser) return;

    if (!user?.id) {
      setSubmissions([]);
      setSubsError(null);
      setSubsTotal(null);
      loadMoreInFlightRef.current = false;
      highestSubsPageLoadedRef.current = 0;
      return;
    }

    let cancelled = false;

    const fetchSubmissions = async () => {
      setLoadingSubs(true);
      setLoadingMoreSubs(false);
      setSubsError(null);
      setSubsTotal(null);
      setSubmissions([]);
      loadMoreInFlightRef.current = false;
      highestSubsPageLoadedRef.current = 0;
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
          page: "1",
          page_size: String(SUBMISSIONS_PAGE_SIZE),
        });
        const res = await fetch(
          `${API_BASE}/users/${user.id}/submissions?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data: SubmissionResponse = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setSubmissions([]);
          setSubsError(
            typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : "Failed to load submissions.",
          );
          return;
        }

        setSubmissions(data.items || []);
        setSubsTotal(typeof data.total === "number" ? data.total : 0);
        highestSubsPageLoadedRef.current = 1;
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSubmissions([]);
          setSubsError("Could not load submissions.");
        }
      } finally {
        if (!cancelled) setLoadingSubs(false);
      }
    };

    void fetchSubmissions();

    return () => {
      cancelled = true;
    };
  }, [loadingUser, user?.id]);

  const loadNextSubmissionPage = useCallback(async () => {
    const uid = user?.id;
    if (!uid || subsError) return;
    if (loadMoreInFlightRef.current || loadingSubs) return;

    const len = submissionsRef.current.length;
    const total = subsTotalRef.current;
    if (len === 0 || total === null || len >= total) return;

    const nextPage = highestSubsPageLoadedRef.current + 1;

    loadMoreInFlightRef.current = true;
    setLoadingMoreSubs(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(SUBMISSIONS_PAGE_SIZE),
      });
      const res = await fetch(
        `${API_BASE}/users/${uid}/submissions?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data: SubmissionResponse = await res.json();

      if (!res.ok) {
        return;
      }

      const batch = data.items || [];
      if (batch.length === 0) {
        setSubsTotal(submissionsRef.current.length);
      } else {
        highestSubsPageLoadedRef.current = nextPage;
        setSubmissions((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          const merged = [...prev];
          for (const row of batch) {
            if (!seen.has(row.id)) {
              seen.add(row.id);
              merged.push(row);
            }
          }
          return merged;
        });
        if (typeof data.total === "number") {
          setSubsTotal(data.total);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMoreSubs(false);
    }
  }, [user?.id, subsError, loadingSubs]);

  const maybeLoadMoreFromScrollPosition = useCallback(() => {
    const el = historyBoxRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance > SCROLL_LOAD_THRESHOLD_PX) return;
    void loadNextSubmissionPage();
  }, [loadNextSubmissionPage]);

  useLayoutEffect(() => {
    if (loadingUser || !user?.id || loadingSubs || subsError) return;
    const total = subsTotalRef.current;
    const len = submissionsRef.current.length;
    if (total === null || len === 0 || len >= total) return;
    if (loadingMoreSubs || loadMoreInFlightRef.current) return;
    const el = historyBoxRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance > SCROLL_LOAD_THRESHOLD_PX) return;
    void loadNextSubmissionPage();
  }, [
    loadingUser,
    user?.id,
    loadingSubs,
    loadingMoreSubs,
    subsError,
    submissions.length,
    subsTotal,
    loadNextSubmissionPage,
  ]);

  return (
    <div className="account-embedded">
      <div className="account-workspace-surface">
        <div className="account-workspace-header">
          {loadingUser ? (
            <p className="account-workspace-muted">Loading user…</p>
          ) : user ? (
            <>
              <div className="account-profile-block">
                <h3 className="account-workspace-subheading">
                  User: {user.display_name}
                </h3>
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
        </div>

        <div className="account-history-section">
          <h3 className="account-workspace-subheading account-workspace-subheading--section">
            Submission history
          </h3>
          <div
            ref={historyBoxRef}
            className="account-history-box"
            onScroll={maybeLoadMoreFromScrollPosition}
          >
            {loadingUser ? (
              <p className="account-workspace-muted">Loading submissions…</p>
            ) : !user ? (
              <p className="account-workspace-muted">Profile not loaded.</p>
            ) : loadingSubs ? (
              <p className="account-workspace-muted">Loading submissions…</p>
            ) : subsError ? (
              <p className="account-workspace-muted">{subsError}</p>
            ) : submissions.length === 0 ? (
              <p className="account-workspace-muted">No submissions found.</p>
            ) : (
              <>
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
                          <td>
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </td>
                          <td>{sub.metrics?.gas ?? "—"}</td>
                          <td>{sub.metrics?.memory_bytes ?? "—"}</td>
                          <td>{sub.metrics?.lines ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {loadingMoreSubs ? (
                  <p className="account-workspace-muted account-history-load-more">
                    Loading more…
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
