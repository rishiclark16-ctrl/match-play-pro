import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { AppBackground } from './app-background';

interface SplashScreenProps {
    onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false);
        }, 2200); // reduced from 3500ms for a snappier feel

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 3000); // allow time for exit animation

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <AppBackground />

                    <div className="relative z-10 flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                            className="flex items-center gap-3 text-5xl sm:text-7xl font-black tracking-tighter text-foreground"
                        >
                            <span className="text-primary">MATCH</span>
                            <span>PLAY</span>
                        </motion.div>

                        <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                            className="w-full h-1.5 bg-primary/20 mt-2 rounded-full origin-left"
                        />

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
                            className="mt-4 text-sm sm:text-lg font-bold tracking-[0.6em] text-muted-foreground uppercase"
                        >
                            Pro Golf
                        </motion.p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
