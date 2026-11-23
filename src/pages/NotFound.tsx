import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-5 pt-safe-content pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto space-y-3"
      >
        {/* Forest hero card holds the headline */}
        <div className="bg-primary rounded-[28px] p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-forest-muted">Hole not found</span>
            <span className="text-[28px] leading-none" aria-hidden>⛳</span>
          </div>
          <p className="mt-4 text-[64px] font-extrabold tracking-[-0.04em] leading-none tabular-nums">
            4<span className="text-gold">0</span>4
          </p>
          <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.02em] leading-tight">
            Lost in the rough
          </h1>
          <p className="mt-1.5 text-[14px] text-on-forest-muted leading-relaxed">
            We couldn't find the page you're looking for. Let's get you back on the fairway.
          </p>
        </div>

        <motion.div whileTap={{ scale: 0.98 }}>
          <Link
            to="/"
            className="w-full h-[60px] rounded-[20px] bg-ink text-ink-foreground text-[16px] font-bold flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => window.history.back()}
          className="w-full h-12 rounded-[20px] text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </motion.button>
      </motion.div>
    </div>
  );
};

export default NotFound;
