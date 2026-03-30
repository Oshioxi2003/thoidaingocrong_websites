import { motion } from 'framer-motion';

interface PageBackgroundProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
}

export default function PageBackground({ src, alt = '', children }: PageBackgroundProps) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          animate={{ scale: [1, 1.06, 1], x: [0, -10, 0], y: [0, -8, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-background/70 dark:bg-background/80" />

        {/* Energy particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              left: `${8 + i * 11}%`,
              bottom: `${10 + Math.random() * 30}%`,
              background: 'radial-gradient(circle, hsl(30 90% 60% / 0.6), hsl(15 85% 55% / 0))',
            }}
            animate={{
              y: [0, -100 - Math.random() * 150],
              opacity: [0, 0.7, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: 5 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 80%, hsl(30 90% 50% / 0.06), transparent 70%)',
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
