import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, Search, Hash, AtSign, Phone, ScanLine, Contact } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { GeometricBackground } from '@/components/ui/geometric-background';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { ShareFriendCode } from '@/components/friends/ShareFriendCode';
import { FriendCodeQR } from '@/components/friends/FriendCodeQR';
import { QRCodeScanner } from '@/components/friends/QRCodeScanner';
import { ContactSyncSheet } from '@/components/friends/ContactSyncSheet';
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
    acceptFriendRequest, 
    declineFriendRequest,
    removeFriend,
  } = useFriends();

  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'email' | 'phone'>('code');
  const [isSending, setIsSending] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [contactSyncOpen, setContactSyncOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get friend code from profile
  const friendCode = (profile as any)?.friend_code as string | null;
  const userName = profile?.full_name;

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
      case 'email': return 'Enter email...';
      case 'phone': return 'Enter phone...';
      default: return 'Enter code...';
    }
  };

  const getSearchIcon = () => {
    switch (searchType) {
      case 'email': return <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      case 'phone': return <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      default: return <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
    }
  };

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
    <div className="bg-background/95 backdrop-blur-sm border-b-2 border-border px-4 pb-2">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0 border-2 w-11 h-11"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="heading-lg">Friends</h1>
          <p className="text-xs text-muted-foreground font-mono">
            <span className="number-display">{friends.length}</span> connection{friends.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout
      header={headerContent}
      background={<GeometricBackground />}
      mainClassName="px-4"
    >
        {/* Your Friend Code with QR and Sharing */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-primary" />
            <span className="label-sm">Your Friend Code</span>
          </div>
          <TechCard variant="elevated" accentBar="top">
            <TechCardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* QR Code */}
                {friendCode && (
                  <div className="shrink-0">
                    <FriendCodeQR friendCode={friendCode} />
                  </div>
                )}
                
                {/* Code and Sharing */}
                <div className="flex-1 flex flex-col items-center sm:items-start gap-3 min-w-0">
                  <span className="text-3xl font-mono font-black tracking-[0.3em] text-primary">
                    {friendCode || '------'}
                  </span>
                  
                  {friendCode && (
                    <ShareFriendCode friendCode={friendCode} userName={userName} />
                  )}
                </div>
              </div>
            </TechCardContent>
          </TechCard>
        </motion.section>

        {/* Add Friend */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="label-sm">Add a Friend</span>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactSyncOpen(true)}
                className="gap-1.5 border-2 h-8"
              >
                <Contact className="h-4 w-4" />
                Contacts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="gap-1.5 border-2 h-8"
              >
                <ScanLine className="h-4 w-4" />
                Scan
              </Button>
            </div>
          </div>
          <TechCard hover>
            <TechCardContent className="space-y-3">
              {/* Search Type Tabs */}
              <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="code" className="text-xs gap-1">
                    <Hash className="w-3 h-3" />
                    Code
                  </TabsTrigger>
                  <TabsTrigger value="email" className="text-xs gap-1">
                    <AtSign className="w-3 h-3" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="text-xs gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {getSearchIcon()}
                  <Input
                    placeholder={getPlaceholder()}
                    value={searchValue}
                    onChange={(e) => setSearchValue(
                      searchType === 'code' ? e.target.value.toUpperCase() : e.target.value
                    )}
                    className={`pl-9 bg-background border-2 border-border focus:border-primary ${
                      searchType === 'code' ? 'font-mono uppercase tracking-widest text-lg' : ''
                    }`}
                    maxLength={searchType === 'code' ? 6 : undefined}
                    type={searchType === 'email' ? 'email' : searchType === 'phone' ? 'tel' : 'text'}
                  />
                </div>
                <Button
                  onClick={() => handleSendRequest()}
                  disabled={!searchValue.trim() || isSending}
                  className="shrink-0 font-bold px-6"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {searchType === 'code' && 'Enter a 6-character friend code'}
                {searchType === 'email' && 'Enter the email they registered with'}
                {searchType === 'phone' && 'Enter their phone number'}
              </p>
            </TechCardContent>
          </TechCard>
        </motion.section>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="label-sm">Pending Requests</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">
                {pendingRequests.length}
              </span>
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
          className="mt-6 pb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="label-sm">Your Friends</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              {friends.length}
            </span>
          </div>
          
          {loading ? (
            <TechCard>
              <TechCardContent className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
              </TechCardContent>
            </TechCard>
          ) : friends.length === 0 ? (
            <TechCard variant="elevated">
              <TechCardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4 border-2 border-border">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-1">No friends yet</h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  Share your friend code or QR with golf buddies to connect and track each other's rounds.
                </p>
              </TechCardContent>
            </TechCard>
          ) : (
            <div className="space-y-2">
              {friends.map((friend, index) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
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
    </AppLayout>
  );
}
