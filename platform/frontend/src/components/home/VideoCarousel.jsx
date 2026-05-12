import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const videos = [
  { id: 1, src: '/video1.mp4' },
  { id: 2, src: '/video2.mp4' },
  { id: 3, src: '/video3.mp4' },
];

const VideoCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loaded, setLoaded] = useState({});
  const videoRefs = useRef([]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === currentSlide) {
        video.currentTime = 0;
        if (isPlaying) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    });
  }, [currentSlide, isPlaying]);

  const handleEnded = () => {
    setCurrentSlide((prev) => (prev + 1) % videos.length);
  };

  const togglePlay = () => {
    const video = videoRefs.current[currentSlide];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % videos.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + videos.length) % videos.length);

  return (
    <section className="relative w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24">
      <div className="relative group">
        <div className="relative w-full h-[220px] sm:h-[380px] md:h-[520px] rounded-3xl overflow-hidden bg-black/10 backdrop-blur-xl border border-white/10 shadow-2xl">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'}`}
            >
              {!loaded[index] && <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/10 to-white/5 animate-pulse" />}

              <video
                ref={(el) => (videoRefs.current[index] = el)}
                src={video.src}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="auto"
                onEnded={handleEnded}
                onClick={togglePlay}
                onLoadedData={() => setLoaded((prev) => ({ ...prev, [index]: true }))}
              />
            </div>
          ))}

          <button
            onClick={togglePlay}
            className="absolute inset-0 z-20 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center transition-transform duration-300 hover:scale-110">
              {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />}
            </div>
          </button>
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-6 lg:left-15 top-1/2 -translate-y-1/2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
        >
          <ChevronLeft className="w-10 h-10 sm:w-6 sm:h-6 text-white/80" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-6 lg:right-15 top-1/2 -translate-y-1/2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
        </button>
      </div>
    </section>
  );
};

export default VideoCarousel;
