-- Migration: Persistent Group Ledger
-- Creates group_ledger_entries and group_settlements tables with RLS policies and indexes.

-- ============================================================
-- TABLE: group_ledger_entries
-- Records each player's net result for a round, associated with a group.
-- ============================================================
CREATE TABLE group_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES golf_groups(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0, -- positive = won, negative = lost
  game_breakdown jsonb DEFAULT '{}', -- { nassau: -10, skins: 5, wolf: -5 }
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, round_id, profile_id)
);

-- ============================================================
-- TABLE: group_settlements
-- Records when players settle their debts within a group.
-- Settlements are permanent — no UPDATE or DELETE policies.
-- ============================================================
CREATE TABLE group_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES golf_groups(id) ON DELETE CASCADE,
  from_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text DEFAULT 'cash', -- 'cash', 'venmo', 'cashapp', 'other'
  note text,
  settled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- group_ledger_entries: primary access patterns
CREATE INDEX idx_group_ledger_entries_group_profile
  ON group_ledger_entries(group_id, profile_id);

CREATE INDEX idx_group_ledger_entries_round
  ON group_ledger_entries(round_id);

-- group_settlements: balance calculation and user queries
CREATE INDEX idx_group_settlements_group
  ON group_settlements(group_id);

CREATE INDEX idx_group_settlements_from_profile
  ON group_settlements(from_profile_id);

CREATE INDEX idx_group_settlements_to_profile
  ON group_settlements(to_profile_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE group_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_settlements ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS: group_ledger_entries
-- ------------------------------------------------------------

-- SELECT: user is a member of the group OR the group owner
CREATE POLICY "group_ledger_entries_select"
  ON group_ledger_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_ledger_entries.group_id
        AND gm.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM golf_groups gg
      WHERE gg.id = group_ledger_entries.group_id
        AND gg.owner_id = auth.uid()
    )
  );

-- INSERT: user is the group owner OR the creator of the associated round
CREATE POLICY "group_ledger_entries_insert"
  ON group_ledger_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM golf_groups gg
      WHERE gg.id = group_ledger_entries.group_id
        AND gg.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = group_ledger_entries.round_id
        AND r.created_by = auth.uid()
    )
  );

-- UPDATE: user is the group owner OR the creator of the associated round
CREATE POLICY "group_ledger_entries_update"
  ON group_ledger_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM golf_groups gg
      WHERE gg.id = group_ledger_entries.group_id
        AND gg.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = group_ledger_entries.round_id
        AND r.created_by = auth.uid()
    )
  );

-- DELETE: user is the group owner OR the creator of the associated round
CREATE POLICY "group_ledger_entries_delete"
  ON group_ledger_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM golf_groups gg
      WHERE gg.id = group_ledger_entries.group_id
        AND gg.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = group_ledger_entries.round_id
        AND r.created_by = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RLS: group_settlements
-- ------------------------------------------------------------

-- SELECT: user is a member of the group OR the group owner
CREATE POLICY "group_settlements_select"
  ON group_settlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_settlements.group_id
        AND gm.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM golf_groups gg
      WHERE gg.id = group_settlements.group_id
        AND gg.owner_id = auth.uid()
    )
  );

-- INSERT: user is the payer (from_profile_id) OR the group owner
-- No UPDATE or DELETE — settlements are permanent records.
CREATE POLICY "group_settlements_insert"
  ON group_settlements
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_profile_id
    OR
    EXISTS (
      SELECT 1 FROM golf_groups gg
      WHERE gg.id = group_settlements.group_id
        AND gg.owner_id = auth.uid()
    )
  );
