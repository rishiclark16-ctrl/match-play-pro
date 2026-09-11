# MATCH Golf Documentation - Master Index

---

## Document Library

| # | Document | Contents |
|---|----------|----------|
| 01 | [Company Overview & Mission](01%20-%20Company%20Overview%20%26%20Mission.md) | Mission, vision, value proposition, target audience, competitive landscape, revenue model, KPIs, brand personality |
| 02 | [Brand Guidelines](02%20-%20Brand%20Guidelines.md) | Logo, color palette (full HSL tokens), typography, spacing, iconography, motion/animation principles, tone of voice, do's and don'ts |
| 03 | [Feature List & Product Specifications](03%20-%20Feature%20List%20%26%20Product%20Specifications.md) | Every feature in the app: scoring, betting games, voice, real-time, offline, social, groups, stats, onboarding, handicap, push notifications, subscription tiers |
| 04 | [Technical Architecture & Stack](04%20-%20Technical%20Architecture%20%26%20Stack.md) | Full tech stack with versions, architecture diagram, state management patterns, data flow, code organization, database overview, edge functions, native iOS architecture, build pipeline, security architecture, performance optimizations |
| 05 | [Component Inventory](05%20-%20Component%20Inventory.md) | All 150+ React components cataloged by domain: golf (55), UI primitives (44), social (14), friends (7), groups (6), subscription (5), profile (2), onboarding (1), layout (1) |
| 06 | [Hooks & Business Logic](06%20-%20Hooks%20%26%20Business%20Logic.md) | All 55+ custom hooks organized by domain: auth, round lifecycle, scoring, voice, games, settlements, analytics, social, groups, subscription, contacts. Plus all pure function libraries. |
| 07 | [Database Schema & API Reference](07%20-%20Database%20Schema%20%26%20API%20Reference.md) | Every table with columns and types, RLS policies, edge function API reference, real-time subscription channels, full migration history |
| 08 | [User Flows & Screen Map](08%20-%20User%20Flows%20%26%20Screen%20Map.md) | Complete route map (26 routes), navigation structure, 8 detailed user flows (diagrams), bottom sheet inventory (20+ sheets) |
| 09 | [Testing & Quality Assurance](09%20-%20Testing%20%26%20Quality%20Assurance.md) | Test infrastructure, 661-test baseline, test inventory by file, test patterns, QA checklist, regression areas, audit history |
| 10 | [iOS & Native Platform Guide](10%20-%20iOS%20%26%20Native%20Platform%20Guide.md) | iOS project structure, native plugins (9), custom Swift plugins, permissions, CocoaPods, Capacitor config, Apple Sign-In, RevenueCat/IAP, build & deployment, App Store assets |
| 11 | [Betting Games Deep Dive](11%20-%20Betting%20Games%20Deep%20Dive.md) | Detailed rules, configuration, examples, and test coverage for: Nassau, Skins, Match Play, Wolf, Stableford, Best Ball, House Games (50+ primitives), Vegas, Rabbit, Quota, Settlement engine, Money tracker |
| 12 | [Security & Privacy](12%20-%20Security%20%26%20Privacy.md) | Authentication methods, authorization (RLS), secrets management, input validation, payment security, privacy (data collected/not collected), data deletion, network security, Sentry config, audit history |
| 13 | [Glossary & Golf Terms](13%20-%20Glossary%20%26%20Golf%20Terms.md) | Complete glossary: golf scoring terms, handicap terms, betting game terms, prop bet terms, house game terms, app-specific terms |

---

## Quick Reference

- **App Name:** MATCH (full: MATCH Golf)
- **Bundle ID:** dev.matchgolf.app
- **Platform:** iOS (primary), Android (secondary)
- **Tech:** React 18 + TypeScript + Vite + Capacitor 6 + Supabase
- **Tests:** 661 passing, 0 failing
- **Components:** 150+
- **Hooks:** 55+
- **Game Types:** 10+
- **Prop Bet Types:** 12
- **Subscription:** Free + Pro ($3.99/mo or $24.99/yr)
- **Database Tables:** 15+
- **Edge Functions:** 6
- **Migrations:** 29

---

*Documentation generated April 2026. Reflects codebase as of commit history through 2026-04-05.*
