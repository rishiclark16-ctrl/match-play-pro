import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
    onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false);
        }, 2200);

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 3000);

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-foreground"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="relative flex flex-col items-center justify-center gap-5">
                        {/* Bold M Logo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
                        >
                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                                <path
                                    d="M16 58 L16 22 L40 46 L64 22 L64 58"
                                    stroke="white"
                                    strokeWidth="7.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            </svg>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
                            className="flex flex-col items-center gap-1"
                        >
                            <span className="text-white text-[13px] font-black uppercase tracking-[0.3em]">MATCH</span>
                            <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.7 }}
                                className="w-8 h-0.5 bg-[#F0EE3A] origin-center"
                            />
                            <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.25em]">Golf</span>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
