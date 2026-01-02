import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ALLOW_FINAL_FLAG,
  ALLOW_SECTIONS_FLAG,
  ALLOW_EXAM_FLAG,
  consumeNavigationFlag,
} from "../utils/navigationFlags";

const SAFE_ROUTE_FLAGS = {
  "/sections": ALLOW_SECTIONS_FLAG,
  "/final": ALLOW_FINAL_FLAG,
  "/exam": ALLOW_EXAM_FLAG,
};

function NavigationBlocker() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPathRef = useRef(location.pathname);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    // Update current path reference
    currentPathRef.current = location.pathname;
    
    // Push current state to history stack
    window.history.pushState(null, "", location.pathname);
    
    // Block browser back/forward buttons
    const handlePopState = (e) => {
      // Prevent navigation
      e.preventDefault();
      // Push state again to prevent back navigation
      window.history.pushState(null, "", currentPathRef.current);
      // Replace current URL to prevent forward navigation
      window.history.replaceState(null, "", currentPathRef.current);
      
      // Show warning (non-blocking)
      console.warn("⚠️ Navigation is restricted during the assessment.");
    };

    // Block browser back/forward buttons
    window.addEventListener("popstate", handlePopState);

    // Prevent direct URL manipulation via hash
    const handleHashChange = () => {
      if (!isNavigatingRef.current) {
        window.history.replaceState(null, "", currentPathRef.current);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    // Block keyboard shortcuts for navigation
    const handleKeyDown = (e) => {
      // Block Alt+Left (back) and Alt+Right (forward)
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        e.stopPropagation();
        console.warn("⚠️ Navigation shortcuts are disabled during the assessment.");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    // Block mouse buttons (Back/Forward)
    const handleMouseUp = (e) => {
      // Button 3 is "Back", Button 4 is "Forward"
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        console.warn("⚠️ Mouse navigation buttons are disabled.");
      }
    };

    window.addEventListener("mouseup", handleMouseUp, true);

    // Monitor URL changes and prevent unauthorized navigation
    const checkUrl = () => {
      const currentUrl = window.location.pathname + window.location.search;
      const expectedUrl = currentPathRef.current + (window.location.search || "");
      
      if (currentUrl !== expectedUrl && !isNavigatingRef.current) {
        const currentPath = window.location.pathname;

        // Allow public pages explicitly
        if (
          currentPath === "/" ||
          currentPath === "/rules" ||
          currentPath === "/login" ||
          currentPath === "/admin-login" ||
          currentPath === "/admin/results"
        ) {
          currentPathRef.current = currentPath;
          return;
        }

        const flagKey = SAFE_ROUTE_FLAGS[currentPath];

        if (flagKey && consumeNavigationFlag(flagKey)) {
          currentPathRef.current = currentPath;
          isNavigatingRef.current = true;
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 150);
          return;
        }

        // URL was changed manually - redirect back immediately
        window.history.replaceState(null, "", expectedUrl);
        navigate(currentPathRef.current, { replace: true });
        console.warn("⚠️ Direct URL access is not allowed. Redirected to current page.");
      }
    };

    // Check more frequently for better protection
    const urlChecker = setInterval(checkUrl, 25);
    
    // Disable address bar editing (as much as possible)
    const handleAddressBar = (e) => {
      // Block F6 (focus address bar) and Ctrl+L (focus address bar)
      if (e.key === "F6" || (e.ctrlKey && e.key === "l")) {
        e.preventDefault();
        e.stopPropagation();
        console.warn("⚠️ Address bar access is restricted during the assessment.");
      }
    };

    document.addEventListener("keydown", handleAddressBar, true);

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("keydown", handleAddressBar, true);
      clearInterval(urlChecker);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Do NOT block navigation on public pages like Welcome and Login.
    const isPublicPage =
      location.pathname === "/" ||
      location.pathname === "/rules" ||
      location.pathname === "/login" ||
      location.pathname === "/admin-login" ||
      location.pathname === "/admin/results";
    if (isPublicPage) {
      return;
    }

    // Check if we have a valid flag for this route
    const flagKey = SAFE_ROUTE_FLAGS[location.pathname];
    if (flagKey) {
      if (!consumeNavigationFlag(flagKey)) {
        // No flag found -> Direct access or reload -> Block it
        console.warn("⚠️ Direct access blocked. Redirecting to home.");
        navigate("/", { replace: true });
        return;
      }
    }

    // Allow programmatic navigation
    isNavigatingRef.current = true;
    const timer = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, navigate]);

  return null;
}

export default NavigationBlocker;

