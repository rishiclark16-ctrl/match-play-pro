import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { ledgerSectionLabel } from './ledgerHelpers';

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
    <section className="mt-[18px]">
      <p className={ledgerSectionLabel}>Group format</p>
      <div className="rounded-[20px] border border-border bg-card p-3.5 flex items-center gap-3">
        <div className="h-11 w-11 rounded-[14px] bg-muted text-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        {groupFormatAssignment ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">{groupFormatAssignment.format.name}</p>
              <p className="text-[13px] text-muted-foreground">Shared with group members</p>
            </div>
            <button
              onClick={() => { hapticLight(); onRemoveAssignment(); }}
              className="h-11 px-2 text-[14px] font-semibold text-loss"
            >
              Remove
            </button>
            <button
              onClick={() => { hapticLight(); onShowFormatPicker(); }}
              className="h-11 rounded-[14px] bg-muted px-3.5 text-[14px] font-semibold text-primary"
            >
              Change
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground">No format assigned</p>
              <p className="text-[13px] text-muted-foreground">Share an AI game with your group</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { hapticLight(); onShowFormatPicker(); }}
              className="h-11 rounded-[14px] bg-primary px-4 text-[14px] font-bold text-primary-foreground"
            >
              Assign
            </motion.button>
          </>
        )}
      </div>
    </section>
  );
}
