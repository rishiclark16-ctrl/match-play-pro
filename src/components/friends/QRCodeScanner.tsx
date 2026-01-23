import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Camera, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

interface QRCodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function QRCodeScanner({ open, onClose, onScan }: QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    // Small delay to ensure DOM is ready
    const startScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const container = document.getElementById(containerId);
      if (!container) return;

      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Extract friend code from URL or use direct code
            let friendCode = decodedText;
            
            try {
              const url = new URL(decodedText);
              const addParam = url.searchParams.get('add');
              if (addParam) {
                friendCode = addParam;
              }
            } catch {
              // Not a URL, use as-is
            }

            onScan(friendCode);
            stopScanner();
          },
          () => {
            // Ignore scan errors (no QR found in frame)
          }
        );
      } catch {
        // Camera access denied or not available
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [open, onScan, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scan QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black">
          {/* Scanner Container */}
          <div 
            id={containerId} 
            className="w-full aspect-square"
          />
          
          {/* Scanning overlay animation */}
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative w-[250px] h-[250px]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              
              {/* Scanning line animation */}
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ y: [0, 246, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Point your camera at a friend's QR code to add them instantly
          </p>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="w-full border-2"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
