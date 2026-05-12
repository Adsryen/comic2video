import { ArrowRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSiteText } from '../../context/siteText';

const HeroSection = ({ heroRef: propHeroRef }) => {
  const localHeroRef = useRef(null);
  const heroRef = propHeroRef || localHeroRef;
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const text = useSiteText();

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleGetStarted = () => {
    navigate('/projects');
  };

  return (
    <section
      ref={heroRef}
      className="relative z-10 pt-28 sm:pt-32 pb-20 sm:pb-24 px-4 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center">
          <div
            className="mb-3 transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transitionDelay: '0ms',
              willChange: 'opacity, transform',
            }}
          >
            <span className="text-yellow-400 text-sm font-semibold">{text.homeBadge}</span>
          </div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-6 bg-gradient-to-r from-[#a855f7] via-[#7c3aed] to-[#4f46e5] bg-clip-text text-transparent transition-all duration-1000 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)',
              transitionDelay: '120ms',
              willChange: 'opacity, transform',
            }}
          >
            {text.homeTitle}
          </h1>

          <p
            className="mt-12 text-lg sm:text-xl md:text-2xl mb-6 text-yellow-500/50 font-semibold transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transitionDelay: '240ms',
              willChange: 'opacity, transform',
            }}
          >
            {text.homeSubtitle}
          </p>

          <p
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-6xl mx-auto mb-10 leading-relaxed transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transitionDelay: '360ms',
              willChange: 'opacity, transform',
            }}
          >
            {text.homeDescription}
          </p>

          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transitionDelay: '480ms',
              willChange: 'opacity, transform',
            }}
          >
            <button
              onClick={handleGetStarted}
              className="relative px-10 sm:px-12 py-4 sm:py-5 rounded-full text-base sm:text-lg font-semibold bg-white/10 backdrop-blur-xl border border-white/30 text-white overflow-hidden group transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
              style={{ willChange: 'transform' }}
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-purple-600/40 to-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ willChange: 'opacity' }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {text.homeOpenPlatform}
                <ArrowRight
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  style={{ willChange: 'transform' }}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
