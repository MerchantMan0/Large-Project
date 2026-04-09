import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Controlled as ControlledEditor } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/lua/lua"; // Lua syntax highlighting
import "./App.css";

import { lua, lauxlib, lualib, to_luastring, to_jsstring } from "fengari-web";

function MainPage() {
  const navigate = useNavigate();
  const outputRef = useRef(null);
  const [code, setCode] = React.useState(`-- Type Lua code here\nprint("Hello from Lua!")`);

  const runLua = (luaCode) => {
    outputRef.current.textContent = ""; // Clear previous output

    try {
      const L = lauxlib.luaL_newstate();
      lualib.luaL_openlibs(L);

      // Override print to capture output
      lua.lua_pushjsfunction(L, (L) => {
        const s = to_jsstring(lua.lua_tostring(L, 1));
        outputRef.current.textContent += s + "\n";
        return 0;
      });
      lua.lua_setglobal(L, "print");

      lauxlib.luaL_dostring(L, to_luastring(luaCode));
    } catch (e) {
      outputRef.current.textContent += "Error: " + e.message;
    }
  };

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Wordle</h1>
        <button type="button" onClick={() => navigate("/account")} style={{ marginLeft: "auto" }}>
          Account
        </button>
      </header>

      <main className="main">
        <section className="problem">
          <h2>Problem</h2>
          <p>Problem content here...</p>
        </section>

        <section className="editor">
          <h2>Editor</h2>
          <ControlledEditor
            value={code}
            options={{
              mode: "lua",
              lineNumbers: true,
            }}
            onBeforeChange={(editor, data, value) => {
              setCode(value);
            }}
            onChange={(editor, data, value) => {
              runLua(value); // live evaluation
            }}
          />
          <h3>Output:</h3>
          <pre
            ref={outputRef}
            style={{ background: "#f0f0f0", padding: "10px", height: "150px", overflowY: "auto" }}
          ></pre>
        </section>
      </main>
    </div>
  );
}

export default MainPage;