import React, { useState, useEffect, useRef } from "react";
import AnimatedBackground from "../components/home/AnimatedBackground";
import HeroSection from "../components/home/HeroSection";
import VideoCarousel from "../components/home/VideoCarousel";
import StatsSection from "../components/home/StatsSection";
import FeaturesSection from "../components/home/FeaturesSection";
import AboutSection from "../components/home/AboutSection";
import PricingSection from "../components/home/PricingSection";
import CTASection from "../components/home/CTASection";

const ManhwaAIHome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const aboutRef = useRef(null);
  const pricingRef = useRef(null);

  const videos = [
    { id: 1, thumbnail: "https://placehold.co/1200x600/000000/8b5cf6?text=Epic+Manga+Animation", title: "Epic Battle Scene" },
    { id: 2, thumbnail: "https://placehold.co/1200x600/000000/fbbf24?text=Romance+Animation", title: "Romantic Moment" },
    { id: 3, thumbnail: "https://placehold.co/1200x600/1a1a2e/8b5cf6?text=Action+Packed", title: "Action Sequence" },
  ];

  useEffect(() => {
    if (!videos.length) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % videos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [videos.length]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <AnimatedBackground />

      <HeroSection heroRef={heroRef} />
      <AboutSection aboutRef={aboutRef} />
      <VideoCarousel
        videos={videos}
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
      />
      <StatsSection />
      <FeaturesSection featuresRef={featuresRef} />
      <PricingSection pricingRef={pricingRef} />
      <CTASection />
    </div>
  );
};

export default ManhwaAIHome;
