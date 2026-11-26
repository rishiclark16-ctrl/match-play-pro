import { motion } from 'framer-motion';
import { Check, Plus, Users } from 'lucide-react';
import type { GolfGroup } from '@/hooks/useGroups';
import { hapticLight } from '@/lib/haptics';
import { ResultsCard } from './resultsUi';

interface AddToGroupTabProps {
  groups: GolfGroup[];
  addingToTab: boolean;
  addedToGroupId: string | null;
  showGroupPicker: boolean;
  setShowGroupPicker: (open: boolean) => void;
  onAdd: (groupId: string) => void;
}

/** "Add to group tab" control shown under the settlement list. */
export function AddToGroupTab({
  groups,
  addingToTab,
  addedToGroupId,
  showGroupPicker,
  setShowGroupPicker,
  onAdd,
}: AddToGroupTabProps) {
  if (addedToGroupId) {
    const name = groups.find(g => g.id === addedToGroupId)?.name;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="rounded-[20px] bg-[#ECFCCB] px-4 py-3 flex items-center gap-3 min-h-[56px]">
          <span className="w-8 h-8 rounded-full bg-[#14532D] flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-[#14532D]">Added to {name} tab</p>
            <p className="text-[12px] text-[#14532D]">Visible in the group ledger</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (showGroupPicker) {
    return (
      <ResultsCard className="p-2">
        <p className="text-[13px] font-semibold text-muted-foreground px-2 pt-1.5 pb-2">Add to which group?</p>
        {groups.map(g => (
          <motion.button
            key={g.id}
            whileTap={{ scale: 0.98 }}
            disabled={addingToTab}
            onClick={() => onAdd(g.id)}
            className="w-full flex items-center gap-3 rounded-[14px] px-3 min-h-[52px] active:bg-muted disabled:opacity-50"
          >
            <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-foreground" />
            </span>
            <span className="text-[15px] font-semibold text-foreground flex-1 text-left truncate">{g.name}</span>
            <span className="text-[12px] text-muted-foreground">{g.members.length} members</span>
          </motion.button>
        ))}
        <button
          onClick={() => setShowGroupPicker(false)}
          className="w-full h-11 mt-1 text-[14px] font-semibold text-muted-foreground"
        >
          Cancel
        </button>
      </ResultsCard>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        hapticLight();
        if (groups.length === 1) onAdd(groups[0].id);
        else setShowGroupPicker(true);
      }}
      disabled={addingToTab}
      className="w-full h-[52px] rounded-[20px] border border-border bg-card flex items-center justify-center gap-2 text-[15px] font-semibold text-foreground disabled:opacity-50"
    >
      {addingToTab ? (
        <span className="text-muted-foreground animate-pulse">Adding…</span>
      ) : (
        <>
          <Plus className="w-4 h-4" strokeWidth={2.6} />
          Add to group tab
        </>
      )}
    </motion.button>
  );
}
