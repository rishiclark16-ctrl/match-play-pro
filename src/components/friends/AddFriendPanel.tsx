import { motion } from 'framer-motion';
import { UserPlus, Hash, AtSign, Phone, Search, Loader2, Check } from 'lucide-react';
import type { SearchResult } from '@/hooks/useFriends';
import { cn } from '@/lib/utils';

export type FriendSearchType = 'name' | 'code' | 'email' | 'phone';

const TYPES: { id: FriendSearchType; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'code', label: 'Code' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
];

const PLACEHOLDER: Record<FriendSearchType, string> = {
  name: 'Search by name...',
  code: 'Enter code...',
  email: 'Enter email...',
  phone: 'Enter phone...',
};

const ICON: Record<FriendSearchType, typeof Search> = {
  name: Search,
  code: Hash,
  email: AtSign,
  phone: Phone,
};

interface AddFriendPanelProps {
  searchType: FriendSearchType;
  onSearchTypeChange: (type: FriendSearchType) => void;
  value: string;
  onValueChange: (value: string) => void;
  nameResults: SearchResult[];
  nameSearching: boolean;
  isFriend: (id: string) => boolean;
  isPending: (id: string) => boolean;
  addingProfileId: string | null;
  onAddProfile: (id: string) => void;
  isSending: boolean;
  onSend: () => void;
}

/** "Add a friend" card: search-type segmented control, input, results, send. */
export function AddFriendPanel({
  searchType,
  onSearchTypeChange,
  value,
  onValueChange,
  nameResults,
  nameSearching,
  isFriend,
  isPending,
  addingProfileId,
  onAddProfile,
  isSending,
  onSend,
}: AddFriendPanelProps) {
  const Icon = ICON[searchType];

  return (
    <div className="rounded-[20px] border border-border bg-card p-3.5">
      <div className="flex gap-1 rounded-[16px] bg-muted p-1 mb-3" role="group" aria-label="Search by">
        {TYPES.map(({ id, label }) => (
          <button
            key={id}
            aria-pressed={searchType === id}
            onClick={() => onSearchTypeChange(id)}
            className={cn(
              'flex-1 h-10 rounded-[12px] text-[14px] font-semibold transition-colors',
              searchType === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
        <input
          placeholder={PLACEHOLDER[searchType]}
          value={value}
          onChange={(e) => onValueChange(searchType === 'code' ? e.target.value.toUpperCase() : e.target.value)}
          className={cn(
            'w-full h-12 rounded-[14px] border border-transparent bg-muted/70 pl-11 pr-10 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-card',
            searchType === 'code' && 'font-mono uppercase tracking-widest'
          )}
          maxLength={searchType === 'code' ? 6 : undefined}
          type={searchType === 'email' ? 'email' : searchType === 'phone' ? 'tel' : 'text'}
        />
        {searchType === 'name' && nameSearching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchType === 'name' && value.trim().length >= 2 && (
        <div className="mt-2 -mx-1">
          {nameResults.length > 0 ? (
            nameResults.map((result) => {
              const friend = isFriend(result.id);
              const pending = isPending(result.id);
              return (
                <div key={result.id} className="flex items-center gap-3 rounded-[14px] px-1 py-1.5">
                  <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-[14px] bg-muted flex items-center justify-center text-[14px] font-bold text-primary">
                    {result.avatarUrl ? (
                      <img src={result.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (result.fullName ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-foreground truncate">{result.fullName || 'Unknown'}</p>
                    {result.handicap != null && (
                      <p className="text-[12px] text-muted-foreground">{result.handicap} handicap</p>
                    )}
                  </div>
                  {friend ? (
                    <span className="inline-flex h-9 items-center gap-1 px-2 text-[13px] font-semibold text-primary">
                      <Check className="h-4 w-4" /> Friends
                    </span>
                  ) : pending ? (
                    <span className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-muted-foreground">Sent</span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => onAddProfile(result.id)}
                      disabled={addingProfileId === result.id}
                      className="h-11 rounded-[14px] bg-primary px-3.5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {addingProfileId === result.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Add
                    </motion.button>
                  )}
                </div>
              );
            })
          ) : !nameSearching ? (
            <p className="py-3 text-center text-[13px] text-muted-foreground">
              No golfers found. Try their friend code instead.
            </p>
          ) : null}
        </div>
      )}

      {searchType !== 'name' && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSend}
          disabled={!value.trim() || isSending}
          className="mt-3 w-full h-[52px] rounded-[14px] bg-foreground text-background text-[15px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {isSending ? 'Sending...' : 'Add friend'}
        </motion.button>
      )}
    </div>
  );
}
