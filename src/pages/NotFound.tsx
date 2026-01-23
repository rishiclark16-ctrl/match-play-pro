import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-sm"
      >
        {/* Golf-themed 404 */}
        <div className="space-y-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl">⛳</span>
          </div>
          <h1 className="text-6xl font-bold text-primary tabular-nums">404</h1>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Lost in the rough
          </h2>
          <p className="text-muted-foreground">
            We couldn't find the page you're looking for. Let's get you back on the fairway.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button asChild className="w-full py-6 text-lg font-semibold rounded-xl">
              <Link to="/">
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </Button>
          </motion.div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => window.history.back()}
            className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
