import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareJoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinCode: string;
  courseName: string;
}

export function ShareJoinCodeModal({ isOpen, onClose, joinCode, courseName }: ShareJoinCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleShareLink = async () => {
    const shareText = `Join my golf round on MATCH!\n\n📍 ${courseName}\n🔑 Code: ${joinCode}\n\nOpen the MATCH app and enter this code to follow along live.`;
    
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Share message copied!');
      }
    } catch (err) {
      // User cancelled share
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-background rounded-3xl p-6 z-50 shadow-2xl max-w-sm mx-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Share this round</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Friends can join with this code to follow along live
              </p>
              
              {/* Large join code display */}
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyCode}
                className="relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-6 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-colors"
              >
                <p className="text-4xl font-bold tracking-[0.3em] text-primary font-mono">
                  {joinCode}
                </p>
                <div className="absolute top-2 right-2">
                  {copied ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </motion.div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleCopyCode}
                  className="py-6 rounded-xl font-semibold"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
                <Button
                  onClick={handleShareLink}
                  className="py-6 rounded-xl font-semibold"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
