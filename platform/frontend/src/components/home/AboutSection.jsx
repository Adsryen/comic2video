import { useEffect, useRef } from 'react';
import { useSiteText } from '../../context/siteText';

const AboutSection = () => {
  const videoRef = useRef(null);
  const text = useSiteText();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
      }
    };

    playVideo();
  }, []);

  return (
    <section className="relative w-full overflow-visible py-24 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative z-10 -mt-5">
          <h2
            className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl
            font-bold mb-8
            bg-gradient-to-r from-purple-700 via-purple-400 to-yellow-400/50
            bg-clip-text text-transparent
            leading-[1.1] pb-2"
          >
            {text.aboutTitleLine1}
            <br />
            {text.aboutTitleLine2}
          </h2>

          <p className="text-gray-300 text-lg leading-relaxed mb-6 max-w-xl">{text.aboutBody1}</p>
          <p className="text-gray-400 text-base leading-relaxed max-w-xl">{text.aboutBody2}</p>
        </div>

        <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[520px]
          rounded-3xl overflow-hidden
          border border-purple-500/20
          bg-black/40 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br
            from-purple-500/10 to-pink-500/10 z-10 pointer-events-none" />

          <video
            ref={videoRef}
            src="/about.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
