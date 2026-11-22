import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Trash2, Edit2, Loader2, Crown, ChevronRight, Receipt, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroups, GolfGroup } from '@/hooks/useGroups';
import { useSubscription } from '@/hooks/useSubscription';
import { CreateGroupSheet } from '@/components/groups/CreateGroupSheet';
import { GroupLedgerView } from '@/components/groups/GroupLedgerView';
import { PaywallModal } from '@/components/subscription';
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
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Group Ledger Overlay */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-20 bg-background"
          >
            <GroupLedgerView group={selectedGroup} onBack={() => setSelectedGroup(null)} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Fixed Header */}
      <header className="flex-shrink-0 z-10 px-5 pb-4 pt-safe-content">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="h-11 w-11 flex-shrink-0 rounded-[14px] bg-muted text-foreground flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <h1 className="text-[30px] font-extrabold tracking-[-0.03em] leading-none text-foreground">Groups</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateGroup}
            className={cn(
              'h-11 flex-shrink-0 rounded-[14px] pl-3 pr-4 inline-flex items-center gap-1.5 text-[14px] font-bold',
              atGroupLimit ? 'bg-gold text-gold-foreground' : 'bg-foreground text-background'
            )}
          >
            {atGroupLimit ? <Crown className="h-4 w-4" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
            {atGroupLimit ? 'Upgrade' : 'New group'}
          </motion.button>
        </div>
        {!loading && groups.length > 0 && !isPro && maxGroups !== Infinity && (
          <p className="mt-2 pl-[56px] text-[13px] text-muted-foreground">
            {groups.length} of {maxGroups} groups on the free plan
          </p>
        )}
      </header>

      {/* Scrollable Content */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 relative z-10 px-5 pb-nav">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] bg-primary p-5 text-primary-foreground"
          >
            <svg aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-[220px] w-[220px] text-white/[0.06]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="30" /><circle cx="100" cy="100" r="52" /><circle cx="100" cy="100" r="74" /><circle cx="100" cy="100" r="96" />
            </svg>
            <p className="relative text-[13px] font-semibold text-on-forest-muted">Your regular game</p>
            <h2 className="relative mt-1.5 text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
              Save the foursome.<br /><span className="text-gold">Keep a running tab.</span>
            </h2>
            <p className="relative mt-2 max-w-[290px] text-[14px] leading-relaxed text-on-forest-muted">
              Create a group with your regular golf buddies for faster round setup and a season-long ledger.
            </p>
            <div className="relative mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: <Users className="h-[18px] w-[18px]" />, label: 'One-tap setup', hot: true },
                { icon: <Receipt className="h-[18px] w-[18px]" />, label: 'Running tab' },
                { icon: <Sparkles className="h-[18px] w-[18px]" />, label: 'House game' },
              ].map(t => (
                <div key={t.label} className={cn('min-h-[88px] rounded-[18px] p-3 flex flex-col justify-between gap-4', t.hot ? 'bg-gold text-gold-foreground' : 'bg-white/10 text-white')}>
                  <span className={cn('h-8 w-8 rounded-[10px] flex items-center justify-center', t.hot ? 'bg-primary/10' : 'bg-white/10')}>{t.icon}</span>
                  <span className="text-[13px] font-bold leading-tight">{t.label}</span>
                </div>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateGroup}
              className="relative mt-4 w-full h-[56px] rounded-[18px] bg-white text-primary text-[16px] font-bold inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Create your first group
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {groups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => { hapticLight(); setSelectedGroup(group); }}
                  className="rounded-[20px] border border-border bg-card p-4 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="text-[17px] font-bold tracking-[-0.02em] text-foreground truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center -mr-2 -mt-2 flex-shrink-0">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Edit ${group.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticLight();
                          setEditingGroup(group);
                          setShowCreateSheet(true);
                        }}
                        className="h-11 w-11 rounded-[14px] flex items-center justify-center text-muted-foreground active:bg-muted"
                      >
                        <Edit2 className="h-[17px] w-[17px]" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Delete ${group.name}`}
                        onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                        disabled={deletingId === group.id}
                        className="h-11 w-11 rounded-[14px] flex items-center justify-center text-muted-foreground active:bg-loss/10 active:text-loss"
                      >
                        {deletingId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-[17px] w-[17px]" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Members + open tab */}
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="h-9 w-9 rounded-[12px] ring-2 ring-card">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="bg-muted text-primary text-[12px] font-bold rounded-[12px]">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.members.length > 4 && (
                        <span className="h-9 w-9 rounded-[12px] ring-2 ring-card bg-muted text-[12px] font-bold text-muted-foreground flex items-center justify-center">
                          +{group.members.length - 4}
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] text-muted-foreground">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-3 h-8 text-[13px] font-semibold text-primary">
                      Tab
                      <ChevronRight className="h-4 w-4" />
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
