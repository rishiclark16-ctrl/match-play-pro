import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Trash2, Edit2, Loader2, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroups, GolfGroup } from '@/hooks/useGroups';
import { useSubscription } from '@/hooks/useSubscription';
import { CreateGroupSheet } from '@/components/groups/CreateGroupSheet';
import { GroupLedgerView } from '@/components/groups/GroupLedgerView';
import { PaywallModal, ProBadge } from '@/components/subscription';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { cn } from '@/lib/utils';

export default function Groups() {
  const navigate = useNavigate();
  const { groups, loading, deleteGroup, refetch: refetchGroups } = useGroups();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GolfGroup | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GolfGroup | null>(null);

  // Subscription gating for group limits
  const { isPro, canAddGroup, limits } = useSubscription();
  const atGroupLimit = !canAddGroup(groups.length);
  const maxGroups = limits.maxGroups;

  const handleCreateGroup = () => {
    if (atGroupLimit) {
      setShowPaywall(true);
      return;
    }
    hapticLight();
    setEditingGroup(null);
    setShowCreateSheet(true);
  };

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

  const handleRefresh = useCallback(async () => {
    hapticLight();
    await refetchGroups();
    hapticSuccess();
  }, [refetchGroups]);

  const getInitials = (name: string) => {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F8F8F6] relative">
      {/* Group Ledger Overlay */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-10 bg-[#F8F8F6]"
          >
            <GroupLedgerView group={selectedGroup} onBack={() => setSelectedGroup(null)} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Fixed Header */}
      <header className="flex-shrink-0 z-10 px-6 pb-3 pt-safe-content border-b-2 border-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
            </motion.button>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH Golf</p>
              <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">Groups</h1>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleCreateGroup}
            className={atGroupLimit
              ? 'border border-gold text-gold bg-transparent hover:bg-gold/10 h-9'
              : 'bg-foreground text-background h-9 px-4 rounded-2xl font-bold'}
          >
            {atGroupLimit ? (
              <>
                <Crown className="h-3.5 w-3.5 mr-1" />
                Upgrade
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Scrollable Content */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 relative z-10 px-4 pb-nav">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-2 mt-6 flex flex-col items-center text-center py-12 px-6"
          >
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-[13px] font-bold text-foreground mb-1">No groups yet</h3>
            <p className="text-[12px] text-muted-foreground max-w-[240px] leading-relaxed">
              Create a group with your regular golf buddies for faster round setup.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateGroup}
              className="bg-foreground text-background rounded-2xl px-6 py-3 font-bold text-sm flex items-center gap-2 mt-5"
            >
              <Plus className="h-4 w-4" />
              Create Your First Group
            </motion.button>
          </motion.div>
        ) : (
          <div className="mt-4">
            <AnimatePresence>
              {groups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => { hapticLight(); setSelectedGroup(group); }}
                  className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4 mb-3 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base tracking-[-0.02em] text-foreground">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticLight();
                          setEditingGroup(group);
                          setShowCreateSheet(true);
                        }}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                        disabled={deletingId === group.id}
                        className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"
                      >
                        {deletingId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 rounded-xl border-2 border-background">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="bg-muted text-foreground text-xs rounded-xl">
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
      </PullToRefresh>

      <CreateGroupSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        editingGroup={editingGroup}
      />

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Unlimited Groups"
      />
    </div>
  );
}
