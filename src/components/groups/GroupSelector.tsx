import { Users, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GolfGroup } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';

interface GroupSelectorProps {
  groups: GolfGroup[];
  onSelectGroup: (group: GolfGroup) => void;
  onManageGroups: () => void;
}

export function GroupSelector({ groups, onSelectGroup, onManageGroups }: GroupSelectorProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (groups.length === 0) {
    return (
      <div className="py-3">
        <p className="text-xs text-muted-foreground mb-2">USE A GROUP</p>
        <button
          type="button"
          onClick={onManageGroups}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Users className="h-4 w-4" />
          Create your first group
        </button>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">USE A GROUP</p>
        <button
          type="button"
          onClick={onManageGroups}
          className="text-xs text-primary hover:underline"
        >
          Manage
        </button>
      </div>
      <div className="space-y-2">
        {groups.slice(0, 3).map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelectGroup(group)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex -space-x-2">
              {group.members.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-7 w-7 border-2 border-card">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.members.length > 3 && (
                <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  +{group.members.length - 3}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                {group.members.length} member{group.members.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
