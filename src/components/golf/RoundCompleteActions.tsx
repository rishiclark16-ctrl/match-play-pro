import { useNavigate } from 'react-router-dom';
import { Share2, Plus, Home, Loader2, Image, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticLight } from '@/lib/haptics';

interface RoundCompleteActionsProps {
  isSharing: boolean;
  shareMode: 'image' | 'text' | null;
  onShareImage: () => void;
  onShareText: () => void;
  onShowShareSheet: () => void;
}

export function RoundCompleteActions({
  isSharing,
  shareMode,
  onShareImage,
  onShareText,
  onShowShareSheet,
}: RoundCompleteActionsProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-4 bg-gradient-to-t from-background via-background to-transparent z-50 pointer-events-auto">
      <div className="space-y-2">
        {/* Send to Group Button */}
        <Button
          onClick={() => {
            hapticLight();
            onShowShareSheet();
          }}
          variant="outline"
          className="w-full h-12 text-base font-bold rounded-lg border-2 border-primary text-primary hover:bg-primary/10"
        >
          <Send className="w-5 h-5 mr-2" />
          Send Results to Group
        </Button>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onShareImage}
            disabled={isSharing}
            className="flex-1 h-11 text-sm font-semibold rounded-lg"
          >
            {isSharing && shareMode === 'image' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Image className="w-4 h-4 mr-2" />
            )}
            Image
          </Button>

          <Button
            variant="outline"
            onClick={onShareText}
            disabled={isSharing}
            className="flex-1 h-11 text-sm font-semibold rounded-lg"
          >
            {isSharing && shareMode === 'text' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Text
          </Button>
        </div>

        {/* New Round Button */}
        <Button
          onClick={() => {
            hapticLight();
            navigate('/new-round');
          }}
          className="w-full h-12 text-base font-bold rounded-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Round
        </Button>

        {/* Home Link */}
        <button
          onClick={() => {
            hapticLight();
            navigate('/');
          }}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
