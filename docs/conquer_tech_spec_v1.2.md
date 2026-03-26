# Conquer Card — Technical Architecture Specification
## Version 1.2 | Solo-Developer Edition

> References: RULES v1.2 | GDD v1.2
> This document is the canonical technical reference for all server and engine work.

---

## 1. Critical Rules (Never Break These)

1. NEVER reimplement game logic in the server — always import from `packages/engine`
2. Turn timer runs on the SERVER — never trust client timing
3. NEVER send opponent hand cards to client — only send hand COUNT
4. All coin operations use atomic PostgreSQL transactions
5. Server validates every action — the client is a view, not a brain
6. Rate limit `game:action` events to max 5 per second per player
7. Card IDs are unique across both decks: `7S_0` and `7S_1` are different cards

---

## 2. System Architecture

Three layers — keep them cleanly separated:

| Layer | Responsibility |
|---|---|
| Game Engine (`packages/engine`) | Pure game logic — rules, state, validation, scoring. No UI, no network, no database. Shared between client and server. |
| Server (`packages/server`) | Authoritative source of truth. Validates all actions. Manages rooms, matchmaking, coin ledger, user accounts, real-time events. |
| Client (`packages/mobile`) | Renders what the server tells it. Sends player actions. Never trusts itself for game logic. |

### Full Stack

| Component | Technology |
|---|---|
| Mobile app | React Native + Expo |
| Game engine | Pure TypeScript — shared via npm workspace |
| REST API | Node.js + Express |
| Real-time | Socket.io |
| Game state cache | Redis |
| Database | PostgreSQL via Prisma |
| Auth | Firebase Admin SDK |
| Voice (v1.0) | Agora.io voice-only SDK |
| Video (v1.5) | Agora.io full A/V SDK |
| IAP | RevenueCat |
| Hosting | Railway |
| App distribution | Expo EAS Build |
| Analytics | PostHog |
| Error tracking | Sentry |

---

## 3. Game Engine Types (packages/engine/src/types.ts)

```typescript
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER'

// Card ID format: '{rank}{suitInitial}_{deckIndex}' e.g. '7S_0', '7S_1', 'JOKER_0'
type Card = {
  id: string        // unique across both decks — '7S_0' and '7S_1' are different
  rank: Rank
  suit: Suit
  deckIndex: 0 | 1
}

type MeldType = 'set' | 'sequence'
type Meld = {
  id: string
  ownerId: string
  type: MeldType
  cards: Card[]
}

type PlayerStatus = 'unopened' | 'opened' | 'finishing' | 'disconnected' | 'spectating'
type Player = {
  id: string
  displayName: string
  hand: Card[]
  melds: Meld[]
  status: PlayerStatus
  faceUpEligible: boolean
  coinBalance: number
  isBot: boolean
  cameraOn: boolean
}

type RoundPhase = 'waiting' | 'dealing' | 'active' | 'round_over'
type GameState = {
  tableId: string
  roundNumber: number
  phase: RoundPhase
  players: Player[]
  activePlayerIndex: number
  drawPile: Card[]
  discardPile: Card[]
  faceUpCard: Card | null
  allMelds: Meld[]
  betAmount: number
  dealerIndex: number
  jokerCount: 0 | 2 | 4
  sequencesOnlyMode: boolean
  turnStartedAt: number
  turnTimeoutSeconds: number
}
```

### Action Types

```typescript
type GameAction =
  | { type: 'DRAW_FROM_DECK'; playerId: string }
  | { type: 'PICK_UP_DISCARD'; playerId: string }
  | { type: 'TAKE_FACE_UP_CARD'; playerId: string }
  | { type: 'LAY_MELD'; playerId: string; cards: Card[]; meldType: MeldType }
  | { type: 'ADD_TO_MELD'; playerId: string; meldId: string; cards: Card[]; position: 'start' | 'end' }
  | { type: 'STEAL_JOKER'; playerId: string; meldId: string; replacementCard: Card }
  | { type: 'DISCARD'; playerId: string; card: Card }
  | { type: 'LEAVE_TABLE'; playerId: string }
  | { type: 'TOGGLE_CAMERA'; playerId: string; cameraOn: boolean }
```

### Core Engine Functions

| Function | Description |
|---|---|
| `createDeck(jokerCount)` | Creates and shuffles double deck (104 + jokers). Returns `Card[]` |
| `dealCards(deck, playerCount)` | Deals 13 cards each, 14 to dealer. Places face-up card under deck. |
| `validateAction(state, playerId, action)` | Returns `{ valid: boolean, reason?: string }` |
| `applyAction(state, playerId, action)` | Returns new `GameState`. Never mutates. |
| `calculateMeldValue(cards)` | Point value for 41-point opening check |
| `validateMeld(cards, mode)` | Checks valid set or sequence including Joker and Ace rules |
| `checkWinCondition(state, playerId)` | Returns `'normal' \| 'joker' \| 'perfect_hand' \| null` |
| `calculatePayout(betAmount, winType, playerCount)` | Returns coin amounts |
| `advanceTurn(state)` | Moves to next player, resets turn timer |
| `handleTimeout(state)` | Auto-draws and auto-discards for timed-out player |
| `reshuffleDeck(state)` | Shuffles discard pile into new draw pile when deck exhausted |

---

## 4. Server Architecture

### 4.1 REST API Endpoints

| Method + Path | Auth | Purpose |
|---|---|---|
| `POST /auth/guest` | None | Create guest account — returns JWT |
| `POST /auth/verify` | Firebase token | Verify Firebase token, return app JWT |
| `GET /profile/:userId` | JWT | Get profile, coin balance, stats |
| `PATCH /profile/:userId` | JWT | Update display name, avatar |
| `GET /tables/public` | JWT | List public tables by tier |
| `POST /tables/create` | JWT | Create private table — returns tableId + room code |
| `POST /tables/:tableId/join` | JWT | Join table by ID or room code |
| `GET /tables/:tableId/state` | JWT | Get current state (for reconnect) |
| `POST /shop/purchase` | JWT | Process coin pack IAP receipt |
| `GET /shop/products` | JWT | List coin packs and cosmetics |
| `GET /history/:userId` | JWT | Get match history |
| `POST /report/:userId` | JWT | Report a player |

### 4.2 Socket.io Events

#### Client emits (player actions):

| Event | Payload |
|---|---|
| `game:action` | `{ actionType, ...actionPayload }` — all game actions use this single event |
| `table:join` | `{ tableId, userId }` |
| `table:leave` | `{ tableId, userId }` |
| `player:ready` | `{ tableId, userId }` |
| `player:camera_toggle` | `{ tableId, userId, cameraOn: boolean }` |
| `player:emoji` | `{ tableId, userId, emoji: string }` |
| `chat:voice_signal` | `{ tableId, userId, signal }` |

#### Server emits (game events):

| Event | When sent |
|---|---|
| `game:state_update` | After every action — SANITIZED (no opponent hands) |
| `game:action_rejected` | Only to the player who sent an invalid action |
| `game:round_start` | When new round begins |
| `game:round_over` | `{ winnerId, winType, payouts }` |
| `game:turn_changed` | `{ activePlayerId, timeoutAt }` |
| `game:turn_timeout` | `{ playerId, autoAction }` |
| `game:player_joined` | When player joins table |
| `game:player_left` | When player leaves |
| `game:player_disconnected` | `{ playerId, reconnectDeadline }` |
| `game:player_reconnected` | `{ playerId }` |
| `player:emoji_reaction` | Broadcast emoji to all at table |
| `table:countdown` | `{ secondsRemaining }` |

> **CRITICAL**: `game:state_update` must sanitize GameState before sending.
> Replace each opponent's `hand: Card[]` with `handCount: number`.
> Never send actual card data for any player except the receiver.

### 4.3 Room Management

| Scenario | Behavior |
|---|---|
| Player joins public table | Find table at tier with open seat; create new if none available |
| Player disconnects | Mark DISCONNECTED; start 60-second countdown; bot takes turns |
| Player reconnects within 60s | Restore player; send current state; remove bot |
| Player fails to reconnect | Remove from game; forfeit bet to winner |
| Table drops below 2 players | Continue; if 1 player remains they win by default |
| All players leave | Table closes after 5-minute empty timeout |
| Host leaves private table | Next longest-seated player becomes host |

### 4.4 Turn Timer
- 30 seconds per turn
- Runs SERVER-SIDE using `setTimeout`
- On expiry: call `handleTimeout(state)` from engine, broadcast result
- Never trust client-reported timing

---

## 5. Database Design

### 5.1 PostgreSQL Schema (Prisma)

#### users table
```prisma
model User {
  id                      String    @id @default(uuid())  // matches Firebase Auth UID
  firebaseUid             String    @unique
  displayName             String
  email                   String?   @unique
  avatarUrl               String?
  coinBalance             Int       @default(200)         // never goes negative
  totalRoundsPlayed       Int       @default(0)
  totalRoundsWon          Int       @default(0)
  doubleWins              Int       @default(0)
  cameraTimeSeconds       Int       @default(0)
  cameraRewardWindowStart DateTime?
  cameraTier1Claimed      Boolean   @default(false)
  cameraTier2Claimed      Boolean   @default(false)
  ageVerified             Boolean   @default(false)
  isGuest                 Boolean   @default(false)
  isBot                   Boolean   @default(false)
  createdAt               DateTime  @default(now())
  lastActiveAt            DateTime?

  gamePlayers    GamePlayer[]
  transactions   CoinTransaction[]
}
```

#### tables table
```prisma
model Table {
  id              String      @id @default(uuid())
  isPrivate       Boolean     @default(false)
  roomCode        String?     @unique
  betAmount       Int
  jokerCount      Int         @default(4)         // 0, 2, or 4
  sequencesOnly   Boolean     @default(false)
  hostUserId      String?
  status          TableStatus @default(WAITING)
  createdAt       DateTime    @default(now())
  closedAt        DateTime?

  rounds Round[]
}

enum TableStatus {
  WAITING
  ACTIVE
  CLOSED
}
```

#### rounds table
```prisma
model Round {
  id            String    @id @default(uuid())
  tableId       String
  roundNumber   Int
  winnerUserId  String?
  winType       WinType?
  betAmount     Int
  playerCount   Int
  startedAt     DateTime?
  endedAt       DateTime?

  table       Table        @relation(fields: [tableId], references: [id])
  gamePlayers GamePlayer[]
  transactions CoinTransaction[]
}

enum WinType {
  NORMAL
  JOKER
  PERFECT_HAND
  FACE_UP_CARD
}
```

#### game_players table
```prisma
model GamePlayer {
  id        String   @id @default(uuid())
  userId    String
  roundId   String
  coinsWon  Int      @default(0)   // positive = won, negative = lost
  joinedAt  DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id])
  round Round @relation(fields: [roundId], references: [id])
}
```

#### coin_transactions table
```prisma
model CoinTransaction {
  id          String          @id @default(uuid())
  userId      String
  amount      Int             // positive = credit, negative = debit
  type        TransactionType
  roundId     String?
  createdAt   DateTime        @default(now())

  user  User   @relation(fields: [userId], references: [id])
  round Round? @relation(fields: [roundId], references: [id])
}

enum TransactionType {
  BET_LOSS
  ROUND_WIN
  DOUBLE_WIN
  IAP
  DAILY_BONUS
  CAMERA_REWARD
  WELCOME_BONUS
  FORFEIT
}
```

### 5.2 Redis Key Patterns

| Key | Value | TTL |
|---|---|---|
| `game:state:{tableId}` | Full GameState JSON | 2 hours |
| `game:turn_timer:{tableId}` | Unix timestamp when turn expires | 35 seconds |
| `table:room_code:{code}` | tableId string | Until table closes |
| `user:session:{userId}` | Socket ID for reconnect routing | 5 minutes |
| `user:camera:{userId}` | `{ windowStart, secondsAccumulated }` | 13 hours |

---

## 6. Client Architecture (React Native)

### 6.1 Monorepo Structure
```
conquer-card/
  packages/
    engine/          -- Pure TypeScript game engine (shared)
    server/          -- Node.js + Express + Socket.io
    mobile/          -- React Native + Expo
  CLAUDE.md          -- AI context file
  docs/              -- All project documents
  package.json       -- Root with npm workspaces
```

### 6.2 Mobile App Structure
```
mobile/src/
  screens/           -- One file per screen
  components/        -- CardView, MeldGroup, PlayerSlot, Timer, etc.
  hooks/             -- useGameState, useSocket, useCoins
  store/             -- Zustand stores (auth, game, ui)
  services/          -- API calls
  socket/            -- Socket.io client + event handlers
  assets/            -- Images, sounds, fonts
  utils/             -- Helpers
```

### 6.3 State Management (Zustand)

| Store | Contents |
|---|---|
| `authStore` | Current user profile, coin balance, Firebase auth state |
| `gameStore` | Current GameState from server, active table ID, selected cards |
| `uiStore` | Loading states, modals, toasts, onboarding progress |

> `gameStore` must ONLY be updated by the `game:state_update` socket event handler.
> Never update game state from local UI actions directly.

### 6.4 Navigation Structure

| Screen | Navigator |
|---|---|
| Splash + Onboarding | No navigation — fullscreen |
| Auth flow | Stack navigator |
| Home | Bottom tab navigator root |
| Public/Private Lobby | Stack — pushed from Home |
| Table (all states) | Full-screen modal |
| Profile | Bottom tab |
| Shop | Bottom tab or modal |
| Settings | Stack from Profile |

---

## 7. Security & Anti-Cheat

| Attack vector | Defense |
|---|---|
| Playing a card not in hand | Server validates card ID exists in player's hand |
| Acting out of turn | Server checks activePlayerIndex on every action |
| Invalid melds | `validateMeld()` runs server-side on every LAY_MELD |
| Coin manipulation | All balances read from DB; client never sends coin amounts |
| Replay attacks | JWT with short expiry (1 hour) + refresh tokens |
| Double-action (spam tap) | Rate limit 5 actions/second per player; duplicates rejected |

---

## 8. Coin Ledger Rules

- Every bet is locked at round start — reserved from each player's balance
- On round end — winner's coins credited, losers' reserved coins go to winner
- On forfeit (disconnect) — reserved coins go to round winner
- On IAP — coins credited ONLY after server-side receipt validation
- Balance never goes below 0
- All transfers use PostgreSQL transactions — atomic, no partial updates

---

## 9. Build Order for Phase 2 (Server)

Work one file at a time. Run tests before moving to next file.

1. `prisma/schema.prisma` — match Section 5.1 exactly
2. `src/lib/firebase.ts` — Firebase Admin SDK init + verifyIdToken()
3. `src/middleware/auth.ts` — JWT verification + auto user upsert in Postgres
4. `src/lib/redis.ts` — Redis client + getGameState / setGameState / deleteGameState helpers
5. `src/sockets/gameEvents.ts` — Wire engine in here. Import validateAction + applyAction. Handle all Socket.io events. Server-side turn timer. Disconnect/reconnect/bot substitution.
6. `src/routes/auth.ts` + `tables.ts` + `shop.ts` — All REST endpoints from Section 4.1
7. `src/lib/coinLedger.ts` — Atomic coin transfers using Postgres transactions
8. `src/botAI.ts` — Conservative random bot for empty seats only

---

## 10. Monitoring

### Sentry
- `@sentry/react-native` on client
- `@sentry/node` on server
- Alert on error rate spikes
- Free tier: 5,000 errors/month

### PostHog Events to Track from Day One

| Event | Why |
|---|---|
| `app_opened` | DAU |
| `round_started` | Game activity |
| `round_completed` | Completion rate |
| `win_type_recorded` | Joker/Perfect Hand frequency |
| `opening_method_used` | 41-pts vs 3-melds — which do players use? |
| `discard_blocked` | How often discard restriction fires |
| `iap_completed` | Revenue |
| `camera_toggled_on` | Social engagement (v1.5) |

---

## 11. v1.5 Additions

- Upgrade Agora SDK from voice-only to full A/V
- Add camera permission flow
- Replace avatar thumbnails with live video feeds in PlayerSlot
- Activate camera time tracking (already in DB schema)
- Activate video coin bonus (already in RULES v1.2)
- Browser version via React Native Web — same codebase, minimal extra work
- Stripe for browser coin purchases (no Apple/Google cut)

---

## 12. Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=1h

# Agora
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Sentry
SENTRY_DSN=

# PostHog
POSTHOG_API_KEY=

# App
NODE_ENV=development
PORT=3000
```

---

*End of Technical Architecture Specification — v1.2*
