import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rss, Users, UserPlus, Hash, AtSign, Phone, ScanLine, Contact, Crown, QrCode, ChevronDown, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useSubscription } from '@/hooks/useSubscription';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { ShareFriendCode } from '@/components/friends/ShareFriendCode';
import { FriendCodeQR } from '@/components/friends/FriendCodeQR';
import { QRCodeScanner } from '@/components/friends/QRCodeScanner';
import { ContactSyncSheet } from '@/components/friends/ContactSyncSheet';
import { PaywallModal } from '@/components/subscription';
import { SocialFeedTab } from '@/components/social/SocialFeedTab';
import { UpcomingRoundsTab } from '@/components/social/UpcomingRoundsTab';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type Tab = 'feed' | 'upcoming' | 'friends';

export default function Social() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useProfile();
  const {
    friends,
    pendingRequests,
    loading,
    sendFriendRequest,
    sendFriendRequestByEmail,
    sendFriendRequestByPhone,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
  } = useFriends();

  const initialTab = (searchParams.get('tab') as Tab) || 'feed';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'email' | 'phone'>('code');
  const [isSending, setIsSending] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [contactSyncOpen, setContactSyncOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const { isPro, canAddFriend, limits } = useSubscription();
  const atFriendLimit = !canAddFriend(friends.length);
  const maxFriends = limits.maxFriends;
  const friendCode = profile?.friend_code ?? null;
  const userName = profile?.full_name;

  useEffect(() => {
    const addCode = searchParams.get('add');
    if (addCode && addCode !== friendCode) {
      setActiveTab('friends');
      setSearchValue(addCode.toUpperCase());
      setSearchType('code');
      const timer = setTimeout(() => { handleSendRequest(addCode); }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, friendCode]);

  const handleSendRequest = async (codeOverride?: string) => {
    const value = codeOverride || searchValue.trim();
    if (!value) return;
    if (atFriendLimit) { setShowPaywall(true); return; }
    setIsSending(true);
    let result: { success: boolean; error?: string };
    switch (searchType) {
      case 'email': result = await sendFriendRequestByEmail(value); break;
      case 'phone': result = await sendFriendRequestByPhone(value); break;
      default: result = await sendFriendRequest(value);
    }
    setIsSending(false);
    if (result.success) {
      hapticSuccess();
      toast.success('Friend request sent!');
      setSearchValue('');
      if (searchParams.get('add')) navigate('/social', { replace: true });
    } else {
      hapticError();
      toast.error(result.error || 'Failed to send request');
    }
  };

  const handleAccept = async (friendshipId: string) => {
    if (atFriendLimit) { setShowPaywall(true); return; }
    setProcessingId(friendshipId);
    const success = await acceptFriendRequest(friendshipId);
    setProcessingId(null);
    if (success) { hapticSuccess(); toast.success('Friend added!'); }
    else toast.error('Failed to accept request');
  };

  const handleDecline = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    const success = await declineFriendRequest(friendshipId);
    setProcessingId(null);
    if (!success) toast.error('Failed to decline request');
    else hapticLight();
  };

  const handleRemove = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    const success = await removeFriend(friendshipId);
    setProcessingId(null);
    if (success) { hapticLight(); toast.success('Friend removed'); }
    else toast.error('Failed to remove friend');
  };

  const handleQRScan = (code: string) => {
    setScannerOpen(false);
    hapticSuccess();
    setSearchType('code');
    setSearchValue(code.toUpperCase());
    setTimeout(() => { handleSendRequest(code); }, 100);
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'email': return 'Enter email...';
      case 'phone': return 'Enter phone...';
      default: return 'Enter code...';
    }
  };

  const getSearchIcon = () => {
    switch (searchType) {
      case 'email': return <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      case 'phone': return <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      default: return <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'friends', label: friends.length > 0 ? `Friends · ${friends.length}` : 'Friends' },
  ];

  const headerContent = (
    <div className="pt-safe-content pb-3 px-6 border-b-2 border-foreground">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH</p>
          <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">Social</h1>
        </div>
        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('friends')}
              className="relative w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
            >
              <UserPlus className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {pendingRequests.length}
              </span>
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/groups')}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <Users className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Tab switcher — 3 tabs */}
      <div className="flex gap-0 border-b border-border/0 -mx-6 px-6">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); hapticLight(); }}
            className={cn(
              'flex-1 py-2.5 text-[13px] font-bold transition-colors relative',
              activeTab === id ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
            {activeTab === id && (
              <motion.div
                layoutId="social-tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-[2px] bg-foreground rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout header={headerContent} mainClassName="pb-nav bg-[#F8F8F6]">
      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            <SocialFeedTab />
          </motion.div>
        )}

        {activeTab === 'upcoming' && (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            <UpcomingRoundsTab />
          </motion.div>
        )}

        {activeTab === 'friends' && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="pt-4"
          >
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <section className="mb-4">
                <div className="flex items-center gap-2 px-6 mb-2">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"
                  />
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Pending</p>
                  <span className="text-[11px] font-bold text-muted-foreground ml-auto">{pendingRequests.length}</span>
                </div>
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      isProcessing={processingId === request.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Add Friend */}
            <section className="mb-4">
              <div className="flex items-center justify-between px-6 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Add a Friend</p>
                <div className="flex gap-1.5">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setContactSyncOpen(true)}
                    className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
                  >
                    <Contact className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setScannerOpen(true)}
                    className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
                  >
                    <ScanLine className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mx-6">
                <div className="bg-muted rounded-xl p-1 flex gap-1 mb-4">
                  {(['code', 'email', 'phone'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSearchType(type)}
                      className={
                        searchType === type
                          ? 'bg-white rounded-lg shadow-sm text-foreground font-bold text-sm py-2 flex-1 text-center'
                          : 'text-muted-foreground font-medium text-sm py-2 flex-1 text-center'
                      }
                    >
                      {type === 'code' ? 'Code' : type === 'email' ? 'Email' : 'Phone'}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  {getSearchIcon()}
                  <input
                    placeholder={getPlaceholder()}
                    value={searchValue}
                    onChange={(e) => setSearchValue(
                      searchType === 'code' ? e.target.value.toUpperCase() : e.target.value
                    )}
                    className={`bg-muted/50 rounded-xl border-0 py-3 px-4 text-sm w-full pl-9 outline-none ${
                      searchType === 'code' ? 'font-mono uppercase tracking-widest' : ''
                    }`}
                    maxLength={searchType === 'code' ? 6 : undefined}
                    type={searchType === 'email' ? 'email' : searchType === 'phone' ? 'tel' : 'text'}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSendRequest()}
                  disabled={!searchValue.trim() || isSending}
                  className="bg-foreground text-background rounded-xl px-5 py-3 font-bold text-sm mt-3 w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {isSending ? 'Sending...' : 'Add Friend'}
                </motion.button>
              </div>
            </section>

            {/* Friend Code */}
            <section className="mb-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowCode(v => !v); hapticLight(); }}
                className="w-full flex items-center justify-between bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3 mx-0"
                style={{ marginLeft: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-4 h-4 text-[#F0EE3A]" />
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-foreground leading-none">Your Friend Code</p>
                    <p className="font-mono text-[13px] font-black tracking-[0.2em] text-foreground/60 mt-0.5">
                      {friendCode || '------'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showCode && 'rotate-180')} />
              </motion.button>

              <AnimatePresence>
                {showCode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mt-2">
                      <div className="font-mono text-3xl font-black tracking-[0.25em] text-foreground text-center py-4 bg-muted/30 rounded-xl mb-3">
                        {friendCode || '------'}
                      </div>
                      {friendCode && <ShareFriendCode friendCode={friendCode} userName={userName} />}
                      {friendCode && (
                        <div className="shrink-0 mt-3 flex justify-center">
                          <FriendCodeQR friendCode={friendCode} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Friends List */}
            <section className="pb-8">
              <div className="flex items-center justify-between px-6 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Your Friends</p>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {friends.length}{!isPro && maxFriends !== Infinity ? `/${maxFriends}` : ''}
                </span>
              </div>

              {atFriendLimit && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setShowPaywall(true)}
                  className="bg-[#F0EE3A]/10 border border-[#F0EE3A]/40 rounded-2xl mx-6 p-4 flex items-center gap-3 mb-3 w-[calc(100%-3rem)]"
                >
                  <Crown className="w-4 h-4 text-[#A08800] flex-shrink-0" />
                  <span className="text-sm font-semibold text-foreground flex-1 text-left">Upgrade for unlimited friends</span>
                  <span className="bg-foreground text-background rounded-xl px-4 py-2 text-sm font-bold">Upgrade</span>
                </motion.button>
              )}

              {loading ? (
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-foreground border-t-transparent rounded-full" />
                </div>
              ) : friends.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">No friends yet</h3>
                  <p className="text-sm text-muted-foreground max-w-[240px]">
                    Share your friend code or QR with golf buddies to connect and track each other's rounds.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend, index) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <FriendCard
                        friend={friend}
                        onRemove={handleRemove}
                        isRemoving={processingId === friend.friendshipId}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <QRCodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleQRScan} />
      <ContactSyncSheet open={contactSyncOpen} onClose={() => setContactSyncOpen(false)} />
      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="Unlimited Friends" />
    </AppLayout>
  );
}
