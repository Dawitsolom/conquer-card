**CONQUER CARD**

Game Design Document

*Social Card Game — Mobile Edition*

Version 1.2 | Updated rules + global positioning

# **1\. Document Purpose**

This GDD translates the rules document (RULES v1.2) into a concrete product blueprint. It covers every screen, game state, player action, loop, and feature needed to build Conquer Card.

*Note: This GDD references RULES v1.2. Any rule changes must be updated in both documents.*

# **2\. Game Overview**

| **Property** | **Value** |
| --- | --- |
| Game name | Conquer Card |
| Genre | Social card game — strategic Rummy-style melding |
| Platform | iOS, Android (React Native + Expo), Browser via React Native Web (v1.5) |
| Players | 2 to 5 per table (real players + bots as last resort) |
| Session type | Living table — ongoing, no fixed end |
| Target audience | Card game players globally, aged 18+ (21+ where required) |
| Tone | Social, warm, competitive — premium artisan feel |
| Inspiration | Pokerface (social layer) + deep strategic card mechanics |
| Monetization | Coin packs (IAP) + cosmetics — free to play, no gameplay ads |
| Supporter pack | $1.99 one-time — unlocks all current cosmetics |
| Age requirement | 18+ globally; 21+ in regions where required by law |
| Language (v1.0) | English only — additional languages planned for future updates |
| Unique value | Strategic depth rivals chess-style card games; social layer rivals Pokerface |

## **2.1 Elevator Pitch**

Conquer Card is a strategic social card game built for people who play for real. Create a private table, share the code, and play with friends and family anywhere in the world. Real stakes. Real strategy. Feel the table.

## **2.2 Core Pillars**

| **Pillar** | **What it means for the product** |
| --- | --- |
| Strategic depth | Face-Up Card, Joker mechanics, discard restrictions, and meld timing reward skilled players |
| Social connection | Audio, emoji reactions, and video (v1.5) make players feel like they are at the same table |
| Accessibility | New players learn in 60 seconds; experienced players find immediate depth |
| Fair play | Server-authoritative game state — no cheating, no exploits |
| Premium feel | Artisan design, warm palette, satisfying animations — quality in every interaction |

# **3\. Core Gameplay Loop**

## **3.1 The Minute-to-Minute Loop**

This is what a player experiences every single turn:

1.  Table shows whose turn it is — active player slot highlights, turn timer starts (30s)
2.  Active player picks up: tap discard pile OR tap draw deck OR tap Face-Up Card (if eligible)
3.  Active player optionally melds: select cards, lay them down, add to existing melds
4.  Active player discards — but CANNOT discard a card that fits their own melds, and CANNOT discard a Joker
5.  Turn passes clockwise — next player's slot highlights
6.  Round ends when a player discards their final card — win animation plays, coins transfer
7.  New round begins after countdown — winner becomes dealer

*Note: The discard restriction (cannot discard a playable card) is a key strategic layer. Communicate this clearly to new players in the tutorial.*

## **3.2 The Two Opening Paths**

When a player picks up from the discard pile for the first time, they must open immediately. There are two valid ways:

| **Opening path** | **Requirement** |
| --- | --- |
| Option A — Points threshold | Lay melds totalling at least 41 points in combined card value |
| Option B — Three melds rule | Lay at least 3 separate valid melds regardless of total point value |

Both paths are equally valid. Option B rewards players who have many low-value melds — but laying 3+ melds exposes cards to opponents who can dump onto them.

## **3.3 The Session Loop**

1.  Player opens app — sees home screen with active tables
2.  Player joins a public table or creates / joins a private table
3.  Multiple rounds are played — coins flow between players
4.  Player leaves table when done — no penalty between rounds
5.  Player checks coin balance, daily bonus, video reward — reasons to return

## **3.4 The Retention Loop**

| **Mechanic** | **Purpose** |
| --- | --- |
| Daily login bonus (20 coins) | Reason to open the app every day |
| Video coin reward (resets every 12 hours) | Reason to play with camera on and return twice daily (v1.5) |
| Private table invites | Friends inviting you is the strongest pull mechanic |
| Coin balance pressure | Running low on coins motivates purchase or daily play |
| Lobby mini-games (post-MVP) | Spin-to-win and other coin games between card rounds |

# **4\. Game State Machine**

## **4.1 Round States**

| **State** | **Description** |
| --- | --- |
| WAITING | Table has fewer than 2 players or countdown is running |
| DEALING | Cards being distributed — Face-Up Card placed under deck |
| ACTIVE | Round in progress — turns cycling clockwise |
| TURN_ACTIVE | A specific player's turn — timer running |
| TURN_TIMEOUT | Player did not act — auto draw + discard executing |
| PLAYER_OPENING | Player picked up discard for first time — must open (41 pts OR 3 melds) |
| ROUND_ENDING | A player has discarded their final card — resolving win |
| ROUND_OVER | Win confirmed — coins transferring, scores updating |
| ROUND_STARTING | Countdown to next round |

## **4.2 Player States**

| **State** | **Description** |
| --- | --- |
| WAITING_FOR_TURN | Not active player — watching, can see their hand |
| UNOPENED | Has not yet opened — draw-only mode, cannot pick up discards |
| OPENED | Has melds on table — full table access |
| FACE_UP_ELIGIBLE | Unopened and can claim the Face-Up Card to finish |
| FACE_UP_INELIGIBLE | Has opened — permanently lost Face-Up Card eligibility |
| FINISHING | Has one card left to discard — discard restriction lifted for final card |
| DISCONNECTED | Not connected — bot covering turns; grace period running |
| ELIMINATED | Disconnected too long — removed; bet forfeited |
| SPECTATING | Joined mid-round — watching only |

# **5\. Screens & User Flows**

## **5.1 Screen List**

| **Screen** | **Purpose** |
| --- | --- |
| Splash / Loading | App boot, auth check |
| Onboarding (3 slides) | First-time user — mechanics, opening paths, social layer |
| Home | Main hub — tables, coin balance, daily bonus |
| Public Lobby | Browse tables by bet tier — join or spectate |
| Private Lobby | Create table or join via room code |
| Table (pre-round) | Seated players, countdown, camera toggle |
| Table (in-round) | Core gameplay — hand, melds, discard pile, draw deck |
| Table (round over) | Result, coin transfer animation, next round countdown |
| Profile | Coin balance, stats, game history, settings |
| Shop | Coin packs, cosmetics, Supporter purchase |
| Settings | Audio, notifications, account |
| Invite / Share | Room code display, share link |

## **5.2 Key Table Screen Zones**

| **Zone** | **Content** |
| --- | --- |
| Status bar (top) | Round number, bet amount, settings icon |
| Opponent slots | Avatar, name, hand count, turn ring — arranged around upper area |
| Table center | Draw deck, discard pile, Face-Up Card (gold border), all melds |
| Action hint bar | Contextual instruction: 'Tap the deck' / 'Must add to your meld' / 'Cannot discard Joker' |
| Player hand (bottom) | Your cards — fan/arc, tappable, selected card lifts |
| HUD bottom bar | Coin balance, Meld button (when valid meld selected), Discard button |

*Note: The action hint bar is critical UX. It must explain every restriction — including when the player cannot discard because they hold a playable card or a Joker.*

## **5.3 New Player Onboarding — 3 Slides**

| **Slide** | **Content** |
| --- | --- |
| Slide 1 — The goal | Meld your cards. Discard the last one. Win. Simple. Fast. Strategic. |
| Slide 2 — Opening paths | Visual: two paths — '41 points' OR '3 melds'. Both open the game. |
| Slide 3 — Social layer | Play with friends anywhere. Voice chat. Emoji reactions. Real stakes. |

# **6\. Player Actions Reference**

| **Action** | **Condition** | **Result** |
| --- | --- | --- |
| DRAW_FROM_DECK | Your turn | Top card added to hand |
| PICK_UP_DISCARD | Your turn AND opened (or opening now) | Top discard to hand; if first pickup, must open |
| TAKE_FACE_UP_CARD | Your turn AND faceUpEligible AND can finish | Face-Up Card to hand; must finish immediately |
| LAY_MELD | Your turn AND picked up AND valid meld | Meld placed on table |
| ADD_TO_MELD | Your turn AND opened AND card fits meld | Card added to meld — no length limit on table |
| STEAL_JOKER | Finishing status AND replacement card in hand AND fits meld | Joker stolen; replacement placed; Joker discarded |
| DISCARD | Your turn AND picked up AND card does not fit own melds AND card is not Joker | Card to discard pile; turn ends |
| TOGGLE_CAMERA | Anytime | Camera on/off; cumulative timer tracks for v1.5 coin reward |

# **7\. Win Conditions & Special Events**

## **7.1 Win Types**

| **Win type** | **Trigger & payout** |
| --- | --- |
| Normal win | Discard final non-Joker card after melding all others → collect bet from each player |
| Joker finish | Discard Joker as final card → collect 2× bet from each player |
| Perfect Hand | 5 identical pairs + meld of 3 + discard all in one turn → collect 2× bet |
| Face-Up Card finish | Claim Face-Up Card (never opened) + finish in one turn → normal payout (2× if Joker discard) |
| Joker steal finish | Replace Joker in meld + discard the Joker → collect 2× bet |

## **7.2 Special Event Animations**

| **Event** | **Animation** |
| --- | --- |
| Joker finish | Joker glows gold → slides to pile → coin rain → all video feeds maximize (v1.5) |
| Perfect Hand | Cards fan out rapidly → 'PERFECT HAND!' burst → gold particles → coin rain |
| Face-Up Card claimed | 'SECRET HAND!' text → player hand briefly fans out → win animation |
| Joker steal | Joker lifts from meld → flies to hand → discarded with glow |
| Cannot discard | Card shakes back to hand + hint bar updates: 'Add this card to your meld first' |

# **8\. Onboarding & Tutorial**

## **8.1 In-Game Tutorial Overlays**

| **Trigger moment** | **Tooltip shown** |
| --- | --- |
| First turn begins | 'Your turn. Tap the deck to draw a card.' |
| Player has a valid meld | 'You have a valid meld! Tap the table to lay it down.' |
| Player tries to discard playable card | 'That card fits your meld — add it there instead.' |
| Player tries to discard Joker | 'Jokers cannot be discarded. Use it in a meld or save it to finish.' |
| Opening threshold reached | 'You can open! You have enough points to pick up from the discard pile.' |
| Three melds available | 'You have 3 melds — you can open without needing 41 points.' |
| One card left | 'Almost there — discard your last card to win!' |

# **9\. Progression & Rewards**

| **Source** | **Amount** |
| --- | --- |
| Welcome bonus (new players) | 200 coins |
| Video bonus Tier 1 (5 min camera) | 5 coins per 12-hour window (v1.5) |
| Video bonus Tier 2 (10 min camera) | +10 coins (15 total) per 12-hour window (v1.5) |
| Daily login bonus | 20 coins per day |
| Normal win (10-coin table, 4 players) | 30 coins |
| Joker / Perfect Hand win (same table) | 60 coins |
| Lobby spin-to-win (post-MVP) | Variable — TBD |

# **10\. Multiplayer & Social**

## **10.1 Table Types**

| **Type** | **Details** |
| --- | --- |
| Public — Beginner | 10 coin bet — open to all |
| Public — Standard | 50 coin bet — open to all |
| Public — High Stakes | 100 coin bet — open to all |
| Public — Elite | 500 coin bet — open to all |
| Private | Custom bet — host sets amount, join via room code or friends list |

## **10.2 Social Layer by Version**

| **Version** | **Social features** |
| --- | --- |
| v1.0 (launch) | Emoji reactions + live voice chat (Agora.io voice-only SDK) |
| v1.5 | Live group video (Agora.io full A/V) + video coin bonus activates |
| Post-launch | Friends list, leaderboards, tournament mode |

# **11\. Monetization**

| **Stream** | **Details** |
| --- | --- |
| Coin packs (IAP) | Primary revenue — $0.99 / $2.99 / $4.99 / $9.99 tiers (pricing TBD) |
| Supporter pack | $1.99 one-time — unlocks all current cosmetics |
| Cosmetics (post-MVP) | Card backs, table themes, avatar frames |
| No ads during gameplay | Ads would destroy the social atmosphere — never add them |

# **12\. MVP Scope**

## **12.1 Must-Have for v1.0**

-   Full rule implementation including both opening paths (41 pts OR 3 melds)
-   DISCARD restriction — cannot discard playable card or Joker
-   All special mechanics: Joker, Face-Up Card, Perfect Hand, Joker steal
-   2–5 player online multiplayer (server-authoritative)
-   Public tables (4 tiers) and private tables (room code)
-   Coin system: balances, bets, payouts, double wins
-   Voice chat (Agora.io voice-only)
-   Emoji reactions
-   Turn timer (30s) with auto-action on timeout
-   Disconnect / reconnect handling
-   Bot AI for empty seats (conservative, last resort)
-   Onboarding (3 slides + in-game tooltips including new rule explanations)
-   New player welcome bonus (200 coins) + daily login (20 coins)

## **12.2 v1.5 (Post-Launch)**

-   Live group video — Agora.io full A/V SDK
-   Video coin bonus activates (5 coins / 15 coins per 12-hour window)
-   Browser version via React Native Web
-   Friends list and social graph
-   Leaderboards

## **12.3 Future**

-   Tournament mode
-   Lobby mini-games (spin-to-win, other coin games)
-   Additional language support
-   Seasonal events and limited cosmetics

# **13\. UI/UX Direction**

| **Element** | **Direction** |
| --- | --- |
| Color palette | Warm earth tones — terracotta, deep brown, gold — premium artisan feel |
| Card back | Geometric artisan lattice — gold on deep brown, subtle and distinctive |
| Typography | Playfair Display for wordmark, DM Sans for UI — warm and readable |
| Tone | Premium artisan — not casino, not generic |
| Card interaction | Tap to select (lifts), tap to play (slides to table), shake on invalid |

# **14\. Technical Notes**

-   Game engine is the source of truth — server imports from packages/engine, never reimplements
-   Server is authoritative — client is a view, not a brain
-   Turn timer runs server-side — never trust client timing
-   Opponent hands never sent to client — only hand count
-   All coin operations are atomic PostgreSQL transactions
-   React Native Web for browser version in v1.5 — same codebase, minimal extra work

# **15\. Resolved Decisions**

| **Decision** | **Resolution** |
| --- | --- |
| App name | Conquer Card |
| Positioning | Global — not region-specific in product identity |
| Community marketing | Targeted layer separate from product — run via social channels |
| Daily login bonus | 20 coins per day |
| Video in v1.0 | Deferred to v1.5 — ship emoji + audio only in v1.0 |
| Browser version | v1.5 via React Native Web — same codebase |
| Age gate | 18+ globally; 21+ where required |
| Supporter pack | $1.99 one-time |
| Starting balance | 200 coins for all new players |
| Table tiers | 10 / 50 / 100 / 500 coins |
| Opening rule | 41+ points OR at least 3 melds — both valid |
| Discard restriction | Cannot discard card that fits own melds; Joker always blocked from discard |
| Sequence extension | No upper limit once on table; 5-card limit for initial lay only |

*End of Game Design Document — v1.2*