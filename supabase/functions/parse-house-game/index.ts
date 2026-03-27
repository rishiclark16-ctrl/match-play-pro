import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const SYSTEM_PROMPT = `You are a golf rules parser for a scoring app. The user will describe their group's betting game in plain English. Your job is to map their description to a structured set of rule primitives.

Return ONLY valid JSON — no preamble, no markdown, no explanation. The JSON must be an array of activated rule objects.

Each object must have exactly these fields:
{ "id": string, "value": any, "confidence": "high" | "medium" | "low" }

Valid ids:
press_auto_x_down, press_auto_birdie, press_auto_eagle, press_manual_request, press_requires_acceptance, press_double_or_nothing, press_max_per_round, press_new_submatch, press_no_dormie, press_back9_auto, format_nassau, format_skins, format_skins_back9_only, format_match_play, format_stroke_play, format_stableford, format_modified_stableford, format_wolf, format_vegas, format_hammer, format_bingo_bango_bongo, format_rabbit, format_quota, format_defender, bonus_par5_double, bonus_par3_special, bonus_birdie_unit, bonus_eagle_unit, bonus_greenie, bonus_sandie, bonus_barkie, bonus_oozle, bonus_chippy, bonus_polie, bonus_last_hole_double, bonus_garbage_tracking, carryover_skins_halved, carryover_cap, carryover_jackpot_18, carryover_reset_on_win, carryover_nassau_halved, handicap_full, handicap_90_pct, handicap_80_pct, handicap_75_pct, handicap_stroke_index, handicap_ghost_player, handicap_scratch, handicap_max_cap, handicap_bump_and_run, handicap_mixed_tees, casual_gimme_distance, casual_breakfast_ball, casual_mulligans, casual_no_blood, casual_preferred_lies, casual_concede_match, casual_foot_wedge, settlement_unit_value, settlement_pay_per_hole, settlement_end_of_round, settlement_running_tab, settlement_net_out, settlement_rain_shortened, settlement_max_loss_cap, settlement_ties_split, settlement_ties_carryover, group_min_players, group_pickup_rule, group_sub_in, group_teams_fixed, group_teams_rotating, group_wolf_lone_multiplier, group_sixes, group_point_bank

Value field rules:
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

Only include rules clearly described or strongly implied. Never invent rules. Use "low" confidence only for ambiguous interpretations.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Description must be at least 5 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Parsing service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: description.trim() }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', await anthropicRes.text());
      return new Response(
        JSON.stringify({ error: 'Failed to parse game rules. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await anthropicRes.json();
    const rawText = data.content?.[0]?.text ?? '[]';

    let parsed: any[] = [];
    try {
      const result = JSON.parse(rawText);
      parsed = Array.isArray(result) ? result : [];
    } catch {
      console.error('Failed to parse Claude JSON:', rawText);
    }

    const sanitized = parsed
      .filter(item =>
        item &&
        typeof item.id === 'string' &&
        VALID_IDS.has(item.id) &&
        ['high', 'medium', 'low'].includes(item.confidence)
      )
      .map(item => ({ id: item.id, value: item.value ?? null, confidence: item.confidence }));

    return new Response(
      JSON.stringify({ primitives: sanitized }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('parse-house-game error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
