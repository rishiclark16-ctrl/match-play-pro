import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://matchgolf.dev',
  'capacitor://localhost',  // iOS
  'http://localhost',       // Android
];

const IS_DEV = Deno.env.get('ENVIRONMENT') !== 'production';

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || (IS_DEV && origin.startsWith('http://localhost:'));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const VALID_IDS = new Set([
  'press_auto_x_down','press_auto_birdie','press_auto_eagle','press_manual_request',
  'press_requires_acceptance','press_double_or_nothing','press_max_per_round',
  'press_new_submatch','press_no_dormie','press_back9_auto','format_nassau',
  'format_skins','format_skins_back9_only','format_match_play','format_stroke_play',
  'format_stableford','format_modified_stableford','format_wolf','format_vegas',
  'format_hammer','format_bingo_bango_bongo','format_rabbit','format_quota',
  'format_defender','bonus_par5_double','bonus_par3_special','bonus_birdie_unit',
  'bonus_eagle_unit','bonus_greenie','bonus_sandie','bonus_barkie','bonus_oozle',
  'bonus_chippy','bonus_polie','bonus_last_hole_double','bonus_garbage_tracking',
  'carryover_skins_halved','carryover_cap','carryover_jackpot_18',
  'carryover_reset_on_win','carryover_nassau_halved','handicap_full',
  'handicap_90_pct','handicap_80_pct','handicap_75_pct','handicap_stroke_index',
  'handicap_ghost_player','handicap_scratch','handicap_max_cap',
  'handicap_bump_and_run','handicap_mixed_tees','casual_gimme_distance',
  'casual_breakfast_ball','casual_mulligans','casual_no_blood','casual_preferred_lies',
  'casual_concede_match','casual_foot_wedge','settlement_unit_value',
  'settlement_pay_per_hole','settlement_end_of_round','settlement_running_tab',
  'settlement_net_out','settlement_rain_shortened','settlement_max_loss_cap',
  'settlement_ties_split','settlement_ties_carryover','group_min_players',
  'group_pickup_rule','group_sub_in','group_teams_fixed','group_teams_rotating',
  'group_wolf_lone_multiplier','group_sixes','group_point_bank',
]);

const SYSTEM_PROMPT = `You are an expert golf rules parser for a scoring app. The user will describe their group's betting game in plain English. Your job is to map their description to rule primitives — both from the standard list AND by creating custom rules for anything not covered.

Return ONLY valid JSON — no preamble, no markdown, no explanation. The JSON must be an array of activated rule objects.

--- STANDARD PRIMITIVES ---
Each standard object has exactly these fields:
{ "id": string, "value": any, "confidence": "high" | "medium" | "low" }

Valid standard ids:
press_auto_x_down, press_auto_birdie, press_auto_eagle, press_manual_request, press_requires_acceptance, press_double_or_nothing, press_max_per_round, press_new_submatch, press_no_dormie, press_back9_auto, format_nassau, format_skins, format_skins_back9_only, format_match_play, format_stroke_play, format_stableford, format_modified_stableford, format_wolf, format_vegas, format_hammer, format_bingo_bango_bongo, format_rabbit, format_quota, format_defender, bonus_par5_double, bonus_par3_special, bonus_birdie_unit, bonus_eagle_unit, bonus_greenie, bonus_sandie, bonus_barkie, bonus_oozle, bonus_chippy, bonus_polie, bonus_last_hole_double, bonus_garbage_tracking, carryover_skins_halved, carryover_cap, carryover_jackpot_18, carryover_reset_on_win, carryover_nassau_halved, handicap_full, handicap_90_pct, handicap_80_pct, handicap_75_pct, handicap_stroke_index, handicap_ghost_player, handicap_scratch, handicap_max_cap, handicap_bump_and_run, handicap_mixed_tees, casual_gimme_distance, casual_breakfast_ball, casual_mulligans, casual_no_blood, casual_preferred_lies, casual_concede_match, casual_foot_wedge, settlement_unit_value, settlement_pay_per_hole, settlement_end_of_round, settlement_running_tab, settlement_net_out, settlement_rain_shortened, settlement_max_loss_cap, settlement_ties_split, settlement_ties_carryover, group_min_players, group_pickup_rule, group_sub_in, group_teams_fixed, group_teams_rotating, group_wolf_lone_multiplier, group_sixes, group_point_bank

Standard value field rules:
- Most primitives: null
- press_auto_x_down: number (default 2)
- bonus_birdie_unit, bonus_eagle_unit: number of units
- casual_gimme_distance: number in feet
- casual_mulligans: number per round
- settlement_unit_value: dollars per unit
- settlement_max_loss_cap: dollars
- handicap_max_cap: number
- press_max_per_round: number
- carryover_cap: number
- group_min_players: number
- group_sub_in: number (starting hole)
- group_wolf_lone_multiplier: number
- bonus_par3_special: "double" | "half" | "separate_pot"
- format_modified_stableford: { eagle: 5, birdie: 2, par: 0, bogey: -1, double: -3 }
- All others: null

--- CUSTOM PRIMITIVES ---
When a described rule doesn't match any standard id, create a custom primitive with these fields:
{ "id": "custom_<snake_case_slug>", "custom": true, "label": string, "description": string, "value": number | null, "confidence": "high" | "medium" | "low" }

- id: must start with "custom_" followed by a unique snake_case name (e.g. "custom_most_bogeys_penalty")
- label: short name shown in the UI (e.g. "Most Bogeys Penalty")
- description: full rule as stated by the user, in one clear sentence (e.g. "Player with most bogeys owes the low score $100")
- value: dollar amount if mentioned, otherwise null
- Use custom primitives for: unusual penalties, side bets, last-man-standing games, prop bets not in the standard list, social rules, unique formats
- Create as many custom primitives as needed — one per distinct rule

--- INFEASIBLE RULES ---
Some rules simply cannot be tracked by a digital golf scoring app. When a described rule falls into this category, add "infeasible": true to the custom primitive. The app will show the user a "cannot be created" warning for these.

Mark as infeasible when the rule requires:
- Physical actions outside the app (e.g. "winner shaves head", "loser buys drinks at the bar", "do push-ups")
- Non-golf social bets with no scoreable outcome (e.g. "bring homemade food", "wear a funny hat")
- Outcomes that cannot be determined from golf scores (e.g. "funniest shot", "best dressed")
- Rules requiring external judging or subjective assessment with no numeric outcome

Format: { "id": "custom_<slug>", "custom": true, "infeasible": true, "label": string, "description": string, "value": number | null, "confidence": "high" }

Do NOT mark as infeasible: money bets based on score outcomes (bogey totals, last place finish, etc.) — these CAN be manually settled using final scores.

--- DISAMBIGUATION RULES ---
- When user says "press when 2 down" or "auto press when X down" → use press_auto_x_down with value:X. Do NOT use press_manual_request.
- press_manual_request means a player must ASK to press (not automatic). Only use it when the user explicitly says requests or asks for presses.
- When user mentions a dollar amount like "$5 bets" or "$5 per unit" or "worth $10" → always include settlement_unit_value with that dollar value as the number.
- When user mentions "carryover" or "carries over" with skins → include carryover_skins_halved (value: null).
- When user says "net out" or "settle at the end" or "settle up at the end" → include settlement_net_out (value: null).
- When user says "full handicap" or just "handicaps" or "using handicaps" → include handicap_full (value: null).
- When user says "back 9 skins" or "skins on the back" → use format_skins_back9_only, NOT format_skins.
- Only include rules clearly described or strongly implied. Never invent rules not mentioned.
- Use "low" confidence only for genuinely ambiguous interpretations.

--- EXAMPLES ---

<example>
Input: "Nassau $5 with 2-down auto presses, birdies pay a unit from everyone"
Output: [{"id":"format_nassau","value":null,"confidence":"high"},{"id":"settlement_unit_value","value":5,"confidence":"high"},{"id":"press_auto_x_down","value":2,"confidence":"high"},{"id":"bonus_birdie_unit","value":1,"confidence":"high"}]
</example>

<example>
Input: "Skins with carryovers, par 5s worth double, settle at the end, $2 per skin"
Output: [{"id":"format_skins","value":null,"confidence":"high"},{"id":"carryover_skins_halved","value":null,"confidence":"high"},{"id":"bonus_par5_double","value":null,"confidence":"high"},{"id":"settlement_net_out","value":null,"confidence":"high"},{"id":"settlement_unit_value","value":2,"confidence":"high"}]
</example>

<example>
Input: "Person with most bogeys owes the lowest score $100, last place buys lunch"
Output: [{"id":"custom_most_bogeys_penalty","custom":true,"label":"Most Bogeys Penalty","description":"Player with the most bogeys owes the low scorer $100","value":100,"confidence":"high"},{"id":"custom_last_place_buys_lunch","custom":true,"label":"Last Place Buys Lunch","description":"The player finishing last buys lunch for the group","value":null,"confidence":"high"}]
</example>

<example>
Input: "Wolf with 2x lone wolf payout, full handicaps, gimmes inside 2 feet, if someone makes an ace everyone owes them $50"
Output: [{"id":"format_wolf","value":null,"confidence":"high"},{"id":"group_wolf_lone_multiplier","value":2,"confidence":"high"},{"id":"handicap_full","value":null,"confidence":"high"},{"id":"casual_gimme_distance","value":2,"confidence":"high"},{"id":"custom_ace_payout","custom":true,"label":"Ace Payout","description":"If any player makes a hole-in-one, all other players owe them $50","value":50,"confidence":"high"}]
</example>

<example>
Input: "Match play 90% handicap, birdies pay a unit, no blood rule"
Output: [{"id":"format_match_play","value":null,"confidence":"high"},{"id":"handicap_90_pct","value":null,"confidence":"high"},{"id":"bonus_birdie_unit","value":1,"confidence":"high"},{"id":"casual_no_blood","value":null,"confidence":"high"}]
</example>`;

function parseClaudeJson(text: string): Record<string, unknown>[] {
  try {
    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const result = JSON.parse(stripped);
    return Array.isArray(result) ? result : [];
  } catch {
    console.error('Failed to parse Claude JSON:', text);
    return [];
  }
}

// Validate custom primitive IDs: only alphanumeric + underscores, 3-40 chars
const CUSTOM_ID_REGEX = /^custom_[a-z0-9_]{3,40}$/;

// Strip HTML/script tags from user-facing strings
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

// Validate primitive values by ID — reject unexpected types
function sanitizeValue(id: string, value: unknown): string | number | null {
  // Number-valued primitives
  const numberIds = new Set([
    'press_auto_x_down', 'bonus_birdie_unit', 'bonus_eagle_unit',
    'casual_gimme_distance', 'casual_mulligans', 'settlement_unit_value',
    'settlement_max_loss_cap', 'handicap_max_cap', 'press_max_per_round',
    'carryover_cap', 'group_min_players', 'group_sub_in',
    'group_wolf_lone_multiplier',
  ]);
  if (numberIds.has(id)) {
    const n = typeof value === 'number' ? value : null;
    // Clamp to reasonable range
    if (n !== null && (n < 0 || n > 10000)) return null;
    return n;
  }
  // Select-valued primitives
  if (id === 'bonus_par3_special') {
    return typeof value === 'string' && ['double', 'half', 'separate_pot'].includes(value) ? value : null;
  }
  // Custom primitives: only allow number or null
  if (id.startsWith('custom_')) {
    return typeof value === 'number' ? Math.min(Math.max(value, 0), 100000) : null;
  }
  // All others: null
  return null;
}

function sanitizePrimitives(items: Record<string, unknown>[]) {
  return items
    .filter(item =>
      item &&
      typeof item.id === 'string' &&
      (VALID_IDS.has(item.id) || (item.custom === true && CUSTOM_ID_REGEX.test(item.id) && typeof item.label === 'string')) &&
      ['high', 'medium', 'low'].includes(item.confidence)
    )
    .map(item => {
      if (item.custom) {
        return {
          id: item.id,
          custom: true as const,
          ...(item.infeasible === true ? { infeasible: true as const } : {}),
          label: stripHtml(String(item.label)).slice(0, 60),
          description: stripHtml(typeof item.description === 'string' ? item.description : item.label).slice(0, 200),
          value: sanitizeValue(item.id, item.value),
          confidence: item.confidence,
        };
      }
      return { id: item.id, value: sanitizeValue(item.id, item.value), confidence: item.confidence };
    });
}

// Simple in-memory rate limiter (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15; // max calls per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    // Auth check — require valid Supabase JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required.' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Decode JWT to get user ID for rate limiting (without full verification — Supabase gateway handles that)
    let userId = 'anon';
    try {
      const payload = JSON.parse(atob(authHeader.split('.')[1]));
      userId = payload.sub || 'anon';
    } catch { /* fallback to anon rate limit bucket */ }

    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a minute.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const { description } = await req.json();

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Description must be at least 5 characters.' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Cap description length to prevent abuse
    const truncatedDescription = description.trim().slice(0, 2000);

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Parsing service not configured.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Try models in order until one succeeds
    const MODELS = ['claude-haiku-4-5-20251001', 'claude-haiku-4-5', 'claude-3-haiku-20240307'];
    let successRes: Response | null = null;

    for (const model of MODELS) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: truncatedDescription }],
        }),
      });
      if (res.ok) {
        successRes = res;
        break;
      }
      const errText = await res.text();
      console.error(`Anthropic model ${model} error ${res.status}:`, errText);
    }

    if (!successRes) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse game rules. Please try again.' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const data = await successRes.json();
    const rawText = data.content?.[0]?.text ?? '[]';
    const primitives = sanitizePrimitives(parseClaudeJson(rawText));

    return new Response(
      JSON.stringify({ primitives }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('parse-house-game error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error. Please try again.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
