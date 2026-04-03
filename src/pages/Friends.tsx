import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, Hash, AtSign, Phone, ScanLine, Contact, Crown, Copy, QrCode, Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useProfile } from '@/hooks/useProfile';
import { useFriends, SearchResult } from '@/hooks/useFriends';
import { useSubscription } from '@/hooks/useSubscription';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { ShareFriendCode } from '@/components/friends/ShareFriendCode';
import { FriendCodeQR } from '@/components/friends/FriendCodeQR';
import { QRCodeScanner } from '@/components/friends/QRCodeScanner';
import { ContactSyncSheet } from '@/components/friends/ContactSyncSheet';
import { PaywallModal, ProBadge } from '@/components/subscription';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

export default function Friends() {
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
    refetch: refetchFriends,
  } = useFriends();

  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'code' | 'email' | 'phone'>('name');
  const [isSending, setIsSending] = useState(false);
  const [nameResults, setNameResults] = useState<SearchResult[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [addingProfileId, setAddingProfileId] = useState<string | null>(null);
  const nameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [contactSyncOpen, setContactSyncOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Subscription gating for friend limits
  const { isPro, canAddFriend, limits } = useSubscription();
  const atFriendLimit = !canAddFriend(friends.length);
  const maxFriends = limits.maxFriends;

  // Get friend code from profile
  const friendCode = profile?.friend_code ?? null;
  const userName = profile?.full_name;

  // Debounced name search
  useEffect(() => {
    if (searchType !== 'name') {
      setNameResults([]);
      return;
    }
    if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current);
    if (searchValue.trim().length < 2) {
      setNameResults([]);
      setNameSearching(false);
      return;
    }
    setNameSearching(true);
    nameSearchTimer.current = setTimeout(async () => {
      const results = await searchByName(searchValue.trim());
      setNameResults(results);
      setNameSearching(false);
    }, 400);
    return () => { if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current); };
  }, [searchValue, searchType, searchByName]);

  const handleAddByProfile = async (profileId: string) => {
    if (atFriendLimit) {
      setShowPaywall(true);
      return;
    }
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

  // Handle deep link from QR code
  useEffect(() => {
    const addCode = searchParams.get('add');
    if (addCode && addCode !== friendCode) {
      setSearchValue(addCode.toUpperCase());
      setSearchType('code');
      // Auto-send request after a short delay to let UI render
      const timer = setTimeout(() => {
        handleSendRequest(addCode);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, friendCode]);

  const handleSendRequest = async (codeOverride?: string) => {
    const value = codeOverride || searchValue.trim();
    if (!value) return;

    // Check friend limit before sending request
    if (atFriendLimit) {
      setShowPaywall(true);
      return;
    }

    setIsSending(true);

    let result: { success: boolean; error?: string };

    switch (searchType) {
      case 'email':
        result = await sendFriendRequestByEmail(value);
        break;
      case 'phone':
        result = await sendFriendRequestByPhone(value);
        break;
      default:
        result = await sendFriendRequest(value);
    }

    setIsSending(false);

    if (result.success) {
      hapticSuccess();
      toast.success('Friend request sent!');
      setSearchValue('');
      // Clear the URL param if present
      if (searchParams.get('add')) {
        navigate('/friends', { replace: true });
      }
    } else {
      hapticError();
      toast.error(result.error || 'Failed to send request');
    }
  };

  const handleAccept = async (friendshipId: string) => {
    // Check friend limit before accepting
    if (atFriendLimit) {
      setShowPaywall(true);
      return;
    }

    setProcessingId(friendshipId);
    const success = await acceptFriendRequest(friendshipId);
    setProcessingId(null);

    if (success) {
      hapticSuccess();
      toast.success('Friend added!');
    } else {
      toast.error('Failed to accept request');
    }
  };

  const handleDecline = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    const success = await declineFriendRequest(friendshipId);
    setProcessingId(null);

    if (success) {
      hapticLight();
    } else {
      toast.error('Failed to decline request');
    }
  };

  const handleRemove = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    const success = await removeFriend(friendshipId);
    setProcessingId(null);

    if (success) {
      hapticLight();
      toast.success('Friend removed');
    } else {
      toast.error('Failed to remove friend');
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'name': return 'Search by name...';
      case 'email': return 'Enter email...';
      case 'phone': return 'Enter phone...';
      default: return 'Enter code...';
    }
  };

  const getSearchIcon = () => {
    switch (searchType) {
      case 'name': return <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      case 'email': return <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      case 'phone': return <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      default: return <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleRefresh = useCallback(async () => {
    hapticLight();
    await refetchFriends();
    hapticSuccess();
  }, [refetchFriends]);

  const handleQRScan = (code: string) => {
    setScannerOpen(false);
    hapticSuccess();
    // Set search type to code and trigger request
    setSearchType('code');
    setSearchValue(code.toUpperCase());
    // Auto-send request
    setTimeout(() => {
      handleSendRequest(code);
    }, 100);
  };

  const headerContent = (
    <div className="pt-safe-content pb-3 px-6 border-b-2 border-foreground flex items-center justify-between">
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
          <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">Friends</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right mr-1">
          <p className="text-2xl font-black tabular-nums text-foreground leading-none">{friends.length}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Connected</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/groups')}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <Users className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );

  return (
    <AppLayout
      header={headerContent}
      mainClassName="pb-nav bg-[#F8F8F6]"
    >
      <PullToRefresh onRefresh={handleRefresh}>
      {/* Your Friend Code */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6 mb-2">Your Friend Code</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mx-6 mb-4">
          <div className="font-mono text-3xl font-black tracking-[0.25em] text-foreground text-center py-4 bg-muted/30 rounded-xl mb-3">
            {friendCode || '------'}
          </div>
          {friendCode && (
            <ShareFriendCode friendCode={friendCode} userName={userName} />
          )}
          {friendCode && (
            <button
              onClick={() => setScannerOpen(true)}
              className="w-full border-2 border-border rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2 mt-2"
            >
              <QrCode className="w-4 h-4" />
              Show QR Code
            </button>
          )}
          {friendCode && (
            <div className="shrink-0 mt-3 flex justify-center">
              <FriendCodeQR friendCode={friendCode} />
            </div>
          )}
        </div>
      </motion.section>

      {/* Add Friend */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
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
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mx-6 mb-4">
          {/* Tab switcher */}
          <div className="bg-muted rounded-xl p-1 flex gap-1 mb-4">
            {(['name', 'code', 'email', 'phone'] as const).map((type) => (
              <button
                key={type}
                onClick={() => { setSearchType(type); setSearchValue(''); setNameResults([]); }}
                className={
                  searchType === type
                    ? 'bg-white rounded-lg shadow-sm text-foreground font-bold text-sm py-2 flex-1 text-center'
                    : 'text-muted-foreground font-medium text-sm py-2 flex-1 text-center'
                }
              >
                {type === 'name' ? 'Name' : type === 'code' ? 'Code' : type === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>

          {/* Input */}
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
            {searchType === 'name' && nameSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Name search results */}
          {searchType === 'name' && searchValue.trim().length >= 2 && (
            <div className="mt-3 space-y-1">
              {nameResults.length > 0 ? (
                nameResults.map((result) => {
                  const isFriend = friends.some(f => f.id === result.id);
                  const isPending = sentRequests.includes(result.id);
                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5"
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground overflow-hidden flex-shrink-0">
                        {result.avatarUrl ? (
                          <img src={result.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          (result.fullName ?? '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{result.fullName || 'Unknown'}</p>
                        {result.handicap != null && (
                          <p className="text-[11px] text-muted-foreground">{result.handicap} HCP</p>
                        )}
                      </div>
                      {isFriend ? (
                        <span className="text-[11px] font-bold text-emerald-600 px-3 py-1.5">Friends</span>
                      ) : isPending ? (
                        <span className="text-[11px] font-bold text-muted-foreground px-3 py-1.5">Sent</span>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddByProfile(result.id)}
                          disabled={addingProfileId === result.id}
                          className="bg-foreground text-background rounded-lg px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                        >
                          <UserPlus className="w-3 h-3" />
                          {addingProfileId === result.id ? '...' : 'Add'}
                        </motion.button>
                      )}
                    </div>
                  );
                })
              ) : !nameSearching ? (
                <p className="text-[12px] text-muted-foreground text-center py-3">No users found</p>
              ) : null}
            </div>
          )}

          {/* Send button (not shown for name search) */}
          {searchType !== 'name' && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSendRequest()}
              disabled={!searchValue.trim() || isSending}
              className="bg-foreground text-background rounded-xl px-5 py-3 font-bold text-sm mt-3 w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Add Friend'}
            </motion.button>
          )}
        </div>
      </motion.section>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
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
        </motion.section>
      )}

      {/* Friends List */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="pb-8"
      >
        <div className="flex items-center justify-between px-6 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Your Friends</p>
          <span className="text-[11px] font-bold text-muted-foreground">
            {friends.length}{!isPro && maxFriends !== Infinity ? `/${maxFriends}` : ''}
          </span>
        </div>

        {/* Friend limit upgrade prompt */}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 flex flex-col items-center justify-center py-12 text-center px-6"
          >
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-[13px] font-bold text-foreground mb-1">No friends yet</h3>
            <p className="text-[12px] text-muted-foreground max-w-[240px] leading-relaxed">
              Share your friend code or QR with golf buddies to connect and track each other's rounds.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-foreground text-background rounded-2xl px-6 py-3 font-bold text-sm flex items-center gap-2 mt-5"
            >
              <UserPlus className="h-4 w-4" />
              Add Your First Friend
            </motion.button>
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
      </motion.section>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
      />

      {/* Contact Sync Sheet */}
      <ContactSyncSheet
        open={contactSyncOpen}
        onClose={() => setContactSyncOpen(false)}
      />

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Unlimited Friends"
      />
      </PullToRefresh>
    </AppLayout>
  );
}
