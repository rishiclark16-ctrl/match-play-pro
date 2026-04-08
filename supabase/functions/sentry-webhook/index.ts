import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

/**
 * Sentry Webhook → GitHub Issue Creator
 *
 * Receives Sentry webhook payloads for new/regression issues,
 * creates a GitHub issue with full context for quick debugging.
 *
 * Setup:
 * 1. Set secrets via Supabase CLI:
 *    supabase secrets set SENTRY_WEBHOOK_SECRET=<your-sentry-webhook-signing-secret>
 *    supabase secrets set GITHUB_TOKEN=<your-github-pat>
 *    supabase secrets set GITHUB_REPO=<owner/repo>
 *
 * 2. In Sentry → Settings → Integrations → Webhooks:
 *    URL: https://puqgbsxabcyxrbwwoznn.supabase.co/functions/v1/sentry-webhook
 *    Secret: <same as SENTRY_WEBHOOK_SECRET>
 *    Events: issue.created, issue.regression
 */

const SENTRY_SECRET = Deno.env.get('SENTRY_WEBHOOK_SECRET') ?? '';
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') ?? '';
const GITHUB_REPO = Deno.env.get('GITHUB_REPO') ?? 'matchgolf/match-golf';

// Only process these Sentry webhook actions
const ACTIONABLE_EVENTS = ['created', 'regression'];

// Rate limit: max 20 issues per hour
const issueTimestamps: number[] = [];
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 60 * 1000;

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove old timestamps
  while (issueTimestamps.length > 0 && issueTimestamps[0] < now - RATE_WINDOW) {
    issueTimestamps.shift();
  }
  if (issueTimestamps.length >= RATE_LIMIT) return true;
  issueTimestamps.push(now);
  return false;
}

interface SentryIssuePayload {
  action: string;
  data: {
    issue: {
      id: string;
      title: string;
      culprit: string;
      shortId: string;
      permalink: string;
      level: string;
      count: string;
      firstSeen: string;
      lastSeen: string;
      metadata: {
        type?: string;
        value?: string;
        filename?: string;
        function?: string;
      };
      tags: Array<{ key: string; value: string }>;
    };
  };
}

function extractContext(payload: SentryIssuePayload) {
  const issue = payload.data.issue;
  const tags = issue.tags || [];

  const getTag = (key: string) => tags.find(t => t.key === key)?.value ?? 'unknown';

  return {
    title: issue.title,
    culprit: issue.culprit,
    errorType: issue.metadata.type ?? 'Error',
    errorValue: issue.metadata.value ?? issue.title,
    filename: issue.metadata.filename ?? '',
    functionName: issue.metadata.function ?? '',
    level: issue.level,
    occurrences: issue.count,
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
    sentryUrl: issue.permalink,
    sentryId: issue.shortId,
    platform: getTag('platform'),
    route: getTag('route'),
    subscription: getTag('subscription'),
    browser: getTag('browser'),
    os: getTag('os'),
    isRegression: payload.action === 'regression',
  };
}

function buildGitHubIssue(ctx: ReturnType<typeof extractContext>) {
  const labels = ['bug', 'sentry-auto'];
  if (ctx.level === 'fatal' || ctx.level === 'error') labels.push('priority: high');
  if (ctx.isRegression) labels.push('regression');
  if (ctx.platform !== 'unknown') labels.push(`platform: ${ctx.platform}`);

  const title = ctx.isRegression
    ? `[Regression] ${ctx.errorType}: ${truncate(ctx.errorValue, 80)}`
    : `[Sentry] ${ctx.errorType}: ${truncate(ctx.errorValue, 80)}`;

  const body = `## Sentry Auto-Report

**${ctx.isRegression ? 'REGRESSION — this error was previously resolved and has returned.' : 'New error detected in production.'}**

### Error
| Field | Value |
|-------|-------|
| **Type** | \`${ctx.errorType}\` |
| **Message** | ${ctx.errorValue} |
| **File** | \`${ctx.filename}\` |
| **Function** | \`${ctx.functionName}\` |
| **Level** | ${ctx.level} |
| **Occurrences** | ${ctx.occurrences} |
| **First seen** | ${ctx.firstSeen} |

### Context
| Tag | Value |
|-----|-------|
| **Route** | \`${ctx.route}\` |
| **Platform** | ${ctx.platform} |
| **Subscription** | ${ctx.subscription} |
| **Browser/OS** | ${ctx.browser} / ${ctx.os} |

### Culprit
\`\`\`
${ctx.culprit}
\`\`\`

### Links
- [View in Sentry](${ctx.sentryUrl})
- Sentry ID: \`${ctx.sentryId}\`

---
*Auto-created by sentry-webhook edge function*`;

  return { title, body, labels };
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

async function createGitHubIssue(title: string, body: string, labels: string[]) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  return res.json();
}

serve(async (req: Request) => {
  // Only accept POST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook secret (Sentry sends it as a header)
  const sentrySecret = req.headers.get('sentry-hook-signature') ?? '';
  if (SENTRY_SECRET && sentrySecret !== SENTRY_SECRET) {
    // Basic verification — for HMAC verification, use crypto.subtle
    console.warn('Invalid Sentry webhook signature');
  }

  try {
    const payload: SentryIssuePayload = await req.json();

    // Only act on new issues and regressions
    if (!ACTIONABLE_EVENTS.includes(payload.action)) {
      return new Response(JSON.stringify({ skipped: true, reason: `action=${payload.action}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    if (isRateLimited()) {
      return new Response(JSON.stringify({ skipped: true, reason: 'rate_limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check required secrets
    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not set');
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ctx = extractContext(payload);
    const { title, body, labels } = buildGitHubIssue(ctx);
    const ghIssue = await createGitHubIssue(title, body, labels);

    return new Response(JSON.stringify({
      success: true,
      github_issue: ghIssue.html_url,
      sentry_id: ctx.sentryId,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Sentry webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
