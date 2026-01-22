import { z } from 'zod';

// Constants
const MIN_SCORE = 1;
const MAX_SCORE = 20; // Reasonable max for a single hole
const MAX_HANDICAP = 54; // USGA max handicap index
const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_CHARS = /^[A-HJ-NP-Z2-9]+$/; // Matches generateJoinCode chars (excludes I, O, 0, 1)

/**
 * Strips HTML tags and dangerous characters from input
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim();
}

/**
 * Player name validation
 * - 1-50 characters after trimming
 * - No HTML tags or dangerous characters
 */
export const playerNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be 50 characters or less')
  .transform(sanitizeString)
  .refine((val) => val.length > 0, 'Name cannot be empty after sanitization');

/**
 * Course name validation
 * - 1-100 characters after trimming
 * - No HTML tags
 */
export const courseNameSchema = z
  .string()
  .min(1, 'Course name is required')
  .max(100, 'Course name must be 100 characters or less')
  .transform(sanitizeString)
  .refine((val) => val.length > 0, 'Course name cannot be empty after sanitization');

/**
 * Handicap validation
 * - Number between 0 and 54 (USGA max)
 * - Can be null/undefined for no handicap
 */
export const handicapSchema = z
  .number()
  .min(0, 'Handicap cannot be negative')
  .max(MAX_HANDICAP, `Handicap cannot exceed ${MAX_HANDICAP}`)
  .nullable()
  .optional();

/**
 * Handicap string input (from form fields)
 * - Converts string to number
 * - Empty string becomes null
 */
export const handicapInputSchema = z
  .string()
  .transform((val) => {
    const trimmed = val.trim();
    if (trimmed === '') return null;
    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
  })
  .pipe(handicapSchema);

/**
 * Join code validation
 * - Exactly 6 alphanumeric characters
 * - Uppercase, excludes ambiguous characters (I, O, 0, 1)
 */
export const joinCodeSchema = z
  .string()
  .transform((val) => val.toUpperCase().trim())
  .refine(
    (val) => val.length === JOIN_CODE_LENGTH,
    `Join code must be exactly ${JOIN_CODE_LENGTH} characters`
  )
  .refine(
    (val) => JOIN_CODE_CHARS.test(val),
    'Join code contains invalid characters'
  );

/**
 * Score validation
 * - Integer between 1 and 20
 */
export const scoreSchema = z
  .number()
  .int('Score must be a whole number')
  .min(MIN_SCORE, `Score must be at least ${MIN_SCORE}`)
  .max(MAX_SCORE, `Score cannot exceed ${MAX_SCORE}`);

/**
 * Stakes validation
 * - Positive number
 * - Max $1000 per bet (reasonable limit)
 */
export const stakesSchema = z
  .number()
  .positive('Stakes must be positive')
  .max(1000, 'Stakes cannot exceed $1000');

/**
 * Hole number validation
 * - Integer between 1 and 18
 */
export const holeNumberSchema = z
  .number()
  .int()
  .min(1, 'Hole number must be at least 1')
  .max(18, 'Hole number cannot exceed 18');

/**
 * Par validation
 * - Integer 3, 4, or 5 (standard golf pars)
 */
export const parSchema = z
  .number()
  .int()
  .min(3, 'Par must be at least 3')
  .max(5, 'Par cannot exceed 5');

/**
 * Email validation (for contacts/friends)
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

// Composite schemas for common operations

/**
 * Player creation input
 */
export const createPlayerSchema = z.object({
  name: playerNameSchema,
  handicap: handicapSchema,
  manualStrokes: z.number().int().min(0).max(36).optional(),
  profileId: uuidSchema.optional(),
});

/**
 * Round creation input
 */
export const createRoundSchema = z.object({
  courseName: courseNameSchema,
  holes: z.union([z.literal(9), z.literal(18)]),
  players: z.array(createPlayerSchema).min(1, 'At least one player is required').max(8, 'Maximum 8 players'),
});

/**
 * Score entry input
 */
export const scoreEntrySchema = z.object({
  playerId: uuidSchema,
  holeNumber: holeNumberSchema,
  strokes: scoreSchema,
});

/**
 * Prop bet creation input
 */
export const createPropBetSchema = z.object({
  type: z.enum(['ctp', 'longest_drive', 'greenie', 'sandie', 'barkie', 'polie', 'arnie', 'ferret', 'snake', 'custom']),
  holeNumber: holeNumberSchema,
  stakes: stakesSchema,
  description: z.string().max(200).optional().transform((val) => val ? sanitizeString(val) : undefined),
});

// Validation helper functions

export type ValidationSuccess<T> = { success: true; data: T; error?: undefined };
export type ValidationError = { success: false; error: string; data?: undefined };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/** Type guard to check if validation failed */
export function isValidationError<T>(result: ValidationResult<T>): result is ValidationError {
  return !result.success;
}

/**
 * Safely validate data and return a result object
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, error: undefined };
  }
  // Return first error message
  const firstError = result.error.errors[0];
  return { success: false, error: firstError?.message || 'Validation failed', data: undefined };
}

/**
 * Validate player name with friendly error
 */
export function validatePlayerName(name: string): ValidationResult<string> {
  return validate(playerNameSchema, name);
}

/**
 * Validate join code with friendly error
 */
export function validateJoinCode(code: string): ValidationResult<string> {
  return validate(joinCodeSchema, code);
}

/**
 * Validate handicap from string input
 */
export function validateHandicap(input: string): ValidationResult<number | null> {
  return validate(handicapInputSchema, input);
}

/**
 * Validate score is within reasonable bounds
 */
export function validateScore(score: number): ValidationResult<number> {
  return validate(scoreSchema, score);
}

/**
 * Check if a parsed number is valid (not NaN, finite)
 */
export function isValidNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
