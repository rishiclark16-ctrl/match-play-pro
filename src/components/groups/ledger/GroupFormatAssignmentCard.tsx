import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';

interface GroupFormatAssignmentLike {
  formatId: string;
  format: { name: string };
}

interface GroupFormatAssignmentCardProps {
  groupFormatAssignment: GroupFormatAssignmentLike | null;
  onShowFormatPicker: () => void;
  onRemoveAssignment: () => void;
}

export function GroupFormatAssignmentCard({
  groupFormatAssignment,
  onShowFormatPicker,
  onRemoveAssignment,
}: GroupFormatAssignmentCardProps) {
  return (
    <div className="mt-4 pb-2">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground mb-2">Group Format</p>
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-border/30">
        {groupFormatAssignment ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0EE3A]/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate">{groupFormatAssignment.format.name}</p>
              <p className="text-[11px] text-muted-foreground">Shared with group members</p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <button
                onClick={() => { hapticLight(); onShowFormatPicker(); }}
                className="text-[11px] font-bold text-foreground"
              >
                Change
              </button>
              <button
                onClick={() => { hapticLight(); onRemoveAssignment(); }}
                className="text-[11px] text-destructive"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-bold text-foreground">No format assigned</p>
                <p className="text-[11px] text-muted-foreground">Share an AI game with your group</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { hapticLight(); onShowFormatPicker(); }}
              className="bg-foreground text-background text-[11px] font-bold px-3 py-1.5 rounded-xl"
            >
              Assign
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
