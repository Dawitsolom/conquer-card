# Conquer Card — Claude Code Context

## What this project is
Conquer Card is a social card game for mobile — a Rummy-style melding game
played with a double deck. Think Pokerface for a strategic card game.
Free to play, coin wagering, live voice chat, emoji reactions.
Video chat is planned for v1.5.

## Solo developer background
Java engineer learning TypeScript. Explain new concepts in Java terms.
Use this project as a teaching opportunity — not just code generation.

## Repository
github.com/Dawitsolom/conquer-card

## Tech stack
- Engine: Pure TypeScript (packages/engine) — COMPLETE, 100 tests passing
- Server: Node.js + Express + Socket.io (packages/server) — IN PROGRESS
- Mobile: React Native + Expo (packages/mobile) — NOT STARTED
- Database: PostgreSQL via Prisma + Redis
- Auth: Firebase Admin SDK + Firebase client
- Real-time: Socket.io
- IAP: RevenueCat
- Voice: Agora.io (voice-only v1.0, full video v1.5)
- Hosting: Railway
- Analytics: PostHog
- Errors: Sentry

## Full documentation
- docs/conquer_rules_v1.2.docx — complete official game rules (READ THIS FIRST)
- docs/conquer_tech_spec_v1.docx — technical specification with all types and functions
- docs/conquer_gdd_v1.2.docx — game design document
- docs/conquer_ux_brief_v1.2.docx — UI/UX design brief
- docs/conquer_branding_v1.2.docx — branding and go-to-market
- docs/conquer_qa_v1.2.docx — QA checklist
- docs/conquer_licensing_v1.docx — legal and licensing guide

## Current project status
Phase 1 COMPLETE: Engine has 100 passing tests covering all rules.
Phase 2 IN PROGRESS: Server needs to be built on top of the engine.
Phase 3 NOT STARTED: Mobile app.

## Git branching rules
- main: production only — never commit directly
- develop: integration branch — Railway staging deploys from here
- feature/*: all work happens here, merged to develop via PR
- hotfix/*: urgent fixes from main, merged back to main AND develop
- Current active branch: feature/server-phase2

## Critical coding rules — never break these
1. NEVER reimplement game logic in the server — always import from packages/engine
2. Turn timer runs on the SERVER — never trust client timing
3. NEVER send opponent hand cards to client — only send hand COUNT
4. All coin operations use atomic PostgreSQL transactions
5. Server validates every action — the client is a view, not a brain
6. Rate limit game:action events to max 5 per second per player
7. Card IDs are unique across both decks: '7S_0' and '7S_1' are different cards

## Key game rules summary (read docs/conquer_rules_v1.2.docx for full rules)
- Double deck (104 cards) + configurable Jokers (0/2/4)
- 13 cards per player, 14 to dealer, 1 face-up card under deck
- Opening: EITHER 41+ points OR at least 3 melds (any value)
- Cannot discard a card that fits your own melds on the table
- Joker can NEVER be discarded — must be used in meld or as finisher
- Sequences can be extended beyond 5 cards once on the table
- Joker finish = double coins. Perfect Hand = double coins. Max = 2x.
- Face-Up Card: claim only to finish, only if player has zero melds

## Phase 2 build order (server)
1. prisma/schema.prisma — Tech Spec Section 5.1
2. src/lib/firebase.ts — Firebase Admin SDK
3. src/middleware/auth.ts — JWT + user upsert
4. src/lib/redis.ts — game state cache
5. src/sockets/gameEvents.ts — wire engine in here (most important file)
6. src/routes/ — REST endpoints from Tech Spec Section 4.2
7. src/lib/coinLedger.ts — atomic coin transfers
8. src/botAI.ts — conservative random bot

## How to run
```bash
# Engine tests
cd packages/engine && npx jest

# Start server (needs .env configured)
cd packages/server && npm run dev

# Start mobile
cd packages/mobile && npx expo start
```
