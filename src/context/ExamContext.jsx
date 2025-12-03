import React, { createContext, useContext, useState } from "react";

const ExamContext = createContext();

export const ExamProvider = ({ children }) => {
  const [state, setState] = useState({
    candidateId: "",
    section: "A",
    answers: {},
  });

  return (
    <ExamContext.Provider value={{ state, setState }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => useContext(ExamContext);
