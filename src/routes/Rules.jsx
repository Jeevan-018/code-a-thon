import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ALLOW_SECTIONS_FLAG, setNavigationFlag } from "../utils/navigationFlags";

function Rules() {
  const [agree, setAgree] = useState(false);
  const navigate = useNavigate();

  const [totalDuration, setTotalDuration] = useState(null);
  const API_BASE = window.location.hostname === "localhost" ? "http://localhost:5000" : (process.env.REACT_APP_API_URL || "https://code-a-thon.onrender.com");

  useEffect(() => {
    const candidateId = localStorage.getItem("candidate_id");
    if (!candidateId) {
      navigate("/login", { replace: true });
    }

    const fetchActiveExam = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exam/active`);
        if (res.ok) {
          const data = await res.json();
          // sum sections.duration (in seconds)
          const totalSeconds = data.sections.reduce((acc, s) => acc + (s.duration || 0), 0);
          setTotalDuration(Math.round(totalSeconds / 60)); // convert to minutes
        }
      } catch (err) {
        console.error("Failed to fetch active exam:", err);
      }
    };
    fetchActiveExam();
  }, [navigate, API_BASE]);

  const handleStart = () => {
    if (!agree) {
      alert("⚠️ Please agree to the rules before starting the test.");
      return;
    }

    // Request full screen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    }

    setNavigationFlag(ALLOW_SECTIONS_FLAG);
    navigate("/sections", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(118, 75, 162, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />

      <div
        style={{
          background: "rgba(26, 31, 58, 0.85)",
          backdropFilter: "blur(16px)",
          borderRadius: "18px",
          padding: "20px 20px",       // reduced inner gap
          maxWidth: "780px",          // widened frame
          width: "90%",               // responsive
          textAlign: "center",
          boxShadow: "0 18px 48px rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          position: "relative",
          zIndex: 1,
        }}
      >

        <h2
          style={{
            color: "#ffffff",
            marginBottom: "30px",
            fontWeight: "700",
            fontSize: "32px",
          }}
        >
          📜 Exam Rules & Instructions
        </h2>
        <ul
          style={{
            textAlign: "left",
            lineHeight: "2",
            color: "#e2e8f0",
            listStyleType: "disc",
            paddingLeft: "25px",
            marginBottom: "30px",
            fontSize: "16px",
          }}
        >
          <li style={{ marginBottom: "12px" }}>No tab switching or window minimization.</li>
          <li style={{ marginBottom: "12px" }}>Copy/Paste is disabled in the coding section.</li>
          <li style={{ marginBottom: "12px" }}>Each section has a timer and auto-submits when time ends.</li>
          <li style={{ marginBottom: "12px" }}>
            Total Exam Duration: <strong style={{ color: "#667eea" }}>{totalDuration !== null ? totalDuration : "--"} mins</strong>.
          </li>
          <li style={{ marginBottom: "12px" }}>Once submitted, you cannot reattempt.</li>
        </ul>

        <div
          style={{
            marginTop: "25px",
            marginBottom: "30px",
            fontSize: "16px",
            color: "#e2e8f0",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={{
                width: "20px",
                height: "20px",
                cursor: "pointer",
                accentColor: "#667eea",
              }}
            />
            I have read and agree to the rules
          </label>
        </div>

        <button
          onClick={handleStart}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            color: "white",
            padding: "16px 50px",
            borderRadius: "12px",
            fontSize: "18px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
            width: "100%",
            maxWidth: "300px",
          }}
        >
          Start Test
        </button>
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
            }
          }
        `}
      </style>
    </div>
  );
}

export default Rules;










