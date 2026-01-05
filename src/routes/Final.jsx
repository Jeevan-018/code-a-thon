import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Final() {
  const navigate = useNavigate();
  const candidate = localStorage.getItem("candidate_id") || "Candidate";
  const [isHovered, setIsHovered] = useState(false);

  const handleGoHome = () => {
    // Clear relevant session data to allow re-login if needed
    localStorage.removeItem("candidate_id");
    localStorage.removeItem("candidate_name");
    localStorage.removeItem("exam_answers");
    localStorage.removeItem("exam_code");
    localStorage.removeItem("completedSections");
    localStorage.removeItem("disqualified");
    navigate("/");
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
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(118, 75, 162, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />

      <div
        style={{
          background: "rgba(26, 31, 58, 0.8)",
          backdropFilter: "blur(20px)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
          padding: "60px 70px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
          zIndex: 1,
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "80px",
            color: "#48bb78",
            marginBottom: "20px",
            animation: "scaleIn 0.7s ease-in-out",
          }}
        >
          ✅
        </div>
        <h1
          style={{
            color: "#ffffff",
            fontWeight: "700",
            marginTop: "20px",
            marginBottom: "16px",
            fontSize: "36px",
          }}
        >
          Thank You, {candidate}
        </h1>
        <p style={{ color: "#e2e8f0", fontSize: "18px", margin: "8px 0" }}>
          Your test has been submitted successfully.
        </p>
        <p
          style={{
            fontSize: "14px",
            color: "#8b92b0",
            marginTop: "20px",
            marginBottom: "30px",
          }}
        >
          You may now close this window.
        </p>

        <button
          onClick={handleGoHome}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            padding: "14px 40px",
            fontSize: "18px",
            fontWeight: "600",
            color: "#ffffff",
            background: isHovered 
              ? "linear-gradient(90deg, #764ba2 0%, #667eea 100%)" 
              : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isHovered 
              ? "0 10px 25px rgba(102, 126, 234, 0.4)" 
              : "0 4px 12px rgba(0, 0, 0, 0.2)",
            transform: isHovered ? "translateY(-2px) scale(1.02)" : "translateY(0) scale(1)",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>🏠</span> Go to Home
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
          @keyframes scaleIn {
            0% {
              transform: scale(0);
            }
            60% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}

export default Final;
