/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// =============================================================================
// GOLF GAME CONSTANTS
// =============================================================================

/** Standard slope rating for course difficulty calculations */
export const STANDARD_SLOPE_RATING = 113;

/** Number of holes in a full round */
export const FULL_ROUND_HOLES = 18;

/** Number of holes in a half round */
export const HALF_ROUND_HOLES = 9;

/** Default par when hole info is missing */
export const DEFAULT_PAR = 4;

/** Standard course par for 18 holes */
export const STANDARD_COURSE_PAR_18 = 72;

/** Standard course par for 9 holes */
export const STANDARD_COURSE_PAR_9 = 36;

// =============================================================================
// SCORING CONSTANTS
// =============================================================================

/** Minimum valid golf score for a hole */
export const MIN_HOLE_SCORE = 1;

/** Maximum valid golf score for a hole (for validation) */
export const MAX_HOLE_SCORE = 15;

/** Maximum score for voice recognition fuzzy matching */
export const MAX_VOICE_SCORE = 12;

// =============================================================================
// UI TIMING CONSTANTS
// =============================================================================

/** Seconds to wait before auto-advancing to next hole */
export const AUTO_ADVANCE_SECONDS = 20;

/** Default toast notification duration in milliseconds */
export const TOAST_DURATION_SHORT = 1500;

/** Extended toast notification duration in milliseconds */
export const TOAST_DURATION_MEDIUM = 2000;

/** Long toast notification duration in milliseconds */
export const TOAST_DURATION_LONG = 5000;

/** Delay before voice retry in milliseconds */
export const VOICE_RETRY_DELAY = 300;

/** Duration for voice success highlight in milliseconds */
export const VOICE_SUCCESS_HIGHLIGHT_DURATION = 1500;

// =============================================================================
// STABLEFORD SCORING
// =============================================================================

/** Stableford points for double eagle (albatross) or better */
export const STABLEFORD_DOUBLE_EAGLE = 5;

/** Stableford points for eagle */
export const STABLEFORD_EAGLE = 4;

/** Stableford points for birdie */
export const STABLEFORD_BIRDIE = 3;

/** Stableford points for par */
export const STABLEFORD_PAR = 2;

/** Stableford points for bogey */
export const STABLEFORD_BOGEY = 1;

/** Stableford points for double bogey or worse */
export const STABLEFORD_DOUBLE_BOGEY = 0;

// =============================================================================
// MODIFIED STABLEFORD SCORING
// =============================================================================

/** Modified Stableford points for double eagle or better */
export const MODIFIED_STABLEFORD_DOUBLE_EAGLE = 8;

/** Modified Stableford points for eagle */
export const MODIFIED_STABLEFORD_EAGLE = 5;

/** Modified Stableford points for birdie */
export const MODIFIED_STABLEFORD_BIRDIE = 2;

/** Modified Stableford points for par */
export const MODIFIED_STABLEFORD_PAR = 0;

/** Modified Stableford points for bogey */
export const MODIFIED_STABLEFORD_BOGEY = -1;

/** Modified Stableford points for double bogey or worse */
export const MODIFIED_STABLEFORD_DOUBLE_BOGEY = -3;

// =============================================================================
// WOLF GAME CONSTANTS
// =============================================================================

/** Required number of players for Wolf game */
export const WOLF_PLAYER_COUNT = 4;

/** Multiplier for Lone Wolf points */
export const WOLF_LONE_WOLF_MULTIPLIER = 2;

/** Multiplier for Blind Wolf points */
export const WOLF_BLIND_WOLF_MULTIPLIER = 3;

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

/** Minimum players for Nassau game */
export const NASSAU_MIN_PLAYERS = 2;

/** Maximum players for Nassau game */
export const NASSAU_MAX_PLAYERS = 2;

/** Minimum fuzzy match similarity for voice recognition */
export const FUZZY_MATCH_MAX_DISTANCE = 1;
