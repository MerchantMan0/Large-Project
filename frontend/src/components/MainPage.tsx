import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { API_BASE } from "../apiBase.ts";
import EditorPanel, { type EditorTab } from "./EditorPanel.tsx";
import OutputPanel from "./OutputPanel.tsx";
import ReadmeMonacoPanel from "./ReadmeMonacoPanel.tsx";

const DEFAULT_LUA = `-- Type Lua code here\nprint("Hello World")`;

type Submission = {
  id: string;
  status: string;
  metrics: {
    gas: number;
    memory_bytes: number;
    lines: number;
  };
  language: string;
};

type Challenge = {
  id: string;
  title?: string;
  description?: string;
};

function MainPage() {
  const navigate = useNavigate();

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([
    { id: "main", label: "solution.lua", source: DEFAULT_LUA },
  ]);
  const [activeEditorTab, setActiveEditorTab] = useState("main");
  const [nextUntitled, setNextUntitled] = useState(1);

  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const activeSource = useMemo(
    () => editorTabs.find((t) => t.id === activeEditorTab)?.source ?? "",
    [editorTabs, activeEditorTab]
  );

  const onTabSourceChange = useCallback((tabId: string, source: string) => {
    setEditorTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, source } : t))
    );
  }, []);

  const onNewTab = useCallback(() => {
    const n = nextUntitled;
    setNextUntitled((x) => x + 1);
    const id = `untitled-${Date.now()}`;
    const label = `Untitled-${n}.lua`;
    setEditorTabs((prev) => [
      ...prev,
      { id, label, source: "-- New file\n" },
    ]);
    setActiveEditorTab(id);
  }, [nextUntitled]);

  const onCloseTab = useCallback((tabId: string) => {
    setEditorTabs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((t) => t.id !== tabId);
    });
  }, []);

  useEffect(() => {
    if (editorTabs.length === 0) return;
    if (!editorTabs.some((t) => t.id === activeEditorTab)) {
      setActiveEditorTab(editorTabs[0].id);
    }
  }, [editorTabs, activeEditorTab]);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const res = await fetch(`${API_BASE}/challenges/current`);
        const data = await res.json();

        setChallengeId(data.id);
        setChallenge(data);
      } catch (err) {
        console.error("Failed to load challenge", err);
      }
    };

    fetchChallenge();
  }, []);

  const pollSubmission = (submissionId: string) => {
    const token = localStorage.getItem("token");

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/submissions/${submissionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data: Submission = await res.json();

        setOutput(
          `Status: ${data.status}\n\n` +
            JSON.stringify(data.metrics, null, 2)
        );

        if (data.status !== "queued") {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        setOutput("Error while polling submission.");
      }
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!challengeId) return;

    setLoading(true);
    setOutput("Submitting...\n");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/challenges/${challengeId}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            language: "lua",
            source: activeSource,
          }),
        }
      );

      const data: Submission = await res.json();

      setOutput(
        `Submission created!\nID: ${data.id}\nStatus: ${data.status}\n\nPolling...`
      );

      pollSubmission(data.id);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setOutput("Submission failed.");
    }
  };

  if (!challengeId) {
    return (
      <div className="app-grid">
        <div style={{ color: "white", padding: "20px" }}>
          Loading challenge...
        </div>
      </div>
    );
  }

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Leetcode</h1>

        <nav className="header-nav">
          <button type="button" onClick={() => navigate("/account")}>
            Account
          </button>
          <button type="button" onClick={() => navigate("/leaderboard")}>
            Leaderboard
          </button>
        </nav>
      </header>

      <main className="main main-workspace">
        <Allotment defaultSizes={[36, 64]} minSize={140}>
          <Allotment.Pane
            minSize={160}
            className="workspace-pane workspace-panel ui-card ui-card--panel-shell"
          >
            <ReadmeMonacoPanel challenge={challenge} />
          </Allotment.Pane>

          <Allotment.Pane minSize={240} className="workspace-pane">
            <div className="editor-stack">
              <Allotment vertical defaultSizes={[62, 38]} minSize={80}>
                <Allotment.Pane
                  minSize={160}
                  className="workspace-pane workspace-panel ui-card ui-card--panel-shell"
                >
                  <EditorPanel
                    tabs={editorTabs}
                    activeTabId={activeEditorTab}
                    onActiveTabChange={setActiveEditorTab}
                    onTabSourceChange={onTabSourceChange}
                    onNewTab={onNewTab}
                    onCloseTab={onCloseTab}
                    onSubmit={handleSubmit}
                    loading={loading}
                  />
                </Allotment.Pane>
                <Allotment.Pane
                  minSize={100}
                  className="workspace-pane workspace-panel ui-card ui-card--panel-shell"
                >
                  <OutputPanel output={output} />
                </Allotment.Pane>
              </Allotment>
            </div>
          </Allotment.Pane>
        </Allotment>
      </main>
    </div>
  );
}

export default MainPage;
