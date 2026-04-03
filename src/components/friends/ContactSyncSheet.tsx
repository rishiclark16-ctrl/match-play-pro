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
  Contact,
  X
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
  const [hasConsented, setHasConsented] = useState(false);

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
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] bg-[#F8F8F6] rounded-t-3xl border-0 p-0 [&>button]:hidden">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-4">
          <h2 className="text-[20px] font-black tracking-[-0.04em] text-[#0A0A0A]">Sync Contacts</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!contacts && !loading && !hasConsented && (
          <div className="flex flex-col h-[calc(100%-80px)] overflow-y-auto">
            {/* Permission card */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-4 p-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F0EE3A] flex items-center justify-center mx-auto mb-3 text-[#0A0A0A]">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="font-black text-[18px] tracking-[-0.03em] text-[#0A0A0A]">Find Your Golf Buddies</h3>
              <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">
                We'll check your contacts to see who's already on the app.
              </p>
            </div>

            {/* How it works card */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-4 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">How it works</p>
              <ul className="space-y-2.5">
                <li className="flex gap-2 text-[13px] text-muted-foreground">
                  <span className="shrink-0 font-bold text-[#0A0A0A]">1.</span>
                  <span>Your contacts' email addresses and phone numbers are sent to our server to find matches.</span>
                </li>
                <li className="flex gap-2 text-[13px] text-muted-foreground">
                  <span className="shrink-0 font-bold text-[#0A0A0A]">2.</span>
                  <span>We only check for existing MATCH Golf users — your contact data is <strong className="text-[#0A0A0A]">not stored</strong> on our servers.</span>
                </li>
                <li className="flex gap-2 text-[13px] text-muted-foreground">
                  <span className="shrink-0 font-bold text-[#0A0A0A]">3.</span>
                  <span>You can then send friend requests or invite others to join.</span>
                </li>
              </ul>
            </div>

            {/* Enable button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={() => { setHasConsented(true); handleSync(); }}
              className="bg-foreground text-background rounded-2xl h-[52px] font-bold mx-6 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              I Agree — Find Friends
            </motion.button>
            <button
              onClick={onClose}
              className="mt-3 text-[13px] text-muted-foreground mx-auto block"
            >
              No thanks
            </button>
          </div>
        )}

        {!contacts && !loading && hasConsented && (
          <div className="flex flex-col items-center px-6">
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] w-full p-5 text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F0EE3A] flex items-center justify-center mx-auto mb-3 text-[#0A0A0A]">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="font-black text-[18px] tracking-[-0.03em] text-[#0A0A0A]">Ready to Sync</h3>
              <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">
                Tap below to check your contacts for friends on the app.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={handleSync}
              className="bg-foreground text-background rounded-2xl h-[52px] font-bold w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Contacts
            </motion.button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin h-10 w-10 border-4 border-[#0A0A0A] border-t-transparent rounded-full mb-4" />
            <p className="text-[14px] text-muted-foreground">Syncing contacts...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center px-6">
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] w-full p-5 text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="font-black text-[18px] tracking-[-0.03em] text-[#0A0A0A]">Unable to Access Contacts</h3>
              <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">{error}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={handleSync}
              className="bg-foreground text-background rounded-2xl h-[52px] font-bold w-full flex items-center justify-center gap-2"
            >
              Try Again
            </motion.button>
          </div>
        )}

        {contacts && !loading && (
          <div className="flex flex-col h-[calc(100%-80px)]">
            {/* Summary */}
            <div className="flex gap-3 mb-4 px-6">
              <div className="flex-1 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-3 text-center">
                <div className="text-2xl font-black tracking-[-0.04em] text-[#0A0A0A]">{contacts.matched.length}</div>
                <div className="text-[11px] text-muted-foreground">On the app</div>
              </div>
              <div className="flex-1 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-3 text-center">
                <div className="text-2xl font-black tracking-[-0.04em] text-[#0A0A0A]">{contacts.unmatched.length}</div>
                <div className="text-[11px] text-muted-foreground">To invite</div>
              </div>
            </div>

            <Tabs defaultValue="matched" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-6" style={{ width: 'calc(100% - 3rem)' }}>
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
                    <div className="text-center py-8 text-muted-foreground px-6">
                      <p className="text-[14px]">No contacts found on the app yet.</p>
                      <p className="text-[12px] mt-1">Invite your friends to join!</p>
                    </div>
                  ) : (
                    <div>
                      {contacts.matched.map((contact, index) => (
                        <motion.div
                          key={contact.profileId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.03 }}
                          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-2 px-4 py-3 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground shrink-0 overflow-hidden">
                            {contact.avatarUrl ? (
                              <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[13px]">{getInitials(contact.name)}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground truncate">{contact.name}</div>
                            {contact.handicap !== undefined && (
                              <div className="text-[12px] text-muted-foreground">
                                Handicap: {contact.handicap}
                              </div>
                            )}
                          </div>

                          {contact.isAlreadyFriend ? (
                            <span className="bg-[#F0FFF4] text-[#22C55E] rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0">
                              Friends
                            </span>
                          ) : contact.isPendingRequest || recentlySent.has(contact.profileId) ? (
                            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0">
                              Pending
                            </span>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                              onClick={() => handleSendRequest(contact)}
                              disabled={sendingTo === contact.profileId}
                              className="bg-foreground text-background rounded-xl px-3 py-1.5 text-[12px] font-bold shrink-0 disabled:opacity-40"
                            >
                              {sendingTo === contact.profileId ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                'Add'
                              )}
                            </motion.button>
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
                    <div className="text-center py-8 text-muted-foreground px-6">
                      <p className="text-[14px]">All your contacts are already on the app!</p>
                    </div>
                  ) : (
                    <div>
                      {contacts.unmatched.slice(0, 50).map((contact, index) => (
                        <motion.div
                          key={contact.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.02 }}
                          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-2 px-4 py-3 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground shrink-0">
                            <span className="text-[13px]">{getInitials(contact.name)}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground truncate">{contact.name}</div>
                            <div className="text-[12px] text-muted-foreground truncate">
                              {contact.emails[0] || contact.phones[0] || 'No contact info'}
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            {contact.phones.length > 0 && (
                              <motion.button
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
                                onClick={() => handleInvite(contact, 'sms')}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </motion.button>
                            )}
                            {contact.emails.length > 0 && (
                              <motion.button
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
                                onClick={() => handleInvite(contact, 'email')}
                              >
                                <Mail className="h-4 w-4" />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {contacts.unmatched.length > 50 && (
                        <p className="text-center text-[12px] text-muted-foreground py-2">
                          Showing first 50 contacts
                        </p>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>

            {/* Refresh button */}
            <div className="pt-4 px-6 pb-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={handleSync}
                disabled={loading}
                className="bg-foreground text-background rounded-2xl h-[52px] font-bold w-full flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Contacts
              </motion.button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
