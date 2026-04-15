import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface Gallery3DSliderProps {
  images: string[];
}

/** Responsive breakpoints for card sizing */
function getResponsiveConfig(width: number) {
  if (width < 480) {
    return { cardW: 260, cardH: 180, gap: 140, stageH: 260 };
  }
  if (width < 768) {
    return { cardW: 300, cardH: 210, gap: 180, stageH: 300 };
  }
  if (width < 1024) {
    return { cardW: 380, cardH: 260, gap: 240, stageH: 360 };
  }
  return { cardW: 440, cardH: 300, gap: 280, stageH: 400 };
}

export default function Gallery3DSlider({ images }: Gallery3DSliderProps) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [config, setConfig] = useState(() => getResponsiveConfig(typeof window !== 'undefined' ? window.innerWidth : 1024));

  const total = images.length;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Responsive resize listener
  useEffect(() => {
    const handleResize = () => setConfig(getResponsiveConfig(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlay || total <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlay, next, total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  if (total === 0) return null;

  const { cardW, cardH, gap, stageH } = config;

  // Calculate position for each card in the 3D carousel
  const getCardStyle = (index: number) => {
    let diff = index - current;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absDiff = Math.abs(diff);

    if (absDiff > 3) {
      return {
        opacity: 0,
        transform: `translateX(${diff * 80}px) scale(0.4) rotateY(${diff * 15}deg)`,
        zIndex: 0,
        pointerEvents: 'none' as const,
      };
    }

    return {
      opacity: absDiff === 0 ? 1 : absDiff === 1 ? 0.65 : absDiff === 2 ? 0.35 : 0.15,
      transform: `translateX(${diff * gap}px) scale(${1 - absDiff * 0.15}) rotateY(${diff * -10}deg)`,
      zIndex: 10 - absDiff,
      pointerEvents: (absDiff === 0 ? 'auto' : 'none') as 'auto' | 'none',
    };
  };

  return (
    <>
      <div
        className="gallery-3d-container"
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
        onTouchStart={(e) => setDragStart(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (dragStart === null) return;
          const diff = dragStart - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) {
            diff > 0 ? next() : prev();
          }
          setDragStart(null);
        }}
      >
        {/* 3D Perspective Stage */}
        <div className="gallery-3d-stage" style={{ height: stageH }}>
          {/* Glow behind active image */}
          <div className="gallery-3d-glow" />

          {images.map((src, index) => {
            const style = getCardStyle(index);
            return (
              <div
                key={src}
                className="gallery-3d-card"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: cardW,
                  height: cardH,
                  marginLeft: -(cardW / 2),
                  marginTop: -(cardH / 2),
                  ...style,
                  transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onClick={() => {
                  if (index === current) {
                    setLightbox(index);
                  }
                }}
              >
                <img
                  src={src}
                  alt={`Ảnh game ${index + 1}`}
                  className="gallery-3d-image"
                  loading="lazy"
                  draggable={false}
                />
                {/* Hover overlay for active card */}
                {index === current && (
                  <div className="gallery-3d-overlay">
                    <ZoomIn size={24} />
                    <span>Xem ảnh</span>
                  </div>
                )}
                {/* Reflection */}
                <div className="gallery-3d-reflection" />
              </div>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="gallery-3d-nav gallery-3d-nav-left"
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="gallery-3d-nav gallery-3d-nav-right"
              aria-label="Ảnh tiếp"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {total > 1 && (
          <div className="gallery-3d-dots">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`gallery-3d-dot ${i === current ? 'active' : ''}`}
                aria-label={`Ảnh ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        <div className="gallery-3d-counter">
          {current + 1} / {total}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.img
              key={lightbox}
              src={images[lightbox]}
              alt={`Ảnh game ${lightbox + 1}`}
              className="gallery-lightbox-image"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="gallery-lightbox-close"
              onClick={() => setLightbox(null)}
            >
              <X size={20} />
            </button>

            {total > 1 && (
              <>
                <button
                  className="gallery-lightbox-nav gallery-lightbox-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((lightbox - 1 + total) % total);
                  }}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="gallery-lightbox-nav gallery-lightbox-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((lightbox + 1) % total);
                  }}
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            <div className="gallery-lightbox-counter">
              {lightbox + 1} / {total}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
