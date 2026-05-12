import { useEffect, useRef } from "react";

const CursorGlow = () => {
  const glowRef = useRef(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let rafId;

    const move = (e) => {
      // Use requestAnimationFrame for smooth GPU updates
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      });
    };

    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="
        pointer-events-none fixed top-0 left-0
        w-[320px] h-[320px]
        -translate-x-1/2 -translate-y-1/2
        rounded-full
        bg-purple-500/30
        blur-[150px]
        mix-blend-screen
        z-[1]
        transition-transform duration-75
      "
    />
  );
};

export default CursorGlow;
