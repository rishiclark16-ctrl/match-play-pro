import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, UserPlus, Users, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

export default function Friends() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { 
    friends, 
    pendingRequests, 
    loading, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest,
    removeFriend,
  } = useFriends();

  const [searchCode, setSearchCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get friend code from profile - handle the case where it might not be in the type yet
  const friendCode = (profile as any)?.friend_code as string | null;

  const handleCopyCode = async () => {
    if (!friendCode) return;
    
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      hapticLight();
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSendRequest = async () => {
    if (!searchCode.trim()) return;
    
    setIsSending(true);
    const result = await sendFriendRequest(searchCode.trim());
    setIsSending(false);

    if (result.success) {
      hapticSuccess();
      toast.success('Friend request sent!');
      setSearchCode('');
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
          <div>
            <h1 className="text-xl font-bold text-foreground">Friends</h1>
            <p className="text-xs text-muted-foreground">
              {friends.length} friend{friends.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pb-safe">
        {/* Your Friend Code */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <p className="text-xs text-muted-foreground mb-2">YOUR FRIEND CODE</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xl font-mono font-bold tracking-widest text-primary">
                {friendCode || '------'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Add Friend */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6"
        >
          <p className="text-xs text-muted-foreground mb-2">ADD BY CODE</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter friend code..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="pl-9 font-mono uppercase"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleSendRequest}
              disabled={!searchCode.trim() || isSending}
              className="shrink-0"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </motion.section>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
          >
            <p className="text-xs text-muted-foreground mb-2">
              PENDING REQUESTS ({pendingRequests.length})
            </p>
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
          className="mt-6 pb-8"
        >
          <p className="text-xs text-muted-foreground mb-2">
            YOUR FRIENDS ({friends.length})
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No friends yet</h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Share your friend code with golf buddies to connect and track each other's rounds.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onRemove={handleRemove}
                  isRemoving={processingId === friend.friendshipId}
                />
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
