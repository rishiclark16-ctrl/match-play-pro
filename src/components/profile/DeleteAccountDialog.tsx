import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteAccountDialogProps {
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
  isDeleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

/** "Type DELETE to confirm" modal. Parent owns state and the delete call. */
export function DeleteAccountDialog({ confirmText, onConfirmTextChange, isDeleting, onCancel, onDelete }: DeleteAccountDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4">
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={spring}
        className="bg-card border border-border rounded-[28px] shadow-[0_24px_64px_rgba(15,31,23,0.2)] p-6 w-full max-w-sm space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-loss/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-loss" />
          </div>
          <div>
            <h3 id="delete-account-title" className="font-extrabold text-[22px] tracking-[-0.02em] leading-tight">Delete account?</h3>
            <p className="text-[13px] text-muted-foreground">This cannot be undone</p>
          </div>
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Permanently deletes your account, rounds, scores, friends, and all data. Active subscriptions must be cancelled separately through the App Store.
        </p>
        <div className="space-y-1.5">
          <Label className="text-[13px] text-muted-foreground font-medium">
            Type <span className="font-bold text-foreground tracking-wide">DELETE</span> to confirm
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            placeholder="DELETE"
            className="text-center font-bold tracking-[0.12em]"
            autoFocus
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 h-[52px] rounded-[14px] bg-muted text-foreground text-[15px] font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={confirmText !== 'DELETE' || isDeleting}
            className="flex-1 h-[52px] rounded-[14px] bg-loss text-white text-[15px] font-bold flex items-center justify-center disabled:opacity-40"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete forever'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
