import { useEffect, useRef, useState } from 'react';
import { useSiteText } from '../../context/siteText';

const StatsSection = () => {
  const text = useSiteText();
  const statsData = [
    { value: 500, suffix: '+', label: text.statsVideos },
    { value: 50, suffix: '+', label: text.statsUsers },
    { value: 120, prefix: '>', suffix: 's', label: text.statsRender },
    { value: 99, suffix: '%', label: text.statsSuccess, decimals: 1 },
  ];

  const sectionRef = useRef(null);
  const [start, setStart] = useState(false);
  const [counts, setCounts] = useState(statsData.map(() => 0));
  const [done, setDone] = useState(statsData.map(() => false));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStart(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!start) return;

    statsData.forEach((stat, index) => {
      let current = 0;
      const increment = stat.value / 60;

      const timer = setInterval(() => {
        current += increment;

        if (current >= stat.value) {
          current = stat.value;
          clearInterval(timer);
          setDone((d) => {
            const copy = [...d];
            copy[index] = true;
            return copy;
          });
        }

        setCounts((prev) => {
          const updated = [...prev];
          updated[index] = stat.decimals ? Number(current.toFixed(stat.decimals)) : Math.floor(current);
          return updated;
        });
      }, 20);
    });
  }, [start, statsData]);

  return (
    <section ref={sectionRef} className="relative mt-15 z-10 py-16 sm:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-3xl mt-6 sm:mt-10 -mb-16 sm:-mb-20 p-6 sm:p-10 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {statsData.map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className={`
                    font-bold mb-2 sm:mb-3
                    text-3xl sm:text-4xl md:text-5xl lg:text-6xl
                    transition-all duration-500 ease-out
                    ${done[index] ? 'scale-140 text-yellow-500/80 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'scale-110 text-gray-700/40'}
                  `}
                >
                  {stat.prefix && <span className="mr-1">{stat.prefix}</span>}
                  {counts[index]}
                  {stat.suffix}
                </div>

                <div className={`text-xs sm:text-sm tracking-wide transition-colors duration-500 ${done[index] ? 'text-gray-300' : 'text-gray-600'}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
