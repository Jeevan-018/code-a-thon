import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminLogin() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate network delay for better UX
    setTimeout(() => {
      if (id === "MCA@ADMIN" && password === "Admin@MCA") {
        navigate("/admin/results");
      } else {
        setError("Invalid Admin Credentials");
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#0a0e27",
        fontFamily: "'Times New Roman', Times, serif",
        position: "relative",
      }}
    >
      <button
        onClick={() => navigate("/login")}
        style={{
          position: "absolute",
          top: "5px",
          right: "20px",
          zIndex: 1000,
          background: "#ef4444",
          color: "#ffffff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        Candidate Login
      </button>
      {/* Left Side - Code-A-Thon Branding */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background elements */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            right: "-20%",
            width: "600px",
            height: "600px",
            background: "rgba(0, 0, 0, 0.1)",
            borderRadius: "50%",
            filter: "blur(80px)",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "-10%",
            width: "500px",
            height: "500px",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "50%",
            filter: "blur(60px)",
            animation: "float 8s ease-in-out infinite reverse",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: "800",
              color: "#ffffff",
              marginBottom: "20px",
              textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              letterSpacing: "-2px",
            }}
          >
            Code-A-Thon
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: "300",
              marginBottom: "40px",
              letterSpacing: "2px",
            }}
          >
            ADMIN PORTAL
          </div>
          <div
            style={{
              width: "80px",
              height: "4px",
              background: "#ffffff",
              margin: "0 auto",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              marginTop: "40px",
              fontSize: "20px",
              color: "rgba(0, 0, 0, 0.85)",
              lineHeight: "1.8",
              maxWidth: "480px",
              textAlign: "center",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Secure access for administrators to view candidate results and manage the assessment platform.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px",
          background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle animated background elements */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "10%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "10%",
            width: "250px",
            height: "250px",
            background: "radial-gradient(circle, rgba(118, 75, 162, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h2
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "8px",
            }}
          >
            Admin Login
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#8b92b0",
              marginBottom: "40px",
            }}
          >
            Enter your admin credentials
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#e2e8f0",
                  marginBottom: "8px",
                }}
              >
                Admin ID
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setError("");
                }}
                name="admin_login_id"
                autoComplete="off"
                placeholder="Enter Admin ID"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "#1a1f3a",
                  border: error ? "2px solid #ef4444" : "2px solid #2d3748",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#1f2542";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? "#ef4444" : "#2d3748";
                  e.target.style.background = "#1a1f3a";
                }}
              />
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#e2e8f0",
                  marginBottom: "8px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                name="admin_login_password"
                autoComplete="off"
                placeholder="Enter Password"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "#1a1f3a",
                  border: error ? "2px solid #ef4444" : "2px solid #2d3748",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#1f2542";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? "#ef4444" : "#2d3748";
                  e.target.style.background = "#1a1f3a";
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid #ef4444",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "14px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "109%",
                padding: "15px",
                background: loading
                  ? "#4a5568"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "50px",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading
                  ? "none"
                  : "0 4px 15px rgba(102, 126, 234, 0.4)",
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                }
              }}
            >
              {loading ? "Verifying..." : "Login as Admin"}
            </button>
          </form>
        </div>
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

export default AdminLogin;
