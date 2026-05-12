import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSiteText } from '../../context/siteText';

const CTASection = () => {
  const text = useSiteText();

  return (
    <section className="relative z-10 px-4 pt-24 pb-28 overflow-visible">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative px-6 sm:px-10 py-14 sm:py-16 lg:px-20 lg:py-20 overflow-visible"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-800/10 to-yellow-800/10 pointer-events-none" />

          <div className="relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.15] pb-3 bg-gradient-to-r from-purple-800 via-purple-500 to-indigo-800 bg-clip-text text-transparent">
              {text.ctaTitle}
            </h2>

            <p className="text-gray-300 mb-10 text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
              {text.ctaBody}
            </p>

            <motion.a
              href="/projects"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-full text-base sm:text-lg font-bold shadow-sm hover:shadow-md hover:shadow-yellow-500/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {text.homeOpenPlatform}
              <ArrowRight className="w-5 h-5" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
