import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register(){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [user_id, setUser_id] = useState("");
  const [error, setError] = useState("");    
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

   const goToLogin = () => {
    navigate("/"); 
   } 

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try{
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, username }),
        });

        if (!response.ok) {
            throw new Error("Registration failed");
        }

        const data = await response.json();
        setUser_id(data.user_id);
        console.log("Registered user:", data.user_id);

        setSuccess("Registered successfully! Redirecting to login...");

        setTimeout(() => {
            navigate("/");
        }, 2000);

    } catch (err) {
        setError(err.message);
    }
  };

  return (
    <div className="register">
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
            <div>
                <label>Username:</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </div>            
            <div>
                <label>Email:</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required  
                />           
            </div>
            <div style={{ marginTop: "1rem" }}>
                <label>Password:</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit" style={{ marginTop: "1rem" }}>
                Register
            </button>
            <button onClick={goToLogin} style={{ marginTop: "1rem" }}>
                Login
            </button>
        </form>
        {user_id && <p style={{ color: "green" }}>Registered user ID: {user_id}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
}

export default Register;