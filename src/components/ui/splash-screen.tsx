import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppBackground } from './app-background';

interface SplashScreenProps {
    onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [stage, setStage] = useState<'swing' | 'flight' | 'logo' | 'complete'>('swing');
    const [show, setShow] = useState(true);

    useEffect(() => {
        // Sequence timing
        const timers = [
            setTimeout(() => setStage('flight'), 1200), // Swing duration
            setTimeout(() => setStage('logo'), 2000),   // Flight duration
            setTimeout(() => {
                setStage('complete');
                setShow(false);
            }, 3500),   // Logo reading time
            setTimeout(() => {
                onComplete();
            }, 4000),   // Fade out duration
        ];

        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);

    // Golf swing path (abstract representation)
    // Starting high, swinging down and through
    const swingPath = "M 80 20 Q 90 20 90 30 L 90 50 L 85 70 L 60 90 L 40 85";

    // Ball flight path - arc from right to left
    // Assuming 100x100 viewbox for paths, rendered in full screen
    const flightPath = "M 90 85 Q 50 20 -20 50";

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <AppBackground />

                    <div className="relative w-full h-full max-w-lg mx-auto">

                        {/* Golfer Animation Container (Right side) */}
                        <div className="absolute right-0 bottom-0 w-64 h-64 sm:w-80 sm:h-80 translate-x-10 translate-y-10">
                            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                                {/* Golfer Body (Abstract) */}
                                <motion.path
                                    d="M 85 90 L 85 60 L 80 50 L 90 50" // Legs/Torso base
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="transparent"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                />
                                <motion.circle
                                    cx="85" cy="45" r="4" // Head
                                    fill="hsl(var(--primary))"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, duration: 0.3 }}
                                />

                                {/* Club Swing */}
                                <motion.path
                                    d="M 82 55 Q 100 20 100 10" // Backswing position
                                    animate={{
                                        d: [
                                            "M 82 55 Q 100 20 100 10", // Backswing
                                            "M 82 55 Q 90 85 40 85",   // Impact / Follow through
                                            "M 82 55 Q 50 90 20 40"    // Finish
                                        ]
                                    }}
                                    stroke="hsl(var(--foreground))"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    transition={{
                                        duration: 1.2,
                                        times: [0, 0.4, 1],
                                        ease: "easeInOut"
                                    }}
                                />
                            </svg>
                        </div>

                        {/* Ball Flight */}
                        <div className="absolute inset-0 pointer-events-none">
                            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                {stage !== 'swing' && (
                                    <>
                                        {/* Ball Trail */}
                                        <motion.path
                                            d={flightPath}
                                            stroke="hsl(var(--primary))"
                                            strokeWidth="1"
                                            strokeDasharray="1 3"
                                            fill="transparent"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 0.6 }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                        />
                                        {/* The Ball */}
                                        <motion.circle
                                            r="1.5"
                                            fill="hsl(var(--foreground))"
                                            initial={{ offsetDistance: "0%" }}
                                            animate={{ offsetDistance: "100%" }}
                                            style={{ offsetPath: `path("${flightPath}")` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                        />
                                    </>
                                )}
                            </svg>
                        </div>

                        {/* Logo Reveal */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            <div className="relative overflow-hidden p-4">
                                <motion.h1
                                    className="text-4xl sm:text-6xl font-black tracking-tighter text-foreground text-center"
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={stage === 'logo' || stage === 'complete' ? { y: 0, opacity: 1 } : {}}
                                    transition={{
                                        type: "spring",
                                        stiffness: 100,
                                        damping: 20,
                                        delay: 0.2
                                    }}
                                >
                                    <span className="text-primary">MATCH</span>
                                    <span className="ml-2">PLAY</span>
                                </motion.h1>
                                <motion.p
                                    className="text-sm sm:text-lg font-bold tracking-[0.5em] text-muted-foreground text-center mt-2 uppercase"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={stage === 'logo' || stage === 'complete' ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ delay: 0.6, duration: 0.5 }}
                                >
                                    PRO GOLF
                                </motion.p>
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
