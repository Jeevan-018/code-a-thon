import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ALLOW_FINAL_FLAG,
  ALLOW_SECTIONS_FLAG,
  setNavigationFlag,
} from "../utils/navigationFlags";

// SECTION_CONFIG is now fetched dynamically from MongoDB

const DEFAULT_SECTION = "A";

const getSectionFromSearch = (search) => {
  try {
    const params = new URLSearchParams(search);
    const requested = params.get("section")?.toUpperCase();
    return requested || DEFAULT_SECTION;
  } catch {
    return DEFAULT_SECTION;
  }
};

const getSectionStartTime = (id) => {
  const saved = localStorage.getItem(`section_${id}_start`);
  return saved ? parseInt(saved) : null;
};

function Exam() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSectionRef = useRef(getSectionFromSearch(location.search));
  const [section, setSection] = useState(initialSectionRef.current);

  const [allTimers, setAllTimers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("exam_answers");
    return saved ? JSON.parse(saved) : {};
  });

  // Auto-save answers
  useEffect(() => {
    localStorage.setItem("exam_answers", JSON.stringify(answers));
  }, [answers]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // MCQ index
  const [currentCodeIndex, setCurrentCodeIndex] = useState(0);
  const [code, setCode] = useState(() => {
    return localStorage.getItem("exam_code") || "";
  });

  // Auto-save code
  useEffect(() => {
    localStorage.setItem("exam_code", code);
  }, [code]);

  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState(null);
  const testCasePanelRef = useRef(null);
  const [language, setLanguage] = useState("Python");
  const [theme] = useState("vs-dark");
  const [dqMessage, setDqMessage] = useState("");
  const [isDisqualified, setIsDisqualified] = useState(false);
  const disqualifiedRef = useRef(false);
  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem("exam_reviews");
    return saved ? JSON.parse(saved) : {};
  });

  // Auto-save reviews
  useEffect(() => {
    localStorage.setItem("exam_reviews", JSON.stringify(reviews));
  }, [reviews]);

  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const warningCountRef = useRef(0);
  const handleNextSectionRef = useRef(null);
  const API_BASE = window.location.hostname === "localhost" ? "http://localhost:5000" : (process.env.REACT_APP_API_URL || "https://code-a-thon.onrender.com");

  const [, setExam] = useState(null);
  const [sectionsConfig, setSectionsConfig] = useState({});

  // ===============================
  // Fetch active exam and sections
  // ===============================
  useEffect(() => {
    const fetchActiveExam = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exam/active`);
        if (res.ok) {
          const data = await res.json();
          setExam(data);

          const config = {};
          data.sections.forEach(s => {
            config[s.id] = { duration: s.duration, questions: s.questions };
          });
          setSectionsConfig(config);

          const requestedSection = getSectionFromSearch(location.search);
          if (config[requestedSection]) {
            setQuestions(config[requestedSection].questions);
          }
        }
      } catch (err) {
        console.error("Failed to fetch active exam:", err);
      }
    };
    fetchActiveExam();
  }, [API_BASE, location.search]);

  // Real-time universal timer (Per-Section Ticking)
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

  // Handle auto-skip when current section expires
  const currentSectionTimer = allTimers[section];
  useEffect(() => {
    if (currentSectionTimer === 0 && Object.keys(sectionsConfig).length > 0) {
      console.log(`Section ${section} expired. Auto-navigating...`);
      if (handleNextSectionRef.current) {
        handleNextSectionRef.current();
      }
    }
  }, [currentSectionTimer, section, sectionsConfig]);

  // Timer is initiated only via handleSectionClick in SectionSelection.jsx 
  // or transitionToSection during sequential navigation.

  useEffect(() => {
    const requestedSection = getSectionFromSearch(location.search);
    if (sectionsConfig[requestedSection]) {
      setSection((prevSection) => {
        if (prevSection === requestedSection) {
          return prevSection;
        }
        setQuestions(sectionsConfig[requestedSection].questions);
        setCurrentCodeIndex(0);
        setCode("");
        setOutput("");
        setTestResults(null);
        setCurrentQuestionIndex(0);
        return requestedSection;
      });
    }
  }, [location.search, sectionsConfig]);

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
      const currentSectionData = sectionsConfig[sectionId];
      if (!currentSectionData || sectionId === "C") return 0;

      const sectionQuestions = currentSectionData.questions || [];
      const sectionAnswers = answers[sectionId] || {};
      let score = 0;
      for (let i = 0; i < sectionQuestions.length; i += 1) {
        const q = sectionQuestions[i];
        if (sectionAnswers[q.id] === q.answer) {
          score += (q.marks || 1);
        }
      }
      return score;
    },
    [sectionsConfig, answers]
  );

  // Helper: submit data for a specific section to MongoDB
  const submitSectionData = useCallback(
    async (sectionId, customPayload = {}) => {
      const candidateId = localStorage.getItem("candidate_id") || "anonymous";
      const disqualified = localStorage.getItem("disqualified") === "true";

      let payload = {
        candidateId,
        section: sectionId,
        disqualified,
        warningCount: warningCountRef.current,
        answers: customPayload.answers || answers[sectionId] || {},
        reviews: customPayload.reviews || reviews[sectionId] || {},
        code: customPayload.code || "",
        language: customPayload.language || language,
        score: customPayload.score !== undefined ? customPayload.score : (sectionId === "C" ? 0 : calculateSectionScore(sectionId)),
        output: customPayload.output || "",
      };

      if (sectionId === "C" && customPayload.score === undefined) {
        const sectionCAnswers = payload.answers || {};
        const sectionCQuestions = sectionsConfig["C"]?.questions || [];
        let totalScoreC = 0;
        sectionCQuestions.forEach((q) => {
          const qAns = sectionCAnswers[q.id];
          if (qAns && qAns.testResults) {
            // Count passed test cases for this question
            totalScoreC += qAns.testResults.filter(r => r.passed).length;
          }
        });
        payload.score = totalScoreC;
      }

      try {
        const res = await fetch(`${API_BASE}/api/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) console.error(`❌ Failed to save section ${sectionId} data.`);
      } catch (err) {
        console.error(`⚠️ Error saving section ${sectionId} data:`, err);
      }
    },
    [answers, reviews, language, API_BASE, calculateSectionScore, sectionsConfig]
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
    [navigate, setDqMessage, setIsDisqualified]
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
        submitSectionData(section);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("🚫 Disqualified! You switched tabs or minimized the window too many times.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      const isZoomKey = (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_" || e.key === "0");
      const isBrowserZoom = (e.ctrlKey || e.metaKey) && isZoomKey;

      if (!isBrowserZoom && (e.metaKey || e.altKey || e.key === "F12" || (e.ctrlKey && e.key === "r"))) {
        e.preventDefault();
        handleViolation("⚠️ Shortcut keys are disabled during the test.");
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [
    disqualifyCandidate,
    section,
    submitSectionData,
    setShowWarning,
    setWarningCount,
  ]);

  // No-op for sectionTimers sync
  useEffect(() => {
    // Left empty to avoid breaking dependencies elsewhere if any
  }, []);

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
    if (s === null || s === undefined) return "--:--";
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

  // Handle Review
  const handleReviewChange = (qid, text) => {
    setReviews((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [qid]: text },
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
    if (!sectionsConfig[nextSection]) return false;

    // Start timer for next section if not already started
    let startTime = getSectionStartTime(nextSection);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(`section_${nextSection}_start`, startTime.toString());
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, sectionsConfig[nextSection].duration - elapsed);

    if (remaining <= 0) {
      return false;
    }

    setSection(nextSection);
    setQuestions(sectionsConfig[nextSection].questions);
    setCurrentCodeIndex(0);
    setCode("");
    setOutput("");
    setTestResults(null);
    setCurrentQuestionIndex(0);

    // Sync URL
    navigate(`?section=${nextSection}`, { replace: true });
    return true;
  }, [sectionsConfig, navigate]);

  const handlePreviousSection = useCallback(() => {
    if (section === "B") {
      submitSectionData("B");
      if (!transitionToSection("A")) alert("Section A has expired.");
    } else if (section === "C") {
      submitSectionData("C");
      if (!transitionToSection("B")) alert("Section B has expired.");
    }
  }, [section, submitSectionData, transitionToSection]);

  const handleNextSection = useCallback(() => {
    if (section === "A") {
      submitSectionData("A");
      markSectionCompleted("A");
      if (!transitionToSection("B")) {
        if (!transitionToSection("C")) {
          navigate("/sections");
        }
      }
    } else if (section === "B") {
      submitSectionData("B");
      markSectionCompleted("B");
      if (!transitionToSection("C")) {
        navigate("/sections");
      }
    } else if (section === "C") {
      // Capture current state for the question
      const currentQ = questions[currentCodeIndex];
      const isPassed = testResults ? testResults.every((r) => r.passed) : false; // Naive check

      const currentAnswerData = {
        code,
        language,
        testResults,
        passed: isPassed,
        timestamp: new Date().toISOString()
      };

      // Calculate updated answers locally
      const updatedSectionC = {
        ...(answers.C || {}),
        [currentQ.id]: currentAnswerData
      };

      // Update React state
      setAnswers((prev) => ({
        ...prev,
        C: updatedSectionC
      }));

      if (currentCodeIndex < questions.length - 1) {
        setCurrentCodeIndex((idx) => idx + 1);

        // Check if we have a saved answer for the next question to restore?
        // For now, we clear it as per original design.
        setCode("");
        setOutput("");
        setTestResults(null);
      } else {
        markSectionCompleted("C");
        setTestResults(null);

        // Submit using the explicitly updated object to ensure the last question is included
        let finalSectionCScore = 0;
        questions.forEach(q => {
          const qAns = updatedSectionC[q.id];
          if (qAns && qAns.testResults) {
            finalSectionCScore += qAns.testResults.filter(r => r.passed).length;
          }
        });

        submitSectionData("C", {
          answers: updatedSectionC,
          score: finalSectionCScore
        }).finally(() => {
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
    questions,
    navigate,
    answers,
    code,
    language,
    testResults
  ]);

  useEffect(() => {
    handleNextSectionRef.current = handleNextSection;
  }, [handleNextSection]);

  // ===============================
  // Simulated code execution
  // ===============================
  // ===============================
  // REAL CODE EXECUTION (Piston API)
  // ===============================
  const [isRunning, setIsRunning] = useState(false);

  const runPistonTest = async (sourceCode, lang, stdinInput) => {
    // Basic mapping for Piston API
    const langMap = {
      Python: "python",
      Java: "java",
      C: "c",
      "C++": "c++",
    };

    // Default to python if unknown or "Python"
    const language = langMap[lang] || "python";
    const version = language === "python" ? "3.10.0" : "*";

    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language,
          version: version,
          files: [{ content: sourceCode }],
          stdin: stdinInput,
        }),
      });
      const data = await response.json();
      // Piston returns { run: { stdout: "...", stderr: "...", ... } }
      // We rely on stdout for checking correctness
      if (data.run) {
        return {
          output: data.run.stdout ? data.run.stdout.trim() : "",
          error: data.run.stderr ? data.run.stderr.trim() : null,
        };
      }
      return { output: "", error: "No output returned" };
    } catch (err) {
      console.error("Piston API Error:", err);
      return { output: "", error: "Execution failed (Network/API)" };
    }
  };

  const handleRunCode = async () => {
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

    setIsRunning(true);
    setOutput("⏳ Running code against test cases...");
    setTestResults(null); // clear previous results

    try {
      const results = [];
      let allPassed = true;

      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        const { output: actualOutput, error } = await runPistonTest(
          code,
          language,
          testCase.input
        );

        // Simple string comparison (trim logic already applied)
        // If there's a stderr, we mark passed=false (unless expected output matches error? unlikely)
        const passed = !error && actualOutput === testCase.expectedOutput;

        if (!passed) allPassed = false;

        results.push({
          id: i + 1,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: error ? `Error: ${error}` : actualOutput,
          passed,
        });
      }

      setTestResults(results);

      const passedCount = results.filter((r) => r.passed).length;
      if (allPassed) {
        setOutput("✅ All test cases passed!");
      } else {
        setOutput(`⚠️ ${passedCount}/${results.length} test cases passed.`);
      }

      // 🚀 AUTO-SAVE TO DB (Every run)
      // We must calculate the full Section C state to avoid overwriting previous question results
      const currentAnswerData = {
        code: code,
        language: language,
        testResults: results,
        passed: allPassed,
        timestamp: new Date().toISOString()
      };

      const updatedSectionC = {
        ...(answers.C || {}),
        [currentCode.id]: currentAnswerData
      };

      // Update state
      setAnswers(prev => ({
        ...prev,
        C: updatedSectionC
      }));

      // Calculate new total score for Section C
      let totalScoreC = 0;
      questions.forEach(q => {
        const qAns = updatedSectionC[q.id];
        if (qAns && qAns.testResults) {
          totalScoreC += qAns.testResults.filter(r => r.passed).length;
        }
      });

      submitSectionData("C", {
        questionId: currentCode.id,
        code: code,
        language: language,
        answers: updatedSectionC, // Send the FULL updated object
        score: totalScoreC,
        output: results.map(r => `Task ${r.id}: ${r.passed ? 'PASS' : 'FAIL'}`).join('\n')
      });
    } catch (e) {
      console.error(e);
      setOutput("❌ Error running tests. Check console or internet connection.");
    } finally {
      setIsRunning(false);
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
              <p>Time Left: {formatTime(allTimers[section])}</p>

              {currentMCQ && (
                <div className="question-card" key={currentMCQ.id}>
                  <p className="question-text">
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

                  <div style={{ marginTop: "20px" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#8b92b0", fontSize: "14px" }}>
                      Any doubts or comments about this question? (Optional)
                    </label>
                    <textarea
                      value={reviews[section]?.[currentMCQ.id] || ""}
                      onChange={(e) => handleReviewChange(currentMCQ.id, e.target.value)}
                      placeholder="Write your review here..."
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#1a1f3a",
                        border: "1px solid #2d3748",
                        borderRadius: "8px",
                        color: "white",
                        minHeight: "60px",
                        fontSize: "14px",
                        resize: "vertical"
                      }}
                    />
                  </div>

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
                  gap: "12px",
                }}
              >
                {(section === "B" || section === "C") && (
                  <button
                    onClick={handlePreviousSection}
                    style={{ background: "#334155" }}
                  >
                    Previous Section
                  </button>
                )}
                <button onClick={handleNextSection}>Next Section</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="coding-shell">
            <header className="coding-topbar" style={{ gap: "24px" }}>
              {/* Left Side: Branding (Aligns with Problem Panel) */}
              <div className="coding-brand" style={{ flex: 1 }}>
                <span className="brand-pill">Code-A-Thon</span>
                <div className="challenge-meta">
                  <p className="challenge-label">Coding Assessment</p>
                  <h3>{currentCode.title || "Logic Challenge"}</h3>
                </div>
              </div>

              {/* Right Side: Controls (Aligns with Editor Panel) */}
              <div className="coding-controls" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  {/* Language Switcher (Green Box) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#cbd5e1" }}>Language</span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{ margin: 0 }}
                    >
                      <option>Python</option>
                      <option>C</option>
                      <option>C++</option>
                      <option>Java</option>
                    </select>
                  </div>

                  {/* Timer Display */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#f8fafc",
                    background: "rgba(239, 68, 68, 0.1)",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(239, 68, 68, 0.2)"
                  }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Time Left:</span>
                    <span style={{ fontSize: "16px", fontWeight: "700", color: "#ef4444", fontFamily: "monospace" }}>{formatTime(allTimers[section])}</span>
                  </div>
                </div>

                {/* Question Progress (Far Right) */}
                <div className="question-progress">
                  Question {currentCodeIndex + 1} / {questions.length}
                </div>
              </div>
            </header>

            <div className="coding-body">
              <section className="problem-panel">
                <div className="problem-card">
                  <h4>Problem Statement</h4>
                  <p className="problem-desc">{currentCode.problemStatement}</p>
                  <div className="io-block">
                    <div>
                      <span>Sample Input</span>
                      <pre>{currentCode.sampleInput || (currentCode.testCases?.[0]?.isVisible ? currentCode.testCases[0].input : "-")}</pre>
                    </div>
                    <div>
                      <span>Expected Output</span>
                      <pre>{currentCode.expectedOutput || (currentCode.testCases?.[0]?.isVisible ? currentCode.testCases[0].expectedOutput : "-")}</pre>
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

              <section className="editor-panel" style={{ overflowY: "auto", paddingRight: "8px" }}>
                <div style={{ minHeight: "400px", border: "1px solid #334155", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                  <Editor
                    height="100%"
                    language={language.toLowerCase()}
                    theme={theme}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    onMount={(editor, monaco) => {
                      // Intercept and disable copy, cut, and paste keybindings
                      // Includes standard (Ctrl/Cmd + C/X/V) and secondary (Insert/Delete) shortcuts
                      editor.addAction({
                        id: "disable-copy",
                        label: "Copy disabled",
                        keybindings: [
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Insert,
                        ],
                        run: () => null,
                      });
                      editor.addAction({
                        id: "disable-cut",
                        label: "Cut disabled",
                        keybindings: [
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX,
                          monaco.KeyMod.Shift | monaco.KeyCode.Delete,
                        ],
                        run: () => null,
                      });
                      editor.addAction({
                        id: "disable-paste",
                        label: "Paste disabled",
                        keybindings: [
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
                          monaco.KeyMod.Shift | monaco.KeyCode.Insert,
                        ],
                        run: () => null,
                      });
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      contextmenu: false, // Disable right-click context menu
                      dragAndDrop: false, // Disable drag and drop of text
                      links: false,
                      mouseWheelZoom: true, // Allow zooming with Ctrl + Scroll
                    }}
                  />
                </div>

                <div className="editor-actions">
                  <button
                    type="button"
                    className="run-btn"
                    onClick={handleRunCode}
                    disabled={isRunning}
                    style={{ opacity: isRunning ? 0.7 : 1, cursor: isRunning ? "wait" : "pointer" }}
                  >
                    {isRunning ? "Running..." : "Run Code"}
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
                          ? `${testResults.filter((tc) => tc.passed).length}/${testResults.length
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
              <div style={{ display: "flex", gap: "12px" }}>
                {(section === "B" || section === "C") && (
                  <button
                    onClick={handlePreviousSection}
                    style={{ background: "#334155" }}
                  >
                    Previous Section
                  </button>
                )}
                <button onClick={handleNextSection}>
                  {currentCodeIndex < questions.length - 1
                    ? "Next Question"
                    : "Submit Test"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Exam;
