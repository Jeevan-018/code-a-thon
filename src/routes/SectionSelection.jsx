import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ALLOW_EXAM_FLAG, ALLOW_FINAL_FLAG, setNavigationFlag } from "../utils/navigationFlags";

const getSectionStartTime = (id) => {
  const saved = localStorage.getItem(`section_${id}_start`);
  return saved ? parseInt(saved) : null;
};

function SectionSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [completedSections, setCompletedSections] = useState([]);
  const [dqMessage, setDqMessage] = useState("");
  const disqualifiedRef = useRef(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [sections, setSections] = useState([]);
  const [allTimers, setAllTimers] = useState({});
  const [sectionsConfig, setSectionsConfig] = useState({});
  const API_BASE = window.location.hostname === "localhost" ? "http://localhost:5000" : (process.env.REACT_APP_API_URL || "https://code-a-thon.onrender.com");

  // Ensure we always have a candidateId
  useEffect(() => {
    const candidateId = localStorage.getItem("candidate_id");
    if (!candidateId) {
      navigate("/login", { replace: true });
      return;
    }
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.pathname);
    };
    window.history.pushState(null, "", window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  // Load completed sections
  useEffect(() => {
    const candidateId = localStorage.getItem("candidate_id");
    if (!candidateId) {
      setCompletedSections([]);
      return;
    }
    const completed = JSON.parse(localStorage.getItem("completedSections") || "[]");
    setCompletedSections(completed);
  }, [location]);

  // Anti-cheating
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleCopyCutPaste = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);

    const disqualifyAndExit = (message) => {
      if (disqualifiedRef.current) return;
      disqualifiedRef.current = true;
      setDqMessage(message);
      setIsDisqualified(true);
      localStorage.setItem("disqualified", "true");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) disqualifyAndExit("🚫 Disqualified! You switched tabs or minimized the window.");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleWindowBlur = () => disqualifyAndExit("🚫 Disqualified! You switched tabs or minimized the window.");
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pagehide", handleWindowBlur);

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return;
      }
      if (e.key === "F11" || e.ctrlKey || e.metaKey || e.altKey || e.key === "F12" || (e.ctrlKey && e.key === "r")) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pagehide", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    const fetchActiveExam = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exam/active`);
        if (res.ok) {
          const exam = await res.json();
          const config = {};
          const mappedSections = exam.sections.map((s) => {
            config[s.id] = { duration: s.duration };
            return {
              id: s.id,
              name: s.name,
              questions: s.questions.length,
              duration: Math.round(s.duration / 60),
              description: s.description,
            };
          });
          setSections(mappedSections);
          setSectionsConfig(config);
        }
      } catch (err) {
        console.error("Failed to fetch active exam:", err);
      }
    };
    fetchActiveExam();
  }, [API_BASE]);

  // Universal real-time timer (Per-Section Ticking)
  useEffect(() => {
    if (Object.keys(sectionsConfig).length === 0) return;

    const tick = () => {
      const now = Date.now();
      const newTimers = {};
      Object.keys(sectionsConfig).forEach((sid) => {
        const startTime = getSectionStartTime(sid);
        if (!startTime) {
          newTimers[sid] = sectionsConfig[sid].duration;
        } else {
          const elapsed = Math.floor((now - startTime) / 1000);
          newTimers[sid] = Math.max(0, sectionsConfig[sid].duration - elapsed);
        }
      });
      setAllTimers(newTimers);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sectionsConfig]);

  const handleSectionClick = (sectionId) => {
    if (completedSections.includes(sectionId)) return;

    let startTime = getSectionStartTime(sectionId);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(`section_${sectionId}_start`, startTime.toString());
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, sectionsConfig[sectionId].duration - elapsed);

    if (remaining <= 0) {
      alert("This section has expired and is no longer accessible.");
      return;
    }

    setNavigationFlag(ALLOW_EXAM_FLAG);
    navigate(`/exam?section=${sectionId}`);
  };

  const isCompleted = (sectionId) => completedSections.includes(sectionId);
  const allCompleted = ["A", "B", "C"].every((id) => completedSections.includes(id));

  const handleFinalSubmit = () => {
    if (!allCompleted) return;
    if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => console.error(err));
    }
    setNavigationFlag(ALLOW_FINAL_FLAG);
    navigate("/final");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)", padding: "40px 20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
      {isDisqualified && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h1 style={{ fontSize: 48, fontWeight: 700, color: "#ffffff" }}>Disqualified</h1>
            <p style={{ fontSize: 24, lineHeight: 1.8, color: "#e2e8f0" }}>{dqMessage || "A violation was detected."}</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "900px", width: "100%", background: "rgba(26, 31, 58, 0.8)", backdropFilter: "blur(20px)", borderRadius: 20, padding: 40, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#ffffff", marginBottom: 8, textAlign: "center" }}>Assessment Section Details</h1>
        <p style={{ fontSize: 16, color: "#8b92b0", textAlign: "center", marginBottom: 32 }}>Select a section to begin or continue your assessment</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((section) => {
            const completed = isCompleted(section.id);
            const timeLeft = allTimers[section.id];
            const isExpired = timeLeft !== undefined && timeLeft <= 0;
            const accessDenied = completed || isExpired;

            return (
              <div
                key={section.id}
                style={{
                  border: completed ? "2px solid #48bb78" : isExpired ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12, padding: 24, background: completed ? "rgba(72, 187, 120, 0.1)" : isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", cursor: accessDenied ? "not-allowed" : "pointer", opacity: accessDenied ? 0.7 : 1,
                }}
                onClick={() => handleSectionClick(section.id)}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>{section.name}</h3>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14, color: "#8b92b0" }}>
                    <span><strong style={{ color: "#e2e8f0" }}>No. of Questions:</strong> {section.questions}</span>
                    <span><strong style={{ color: "#e2e8f0" }}>Duration:</strong> {section.duration} Mins</span>
                    {timeLeft !== undefined && (
                      <span>
                        <strong style={{ color: isExpired ? "#ef4444" : "#667eea" }}>Time Remaining:</strong>{" "}
                        {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "#8b92b0", marginTop: 8 }}>{section.description}</p>
                </div>
                <div style={{ marginLeft: 24 }}>
                  {completed ? (
                    <button style={{ padding: "10px 24px", border: "1px solid #48bb78", borderRadius: 8, background: "rgba(72, 187, 120, 0.1)", color: "#48bb78", fontSize: 14, fontWeight: 600, cursor: "not-allowed" }} disabled>Completed</button>
                  ) : isExpired ? (
                    <button style={{ padding: "10px 24px", border: "1px solid #ef4444", borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: 14, fontWeight: 600, cursor: "not-allowed" }} disabled>Expired</button>
                  ) : (
                    <button style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)" }}>Start Section</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button onClick={handleFinalSubmit} disabled={!allCompleted} style={{ padding: "14px 40px", borderRadius: 12, border: "none", background: allCompleted ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(148, 163, 184, 0.3)", color: "#ffffff", fontSize: 16, fontWeight: 600, cursor: allCompleted ? "pointer" : "not-allowed", boxShadow: allCompleted ? "0 4px 15px rgba(16, 185, 129, 0.4)" : "none", opacity: allCompleted ? 1 : 0.7 }}>
            {allCompleted ? "Submit Assessment" : "Complete All Sections to Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SectionSelection;
