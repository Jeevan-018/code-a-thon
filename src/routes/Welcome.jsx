import React, { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function Welcome() {
  const videoRef = useRef(null);
  const navigate = useNavigate();

  const goToLogin = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const ensurePlay = () => {
      if (videoElement.paused) {
        videoElement.play().catch((err) => {
          console.warn("Video autoplay failed:", err);
        });
      }
    };

    const handleEnded = () => goToLogin();
    const handleError = (e) => {
      console.error("Video failed:", e);
      setTimeout(goToLogin, 800);
    };

    videoElement.addEventListener("ended", handleEnded);
    videoElement.addEventListener("error", handleError);
    videoElement.addEventListener("loadeddata", ensurePlay);

    ensurePlay();

    return () => {
      videoElement.removeEventListener("ended", handleEnded);
      videoElement.removeEventListener("error", handleError);
      videoElement.removeEventListener("loadeddata", ensurePlay);
    };
  }, [goToLogin]);

  return (
    <div
      className="fullscreen-video"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000000",
        zIndex: 9999,
      }}
    >
      <video
        ref={videoRef}
        src="/video/welcome_loop.mp4"
        autoPlay
        muted
        loop
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          cursor: "pointer",
        }}
        onClick={goToLogin}
        onEnded={goToLogin}
      />
    </div>
  );
}

export default Welcome;
