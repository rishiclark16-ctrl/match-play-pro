import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GolfGroup } from '@/hooks/useGroups';

interface GroupSelectorProps {
  groups: GolfGroup[];
  onSelectGroup: (group: GolfGroup) => void;
  onManageGroups: () => void;
}

export function GroupSelector({ groups, onSelectGroup, onManageGroups }: GroupSelectorProps) {
  const getInitials = (name: string) => {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (groups.length === 0) {
    return (
      <div className="py-4">
        <p className="text-[13px] font-semibold text-muted-foreground mb-3">Use a group</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onManageGroups}
          className="flex items-center gap-3 px-4 py-3 rounded-[20px] border border-dashed border-border-strong text-sm text-muted-foreground w-full"
        >
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <span className="font-medium">Create your first group</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-muted-foreground">Use a group</p>
        <button
          type="button"
          onClick={onManageGroups}
          className="h-11 px-2 -my-3 text-[14px] text-primary font-semibold"
        >
          Manage
        </button>
      </div>
      <div className="space-y-2">
        {groups.slice(0, 3).map((group, i) => (
          <motion.button
            key={group.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => onSelectGroup(group)}
            className="w-full text-left bg-card rounded-[20px] border border-border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {group.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-8 w-8 rounded-xl border-2 border-white overflow-hidden">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {group.members.length > 3 && (
                  <div className="h-8 w-8 rounded-xl bg-muted border-2 border-white flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    +{group.members.length - 3}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
