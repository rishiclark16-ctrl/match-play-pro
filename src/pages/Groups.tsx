import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Trash2, Edit2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroups, GolfGroup } from '@/hooks/useGroups';
import { CreateGroupSheet } from '@/components/groups/CreateGroupSheet';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Groups() {
  const navigate = useNavigate();
  const { groups, loading, deleteGroup } = useGroups();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GolfGroup | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (groupId: string) => {
    setDeletingId(groupId);
    hapticLight();
    
    const success = await deleteGroup(groupId);
    
    if (success) {
      hapticSuccess();
      toast.success('Group deleted');
    } else {
      hapticError();
      toast.error('Failed to delete group');
    }
    
    setDeletingId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pt-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Golf Groups</h1>
            <p className="text-xs text-muted-foreground">
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              hapticLight();
              setEditingGroup(null);
              setShowCreateSheet(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </header>

      <div className="px-4 pb-safe">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No groups yet</h2>
            <p className="text-muted-foreground max-w-[280px] mb-6">
              Create a group with your regular golf buddies for faster round setup.
            </p>
            <Button
              onClick={() => {
                hapticLight();
                setShowCreateSheet(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3 mt-4">
            <AnimatePresence>
              {groups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          hapticLight();
                          setEditingGroup(group);
                          setShowCreateSheet(true);
                        }}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(group.id)}
                        disabled={deletingId === group.id}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        {deletingId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Members */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-card">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateGroupSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        editingGroup={editingGroup}
      />
    </div>
  );
}
