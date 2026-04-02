import React from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function MainPage() {
  const navigate = useNavigate();

  // mock user info
  const user = { display_name: "Mock User", submissions: 5, challenges_solved: 3 };

  const goToAccount = () => {
    navigate("/account");
  };

  return (
    <div className="app-grid">
      <header className="header">
        <h1>Lua Wordle</h1>
        <button type="button" onClick={goToAccount} style={{ marginLeft: "auto" }}>
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
          <p>Code editor goes here...</p>
        </section>
      </main>
    </div>
  );
}

export default MainPage;
