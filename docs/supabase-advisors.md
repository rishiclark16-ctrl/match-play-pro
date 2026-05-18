# Supabase Advisor Inventory

**Snapshot date:** 2026-05-18  
**Project ref:** `puqgbsxabcyxrbwwoznn`  
**Tool:** `mcp__supabase__get_advisors` (security + performance)

Why this doc exists: Supabase's linter cannot introspect runtime behavior of `SECURITY DEFINER` functions, so it keeps flagging functions that are already hardened via `auth.uid()` pinning. This file is the single source of truth for which advisor entries are accepted, which are dashboard actions, and which (if any) need new work.

## Headline numbers

- Total advisor entries: **212** (58 security, 154 performance)

- `perf-tuning-backlog`: **154**
- `false-positive-hardened`: **44**
- `NEW-INVESTIGATE`: **10**
- `intentional`: **2**
- `cosmetic`: **1**
- `dashboard-action`: **1**

## Category legend

| Category | Meaning |
|---|---|
| `false-positive-hardened` | Function matches the known-hardened list (migrations `20260427100000_advisor_security_hardening` + `20260428000000_pin_auth_uid_in_predicates`). Uses `auth.uid()` internally; the `_user_id` parameter is ignored. Advisor cannot detect this. |
| `dashboard-action` | Requires a click in the Supabase dashboard (no SQL available). |
| `cosmetic` | Low/no risk, documented and accepted. |
| `intentional` | Deliberate config (e.g. deny-all RLS via no policies, with service role bypass). |
| `perf-tuning-backlog` | Known Supabase performance lint (RLS initplan, multiple permissive policies, unused/missing indexes). Not a security risk. Address opportunistically. |
| `NEW-INVESTIGATE` | Not on any known list. Needs human attention. |

## NEW-INVESTIGATE — needs human review

**5 unique function(s) (× 2 roles each = 10 advisor entries).** These are SECURITY DEFINER functions in `public` that are NOT on the hardened list from prior migrations.

| Function | Recommendation |
|---|---|
| `public.check_push_rate_limit()` | Internal helper called by edge functions for push-notification rate limiting. Takes user_id as a parameter (not auth.uid()). If callable via RPC, an attacker could exhaust another user's push quota. Recommended: REVOKE EXECUTE FROM anon, authenticated; keep grant only on service_role. |
| `public.get_social_feed_round_ids()` | Helper RPC. Sibling `get_social_feed_rounds` was already pinned to auth.uid() in migration 20260427100000. Check whether this *_ids variant also accepts a viewer_id arg and apply the same pinning, or REVOKE EXECUTE if it's only called server-side. |
| `public.handle_new_user()` | Auth trigger function (on_auth_user_created). Should NEVER be callable from REST. Recommended: REVOKE EXECUTE FROM anon, authenticated, public. It only needs to be callable by the auth schema trigger. |
| `public.is_round_complete()` | Predicate function taking p_round_id only — no auth.uid() dependence. Low risk (round completion status is not sensitive) but consider REVOKE EXECUTE FROM anon if unused by clients. |
| `public.lookup_round_by_join_code()` | INTENTIONALLY public: this is how the /join flow resolves a 6-char code to a round. Anon can call it. Confirm rate-limiting / brute-force protection on join codes is sufficient (codes are 6 chars — short). Otherwise no action; flag the advisor as accepted. |

## false-positive-hardened (44 entries → 22 unique functions)

Each function is flagged twice (once for the `anon` role, once for `authenticated`). All entries here are accepted false-positives. The functions internally call `auth.uid()` and ignore any `_user_id` parameter passed in by an RPC caller — verified in migrations `20260427100000` and `20260428000000`.

| Function | Hardened in migration |
|---|---|
| `public.are_friends()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.can_edit_round()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.get_friend_count()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.get_group_count()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.get_head_to_head()` | `20260427100000_advisor_security_hardening` |
| `public.get_round_reactions()` | `20260427100000_advisor_security_hardening` |
| `public.get_season_leaderboard()` | `20260427100000_advisor_security_hardening` |
| `public.get_social_feed_rounds()` | `20260427100000_advisor_security_hardening` |
| `public.get_upcoming_rounds()` | `20260427100000_advisor_security_hardening` |
| `public.get_watch_party_messages()` | `20260427100000_advisor_security_hardening` |
| `public.get_watch_party_recipients()` | `20260427100000_advisor_security_hardening` |
| `public.get_watch_party_stats()` | `20260427100000_advisor_security_hardening` |
| `public.has_round_access()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_friend_of_any_player()` | `20260427100000_advisor_security_hardening` |
| `public.is_group_member()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_group_owner()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_pro_user()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_round_creator()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_round_owner()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_round_participant()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_scorekeeper()` | `20260428000000_pin_auth_uid_in_predicates` |
| `public.is_watch_party_member()` | `20260428000000_pin_auth_uid_in_predicates` |

## dashboard-action

| Advisor | Action required |
|---|---|
| **Leaked Password Protection** (`auth_leaked_password_protection`) | Supabase dashboard → **Authentication → Settings → Auth Providers → Email** → enable **"Leaked password protection"**. This blocks signup/password-change against the HaveIBeenPwned database. No SQL equivalent. |

## cosmetic

| Advisor | Note |
|---|---|
| **Extension in Public** (`pg_net`) | The HTTP-call extension lives in the `public` schema. Moving it requires recreating with `CREATE EXTENSION ... WITH SCHEMA extensions;` and updating any callers. Low risk; deferred. |

## intentional

| Table | Note |
|---|---|
| `public.promo_codes` | RLS enabled, **no policies** → deny-all by default. The `validate-promo-code` edge function uses the service role to bypass RLS. Do not add a policy. |
| `public.push_rate_limits` | RLS enabled, **no policies** → deny-all by default. Only edge functions (service role) read/write it. Do not add a policy. |

## perf-tuning-backlog

154 performance lints, all well-known Supabase tuning patterns. **Not security issues.** Bucketed below by lint type so a future perf pass can prioritize.

| Lint | Count | Mitigation |
|---|---|---|
| `auth_rls_initplan` | 95 | Wrap `auth.uid()` calls in RLS policies with `(SELECT auth.uid())` so the planner caches the result per query instead of per row. Touches most policies on `profiles`, `scores`, `friendships`, `rounds`, etc. Big mechanical refactor; deferred. |
| `multiple_permissive_policies` | 26 | Tables with overlapping permissive policies (e.g. `profiles` has both "view own and friends" and "view any for discovery" — the second subsumes the first). Consolidate into a single OR'd policy. |
| `unindexed_foreign_keys` | 20 | Add covering indexes on FK columns. Low-priority for low-volume tables (`bet_settlements`, `promo_redemptions`, `prop_bets`); add as load grows. |
| `unused_index` | 13 | Indexes never used in `pg_stat_user_indexes`. Safe to drop (`idx_friendships_status_user`, `idx_subscriptions_status`, etc.). Keep around until traffic patterns stabilize post-launch. |

### Tables most affected by `auth_rls_initplan`

| Table | Policy count |
|---|---|
| `public.scores` | 6 |
| `public.profiles` | 5 |
| `public.friendships` | 4 |
| `public.round_shares` | 4 |
| `public.golf_groups` | 4 |
| `public.group_members` | 4 |
| `public.prop_bets` | 4 |
| `public.rounds` | 4 |
| `public.players` | 4 |
| `public.watch_party_members` | 4 |
| `public.device_tokens` | 4 |
| `public.presses` | 4 |
| `public.bet_settlements` | 4 |
| `public.group_format_assignments` | 4 |
| `public.group_ledger_entries` | 4 |

## How to refresh this report

```
# from a Claude Code session with the Supabase MCP attached:
mcp__supabase__get_advisors(type="security")
mcp__supabase__get_advisors(type="performance")
```

Then re-run `parse_advisors.py` and `gen_advisor_doc.py` from the worktree root. If new function names appear under `NEW-INVESTIGATE`, add them to `HARDENED` (after hardening) or to `NEW_INVESTIGATE_NOTES` (with remediation guidance) in `gen_advisor_doc.py`.
