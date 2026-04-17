import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { API_BASE } from "../apiBase.ts";
import Account from "./Account.tsx";
import EditorPanel, { type EditorTab } from "./EditorPanel.tsx";
import Leaderboard from "./Leaderboard.tsx";
import OutputPanel, { type OutputPanelMetrics } from "./OutputPanel.tsx";
import ReadmeMonacoPanel from "./ReadmeMonacoPanel.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Login from "./Login.tsx";
import Register from "./Register.tsx";

const DEFAULT_LUA = `-- Type Lua code here\nprint("Hello World")`;

type AuthPanel = "login" | "register" | "forgot";

type MainPageProps = {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
};

type Submission = {
  id: string;
  status: string;
  metrics?: OutputPanelMetrics;
  language: string;
};

type Challenge = {
  id: string;
  title?: string;
  description?: string;
};

/** Matches server `queued` / `running` — metrics are placeholders until evaluation finishes. */
function submissionMetricsReady(status: string): boolean {
  return status !== "queued" && status !== "running";
}

function MainPage({ token, setToken }: MainPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authPanel, setAuthPanel] = useState<AuthPanel>(() => {
    const a = searchParams.get("auth");
    if (a === "register") return "register";
    if (a === "forgot") return "forgot";
    return "login";
  });

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([
    { id: "main", label: "solution.lua", source: DEFAULT_LUA },
  ]);
  const [activeEditorTab, setActiveEditorTab] = useState("main");
  const [nextUntitled, setNextUntitled] = useState(1);

  const [output, setOutput] = useState<string>("");
  const [outputMetrics, setOutputMetrics] = useState<OutputPanelMetrics | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [leftPaneTab, setLeftPaneTab] = useState<
    "readme" | "account" | "leaderboard" | "output"
  >("readme");

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

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    navigate("/main", { replace: true });
  }, [navigate, setToken]);

  const openLogin = useCallback(() => {
    setAuthPanel("login");
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const openRegister = useCallback(() => {
    setAuthPanel("register");
  }, []);

  const openForgot = useCallback(() => {
    setAuthPanel("forgot");
  }, []);

  useEffect(() => {
    if (token !== null) return;
    const a = searchParams.get("auth");
    if (a === "register") setAuthPanel("register");
    else if (a === "forgot") setAuthPanel("forgot");
    else setAuthPanel("login");
  }, [token, searchParams]);

  const authTitle =
    authPanel === "login"
      ? "Login"
      : authPanel === "register"
        ? "Register"
        : "Forgot Password";

  const authDialog =
    token === null ? (
      <Dialog.Root open modal>
        <Dialog.Portal>
          <Dialog.Overlay className="login-dialog-overlay" />
          <Dialog.Content
            className="login-dialog-content"
            aria-describedby={undefined}
            onInteractOutside={(e) => {
              e.preventDefault();
              if (authPanel !== "login") openLogin();
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              if (authPanel !== "login") openLogin();
            }}
          >
            <Dialog.Title className="login-dialog-title">{authTitle}</Dialog.Title>
            {authPanel === "login" && (
              <Login
                setToken={setToken}
                onGoToRegister={openRegister}
                onGoToForgotPassword={openForgot}
              />
            )}
            {authPanel === "register" && (
              <Register onBackToLogin={openLogin} />
            )}
            {authPanel === "forgot" && (
              <ForgotPassword onBackToLogin={openLogin} />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    ) : null;

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

        setOutput(`Submission ${data.id}\nStatus: ${data.status}\n`);

        if (submissionMetricsReady(data.status) && data.metrics != null) {
          setOutputMetrics(data.metrics);
        }

        if (submissionMetricsReady(data.status)) {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        setOutputMetrics(null);
        setOutput("Error while polling submission.");
      }
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!challengeId) return;

    setLoading(true);
    setLeftPaneTab("output");
    setOutputMetrics(null);
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
      setOutputMetrics(null);
      setOutput("Submission failed.");
    }
  };

  if (!challengeId) {
    return (
      <>
        <div className="app-grid">
          <div style={{ color: "white", padding: "20px" }}>
            Loading challenge...
          </div>
        </div>
        {authDialog}
      </>
    );
  }

  return (
    <>
    <div className="app-grid">
      <header className="header">
        <h1>Lua Leetcode</h1>

        <nav className="header-nav">
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <main className="main main-workspace">
        <Allotment defaultSizes={[36, 64]} minSize={140}>
          <Allotment.Pane
            minSize={160}
            className="workspace-pane workspace-panel ui-card ui-card--panel-shell"
          >
            <div className="editor-panel-inner">
              <Tabs.Root
                className="editor-tabs-root"
                value={leftPaneTab}
                onValueChange={(v) =>
                  setLeftPaneTab(
                    v as "readme" | "account" | "leaderboard" | "output"
                  )
                }
              >
                <div className="editor-tabs-toolbar-row">
                  <Tabs.List
                    className="editor-tabs-list"
                    aria-label="Workspace side panel"
                  >
                    <Tabs.Trigger
                      className="editor-tab-trigger"
                      value="readme"
                      type="button"
                    >
                      README
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      className="editor-tab-trigger"
                      value="account"
                      type="button"
                    >
                      Account
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      className="editor-tab-trigger"
                      value="leaderboard"
                      type="button"
                    >
                      Leaderboard
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      className="editor-tab-trigger"
                      value="output"
                      type="button"
                    >
                      Output
                    </Tabs.Trigger>
                  </Tabs.List>
                </div>
                <Tabs.Content
                  className="editor-tab-content"
                  value="readme"
                  forceMount
                >
                  <ReadmeMonacoPanel challenge={challenge} omitTabStrip />
                </Tabs.Content>
                <Tabs.Content className="editor-tab-content" value="account">
                  <Account />
                </Tabs.Content>
                <Tabs.Content
                  className="editor-tab-content"
                  value="leaderboard"
                >
                  <Leaderboard />
                </Tabs.Content>
                <Tabs.Content className="editor-tab-content" value="output">
                  <OutputPanel output={output} metrics={outputMetrics} />
                </Tabs.Content>
              </Tabs.Root>
            </div>
          </Allotment.Pane>

          <Allotment.Pane
            minSize={240}
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
        </Allotment>
      </main>
    </div>
    {authDialog}
    </>
  );
}

export default MainPage;
