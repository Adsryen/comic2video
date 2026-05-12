import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/bgAnimation.mp4";
const FALLBACK_IMG = "/bgAnimation-fallback.jpg";

const AnimatedBackground = () => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Preload fallback image immediately
    const img = new Image();
    img.src = FALLBACK_IMG;

    // Ultra-aggressive autoplay settings
    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("preload", "auto");
    video.setAttribute("x-webkit-airplay", "deny");

    // Immediate play - no waiting
    const playImmediately = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Instant retry without delay
            setTimeout(playImmediately, 50);
          });
      }
    };

    // Handle playing event
    const handlePlaying = () => setIsPlaying(true);
    const handleCanPlay = () => {
      if (!isPlaying) playImmediately();
    };

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    
    // Force load and play immediately
    video.load();
    playImmediately();

    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      
      {/* Fallback Image - Instant display */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${FALLBACK_IMG})`,
          opacity: isPlaying ? 0 : 1,
          transition: "opacity 800ms ease-out",
          willChange: "opacity",
        }}
      />

      {/* Background Video - Hardware accelerated */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: isPlaying ? 1 : 0,
          transition: "opacity 800ms ease-out",
          willChange: "opacity",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        onPlaying={() => setIsPlaying(true)}
      />

      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50"
        style={{ 
          willChange: "opacity",
          transform: "translateZ(0)",
        }}
      />
    </div>
  );
};

export default AnimatedBackground;