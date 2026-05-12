import { Zap, Video, Image } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSiteText } from '../../context/siteText';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: (direction) => ({
    opacity: 0,
    rotateY: direction * 45,
    scale: 0.96,
  }),
  show: {
    opacity: 1,
    rotateY: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 90,
      damping: 22,
      mass: 0.9,
    },
  },
};

const FeaturesSection = ({ featuresRef }) => {
  const text = useSiteText();
  const features = [
    { icon: Zap, title: text.featureFastTitle, desc: text.featureFastDesc },
    { icon: Video, title: text.featureHdTitle, desc: text.featureHdDesc },
    { icon: Image, title: text.featureSmartTitle, desc: text.featureSmartDesc },
    { icon: Video, title: text.featureAutoTitle, desc: text.featureAutoDesc },
  ];

  return (
    <section ref={featuresRef} className="mt-10 relative z-10 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-800 via-purple-500 to-indigo-800 bg-clip-text text-transparent">
            {text.homeFeaturesTitle}
          </h2>

          <p className="text-gray-400 text-lg sm:text-xl max-w-3xl mx-auto">{text.homeFeaturesDescription}</p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }} className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 [perspective:1600px]">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const direction = index % 2 === 0 ? -1 : 1;
            return (
              <motion.div
                key={feature.title}
                custom={direction}
                variants={cardVariants}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-xl"
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className="mb-5 inline-flex rounded-2xl bg-purple-500/10 p-3 text-purple-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="text-sm leading-7 text-gray-400">{feature.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
