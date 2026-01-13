import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Mail, 
  MessageSquare, 
  Check, 
  Clock, 
  RefreshCw,
  AlertCircle,
  Contact
} from 'lucide-react';
import { useContacts, MatchedContact, DeviceContact } from '@/hooks/useContacts';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { hapticSuccess, hapticError, hapticLight } from '@/lib/haptics';

interface ContactSyncSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ContactSyncSheet({ open, onClose }: ContactSyncSheetProps) {
  const { user } = useAuth();
  const { contacts, loading, error, syncContacts, clearContacts } = useContacts();
  const { sendFriendRequest } = useFriends();
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [recentlySent, setRecentlySent] = useState<Set<string>>(new Set());

  const handleSync = async () => {
    if (!user) return;
    hapticLight();
    const result = await syncContacts(user.id);
    if (result) {
      hapticSuccess();
      toast.success(`Found ${result.matched.length} contacts on the app!`);
    }
  };

  const handleSendRequest = async (contact: MatchedContact) => {
    if (!contact.friendCode) return;
    
    setSendingTo(contact.profileId);
    const result = await sendFriendRequest(contact.friendCode);
    setSendingTo(null);

    if (result.success) {
      hapticSuccess();
      toast.success(`Friend request sent to ${contact.name}!`);
      setRecentlySent(prev => new Set(prev).add(contact.profileId));
    } else {
      hapticError();
      toast.error(result.error || 'Failed to send request');
    }
  };

  const handleInvite = (contact: DeviceContact, method: 'sms' | 'email') => {
    hapticLight();
    const message = encodeURIComponent(
      `Hey! I'm using this awesome golf app to track my rounds. Join me! Download it here: ${window.location.origin}`
    );

    if (method === 'sms' && contact.phones.length > 0) {
      window.open(`sms:${contact.phones[0]}?body=${message}`, '_blank');
    } else if (method === 'email' && contact.emails.length > 0) {
      const subject = encodeURIComponent('Join me on this golf app!');
      window.open(`mailto:${contact.emails[0]}?subject=${subject}&body=${message}`, '_blank');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Contact className="h-5 w-5 text-primary" />
            Sync Contacts
          </SheetTitle>
          <SheetDescription>
            Find friends from your contacts who are already using the app
          </SheetDescription>
        </SheetHeader>

        {!contacts && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border-2 border-primary/20">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Find Your Golf Buddies</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
              We'll check your contacts to see who's already on the app. You can then add them as friends or invite others.
            </p>
            <Button onClick={handleSync} size="lg" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Contacts
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4" />
            <p className="text-muted-foreground">Syncing contacts...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-bold mb-2">Unable to Access Contacts</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-4">
              {error}
            </p>
            <Button variant="outline" onClick={handleSync}>
              Try Again
            </Button>
          </div>
        )}

        {contacts && !loading && (
          <div className="flex flex-col h-[calc(100%-80px)]">
            {/* Summary */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <div className="text-2xl font-bold text-primary">{contacts.matched.length}</div>
                <div className="text-xs text-muted-foreground">On the app</div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-muted border border-border text-center">
                <div className="text-2xl font-bold">{contacts.unmatched.length}</div>
                <div className="text-xs text-muted-foreground">To invite</div>
              </div>
            </div>

            <Tabs defaultValue="matched" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="matched" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  On App ({contacts.matched.length})
                </TabsTrigger>
                <TabsTrigger value="invite" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite ({contacts.unmatched.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="matched" className="flex-1 overflow-auto mt-3">
                <AnimatePresence mode="popLayout">
                  {contacts.matched.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No contacts found on the app yet.</p>
                      <p className="text-xs mt-1">Invite your friends to join!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.matched.map((contact, index) => (
                        <motion.div
                          key={contact.profileId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-card"
                        >
                          <Avatar className="h-12 w-12 border-2 border-border">
                            <AvatarImage src={contact.avatarUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{contact.name}</div>
                            {contact.handicap !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                Handicap: {contact.handicap}
                              </div>
                            )}
                          </div>

                          {contact.isAlreadyFriend ? (
                            <Badge variant="secondary" className="gap-1 shrink-0">
                              <Check className="h-3 w-3" />
                              Friends
                            </Badge>
                          ) : contact.isPendingRequest || recentlySent.has(contact.profileId) ? (
                            <Badge variant="outline" className="gap-1 shrink-0">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSendRequest(contact)}
                              disabled={sendingTo === contact.profileId}
                              className="shrink-0"
                            >
                              {sendingTo === contact.profileId ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="invite" className="flex-1 overflow-auto mt-3">
                <AnimatePresence mode="popLayout">
                  {contacts.unmatched.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>All your contacts are already on the app!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.unmatched.slice(0, 50).map((contact, index) => (
                        <motion.div
                          key={contact.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-card"
                        >
                          <Avatar className="h-12 w-12 border-2 border-border">
                            <AvatarFallback className="bg-muted">
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{contact.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {contact.emails[0] || contact.phones[0] || 'No contact info'}
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            {contact.phones.length > 0 && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleInvite(contact, 'sms')}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                            {contact.emails.length > 0 && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleInvite(contact, 'email')}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {contacts.unmatched.length > 50 && (
                        <p className="text-center text-xs text-muted-foreground py-2">
                          Showing first 50 contacts
                        </p>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>

            {/* Refresh button */}
            <div className="pt-4 border-t mt-4">
              <Button 
                variant="outline" 
                onClick={handleSync} 
                className="w-full gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Contacts
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
