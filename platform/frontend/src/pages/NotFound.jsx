import React from "react";
import { Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  
   

      {/* Premium Glass Card - Centered */}
      <div className="relative z-10 w-full max-w-[60%] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto px-4">
        
        <div className="relative rounded-3xl 
          bg-white/[0.03] backdrop-blur-3xl
          border border-white/20
          shadow-[0_8px_32px_0_rgba(168,85,247,0.3),0_0_0_1px_rgba(255,255,255,0.1)_inset,0_20px_60px_-15px_rgba(168,85,247,0.4)]
          p-8 sm:p-10 md:p-12
          overflow-hidden">
          
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-fuchsia-500/10 rounded-3xl"></div>
          
          {/* Highlight top edge */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          
          {/* Content */}
          <div className="relative z-10 text-center">
            
            {/* Small Tag */}
            <div className="inline-flex items-center px-4 py-1.5 rounded-full 
              bg-white/10 backdrop-blur-xl
              border border-purple-400/40
              shadow-[0_4px_16px_rgba(168,85,247,0.25)]
              mb-6">
              <span className="text-xs font-bold text-purple-200 tracking-widest uppercase">Error 404</span>
            </div>

            {/* 404 Number */}
            <h1 className="text-[80px] sm:text-[100px] md:text-[120px] font-black leading-none tracking-tight
              bg-gradient-to-br from-purple-200 via-fuchsia-300 to-purple-400
              text-transparent bg-clip-text
              drop-shadow-[0_0_50px_rgba(168,85,247,0.7)]
              mb-4">
              404
            </h1>

            {/* Main Heading */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white/95 mb-3">
            <span className="bg-gradient-to-r from-purple-300 to-fuchsia-300 text-transparent bg-clip-text">Not Found</span>
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
              The page you're looking for has drifted into another dimension.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              
              <button
                onClick={() => navigate("/", { replace: true })}
                className="group relative w-full sm:w-auto flex items-center justify-center gap-2.5
                px-6 py-3 rounded-xl
                bg-white/10 backdrop-blur-xl
                border border-purple-400/40
                text-white text-sm sm:text-base font-semibold
              
                hover:bg-white/15 hover:border-purple-400/60
            
                hover:scale-[1.02] active:scale-[0.98] 
                transition-all duration-300
                overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Home size={18} className="relative z-10" />
                <span className="relative z-10">Return Home</span>
              </button>

              <button
                onClick={() => navigate(-1)}
                className="group relative w-full sm:w-auto flex items-center justify-center gap-2.5
                px-6 py-3 rounded-xl
                bg-white/5 backdrop-blur-xl
                border border-white/15
                text-white text-sm sm:text-base font-semibold
                hover:bg-white/10 hover:border-white/25
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-300"
              >
                <ArrowLeft size={18} />
                <span>Go Back</span>
              </button>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
