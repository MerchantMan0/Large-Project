import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Leaderboard(){
    

    const navigate = useNavigate();
    const goToHomePage = () => {
        navigate("/main");
    }
    const goToAccount = () =>{
        navigate("/account");
    }
    return (
        <header class="header">
            <h1>Lua Leetcode</h1>
            <nav class="nav">
                <ul>
                    <li><a onClick={goToAccount}>Account</a></li>
                    <li><a onClick={goToHomePage}>Home Page</a></li>
                </ul>
            </nav>
        </header>
    )
}

export default Leaderboard;