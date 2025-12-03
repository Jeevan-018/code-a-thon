const hasSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const ALLOW_SECTIONS_FLAG = "allow_sections_entry";
export const ALLOW_EXAM_FLAG = "allow_exam_entry";
export const ALLOW_FINAL_FLAG = "allow_final_entry";

export const setNavigationFlag = (flag) => {
  if (!flag || !hasSessionStorage()) return;
  try {
    window.sessionStorage.setItem(flag, "true");
  } catch {
    // Ignore storage quota errors silently
  }
};

export const consumeNavigationFlag = (flag) => {
  if (!flag || !hasSessionStorage()) return false;
  try {
    // Check if flag exists but DO NOT remove it.
    // This fixes the issue where React Strict Mode (double render)
    // causes the flag to be consumed on the first render, failing the second.
    if (window.sessionStorage.getItem(flag) === "true") {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};



