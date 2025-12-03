import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ALLOW_FINAL_FLAG,
  ALLOW_SECTIONS_FLAG,
  setNavigationFlag,
} from "../utils/navigationFlags";

const SECTION_CONFIG = {
  A: { duration: 30 * 60, file: "/questions/sectionA.json" },
  B: { duration: 20 * 60, file: "/questions/sectionB.json" },
  C: { duration: 60 * 60, file: "/questions/sectionC.json" },
};

const DEFAULT_SECTION = "A";

const getSectionFromSearch = (search) => {
  try {
    const params = new URLSearchParams(search);
    const requested = params.get("section")?.toUpperCase();
    return SECTION_CONFIG[requested] ? requested : DEFAULT_SECTION;
  } catch {
    return DEFAULT_SECTION;
  }
};

function Exam() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSectionRef = useRef(getSectionFromSearch(location.search));
  const [section, setSection] = useState(initialSectionRef.current);
  const [timeLeft, setTimeLeft] = useState(
    SECTION_CONFIG[initialSectionRef.current].duration
  );
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // MCQ index
  const [currentCodeIndex, setCurrentCodeIndex] = useState(0);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState(null);
  const testCasePanelRef = useRef(null);
  const [language, setLanguage] = useState("Python");
  const [dqMessage, setDqMessage] = useState("");
  const [isDisqualified, setIsDisqualified] = useState(false);
  const disqualifiedRef = useRef(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const warningCountRef = useRef(0);
  const handleNextSectionRef = useRef(null);
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const requestedSection = getSectionFromSearch(location.search);
    setSection((prevSection) => {
      if (prevSection === requestedSection) {
        return prevSection;
      }
      setTimeLeft(SECTION_CONFIG[requestedSection].duration);
      setCurrentCodeIndex(0);
      setCode("");
      setOutput("");
      setTestResults(null);
      setCurrentQuestionIndex(0);
      return requestedSection;
    });
  }, [location.search]);

  useEffect(() => {
    const candidateId = localStorage.getItem("candidate_id");
    if (!candidateId) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // 🔒 Anti-cheating restrictions

  // Helper: calculate score for the current section
  const calculateSectionScore = useCallback(
    (sectionId) => {
      if (sectionId === "C") return 0;
      if (section !== sectionId || !questions || questions.length === 0) {
        return 0;
      }

      const sectionAnswers = answers[sectionId] || {};
      let score = 0;
      for (let i = 0; i < questions.length; i += 1) {
        const q = questions[i];
        if (sectionAnswers[q.id] === q.answer) {
          score += 1;
        }
      }
      return score;
    },
    [section, questions, answers]
  );

  // Helper: submit data for a specific section to MongoDB
  const submitSectionData = useCallback(
    async (sectionId) => {
      const candidateId = localStorage.getItem("candidate_id") || "anonymous";
      const disqualified = localStorage.getItem("disqualified") === "true";

      let payload = {
        candidateId,
        section: sectionId,
        disqualified,
        warningCount: warningCountRef.current,
        answers: {},
        code: "",
        language: "",
        score: 0,
      };

      if (sectionId === "C") {
        payload = {
          ...payload,
          answers: {},
          code,
          language,
          score: 0,
        };
      } else {
        payload = {
          ...payload,
          answers: answers[sectionId] || {},
          score: calculateSectionScore(sectionId),
        };
      }

      try {
        const res = await fetch(`${API_BASE}/api/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.error(`❌ Failed to save section ${sectionId} data.`);
        }
      } catch (err) {
        console.error(`⚠️ Error saving section ${sectionId} data:`, err);
      }
    },
    [answers, code, language, API_BASE, calculateSectionScore]
  );

  const disqualifyCandidate = useCallback(
    (message) => {
      if (disqualifiedRef.current) return;
      disqualifiedRef.current = true;
      setDqMessage(message);
      setIsDisqualified(true);
      localStorage.setItem("disqualified", "true");
      setNavigationFlag(ALLOW_FINAL_FLAG);
      setTimeout(() => navigate("/final", { replace: true }), 1500);
    },
    [navigate]
  );

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleCopyCutPaste = (e) => e.preventDefault();

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);

    const handleViolation = (message) => {
      if (disqualifiedRef.current) return;

      const newCount = warningCountRef.current + 1;
      warningCountRef.current = newCount;
      setWarningCount(newCount);

      if (newCount >= 3) {
        disqualifyCandidate(message);
      } else {
        setShowWarning(true);
        // Sync warning count immediately
        submitSectionData(section);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("🚫 Disqualified! You switched tabs or minimized the window too many times.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleWindowBlur = () => {
      handleViolation("🚫 Disqualified! You switched tabs or minimized the window too many times.");
    };
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pagehide", handleWindowBlur);

    const handleKeyDown = (e) => {
      if (
        //e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.key === "F12" ||
        (e.ctrlKey && e.key === "r")
      ) {
        e.preventDefault();
        alert("⚠️ Shortcut keys are disabled during the test.");
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pagehide", handleWindowBlur);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [disqualifyCandidate, section, submitSectionData]);

  // ===============================
  // Load section questions
  // ===============================
  useEffect(() => {
    const file = SECTION_CONFIG[section]?.file;
    if (!file) return;
    setQuestions([]);
    fetch(file)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        setCurrentQuestionIndex(0);
      })
      .catch((err) => console.error("Failed to load questions:", err));
  }, [section]);

  // ===============================
  // Timer logic
  // ===============================
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          if (handleNextSectionRef.current) {
            handleNextSectionRef.current();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [section]);

  // ===============================
  // Mark section as completed (for SectionSelection screen)
  // ===============================
  const markSectionCompleted = useCallback((sectionId) => {
    const completed = JSON.parse(
      localStorage.getItem("completedSections") || "[]"
    );
    if (!completed.includes(sectionId)) {
      completed.push(sectionId);
      localStorage.setItem("completedSections", JSON.stringify(completed));
    }
  }, []);



  // Format time display
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Handle MCQ answer
  const handleSelect = (sectionKey, qid, idx) => {
    setAnswers((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [qid]: idx },
    }));
  };

  // Clear current MCQ response
  const handleClearCurrentResponse = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    const qid = currentQuestion.id;

    setAnswers((prev) => {
      const sectionAnswers = { ...(prev[section] || {}) };
      delete sectionAnswers[qid];
      return { ...prev, [section]: sectionAnswers };
    });
  };

  // Previous MCQ question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((idx) => idx - 1);
    }
  };

  // Next MCQ question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((idx) => idx + 1);
    }
  };

  // Status shape style for Session Status panel
  const getStatusShapeStyle = (isAnswered) => ({
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    clipPath: isAnswered
      ? "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" // up-facing pentagon
      : "polygon(50% 100%, 100% 62%, 82% 0%, 18% 0%, 0% 62%)", // down-facing pentagon
    backgroundColor: isAnswered ? "#22c55e" : "#ef4444",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  });

  // ===============================
  // Section navigation logic
  // ===============================
  const transitionToSection = useCallback((nextSection) => {
    if (!SECTION_CONFIG[nextSection]) return;
    setSection(nextSection);
    setTimeLeft(SECTION_CONFIG[nextSection].duration);
    setCurrentCodeIndex(0);
    setCode("");
    setOutput("");
    setTestResults(null);
    setCurrentQuestionIndex(0);
  }, []);

  const handleNextSection = useCallback(() => {
    if (section === "A") {
      submitSectionData("A");
      markSectionCompleted("A");
      transitionToSection("B");
    } else if (section === "B") {
      submitSectionData("B");
      markSectionCompleted("B");
      transitionToSection("C");
    } else if (section === "C") {
      if (currentCodeIndex < questions.length - 1) {
        setCurrentCodeIndex((idx) => idx + 1);
        setCode("");
        setOutput("");
        setTestResults(null);
      } else {
        markSectionCompleted("C");
        setTestResults(null);
        submitSectionData("C").finally(() => {
          setNavigationFlag(ALLOW_SECTIONS_FLAG);
          navigate("/sections");
        });
      }
    }
  }, [
    section,
    submitSectionData,
    markSectionCompleted,
    transitionToSection,
    currentCodeIndex,
    questions.length,
    navigate,
  ]);

  useEffect(() => {
    handleNextSectionRef.current = handleNextSection;
  }, [handleNextSection]);

  // ===============================
  // Simulated code execution
  // ===============================
  const handleRunCode = () => {
    if (code.trim() === "") {
      setOutput("⚠️ Please write some code first!");
      setTestResults(null);
      return;
    }

    const cases = currentCode.testCases || [];
    if (cases.length === 0) {
      setOutput("ℹ️ No automated test cases available for this question.");
      setTestResults(null);
      return;
    }

    const results = runMockTestCases(currentCode, code);
    setTestResults(results);
    const passedCount = results.filter((tc) => tc.passed).length;
    if (passedCount === results.length) {
      setOutput("✅ All test cases passed.");
    } else {
      setOutput(`⚠️ ${passedCount}/${results.length} test cases passed.`);
    }
  };

  const currentCode = questions[currentCodeIndex] || {};
  const questionTestCases = currentCode.testCases || [];

  useEffect(() => {
    if (testResults && testCasePanelRef.current) {
      testCasePanelRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [testResults]);

  const runMockTestCases = (question, userCode) => {
    const normalisedCode = userCode.toLowerCase();
    const evaluator = (qid) => {
      if (qid === 1) {
        return (
          normalisedCode.includes("+") ||
          normalisedCode.includes("sum") ||
          normalisedCode.includes("add")
        );
      }
      if (qid === 2) {
        return (
          normalisedCode.includes("%") &&
          (normalisedCode.includes("for") || normalisedCode.includes("while"))
        );
      }
      if (qid === 3) {
        return (
          normalisedCode.includes("reverse") ||
          normalisedCode.includes("[::-1]") ||
          normalisedCode.includes("strrev") ||
          normalisedCode.includes(".length - 1")
        );
      }
      return normalisedCode.length > 20;
    };

    const passesPattern = evaluator(question?.id);
    return (question?.testCases || []).map((tc, idx) => ({
      id: idx + 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      passed: passesPattern && userCode.trim().length > 0,
    }));
  };

  // ===============================
  // Render UI
  // ===============================
  const currentMCQ = section !== "C" ? questions[currentQuestionIndex] : null;

  return (
    <>
      {showWarning && !isDisqualified && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            color: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "500px",
              width: "100%",
              padding: "40px",
              background: "#1e293b",
              borderRadius: "12px",
              border: "1px solid #ef4444",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 32,
                fontWeight: 700,
                color: "#ef4444",
              }}
            >
              ⚠️ Warning {warningCount}/3
            </h2>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 18,
                lineHeight: 1.6,
                color: "#e2e8f0",
              }}
            >
              Tab switching or window minimization is not allowed.
              <br />
              <strong>
                You have {3 - warningCount} attempt{3 - warningCount !== 1 ? "s" : ""} remaining.
              </strong>
            </p>
            <button
              onClick={() => setShowWarning(false)}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                color: "#ffffff",
                background: "#ef4444",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#dc2626")}
              onMouseLeave={(e) => (e.target.style.background = "#ef4444")}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {isDisqualified ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgb(0, 0, 0)",
            color: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "700px",
              width: "100%",
              padding: "40px",
            }}
          >
            <h1
              style={{
                margin: "0 0 20px",
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: 1,
                color: "#ffffff",
              }}
            >
              Disqualified
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: 1.8,
                color: "#e2e8f0",
                maxWidth: "800px",
              }}
            >
              {dqMessage ||
                "A violation was detected during the assessment. This session is locked."}
            </p>
            <p
              style={{
                margin: "24px 0 0",
                fontSize: 16,
                color: "#94a3b8",
                maxWidth: "600px",
              }}
            >
              Please contact the exam administrator.
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={`exam-container${section === "C" ? " coding-mode" : ""}`}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          maxWidth: "none", // <<< ensure full width, override any CSS max-width
          margin: 0,
          padding: 0,
          overflow: "hidden",
          borderRadius: 0,
          boxShadow: "none",
          background: "transparent",
        }}
      >
        {section !== "C" ? (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
            }}
          >
            {/* Left: single question with controls */}
            <div
              style={{
                flex: 3,
                padding: "24px 32px",
                overflowY: "auto",
              }}
            >
              <h2>Section-{section}</h2>
              <p>Time Left: {formatTime(timeLeft)}</p>

              {currentMCQ && (
                <div className="question-card" key={currentMCQ.id}>
                  <p>
                    <b>{currentQuestionIndex + 1}. </b> {currentMCQ.text}
                  </p>
                  {currentMCQ.choices.map((choice, idx) => (
                    <label key={idx}>
                      <input
                        type="radio"
                        name={`sec${section}_q${currentMCQ.id}`}
                        checked={answers[section]?.[currentMCQ.id] === idx}
                        onChange={() =>
                          handleSelect(section, currentMCQ.id, idx)
                        }
                      />{" "}
                      {choice}
                    </label>
                  ))}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "30px",
                      alignItems: "center",
                    }}
                  >
                    {/* Left: Clear Response */}
                    <button
                      type="button"
                      onClick={handleClearCurrentResponse}
                      style={{
                        margin: 0,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Keep original purple
                      }}
                    >
                      Clear Response
                    </button>

                    {/* Right: Navigation Buttons */}
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        type="button"
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        style={{
                          margin: 0,
                          background: currentQuestionIndex === 0 
                            ? "#4a5568" 
                            : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", // Blue for nav
                          cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                          opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                        }}
                      >
                        Previous Question
                      </button>

                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        disabled={currentQuestionIndex === questions.length - 1}
                        style={{
                          margin: 0,
                          background: currentQuestionIndex === questions.length - 1 
                            ? "#4a5568" 
                            : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", // Blue for nav
                          cursor: currentQuestionIndex === questions.length - 1 ? "not-allowed" : "pointer",
                          opacity: currentQuestionIndex === questions.length - 1 ? 0.5 : 1,
                        }}
                      >
                        Next Question
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: session status + Next Section button inside black window */}
            <div
              style={{
                flex: 1,
                background: "#000000",
                color: "#f9fafb",
                display: "flex",
                flexDirection: "column",
                padding: "0", // Remove padding to allow header to be full width
              }}
            >
              {/* New Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "16px",
                  textAlign: "center",
                  marginBottom: "16px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "20px", color: "#ffffff" }}>
                  Code-A-Thon
                </h2>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 16px", // Add padding back for content
                }}
              >
                <h3 style={{ margin: "0 0 16px" }}>Session Status</h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 16,
                    width: "100%",
                    paddingTop: 8,
                  }}
                >
                  {questions.map((q, index) => {
                    const isAnswered =
                      answers[section] && answers[section][q.id] !== undefined;
                    return (
                      <div
                        key={q.id}
                        style={getStatusShapeStyle(isAnswered)}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        <span>{index + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "0 16px 12px 16px", // Add padding back for footer
                }}
              >
                <button onClick={handleNextSection}>Next Section</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="coding-shell">
            <header className="coding-topbar">
              <div className="coding-brand">
                <span className="brand-pill">Code-A-Thon</span>
                <div className="challenge-meta">
                  <p className="challenge-label">Coding Assessment</p>
                  <h3>{currentCode.title || "Logic Challenge"}</h3>
                </div>
              </div>
              <div className="coding-controls">
                <div className="language-switch">
                  <span>Language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option>Python</option>
                    <option>C</option>
                    <option>C++</option>
                    <option>Java</option>
                  </select>
                </div>
                <div className="question-progress">
                  Question {currentCodeIndex + 1} / {questions.length}
                </div>
              </div>
            </header>

            <div className="coding-body">
              <section className="problem-panel">
                <div className="problem-card">
                  <h4>Problem Statement</h4>
                  <p className="problem-desc">{currentCode.description}</p>
                  <div className="io-block">
                    <div>
                      <span>Sample Input</span>
                      <pre>{currentCode.sampleInput || "-"}</pre>
                    </div>
                    <div>
                      <span>Expected Output</span>
                      <pre>{currentCode.expectedOutput || "-"}</pre>
                    </div>
                  </div>
                  <ul className="problem-guidelines">
                    <li>
                      Use the selected language to implement your solution.
                    </li>
                    <li>Click “Run Code” to simulate output.</li>
                    <li>
                      Submit when you are ready or move to the next question.
                    </li>
                  </ul>
                </div>
              </section>

              <section className="editor-panel">
                <textarea
                  className="code-textarea"
                  rows="20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Write your code here"
                />
                <div className="editor-actions">
                  <button
                    type="button"
                    className="run-btn"
                    onClick={handleRunCode}
                  >
                    Run Code
                  </button>
                </div>
                <div className="output-panel">
                  <div className="output-header">
                    <span>Console Output</span>
                  </div>
                  <pre>{output || "💻 Output will appear here"}</pre>
                </div>
                {questionTestCases.length > 0 ? (
                  <div className="testcase-panel" ref={testCasePanelRef}>
                    <div className="output-header testcase-header">
                      <span>Test Cases</span>
                      <span className="testcase-summary">
                        {testResults
                          ? `${testResults.filter((tc) => tc.passed).length}/${
                              testResults.length
                            } Passed`
                          : `${questionTestCases.length} Pending`}
                      </span>
                    </div>
                    <ul className="testcase-list">
                      {questionTestCases.map((tc, idx) => {
                        const result = testResults?.find(
                          (r) => r.id === idx + 1
                        );
                        const statusClass = result
                          ? result.passed
                            ? "testcase-pass"
                            : "testcase-fail"
                          : "testcase-pending";
                        const statusLabel = result
                          ? result.passed
                            ? "Passed"
                            : "Failed"
                          : "Not Run";
                        const statusIcon = result
                          ? result.passed
                            ? "✔"
                            : "✖"
                          : "…";
                        return (
                          <li
                            key={idx}
                            className={`testcase-item ${statusClass}`}
                          >
                            <div className="testcase-status">
                              <span
                                className="testcase-icon"
                                aria-hidden="true"
                              >
                                {statusIcon}
                              </span>
                              <span>
                                Test Case {idx + 1}: {statusLabel}
                              </span>
                            </div>
                            <div className="testcase-io">
                              <span>Input:</span> {tc.input}
                            </div>
                            <div className="testcase-io">
                              <span>Expected:</span> {tc.expectedOutput}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </section>
            </div>

            <div className="coding-footer">
              <button onClick={handleNextSection}>
                {currentCodeIndex < questions.length - 1
                  ? "Next Question"
                  : "Submit Test"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Exam;
