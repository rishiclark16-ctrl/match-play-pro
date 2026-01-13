import { Users, ChevronRight, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GolfGroup } from '@/hooks/useGroups';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';

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
      <div className="py-4">
        <p className="label-sm mb-3">Use a Group</p>
        <button
          type="button"
          onClick={onManageGroups}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary-light transition-all w-full"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <span className="font-medium">Create your first group</span>
        </button>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="label-sm">Use a Group</p>
        <button
          type="button"
          onClick={onManageGroups}
          className="text-xs text-primary font-semibold hover:underline"
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
            className="w-full text-left"
          >
            <TechCard hover>
              <TechCardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 3).map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-card">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.members.length > 3 && (
                      <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        +{group.members.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </TechCardContent>
            </TechCard>
          </button>
        ))}
      </div>
    </div>
  );
}
