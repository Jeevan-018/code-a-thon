import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = window.location.hostname === "localhost" ? "http://localhost:5000" : (process.env.REACT_APP_API_URL || "https://code-a-thon.onrender.com");

function AdminExamManager() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!!id);
  const [examData, setExamData] = useState({
    title: "",
    description: "",
    sections: [],
    isActive: false,
  });

  const [activeSectionTab, setActiveSectionTab] = useState(0);

  const fetchExams = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/exams`);
      setExams(res.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExamById = React.useCallback(async (examId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/exams/${examId}`);
      setExamData(res.data);
      setIsEditing(true);
    } catch (err) {
      console.error("Error fetching exam:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    if (id) {
      fetchExamById(id);
    }
  }, [id, fetchExams, fetchExamById]);

  const handleSaveExam = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (id) {
        await axios.put(`${API_BASE}/api/admin/exams/${id}`, examData);
      } else {
        await axios.post(`${API_BASE}/api/admin/exams`, examData);
      }
      navigate("/admin/exams");
      setIsEditing(false);
      setExamData({ title: "", description: "", sections: [], isActive: false });
      fetchExams();
    } catch (err) {
      console.error("Error saving exam:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || "Unknown error";
      const errorStack = err.response?.data?.stack ? JSON.stringify(err.response.data.stack, null, 2) : "";
      alert(`Failed to save exam: ${errorMessage}\n${errorStack}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = () => {
    const sectionIds = ["A", "B", "C", "D", "E"];
    const nextId = sectionIds[examData.sections.length] || `S${examData.sections.length + 1}`;
    const newSection = {
      id: nextId,
      name: `Section ${nextId}`,
      duration: 30 * 60, // 30 mins default
      description: "",
      questions: [],
    };
    setExamData({ ...examData, sections: [...examData.sections, newSection] });
    setActiveSectionTab(examData.sections.length);
  };

  const handleRemoveSection = (index) => {
    const updatedSections = examData.sections.filter((_, i) => i !== index);
    setExamData({ ...examData, sections: updatedSections });
    if (activeSectionTab >= updatedSections.length) {
      setActiveSectionTab(Math.max(0, updatedSections.length - 1));
    }
  };

  const handleUpdateSection = (index, field, value) => {
    const updatedSections = [...examData.sections];
    updatedSections[index] = { ...updatedSections[index], [field]: value };
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleAddQuestion = (sectionIndex, type) => {
    const section = examData.sections[sectionIndex];
    const newQuestion = {
      id: `q${section.questions.length + 1}`,
      type: type,
      marks: type === "MCQ" ? 1 : 5,
      ...(type === "MCQ"
        ? { text: "", choices: ["", "", "", ""], answer: 0 }
        : {
          title: "",
          problemStatement: "",
          sampleInput: "",
          expectedOutput: "",
          supportedLanguages: ["Python", "Java", "C", "C++"],
          testCases: [{ input: "", expectedOutput: "", isVisible: true }],
        }),
    };
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex].questions.push(newQuestion);
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleRemoveQuestion = (sectionIndex, questionIndex) => {
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex].questions = updatedSections[sectionIndex].questions.filter(
      (_, i) => i !== questionIndex
    );
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleUpdateQuestion = (sectionIndex, questionIndex, field, value) => {
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      questions: updatedSections[sectionIndex].questions.map((q, i) =>
        i === questionIndex ? { ...q, [field]: value } : q
      )
    };
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleUpdateChoice = (sectionIndex, questionIndex, choiceIndex, value) => {
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      questions: updatedSections[sectionIndex].questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            choices: q.choices.map((c, ci) => ci === choiceIndex ? value : c)
          }
          : q
      )
    };
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleAddTestCase = (sectionIndex, questionIndex) => {
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex].questions[questionIndex].testCases.push({
      input: "",
      expectedOutput: "",
      isVisible: true,
    });
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleRemoveTestCase = (sectionIndex, questionIndex, testCaseIndex) => {
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex].questions[questionIndex].testCases = updatedSections[
      sectionIndex
    ].questions[questionIndex].testCases.filter((_, i) => i !== testCaseIndex);
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleUpdateTestCase = (sectionIndex, questionIndex, testCaseIndex, field, value) => {
    const updatedSections = [...examData.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      questions: updatedSections[sectionIndex].questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            testCases: q.testCases.map((tc, tci) => tci === testCaseIndex ? { ...tc, [field]: value } : tc)
          }
          : q
      )
    };
    setExamData({ ...examData, sections: updatedSections });
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/exams/${examId}`);
      fetchExams();
    } catch (err) {
      console.error("Error deleting exam:", err);
    }
  };

  const handleSetActive = async (examId) => {
    try {
      const exam = exams.find((e) => e._id === examId);
      await axios.put(`${API_BASE}/api/admin/exams/${examId}`, { ...exam, isActive: true });
      fetchExams();
    } catch (err) {
      console.error("Error setting active exam:", err);
    }
  };

  if (loading && !exams.length) return <div style={{ color: "white", padding: 20 }}>Loading...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Exam Management</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate("/admin/results")} style={styles.secondaryButton}>
            View Results
          </button>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} style={styles.primaryButton}>
              Create New Exam
            </button>
          )}
        </div>
      </header>

      {isEditing ? (
        <div style={styles.editorContainer}>
          <form onSubmit={handleSaveExam}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Exam Title</label>
              <input
                type="text"
                value={examData.title}
                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                placeholder="e.g. Internal Assessment 2024"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={examData.description}
                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                placeholder="Brief description of the exam"
                style={styles.textarea}
              />
            </div>

            <div style={{ marginBottom: "24px", padding: "12px", background: "rgba(102, 126, 234, 0.1)", borderRadius: "8px", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
              <span style={{ color: "#667eea", fontWeight: "600" }}>Total Exam Duration: </span>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {Math.round(examData.sections.reduce((acc, s) => acc + (s.duration || 0), 0) / 60)} mins
              </span>
            </div>

            <div style={styles.sectionManager}>
              <div style={styles.sectionHeader}>
                <h3>Sections</h3>
                <button type="button" onClick={handleAddSection} style={styles.addButton}>
                  + Add Section
                </button>
              </div>

              {examData.sections.length > 0 && (
                <div style={styles.tabs}>
                  {examData.sections.map((sec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSectionTab(idx)}
                      style={{
                        ...styles.tab,
                        ...(activeSectionTab === idx ? styles.activeTab : {}),
                      }}
                    >
                      Section {sec.id}
                    </button>
                  ))}
                </div>
              )}

              {examData.sections[activeSectionTab] && (
                <div style={styles.sectionContent}>
                  <div style={styles.row}>
                    <div style={styles.col}>
                      <label style={styles.label}>Section Name</label>
                      <input
                        type="text"
                        value={examData.sections[activeSectionTab].name}
                        onChange={(e) => handleUpdateSection(activeSectionTab, "name", e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.col}>
                      <label style={styles.label}>Duration (mins)</label>
                      <input
                        type="number"
                        value={examData.sections[activeSectionTab].duration / 60}
                        onChange={(e) =>
                          handleUpdateSection(activeSectionTab, "duration", e.target.value * 60)
                        }
                        style={styles.input}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(activeSectionTab)}
                      style={styles.removeButton}
                    >
                      Delete Section
                    </button>
                  </div>

                  <div style={styles.questionList}>
                    <div style={styles.questionHeader}>
                      <h4>Questions</h4>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(activeSectionTab, "MCQ")}
                          style={styles.smallAddButton}
                        >
                          + MCQ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(activeSectionTab, "CODING")}
                          style={styles.smallAddButton}
                        >
                          + Coding
                        </button>
                      </div>
                    </div>

                    {examData.sections[activeSectionTab].questions.map((q, qIdx) => (
                      <div key={qIdx} style={styles.questionCard}>
                        <div style={styles.row}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <strong>Q{qIdx + 1} ({q.type})</strong>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span style={{ fontSize: "12px", color: "#8b92b0" }}>Marks:</span>
                              <input
                                type="number"
                                value={q.marks}
                                onChange={(e) => handleUpdateQuestion(activeSectionTab, qIdx, "marks", parseInt(e.target.value) || 0)}
                                style={{ ...styles.smallInput, width: "50px", padding: "4px" }}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(activeSectionTab, qIdx)}
                            style={styles.iconButton}
                          >
                            🗑️
                          </button>
                        </div>

                        {q.type === "MCQ" ? (
                          <>
                            <textarea
                              value={q.text}
                              onChange={(e) => handleUpdateQuestion(activeSectionTab, qIdx, "text", e.target.value)}
                              placeholder="Question text"
                              style={styles.smallTextarea}
                            />
                            <div style={styles.mcqGrid}>
                              {q.choices.map((choice, cIdx) => (
                                <div key={cIdx} style={styles.choiceRow}>
                                  <input
                                    type="radio"
                                    checked={q.answer === cIdx}
                                    onChange={() => handleUpdateQuestion(activeSectionTab, qIdx, "answer", cIdx)}
                                  />
                                  <input
                                    type="text"
                                    value={choice}
                                    onChange={(e) => handleUpdateChoice(activeSectionTab, qIdx, cIdx, e.target.value)}
                                    placeholder={`Choice ${cIdx + 1}`}
                                    style={styles.smallInput}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={q.title}
                              onChange={(e) => handleUpdateQuestion(activeSectionTab, qIdx, "title", e.target.value)}
                              placeholder="Question Title (e.g. Reverse a String)"
                              style={{ ...styles.input, marginBottom: "16px" }}
                            />
                            <textarea
                              value={q.problemStatement}
                              onChange={(e) => handleUpdateQuestion(activeSectionTab, qIdx, "problemStatement", e.target.value)}
                              placeholder="Problem Statement"
                              style={styles.smallTextarea}
                            />
                            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                              <div style={{ flex: 1 }}>
                                <label style={styles.label}>Sample Input (Optional)</label>
                                <input
                                  type="text"
                                  value={q.sampleInput}
                                  onChange={(e) => handleUpdateQuestion(activeSectionTab, qIdx, "sampleInput", e.target.value)}
                                  placeholder="e.g. [1, 2, 3]"
                                  style={styles.smallInput}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={styles.label}>Expected Output (Optional)</label>
                                <input
                                  type="text"
                                  value={q.expectedOutput}
                                  onChange={(e) => handleUpdateQuestion(activeSectionTab, qIdx, "expectedOutput", e.target.value)}
                                  placeholder="e.g. [3, 2, 1]"
                                  style={styles.smallInput}
                                />
                              </div>
                            </div>
                            <div style={styles.testCaseManager}>
                              <h5>Test Cases</h5>
                              {q.testCases.map((tc, tcIdx) => (
                                <div key={tcIdx} style={styles.testCaseRow}>
                                  <input
                                    type="text"
                                    value={tc.input}
                                    onChange={(e) => handleUpdateTestCase(activeSectionTab, qIdx, tcIdx, "input", e.target.value)}
                                    placeholder="Input"
                                    style={styles.tinyInput}
                                  />
                                  <input
                                    type="text"
                                    value={tc.expectedOutput}
                                    onChange={(e) => handleUpdateTestCase(activeSectionTab, qIdx, tcIdx, "expectedOutput", e.target.value)}
                                    placeholder="Expected Output"
                                    style={styles.tinyInput}
                                  />
                                  <label style={{ color: "white", fontSize: 12 }}>
                                    <input
                                      type="checkbox"
                                      checked={tc.isVisible}
                                      onChange={(e) => handleUpdateTestCase(activeSectionTab, qIdx, tcIdx, "isVisible", e.target.checked)}
                                    /> Visible
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTestCase(activeSectionTab, qIdx, tcIdx)}
                                    style={styles.tinyRemoveButton}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleAddTestCase(activeSectionTab, qIdx)}
                                style={styles.tinyAddButton}
                              >
                                + Add Test Case
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.footer}>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  navigate("/admin/exams");
                }}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
              <button type="submit" style={styles.primaryButton}>
                Save Exam
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={styles.listContainer}>
          {exams.length === 0 ? (
            <p style={{ color: "#8b92b0" }}>No exams created yet.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created At</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam._id} style={styles.tr}>
                    <td style={styles.td}>{exam.title}</td>
                    <td style={styles.td}>
                      {exam.isActive ? (
                        <span style={styles.activeBadge}>Active</span>
                      ) : (
                        <span style={styles.inactiveBadge}>Inactive</span>
                      )}
                    </td>
                    <td style={styles.td}>{new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      {!exam.isActive && (
                        <button onClick={() => handleSetActive(exam._id)} style={styles.actionButton}>
                          Set Active
                        </button>
                      )}
                      <button onClick={() => navigate(`/admin/exams/${exam._id}`)} style={styles.actionButton}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam._id)}
                        style={{ ...styles.actionButton, color: "#ef4444" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    background: "#0a0e27",
    minHeight: "100vh",
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
  },
  headerButtons: {
    display: "flex",
    gap: "12px",
  },
  primaryButton: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "transparent",
    border: "1px solid #2d3748",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
  editorContainer: {
    background: "#1a1f3a",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  formGroup: {
    marginBottom: "24px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    color: "#8b92b0",
  },
  input: {
    width: "100%",
    padding: "12px",
    background: "#0a0e27",
    border: "1px solid #2d3748",
    borderRadius: "8px",
    color: "white",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    background: "#0a0e27",
    border: "1px solid #2d3748",
    borderRadius: "8px",
    color: "white",
    fontSize: "16px",
    minHeight: "80px",
  },
  sectionManager: {
    marginTop: "40px",
    borderTop: "1px solid #2d3748",
    paddingTop: "24px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  addButton: {
    background: "#48bb78",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
  },
  tab: {
    padding: "10px 20px",
    background: "#0a0e27",
    border: "1px solid #2d3748",
    color: "#8b92b0",
    borderRadius: "8px 8px 0 0",
    cursor: "pointer",
  },
  activeTab: {
    background: "#667eea",
    color: "white",
    borderColor: "#667eea",
  },
  sectionContent: {
    background: "#0a0e27",
    padding: "24px",
    borderRadius: "8px",
  },
  row: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
  },
  removeButton: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  questionList: {
    marginTop: "32px",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  smallAddButton: {
    background: "#667eea",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    marginLeft: "8px",
    cursor: "pointer",
    fontSize: "12px",
  },
  questionCard: {
    background: "#1a1f3a",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "16px",
    border: "1px solid #2d3748",
  },
  smallTextarea: {
    width: "100%",
    padding: "10px",
    background: "#0a0e27",
    border: "1px solid #2d3748",
    borderRadius: "6px",
    color: "white",
    marginBottom: "16px",
  },
  mcqGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  choiceRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  smallInput: {
    flex: 1,
    padding: "8px",
    background: "#0a0e27",
    border: "1px solid #2d3748",
    borderRadius: "4px",
    color: "white",
  },
  iconButton: {
    background: "transparent",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  },
  testCaseManager: {
    marginTop: "16px",
    borderTop: "1px solid #2d3748",
    paddingTop: "12px",
  },
  testCaseRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "8px",
  },
  tinyInput: {
    flex: 1,
    padding: "6px",
    background: "#0a0e27",
    border: "1px solid #2d3748",
    borderRadius: "4px",
    color: "white",
    fontSize: "12px",
  },
  tinyRemoveButton: {
    background: "#ef4444",
    color: "white",
    border: "none",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tinyAddButton: {
    background: "#48bb78",
    color: "white",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    cursor: "pointer",
  },
  footer: {
    marginTop: "40px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  listContainer: {
    background: "#1a1f3a",
    borderRadius: "16px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "20px",
    background: "#2d3748",
    color: "#8b92b0",
    fontWeight: "600",
    fontSize: "14px",
  },
  td: {
    padding: "20px",
    borderBottom: "1px solid #2d3748",
  },
  tr: {
    "&:hover": {
      background: "#1f2542",
    },
  },
  activeBadge: {
    background: "rgba(72, 187, 120, 0.2)",
    color: "#48bb78",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  inactiveBadge: {
    background: "rgba(148, 163, 184, 0.2)",
    color: "#94a3b8",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  actionButton: {
    background: "transparent",
    border: "none",
    color: "#667eea",
    marginRight: "16px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default AdminExamManager;
