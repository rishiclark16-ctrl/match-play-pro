export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bet_settlements: {
        Row: {
          amount: number
          created_at: string | null
          from_player_id: string
          id: string
          paid_at: string | null
          round_id: string
          status: string
          to_player_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          from_player_id: string
          id?: string
          paid_at?: string | null
          round_id: string
          status?: string
          to_player_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          from_player_id?: string
          id?: string
          paid_at?: string | null
          round_id?: string
          status?: string
          to_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bet_settlements_from_player_id_fkey"
            columns: ["from_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_settlements_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_settlements_to_player_id_fkey"
            columns: ["to_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      golf_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "golf_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_format_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          format_id: string
          group_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          format_id: string
          group_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          format_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_format_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_format_assignments_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "personal_game_formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_format_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "golf_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_ledger_entries: {
        Row: {
          amount: number
          created_at: string | null
          game_breakdown: Json | null
          group_id: string
          id: string
          profile_id: string
          round_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          game_breakdown?: Json | null
          group_id: string
          id?: string
          profile_id: string
          round_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          game_breakdown?: Json | null
          group_id?: string
          id?: string
          profile_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_ledger_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "golf_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ledger_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ledger_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string | null
          group_id: string
          guest_handicap: number | null
          guest_name: string | null
          id: string
          order_index: number
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          guest_handicap?: number | null
          guest_name?: string | null
          id?: string
          order_index?: number
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          guest_handicap?: number | null
          guest_name?: string | null
          id?: string
          order_index?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "golf_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_settlements: {
        Row: {
          amount: number
          created_at: string | null
          from_profile_id: string
          group_id: string
          id: string
          method: string | null
          note: string | null
          settled_at: string | null
          to_profile_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          from_profile_id: string
          group_id: string
          id?: string
          method?: string | null
          note?: string | null
          settled_at?: string | null
          to_profile_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          from_profile_id?: string
          group_id?: string
          id?: string
          method?: string | null
          note?: string | null
          settled_at?: string | null
          to_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_settlements_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_settlements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "golf_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_settlements_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      house_games: {
        Row: {
          active_primitives: Json
          created_at: string | null
          description: string
          group_id: string
          id: string
          name: string
          owner_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          active_primitives?: Json
          created_at?: string | null
          description?: string
          group_id: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          active_primitives?: Json
          created_at?: string | null
          description?: string
          group_id?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "house_games_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "golf_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_games_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_game_formats: {
        Row: {
          active_primitives: Json
          created_at: string | null
          description: string
          id: string
          is_public: boolean
          name: string
          owner_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          active_primitives?: Json
          created_at?: string | null
          description?: string
          id?: string
          is_public?: boolean
          name?: string
          owner_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          active_primitives?: Json
          created_at?: string | null
          description?: string
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_game_formats_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          handicap: number | null
          id: string
          is_ghost: boolean
          manual_strokes: number | null
          name: string
          order_index: number
          profile_id: string | null
          round_id: string | null
          team_id: string | null
          tee_set_id: string | null
        }
        Insert: {
          created_at?: string | null
          handicap?: number | null
          id?: string
          is_ghost?: boolean
          manual_strokes?: number | null
          name: string
          order_index: number
          profile_id?: string | null
          round_id?: string | null
          team_id?: string | null
          tee_set_id?: string | null
        }
        Update: {
          created_at?: string | null
          handicap?: number | null
          id?: string
          is_ghost?: boolean
          manual_strokes?: number | null
          name?: string
          order_index?: number
          profile_id?: string | null
          round_id?: string | null
          team_id?: string | null
          tee_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      presses: {
        Row: {
          created_at: string | null
          id: string
          initiated_by: string | null
          round_id: string | null
          stakes: number
          start_hole: number
          status: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          initiated_by?: string | null
          round_id?: string | null
          stakes: number
          start_hole: number
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          initiated_by?: string | null
          round_id?: string | null
          stakes?: number
          start_hole?: number
          status?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presses_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presses_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          friend_code: string | null
          full_name: string | null
          grandfathered_at: string | null
          handicap: number | null
          has_onboarded: boolean
          home_course_id: string | null
          home_course_name: string | null
          id: string
          notification_preferences: Json | null
          paypal_email: string | null
          phone: string | null
          push_permission_denied_at: string | null
          push_token: string | null
          subscription_tier: string | null
          tee_preference: string | null
          updated_at: string | null
          venmo_username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          friend_code?: string | null
          full_name?: string | null
          grandfathered_at?: string | null
          handicap?: number | null
          has_onboarded?: boolean
          home_course_id?: string | null
          home_course_name?: string | null
          id: string
          notification_preferences?: Json | null
          paypal_email?: string | null
          phone?: string | null
          push_permission_denied_at?: string | null
          push_token?: string | null
          subscription_tier?: string | null
          tee_preference?: string | null
          updated_at?: string | null
          venmo_username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          friend_code?: string | null
          full_name?: string | null
          grandfathered_at?: string | null
          handicap?: number | null
          has_onboarded?: boolean
          home_course_id?: string | null
          home_course_name?: string | null
          id?: string
          notification_preferences?: Json | null
          paypal_email?: string | null
          phone?: string | null
          push_permission_denied_at?: string | null
          push_token?: string | null
          subscription_tier?: string | null
          tee_preference?: string | null
          updated_at?: string | null
          venmo_username?: string | null
        }
        Relationships: []
      }
      prop_bets: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          hole_number: number
          id: string
          round_id: string
          stakes: number
          type: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hole_number: number
          id?: string
          round_id: string
          stakes?: number
          type: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hole_number?: number
          id?: string
          round_id?: string
          stakes?: number
          type?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prop_bets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prop_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prop_bets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      round_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          round_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          round_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          round_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_comments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          round_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          round_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_messages_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          round_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          round_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_reactions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      round_shares: {
        Row: {
          created_at: string | null
          id: string
          round_id: string
          seen_at: string | null
          shared_by_id: string
          shared_with_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          round_id: string
          seen_at?: string | null
          shared_by_id: string
          shared_with_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          round_id?: string
          seen_at?: string | null
          shared_by_id?: string
          shared_with_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_shares_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_shares_shared_by_id_fkey"
            columns: ["shared_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_shares_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      round_spectators: {
        Row: {
          id: string
          joined_at: string | null
          profile_id: string
          round_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          profile_id: string
          round_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          profile_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_spectators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_spectators_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          completed_at: string | null
          course_id: string | null
          course_name: string
          created_at: string | null
          created_by: string | null
          games: Json | null
          handicap_mode: string | null
          hole_info: Json | null
          holes: number
          id: string
          invited_player_ids: string[] | null
          join_code: string
          match_play: boolean | null
          mixed_tees: boolean
          modified_stableford: boolean | null
          rating: number | null
          scorekeeper_ids: string[] | null
          slope: number | null
          stableford: boolean | null
          stakes: number | null
          status: string | null
          stroke_play: boolean | null
          teams: Json | null
          tee_sets: Json | null
          tee_time: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          course_name: string
          created_at?: string | null
          created_by?: string | null
          games?: Json | null
          handicap_mode?: string | null
          hole_info?: Json | null
          holes?: number
          id?: string
          invited_player_ids?: string[] | null
          join_code: string
          match_play?: boolean | null
          mixed_tees?: boolean
          modified_stableford?: boolean | null
          rating?: number | null
          scorekeeper_ids?: string[] | null
          slope?: number | null
          stableford?: boolean | null
          stakes?: number | null
          status?: string | null
          stroke_play?: boolean | null
          teams?: Json | null
          tee_sets?: Json | null
          tee_time?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          course_name?: string
          created_at?: string | null
          created_by?: string | null
          games?: Json | null
          handicap_mode?: string | null
          hole_info?: Json | null
          holes?: number
          id?: string
          invited_player_ids?: string[] | null
          join_code?: string
          match_play?: boolean | null
          mixed_tees?: boolean
          modified_stableford?: boolean | null
          rating?: number | null
          scorekeeper_ids?: string[] | null
          slope?: number | null
          stableford?: boolean | null
          stakes?: number | null
          status?: string | null
          stroke_play?: boolean | null
          teams?: Json | null
          tee_sets?: Json | null
          tee_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          created_at: string | null
          hole_number: number
          id: string
          player_id: string | null
          round_id: string | null
          strokes: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hole_number: number
          id?: string
          player_id?: string | null
          round_id?: string | null
          strokes: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hole_number?: number
          id?: string
          player_id?: string | null
          round_id?: string | null
          strokes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_transactions: {
        Row: {
          created_at: string | null
          expires_date: string | null
          id: string
          original_transaction_id: string
          product_id: string
          purchase_date: string
          raw_receipt: Json | null
          subscription_id: string
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          expires_date?: string | null
          id?: string
          original_transaction_id: string
          product_id: string
          purchase_date: string
          raw_receipt?: Json | null
          subscription_id: string
          transaction_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          expires_date?: string | null
          id?: string
          original_transaction_id?: string
          product_id?: string
          purchase_date?: string
          raw_receipt?: Json | null
          subscription_id?: string
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancellation_date: string | null
          created_at: string | null
          expires_at: string | null
          grace_period_expires_at: string | null
          id: string
          latest_transaction_id: string | null
          original_transaction_id: string | null
          product_id: string | null
          status: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancellation_date?: string | null
          created_at?: string | null
          expires_at?: string | null
          grace_period_expires_at?: string | null
          id?: string
          latest_transaction_id?: string | null
          original_transaction_id?: string | null
          product_id?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancellation_date?: string | null
          created_at?: string | null
          expires_at?: string | null
          grace_period_expires_at?: string | null
          id?: string
          latest_transaction_id?: string | null
          original_transaction_id?: string | null
          product_id?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watch_party_members: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          profile_id: string
          round_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          profile_id: string
          round_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          profile_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_party_members_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_post_reveal: boolean
          round_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_post_reveal?: boolean
          round_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_post_reveal?: boolean
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_party_messages_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_notifications: {
        Row: {
          recipient_count: number
          round_id: string
          sent_at: string
        }
        Insert: {
          recipient_count?: number
          round_id: string
          sent_at?: string
        }
        Update: {
          recipient_count?: number
          round_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_notifications_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: true
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          id: string
          profile_id: string
          token: string
          platform: string
          last_seen_at: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          token: string
          platform?: string
          last_seen_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          token?: string
          platform?: string
          last_seen_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      can_edit_round: {
        Args: { check_round_id: string; check_user_id: string }
        Returns: boolean
      }
      get_friend_count: { Args: { check_user_id: string }; Returns: number }
      get_group_count: { Args: { check_user_id: string }; Returns: number }
      get_head_to_head: {
        Args: { other_id: string; viewer_id: string }
        Returns: {
          losses: number
          net_amount: number
          pushes: number
          round_count: number
          wins: number
        }[]
      }
      get_round_reactions: {
        Args: { target_round_id: string; viewer_id: string }
        Returns: {
          count: number
          reaction_type: string
          viewer_reacted: boolean
        }[]
      }
      get_season_leaderboard: {
        Args: { viewer_id: string }
        Returns: {
          friend_avatar: string
          friend_name: string
          friend_profile_id: string
          net_amount: number
          round_count: number
        }[]
      }
      get_social_feed_round_ids: {
        Args: { viewer_id: string }
        Returns: {
          round_id: string
        }[]
      }
      get_social_feed_rounds: {
        Args: { viewer_id: string }
        Returns: {
          comment_count: number
          completed_at: string
          course_name: string
          creator_avatar: string
          creator_id: string
          creator_name: string
          games: Json
          participant_ids: string[]
          participant_names: string[]
          round_id: string
        }[]
      }
      get_upcoming_rounds: {
        Args: { viewer_id: string }
        Returns: {
          course_name: string
          created_at: string
          creator_avatar: string
          creator_id: string
          creator_name: string
          invited_ids: string[]
          message_count: number
          participant_ids: string[]
          participant_names: string[]
          round_id: string
          tee_time: string
        }[]
      }
      get_watch_party_messages: {
        Args: { p_round_id: string }
        Returns: {
          author_avatar: string
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          is_player: boolean
          is_post_reveal: boolean
        }[]
      }
      get_watch_party_recipients: {
        Args: { p_round_id: string }
        Returns: {
          profile_id: string
        }[]
      }
      get_watch_party_stats: {
        Args: { p_round_id: string }
        Returns: {
          first_message_author: string
          first_message_body: string
          message_count: number
          spectator_count: number
        }[]
      }
      has_round_access: {
        Args: { check_round_id: string; check_user_id: string }
        Returns: boolean
      }
      is_friend_of_any_player: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_pro_user: { Args: { check_user_id: string }; Returns: boolean }
      is_round_complete: { Args: { p_round_id: string }; Returns: boolean }
      is_round_creator: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
      is_round_owner: {
        Args: { check_round_id: string; check_user_id: string }
        Returns: boolean
      }
      is_round_participant: {
        Args: { check_round_id: string; check_user_id: string }
        Returns: boolean
      }
      is_scorekeeper: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
      is_watch_party_member: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
