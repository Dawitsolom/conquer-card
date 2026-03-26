# Conquer Card — Claude Code Context

## What this project is
Conquer Card is a social card game for mobile — a Rummy-style melding game
played with a double deck. Think Pokerface for a strategic card game.
Free to play, coin wagering, live voice chat, emoji reactions.
Video chat planned for v1.5. Browser version via React Native Web in v1.5.

## AI Agent Roles
See AGENTS.md for full collaboration guide. Quick summary:
- Claude Code: primary implementation engineer — reads files, runs commands, edits code
- GitHub Copilot: passive inline autocomplete only
- Codex/ChatGPT: upstream planning and prompt generation
- Claude Chat: architecture decisions and document updates

## Solo developer background
Java engineer learning TypeScript. Explain new concepts in Java terms.
Use this project as a teaching opportunity — not just code generation.

## Repository
github.com/Dawitsolomon/conquer-card

## Tech stack
- Engine: Pure TypeScript (packages/engine) — COMPLETE, 100 tests passing
- Server: Node.js + Express + Socket.io (packages/server) — COMPLETE
- Mobile: React Native + Expo (packages/mobile) — IN PROGRESS (Phase 3)
- Database: PostgreSQL via Prisma + Redis (both running on Railway)
- Auth: Firebase Admin SDK + Firebase client
- Real-time: Socket.io
- IAP: RevenueCat
- Voice: Agora.io (voice-only v1.0, full video v1.5)
- Hosting: Railway
- Analytics: PostHog
- Errors: Sentry

## Full documentation
- docs/conquer_rules_v1.2.docx — complete official game rules (READ THIS FIRST)
- docs/conquer_tech_spec_v1.2.md — technical specification (readable by Claude Code)
- docs/conquer_gdd_v1.2.docx — game design document
- docs/conquer_ux_brief_v1.2.docx — UI/UX design brief
- docs/conquer_branding_v1.2.docx — branding and go-to-market
- docs/conquer_qa_v1.2.docx — QA checklist
- docs/conquer_licensing_v1.docx — legal and licensing guide
- docs/conquer_engine_update_v1.docx — engine update brief

## Current project status
Phase 1 COMPLETE: Engine — 100 tests passing, all rules implemented
Phase 2 COMPLETE: Server — running on Railway, PostgreSQL + Redis live
Phase 3 IN PROGRESS: Mobile app on feature/mobile-phase3
Phase 4 NOT STARTED: QA and launch

## Active branch
feature/mobile-phase3 — branched from develop

## Git branching rules
- main: production only — never commit directly
- develop: integration branch — Railway staging deploys from here
- feature/*: all work happens here, merged to develop via PR
- hotfix/*: urgent fixes from main, merged back to main AND develop
- Commit messages: feat(scope): description or fix(scope): description

## Critical coding rules — never break these
1. NEVER reimplement game logic in mobile or server — engine is source of truth
2. Turn timer runs on the SERVER — never trust client timing
3. NEVER send opponent hand cards to client — only send handCount
4. All coin operations use atomic PostgreSQL transactions
5. Server validates every action — mobile is a view, not a brain
6. Rate limit game:action to max 5 per second per player
7. Card IDs are unique across both decks: '7S_0' and '7S_1' are different cards
8. Mobile only renders server state and sends player intents — no local game logic

## Key game rules summary (full rules in docs/conquer_rules_v1.2.docx)
- Double deck (104 cards) + configurable Jokers (0/2/4)
- 13 cards per player, 14 to dealer, 1 face-up card under deck
- Opening: EITHER 41+ points OR at least 3 melds (any value) — both valid
- Cannot discard a card that fits your own melds already on the table
- Joker can NEVER be discarded — must be used in meld or as finisher
- Sequences can be extended beyond 5 cards once on the table (no upper limit)
- Joker finish = double coins. Perfect Hand = double coins. Maximum = 2x.
- Face-Up Card: claim only to finish, only if player has zero melds

## Phase 3 build order (mobile)
Work one screen/component at a time. Tests before moving on.

Step 1 — Contract alignment (Codex prompt already prepared)
  - Audit server socket events vs mobile usage
  - Create shared contract types
  - Fix legacy event names and payload mismatches
  - Ensure sanitized state shape is consumed correctly

Step 2 — Auth flow
  - Splash screen + onboarding (3 slides)
  - Login/register screen (Firebase client)
  - Guest mode

Step 3 — Home screen
  - Coin balance display
  - Daily bonus claim
  - Public table listing by tier
  - Create private table button

Step 4 — Table screen (most important — take most time here)
  - Pre-round lobby
  - Card deal animation
  - Player hand (fan layout, tap to select)
  - Meld zone (all players' melds visible)
  - Draw deck + discard pile + Face-Up Card
  - Action hint bar (always active, explains discard restrictions)
  - Turn timer ring
  - Discard button (greyed when blocked)
  - Emoji reactions
  - Round over overlay

Step 5 — Profile + Shop screens
Step 6 — Voice chat (Agora.io)
Step 7 — IAP (RevenueCat)

## Action hint bar messages (critical UX)
Must handle every state:
- "Tap the deck to draw a card"
- "Tap the discard pile to pick up [card]" (when eligible)
- "You need 41+ points or 3 melds to open"
- "You have 3 melds — you can open now!"
- "Lay down your melds to open"
- "Add cards to melds or discard"
- "That card fits your meld — add it there first" (discard blocked)
- "Jokers cannot be discarded — use it in a meld or save it to finish"
- "Discard your final card to win!"

## Server socket events reference (docs/conquer_tech_spec_v1.2.md Section 4.2)
Client emits: game:action, table:join, table:leave, player:ready,
              player:camera_toggle, player:emoji, chat:voice_signal
Server emits: game:state_update, game:action_rejected, game:round_start,
              game:round_over, game:turn_changed, game:turn_timeout,
              game:player_joined, game:player_left, game:player_disconnected,
              game:player_reconnected, player:emoji_reaction, table:countdown

## Sanitized state shape (what mobile receives)
- Own player: full hand Card[] visible
- Other players: handCount number only — never hand Card[]
- drawPile: drawPileCount number only — never actual cards
- Everything else in GameState is visible to all players

## How to run
# Engine tests
cd packages/engine && npx jest

# Start server (needs .env configured)
cd packages/server && npm run dev

# Start mobile
cd packages/mobile && npx expo start
