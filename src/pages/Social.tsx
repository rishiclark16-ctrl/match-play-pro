import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, ScanLine, Contact, Crown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useFriends, SearchResult } from '@/hooks/useFriends';
import { useSubscription } from '@/hooks/useSubscription';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { AddFriendPanel, type FriendSearchType } from '@/components/friends/AddFriendPanel';
import { FriendCodePanel } from '@/components/friends/FriendCodePanel';
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
    sendFriendRequestByProfileId,
    searchByName,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    sentRequests,
  } = useFriends();

  const initialTab = (searchParams.get('tab') as Tab) || 'feed';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<FriendSearchType>('name');
  const [isSending, setIsSending] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [contactSyncOpen, setContactSyncOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [nameResults, setNameResults] = useState<SearchResult[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [addingProfileId, setAddingProfileId] = useState<string | null>(null);
  const nameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);
  const searchByNameRef = useRef(searchByName);
  searchByNameRef.current = searchByName;

  const { isPro, canAddFriend, limits } = useSubscription();
  const atFriendLimit = !canAddFriend(friends.length);
  const maxFriends = limits.maxFriends;
  const friendCode = profile?.friend_code ?? null;
  const userName = profile?.full_name;

  // Debounced name search — uses ref to avoid dependency churn
  useEffect(() => {
    if (searchType !== 'name') {
      setNameResults([]);
      setNameSearching(false);
      return;
    }
    if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current);
    const trimmed = searchValue.trim();
    if (trimmed.length < 2) {
      setNameResults([]);
      setNameSearching(false);
      return;
    }
    setNameSearching(true);
    const requestId = ++searchRequestId.current;
    nameSearchTimer.current = setTimeout(async () => {
      const results = await searchByNameRef.current(trimmed);
      // Only apply results if this is still the latest request
      if (requestId === searchRequestId.current) {
        setNameResults(results);
        setNameSearching(false);
      }
    }, 350);
    return () => { if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current); };
  }, [searchValue, searchType]);

  const handleAddByProfile = async (profileId: string) => {
    if (atFriendLimit) { setShowPaywall(true); return; }
    setAddingProfileId(profileId);
    const result = await sendFriendRequestByProfileId(profileId);
    setAddingProfileId(null);
    if (result.success) {
      hapticSuccess();
      toast.success('Friend request sent!');
    } else {
      hapticError();
      toast.error(result.error || 'Failed to send request');
    }
  };

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
      if (searchParams.get('add')) navigate('/social?tab=friends', { replace: true });
    } else {
      hapticError();
      toast.error(result.error || 'Failed to send request');
    }
  };

  // Handle deep link from QR code — placed after handleSendRequest to avoid stale closure
  useEffect(() => {
    const addCode = searchParams.get('add');
    if (addCode && addCode !== friendCode) {
      setActiveTab('friends');
      setSearchValue(addCode.toUpperCase());
      setSearchType('code');
      if (atFriendLimit) { setShowPaywall(true); return; }
      const timer = setTimeout(() => {
        sendFriendRequest(addCode).then(result => {
          if (result.success) {
            hapticSuccess();
            toast.success('Friend request sent!');
            setSearchValue('');
          } else {
            hapticError();
            toast.error(result.error || 'Failed to send request');
          }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
    // atFriendLimit must be in deps — without it, the paywall check uses a
    // stale value if the user's friend count crosses the limit mid-flow.
  }, [searchParams, friendCode, sendFriendRequest, atFriendLimit]);

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'friends', label: friends.length > 0 ? `Friends · ${friends.length}` : 'Friends' },
  ];

  const headerContent = (
    <div className="pt-safe-content pb-3 px-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] leading-none text-foreground">Social</h1>
        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('friends')}
              aria-label={`${pendingRequests.length} friend request${pendingRequests.length === 1 ? '' : 's'}`}
              className="relative h-11 w-11 rounded-[14px] bg-muted text-primary flex items-center justify-center"
            >
              <UserPlus className="h-[18px] w-[18px]" />
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#B42318] text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-background">
                {pendingRequests.length}
              </span>
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/groups')}
            aria-label="Groups"
            className="h-11 rounded-[14px] bg-muted text-primary pl-3 pr-3.5 inline-flex items-center gap-1.5 text-[14px] font-semibold"
          >
            <Users className="h-[18px] w-[18px]" />
            Groups
          </motion.button>
        </div>
      </div>

      {/* Tab switcher: muted segmented control, active = Forest */}
      <div className="flex gap-1 rounded-[18px] bg-muted p-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); hapticLight(); }}
            aria-pressed={activeTab === id}
            className={cn(
              'relative flex-1 h-11 rounded-[14px] text-[14px] font-semibold transition-colors',
              activeTab === id ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {activeTab === id && (
              <motion.span
                layoutId="social-tab-indicator"
                className="absolute inset-0 rounded-[14px] bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const sectionLabel = 'text-[13px] font-semibold text-muted-foreground';

  return (
    <AppLayout header={headerContent} mainClassName="pb-nav bg-background">
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
            className="px-5 pt-2 pb-6 space-y-[18px]"
          >
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <section>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <p className={sectionLabel}>Pending requests</p>
                  <span className="ml-auto text-[12px] font-semibold text-muted-foreground">{pendingRequests.length}</span>
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
            <section>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className={sectionLabel}>Add a friend</p>
                <div className="flex gap-1.5 -my-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setContactSyncOpen(true)}
                    aria-label="Find friends in contacts"
                    className="h-11 w-11 rounded-[14px] bg-muted text-primary flex items-center justify-center"
                  >
                    <Contact className="h-[18px] w-[18px]" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setScannerOpen(true)}
                    aria-label="Scan a friend's QR code"
                    className="h-11 w-11 rounded-[14px] bg-muted text-primary flex items-center justify-center"
                  >
                    <ScanLine className="h-[18px] w-[18px]" />
                  </motion.button>
                </div>
              </div>
              <AddFriendPanel
                searchType={searchType}
                onSearchTypeChange={(type) => { setSearchType(type); setSearchValue(''); setNameResults([]); }}
                value={searchValue}
                onValueChange={setSearchValue}
                nameResults={nameResults}
                nameSearching={nameSearching}
                isFriend={(id) => friends.some(f => f.id === id)}
                isPending={(id) => sentRequests.includes(id)}
                addingProfileId={addingProfileId}
                onAddProfile={handleAddByProfile}
                isSending={isSending}
                onSend={() => handleSendRequest()}
              />
            </section>

            {/* Friend Code */}
            <FriendCodePanel
              friendCode={friendCode}
              userName={userName}
              open={showCode}
              onToggle={() => setShowCode(v => !v)}
            />

            {/* Friends List */}
            <section>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className={sectionLabel}>Your friends</p>
                <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                  {friends.length}{!isPro && maxFriends !== Infinity ? ` of ${maxFriends}` : ''}
                </span>
              </div>

              {atFriendLimit && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setShowPaywall(true)}
                  className="mb-2 w-full rounded-[20px] bg-gold-muted border border-gold/60 p-3.5 flex items-center gap-3 text-left"
                >
                  <span className="h-11 w-11 flex-shrink-0 rounded-[14px] bg-gold text-gold-foreground flex items-center justify-center">
                    <Crown className="h-5 w-5" />
                  </span>
                  <span className="flex-1 text-[14px] font-semibold text-foreground">Go Pro for unlimited friends</span>
                  <span className="h-11 rounded-[14px] bg-primary px-4 inline-flex items-center text-[14px] font-bold text-primary-foreground">Upgrade</span>
                </motion.button>
              )}

              {loading ? (
                <div className="rounded-[20px] border border-border bg-card flex items-center justify-center py-12">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : friends.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[20px] border border-dashed border-border-strong px-6 py-8 text-center"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-gold text-gold-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-foreground">Bring your foursome</h3>
                  <p className="mx-auto mt-1 max-w-[250px] text-[13px] leading-relaxed text-muted-foreground">
                    Share your friend code or QR, then follow each other's rounds and settle up in one tap.
                  </p>
                  {friendCode && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setShowCode(true); hapticLight(); }}
                      className="mt-4 h-11 rounded-[14px] bg-primary px-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-foreground"
                    >
                      Share my code
                    </motion.button>
                  )}
                </motion.div>
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
