import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./routes/Login";
import Welcome from "./routes/Welcome";
import SectionSelection from "./routes/SectionSelection";
import Exam from "./routes/Exam";
import Final from "./routes/Final";
import Rules from "./routes/Rules";
import AdminLogin from "./routes/AdminLogin";
import ResultsDashboard from "./routes/ResultsDashboard";
import NavigationBlocker from "./components/NavigationBlocker";
import "./styles.css";

import AdminExamManager from "./routes/AdminExamManager";

function AppContent() {
  return (
    <>
      <NavigationBlocker />
      <Routes>
        {/* 👇 Default route now shows Welcome video */}
        <Route path="/" element={<Welcome />} />

        {/* Optional login route */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Rules page */}
        <Route path="/rules" element={<Rules />} />

        {/* Section selection page */}
        <Route path="/sections" element={<SectionSelection />} />

        {/* Other exam routes */}
        <Route path="/exam" element={<Exam />} />
        <Route path="/final" element={<Final />} />

        {/* Admin Dashboard */}
        <Route path="/admin/results" element={<ResultsDashboard />} />
        <Route path="/admin/exams" element={<AdminExamManager />} />
        <Route path="/admin/exams/:id" element={<AdminExamManager />} />

        {/* Redirect any unknown routes to welcome */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  // Global text selection prevention via JavaScript
  useEffect(() => {
    // Helper function to safely get element and check if it's an input/textarea/editable
    const isEditableElement = (node) => {
      if (!node) return false;
      
      // If it's a text node, get the parent element
      const element = node.nodeType === 1 ? node : (node.parentElement || node.parentNode);
      if (!element || element.nodeType !== 1) return false;
      
      const tagName = element.tagName?.toUpperCase();
      const isInput = tagName === "INPUT" || tagName === "TEXTAREA";
      const isContentEditable = element.isContentEditable === true;
      const contentEditableAttr = element.getAttribute?.("contenteditable");
      const isContentEditableAttr = contentEditableAttr === "true" || contentEditableAttr === "";
      const role = element.getAttribute?.("role");
      const isTextbox = role === "textbox";
      
      return isInput || isContentEditable || isContentEditableAttr || isTextbox;
    };

    // Prevent text selection via mouse drag
    const preventSelection = (e) => {
      if (!isEditableElement(e.target)) {
        e.preventDefault();
        return false;
      }
    };

    // Prevent text selection on selectstart (IE/Edge)
    const handleSelectStart = (e) => {
      if (!isEditableElement(e.target)) {
        e.preventDefault();
        return false;
      }
    };

    // Clear any existing text selection
    const clearSelection = () => {
      if (window.getSelection) {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
          const anchorNode = selection.anchorNode;
          if (!isEditableElement(anchorNode)) {
            selection.removeAllRanges();
          }
        }
      }
    };

    // Track mouse state for drag selection prevention
    let mouseDown = false;
    
    const handleMouseDown = (e) => {
      if (!isEditableElement(e.target)) {
        mouseDown = true;
        if (e.detail > 1) {
          // Prevent double-click selection
          e.preventDefault();
        }
      }
    };

    const handleMouseUp = () => {
      mouseDown = false;
      clearSelection();
    };

    const handleMouseMove = (e) => {
      if (mouseDown && !isEditableElement(e.target)) {
        clearSelection();
      }
    };

    // Add event listeners
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseUp);
    document.addEventListener("dragstart", preventSelection);
    document.addEventListener("contextmenu", preventSelection);

    // Cleanup
    return () => {
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseUp);
      document.removeEventListener("dragstart", preventSelection);
      document.removeEventListener("contextmenu", preventSelection);
    };
  }, []);

  // Reset completed sections on every fresh app load (new run)
  useEffect(() => {
    localStorage.removeItem("completedSections");
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
