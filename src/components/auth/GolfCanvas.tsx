import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Full-screen crossfading golf video background for the sign-in landing page. */
const GOLF_VIDEOS = [
  '/videos/golf-bg-1.mp4',
  '/videos/golf-bg-2.mp4',
  '/videos/golf-bg-3.mp4',
];

const VIDEO_CROSSFADE = 1.8; // seconds for crossfade transition
const CROSSFADE_LEAD = 2.0; // start crossfade this many seconds before video ends

export function GolfCanvas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ];
  const transitionScheduled = useRef(false);

  useEffect(() => {
    // Start playing the first video and preload all others
    videoRefs.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      if (i === 0) {
        el.play().catch(() => {});
      } else {
        // Preload by loading enough data
        el.load();
      }
    });

    // Poll timeupdate to start crossfade before current video ends
    const handleTimeUpdate = (index: number) => () => {
      const el = videoRefs[index].current;
      if (!el || transitionScheduled.current) return;
      const remaining = el.duration - el.currentTime;
      if (remaining <= CROSSFADE_LEAD && remaining > 0) {
        transitionScheduled.current = true;
        const nextIdx = (index + 1) % GOLF_VIDEOS.length;
        // Start next video playing underneath before fading
        const nextVideo = videoRefs[nextIdx].current;
        if (nextVideo) {
          nextVideo.currentTime = 0;
          nextVideo.play().catch(() => {});
        }
        setActiveIndex(nextIdx);
      }
    };

    // When video ends, pause it (next is already playing)
    const handleEnded = (index: number) => () => {
      const el = videoRefs[index].current;
      if (el) el.pause();
      transitionScheduled.current = false;
    };

    const cleanups: (() => void)[] = [];
    videoRefs.forEach((ref, i) => {
      const el = ref.current;
      if (el) {
        const tuHandler = handleTimeUpdate(i);
        const endHandler = handleEnded(i);
        el.addEventListener('timeupdate', tuHandler);
        el.addEventListener('ended', endHandler);
        cleanups.push(() => {
          el.removeEventListener('timeupdate', tuHandler);
          el.removeEventListener('ended', endHandler);
        });
      }
    });

    return () => cleanups.forEach((fn) => fn());
    // videoRefs is an array of stable useRefs; wrapping array changes identity each render
    // so we intentionally run this once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {GOLF_VIDEOS.map((src, i) => (
        <motion.video
          key={src}
          ref={videoRefs[i]}
          src={src}
          muted
          playsInline
          preload="auto"
          animate={{ opacity: activeIndex === i ? 1 : 0 }}
          transition={{ duration: VIDEO_CROSSFADE, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ))}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(15,31,23,0.45) 0%, rgba(15,31,23,0.05) 35%, rgba(15,31,23,0.2) 62%, rgba(15,31,23,0.92) 100%)',
      }} />

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
      }} />
    </div>
  );
}
