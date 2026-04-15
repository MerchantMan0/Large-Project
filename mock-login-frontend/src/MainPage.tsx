import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { API_BASE } from "./apiBase.ts";

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

function MainPage() {
  const navigate = useNavigate();

  const [code, setCode] = useState<string>(
    `-- Type Lua code here\nprint("Hello World")`
  );

  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // -----------------------------
  // POLLING FUNCTION
  // -----------------------------
  const pollSubmission = async (submissionId: string) => {
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

        // stop polling when done
        if (data.status !== "queued") {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        setOutput("Error while polling submission.");
      }
    }, 1000); // poll every 1s
  };

  // -----------------------------
  // SUBMIT CODE
  // -----------------------------
  const handleSubmit = async () => {
    setLoading(true);
    setOutput("Submitting...\n");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/challenges/Hardest-Challenge/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            language: "lua",
            source: code,
          }),
        }
      );

      const data: Submission = await res.json();

      setOutput(
        `Submission created!\nID: ${data.id}\nStatus: ${data.status}\n\nPolling...`
      );

      // start polling
      pollSubmission(data.id);
    } catch (err) {
      setLoading(false);
      setOutput("Submission failed.");
    }
  };

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Leetcode</h1>

        <nav className="header-nav">
          <button onClick={() => navigate("/account")}>Account</button>
          <button onClick={() => navigate("/leaderboard")}>
            Leaderboard
          </button>
        </nav>
      </header>

      <main className="main">
        <section className="problem">
          <h2>Problem</h2>
          <p>Print "Hello World"</p>
        </section>

        <section className="editor">
          <h2>Editor</h2>

          <Editor
            height="400px"
            language="lua"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />

          <div style={{ marginTop: "10px" }}>
            <button onClick={handleSubmit} disabled={loading}>
              {loading ? "Running..." : "Submit"}
            </button>
          </div>

          <h3>Output:</h3>

          <pre
            style={{
              background: "#111",
              color: "#0f0",
              padding: "10px",
              height: "150px",
              overflowY: "auto",
            }}
          >
            {output}
          </pre>
        </section>
      </main>
    </div>
  );
}

export default MainPage;