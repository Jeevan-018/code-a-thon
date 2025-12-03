import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles.css"; // Reusing existing styles for consistency

const ResultsDashboard = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");

  const fetchResults = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/results");
      setResults(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching results:", err);
      setError("Failed to load results. Please make sure the backend is running.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredResults = results.filter((result) => {
    if (!selectedDate) return false;
    const resultDate = new Date(result.updatedAt).toLocaleDateString("en-CA"); // YYYY-MM-DD
    return resultDate === selectedDate;
  }).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  // Calculate Summary Stats
  const totalCandidates = filteredResults.length;
  const totalScoreSum = filteredResults.reduce((sum, r) => sum + (r.totalScore || 0), 0);
  const avgScore = totalCandidates > 0 ? (totalScoreSum / totalCandidates).toFixed(1) : 0;


  if (loading) return <div className="container"><h2>Loading results...</h2></div>;
  if (error) return <div className="container"><h2 className="error-text">{error}</h2></div>;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0e27", color: "#fff", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <button
        onClick={() => window.location.href = "/login"}
        style={{
          position: "absolute",
          top: "20px",
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
        Logout
      </button>
      {/* Header */}
      <header style={{ padding: "20px", background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)", textAlign: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: "0", fontSize: "2.5rem", fontWeight: "800", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>Code-A-Thon</h1>
        <p style={{ margin: "5px 0 0", opacity: 0.9 }}>Admin Dashboard</p>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <label style={{ fontSize: "1.2rem", marginRight: "1rem", color: "#a0aec0" }}>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: "10px 15px",
              borderRadius: "8px",
              border: "1px solid #4a5568",
              background: "#1a1f3a",
              color: "#fff",
              fontSize: "1rem",
              outline: "none",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {!selectedDate ? (
          <div style={{ textAlign: "center", marginTop: "4rem", opacity: 0.7 }}>
            <h2 style={{ color: "#a0aec0" }}>Please select a date to view results</h2>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Total Candidates</h3>
                <p style={cardValueStyle}>{totalCandidates}</p>
              </div>
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Average Score</h3>
                <p style={cardValueStyle}>{avgScore}</p>
              </div>
            </div>

            {/* Results Table */}
            {/* Combined Results Table with Fixed Section Columns */}
            {(() => {
              // Fixed sections as requested
              const fixedSections = ['A', 'B', 'C'];

              return (
                <div className="results-table-container" style={{ overflowX: "auto", background: "#1a1f3a", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", color: "#fff" }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#a0aec0", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "1rem" }}>Candidate ID</th>
                        <th style={{ padding: "1rem" }}>Warnings</th>
                        {fixedSections.map(section => (
                          <th key={section} style={{ padding: "1rem" }}>Section {section}</th>
                        ))}
                        <th style={{ padding: "1rem" }}>Total Score</th>
                        <th style={{ padding: "1rem" }}>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={4 + fixedSections.length} style={{ padding: "3rem", textAlign: "center", color: "#a0aec0" }}>
                            No results found for {selectedDate}.
                          </td>
                        </tr>
                      ) : (
                        filteredResults.map((result) => (
                          <tr key={result._id} style={{ background: "#2d3748", transition: "transform 0.2s" }} className="table-row">
                            <td style={cellStyleFirst}>
                  {result.candidateId}
                  {result.disqualified && (
                    <span style={{ color: "#ff4444", fontSize: "0.8rem", marginLeft: "8px", fontWeight: "bold" }}>
                      (DISQUALIFIED)
                    </span>
                  )}
                </td>
                <td style={cellStyle}>
                  <span style={{ color: result.warningCount > 0 ? "#ff4444" : "#a0aec0", fontWeight: "bold" }}>
                    {result.warningCount || 0}
                  </span>
                </td>
                            
                            {/* Fixed Section Scores */}
                            {fixedSections.map(section => (
                              <td key={section} style={cellStyle}>
                                {result.answers?.sectionScores?.[section] !== undefined 
                                  ? <span style={{ fontWeight: "bold", color: "#667eea" }}>{result.answers.sectionScores[section]}</span>
                                  : <span style={{ opacity: 0.5 }}>-</span>
                                }
                              </td>
                            ))}

                            <td style={{ ...cellStyle, fontWeight: "bold", color: "#4caf50" }}>
                              {result.totalScore}
                            </td>
                            <td style={cellStyleLast}>
                              {new Date(result.updatedAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: "20px", background: "#050714", textAlign: "center", borderTop: "1px solid #1a1f3a" }}>
        <p style={{ margin: 0, color: "#8b92b0" }}>&copy; {new Date().getFullYear()} Code-A-Thon Assessment Platform. All rights reserved.</p>
      </footer>
      
      <style>{`
        .table-row:hover {
          transform: scale(1.01);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

// Styles
const cardStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: "1.5rem",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  textAlign: "center",
};

const cardTitleStyle = {
  margin: "0 0 10px 0",
  fontSize: "1rem",
  color: "#a0aec0",
  fontWeight: "500",
};

const cardValueStyle = {
  margin: 0,
  fontSize: "2rem",
  fontWeight: "700",
  color: "#fff",
};

const cellStyle = {
  padding: "1rem",
};

const cellStyleFirst = {
  ...cellStyle,
  borderTopLeftRadius: "8px",
  borderBottomLeftRadius: "8px",
};

const cellStyleLast = {
  ...cellStyle,
  borderTopRightRadius: "8px",
  borderBottomRightRadius: "8px",
};

export default ResultsDashboard;
