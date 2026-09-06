# MATCH Golf - Database Schema & API Reference

---

## 1. DATABASE OVERVIEW

- **Provider:** Supabase (hosted PostgreSQL)
- **Project ID:** puqgbsxabcyxrbwwoznn
- **URL:** https://puqgbsxabcyxrbwwoznn.supabase.co
- **Migrations:** 29 migration files in `supabase/migrations/`
- **Security:** Row Level Security (RLS) enabled on all tables

---

## 2. CORE TABLES

### 2.1 `profiles`
Extends Supabase `auth.users` with app-specific data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users.id` |
| `display_name` | TEXT | User's display name |
| `handicap_index` | DECIMAL | Golf handicap index (supports decimals) |
| `avatar_url` | TEXT | URL to profile photo |
| `friend_code` | TEXT | Unique code for friend discovery |
| `home_course` | TEXT | User's home course name |
| `has_onboarded` | BOOLEAN | Whether user completed onboarding |
| `push_token` | TEXT | Device push notification token |
| `created_at` | TIMESTAMPTZ | Account creation time |
| `updated_at` | TIMESTAMPTZ | Last profile update |

### 2.2 `rounds`
Central table for golf rounds.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Round identifier |
| `creator_id` | UUID (FK) | References `profiles.id` |
| `course_name` | TEXT | Name of golf course |
| `course_id` | TEXT | External course identifier |
| `holes` | INTEGER | 9 or 18 |
| `stroke_play` | BOOLEAN | Stroke play enabled |
| `match_play` | BOOLEAN | Match play enabled |
| `stakes` | DECIMAL | Base stakes amount |
| `status` | TEXT | 'active' or 'complete' |
| `join_code` | TEXT | 6-character alphanumeric join code |
| `hole_info` | JSONB | Array of `{number, par, handicap, yardage}` |
| `games` | JSONB | Array of `GameConfig` objects |
| `slope` | DECIMAL | Course slope rating |
| `rating` | DECIMAL | Course rating |
| `handicap_mode` | TEXT | 'auto' or 'manual' |
| `tee_sets` | JSONB | Available tee sets for mixed tees |
| `mixed_tees` | BOOLEAN | Whether mixed tees are active |
| `created_at` | TIMESTAMPTZ | Round creation time |
| `completed_at` | TIMESTAMPTZ | Round completion time |

### 2.3 `players`
Participants in a round.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Player record identifier |
| `round_id` | UUID (FK) | References `rounds.id` |
| `profile_id` | UUID (FK) | References `profiles.id` (null for non-app players) |
| `name` | TEXT | Player display name |
| `handicap` | DECIMAL | Player's handicap index |
| `order_index` | INTEGER | Player order (0-based) |
| `manual_strokes` | INTEGER | Manual strokes for manual handicap mode |
| `is_ghost` | BOOLEAN | Ghost player flag |
| `tee_set_id` | TEXT | Which tee set this player plays from |
| `avatar_url` | TEXT | Player avatar URL |
| `is_scorekeeper` | BOOLEAN | Can enter scores for all players |
| `created_at` | TIMESTAMPTZ | When player was added |

### 2.4 `scores`
Individual hole scores.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Score record identifier |
| `round_id` | UUID (FK) | References `rounds.id` |
| `player_id` | UUID (FK) | References `players.id` |
| `hole_number` | INTEGER | 1-18 |
| `strokes` | INTEGER | Number of strokes |
| `created_at` | TIMESTAMPTZ | Score entry time |
| `updated_at` | TIMESTAMPTZ | Last update time |

**Unique constraint:** `(player_id, hole_number)` -- last-write-wins for conflict resolution.

### 2.5 `presses`
Nassau auto-press tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Press identifier |
| `round_id` | UUID (FK) | References `rounds.id` |
| `start_hole` | INTEGER | Hole where press begins |
| `initiated_by` | UUID | Player who initiated |
| `stakes` | DECIMAL | Press stakes amount |
| `status` | TEXT | 'active', 'won', 'lost', 'pushed' |
| `created_at` | TIMESTAMPTZ | Press creation time |

---

## 3. BETTING TABLES

### 3.1 `prop_bets`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Prop bet identifier |
| `round_id` | UUID (FK) | References `rounds.id` |
| `type` | TEXT | Bet type (ctp, greenie, sandie, etc.) |
| `hole_number` | INTEGER | Associated hole |
| `stakes` | DECIMAL | Bet amount |
| `description` | TEXT | Custom description (for custom bets) |
| `winner_id` | UUID (FK) | References `players.id` |
| `created_by` | UUID (FK) | Who created the bet |
| `created_at` | TIMESTAMPTZ | Creation time |

### 3.2 `bet_settlements`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Settlement identifier |
| `round_id` | UUID (FK) | References `rounds.id` |
| `from_player_id` | UUID (FK) | Who owes money |
| `to_player_id` | UUID (FK) | Who is owed money |
| `amount` | DECIMAL | Amount owed |
| `status` | TEXT | 'pending', 'paid', 'forgiven' |
| `paid_at` | TIMESTAMPTZ | When marked as paid |
| `created_at` | TIMESTAMPTZ | Creation time |

---

## 4. SOCIAL TABLES

### 4.1 `friendships`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Friendship identifier |
| `requester_id` | UUID (FK) | Who sent the request |
| `addressee_id` | UUID (FK) | Who received the request |
| `status` | TEXT | 'pending', 'accepted', 'blocked' |
| `created_at` | TIMESTAMPTZ | Request time |

### 4.2 `golf_groups`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Group identifier |
| `name` | TEXT | Group name |
| `description` | TEXT | Group description |
| `created_by` | UUID (FK) | Group creator |
| `created_at` | TIMESTAMPTZ | Creation time |

### 4.3 `group_members`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Membership identifier |
| `group_id` | UUID (FK) | References `golf_groups.id` |
| `profile_id` | UUID (FK) | References `profiles.id` |
| `role` | TEXT | 'admin', 'member' |
| `joined_at` | TIMESTAMPTZ | Join time |

### 4.4 `round_spectators`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Spectator record |
| `round_id` | UUID (FK) | References `rounds.id` |
| `profile_id` | UUID (FK) | References `profiles.id` |
| `created_at` | TIMESTAMPTZ | When started spectating |

### 4.5 `round_shares`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Share record |
| `round_id` | UUID (FK) | References `rounds.id` |
| `shared_by` | UUID (FK) | Who shared |
| `share_type` | TEXT | 'image', 'sms', 'email', 'link' |
| `created_at` | TIMESTAMPTZ | Share time |

---

## 5. SUBSCRIPTION TABLE

### 5.1 `subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Subscription record |
| `profile_id` | UUID (FK) | References `profiles.id` |
| `is_pro` | BOOLEAN | Active Pro subscription |
| `active_subscription` | TEXT | RevenueCat product identifier |
| `expiration_date` | TIMESTAMPTZ | Subscription expiry |
| `will_renew` | BOOLEAN | Auto-renew status |
| `updated_at` | TIMESTAMPTZ | Last sync time |

---

## 6. HOUSE GAME TABLES

### 6.1 `house_games`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | House game identifier |
| `group_id` | UUID (FK) | References `golf_groups.id` |
| `owner_id` | UUID (FK) | References `profiles.id` |
| `name` | TEXT | Game name |
| `description` | TEXT | Natural language description |
| `active_primitives` | JSONB | Array of configured primitives |
| `version` | INTEGER | Version number |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### 6.2 `personal_game_formats`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Format identifier |
| `owner_id` | UUID (FK) | References `profiles.id` |
| `name` | TEXT | Format name |
| `description` | TEXT | Description |
| `active_primitives` | JSONB | Array of configured primitives |
| `is_public` | BOOLEAN | Visible to other users |
| `version` | INTEGER | Version number |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## 7. ROW LEVEL SECURITY (RLS)

### Helper Functions

```sql
is_round_participant(round_id UUID) -> BOOLEAN
-- Returns true if current user is a player in the specified round

is_scorekeeper(round_id UUID) -> BOOLEAN
-- Returns true if current user can enter scores for the round

is_round_creator(round_id UUID) -> BOOLEAN
-- Returns true if current user created the round
```

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Own profile + friends | Own profile | Own profile | -- |
| `rounds` | Participant or spectator | Authenticated | Creator | Creator |
| `players` | Round participant | Round creator | Scorekeeper | Creator |
| `scores` | Round participant | Scorekeeper | Scorekeeper | Scorekeeper |
| `presses` | Round participant | Round participant | -- | -- |
| `prop_bets` | Round participant | Round participant | Round participant | Creator |
| `bet_settlements` | Involved party | System | Involved party | -- |
| `friendships` | Involved party | Authenticated | Involved party | Involved party |
| `golf_groups` | Member | Authenticated | Admin | Admin |
| `group_members` | Group member | Group admin | Admin | Admin/self |

---

## 8. EDGE FUNCTIONS

### 8.1 `delete-account`
- **Method:** POST
- **Auth:** Bearer token (user's Supabase JWT)
- **Purpose:** Cascade delete all user data (profiles, rounds, scores, friendships, etc.)
- **Called from:** Profile settings page

### 8.2 `send-push`
- **Method:** POST
- **Auth:** Service role or user JWT
- **Body:** `{ profileIds: string[], title: string, body: string, data?: object }`
- **Purpose:** Send push notifications to specified users
- **Called from:** Round creation, invites

### 8.3 `golf-course-lookup`
- **Method:** POST
- **Body:** `{ query: string }` or `{ courseId: string }`
- **Purpose:** Search golf courses, return hole data, tee sets, slope/rating
- **Called from:** Course search in new round wizard

### 8.4 `sync-subscription`
- **Method:** POST
- **Auth:** Bearer token
- **Body:** `{ isPro: boolean, activeSubscription: string, expirationDate: string, willRenew: boolean }`
- **Purpose:** Sync RevenueCat subscription status to Supabase
- **Called from:** After purchase or restore

### 8.5 `subscription-webhook`
- **Method:** POST
- **Auth:** `REVENUECAT_WEBHOOK_AUTH` secret
- **Purpose:** Handle RevenueCat webhook events (renewal, cancellation, etc.)
- **Called from:** RevenueCat server

### 8.6 `parse-house-game`
- **Method:** POST
- **Auth:** Bearer token
- **Body:** `{ description: string }`
- **Purpose:** Parse natural language game description into structured primitives
- **Called from:** House game builder

---

## 9. REAL-TIME SUBSCRIPTIONS

The app subscribes to Postgres changes on three tables for live scoring:

| Table | Channel | Events | Used In |
|-------|---------|--------|---------|
| `scores` | `scores:round_id=eq.{id}` | INSERT, UPDATE | `useSupabaseRound` |
| `players` | `players:round_id=eq.{id}` | INSERT, UPDATE, DELETE | `useSupabaseRound` |
| `rounds` | `rounds:id=eq.{id}` | UPDATE | `useSupabaseRound` |

---

## 10. MIGRATION HISTORY

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-01-12 | Initial schema | Core tables (profiles, rounds, players, scores) |
| 2026-01-12 | Betting tables | Prop bets, settlements, presses |
| 2026-01-12 | Social tables | Friendships, groups, spectators |
| 2026-01-13 | Course data | Course search, tee sets |
| 2026-01-14 | Refinements | Additional indexes and policies |
| 2026-01-25 | Decimal handicaps | Allow decimal handicap values |
| 2026-01-26 | Subscriptions | Subscription table |
| 2026-02-01 | RLS tightening | Stricter RLS policies |
| 2026-03-26 | Group ledger | Cross-round money tracking |
| 2026-03-26 | House games | House game tables and primitives |
| 2026-03-27 | Ghost players | Ghost player support |
| 2026-03-27 | Mixed tees | Mixed tee set support |
| 2026-03-27 | Push notifications | Push token and notification tables |
| 2026-03-28 | Personal formats | Personal game format table |
| 2026-03-30 | Onboarding | `has_onboarded` column |
| 2026-03-30 | Social formats | Public game format sharing |
| 2026-04-01 | Social feed | Activity feed, reactions, comments |
| 2026-04-01 | Money leaderboard | Season leaderboard tables |
| 2026-04-02 | Social v2 | Enhanced social features |
| 2026-04-02 | Missing policies | Fix missing SELECT policies |
| 2026-04-02 | Triggers | Rounds trigger and settlements delete |
