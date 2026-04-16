import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { registerLua } from "./luaLanguage";
import { API_BASE } from "./apiBase.ts";

function MainPage() {
  const navigate = useNavigate();
  const outputRef = useRef(null);

  const [code, setCode] = useState(
    `-- Type Lua code here\nprint("Hello World")`
  );

  // 🔥 Register Lua language once
  useEffect(() => {
    import("monaco-editor").then((monaco) => {
      registerLua(monaco);
    });
  }, []);

  const handleSubmit = async () => {
    if (!outputRef.current) return;

    outputRef.current.textContent = "Submitting...\n";

    try {
      const res = await fetch(
        `${API_BASE}/challenges/Hardest-Challenge/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer MOCK_TOKEN",
          },
          body: JSON.stringify({
            language: "lua",
            source: code,
          }),
        }
      );

      const data = await res.json();

      outputRef.current.textContent =
        "Submission Response:\n\n" + JSON.stringify(data, null, 2);
    } catch (err) {
      outputRef.current.textContent =
        "Error connecting to API:\n" + err.message;
    }
  };

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Wordle</h1>
        <button
          type="button"
          onClick={() => navigate("/account")}
          style={{ marginLeft: "auto" }}
        >
          Account
        </button>
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
            onChange={(value) => setCode(value || "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />

          <div style={{ marginTop: "10px" }}>
            <button onClick={handleSubmit}>Submit</button>
          </div>

          <h3>Output:</h3>
          <pre
            ref={outputRef}
            style={{
              background: "#111",
              color: "#0f0",
              padding: "10px",
              height: "150px",
              overflowY: "auto",
            }}
          />
        </section>
      </main>
    </div>
  );
}

export default MainPage;