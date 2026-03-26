**CONQUER CARD**

QA & Testing Checklist

Version 1.2 | Updated with new rules

# **1\. How to Use This Checklist**

Every item must be tested and confirmed before App Store submission. Work through each section in order — engine first, then server, then client, then edge cases, then pre-launch. Check each box only when you have personally verified it works.

*Note: A bug found here costs you 30 minutes. A bug found after launch costs you reviews, ratings, and players.*

# **2\. Game Engine Tests (npx jest)**

## **2.1 Deck Tests**

-   Double deck has exactly 104 cards with 0 jokers
-   Double deck has exactly 106 cards with 2 jokers
-   Double deck has exactly 108 cards with 4 jokers
-   No two cards share the same ID
-   After dealing 4 players: each has 13, dealer has 14
-   Face-up card placed correctly — not in any hand or draw pile

## **2.2 Meld Validation Tests**

-   Valid set: 7♠ 7♥ 7♦ — ACCEPTED
-   Valid set: K♠ K♥ K♦ K♣ — ACCEPTED
-   Invalid set: 7♠ 7♠ 7♥ — REJECTED (duplicate suit)
-   Valid 5-card sequence: 9♠ 10♠ J♠ Q♠ K♠ — ACCEPTED
-   Invalid initial 6-card sequence — REJECTED (must split)
-   ADD\_TO\_MELD extending 5-card sequence to 6 cards — ACCEPTED (no limit on table)
-   ADD\_TO\_MELD extending to 8 cards — ACCEPTED
-   Valid Ace high: Q♠ K♠ A♠ — ACCEPTED
-   Valid Ace low: A♠ 2♠ 3♠ — ACCEPTED
-   Invalid wraparound: K♠ A♠ 2♠ — REJECTED
-   Joker as wild in sequence — ACCEPTED
-   Duplicate card ID in same meld — REJECTED
-   Sequences-only mode: set attempted — REJECTED

## **2.3 Opening Tests — Both Paths**

-   Open with exactly 41 points — ACCEPTED
-   Open with 40 points, 2 melds — REJECTED (below threshold, under 3 melds)
-   Open with 3 melds totalling only 28 points — ACCEPTED (3-meld rule)
-   Open with 2 melds totalling 45 points — ACCEPTED (41-point rule)
-   Open with 2 melds totalling 38 points — REJECTED (neither rule met)
-   Open with 4 melds totalling 20 points — ACCEPTED (4 melds >= 3)
-   Open with 1 meld totalling 35 points — REJECTED
-   Joker in meld counts toward meld count for 3-meld rule — confirmed

## **2.4 Discard Restriction Tests**

-   Player tries to discard 6♠ when they own 5♠-7♠ sequence — REJECTED
-   Player tries to discard 6♠ when opponent owns 5♠-7♠ but player has no matching meld — ACCEPTED
-   Player tries to discard Joker mid-game — REJECTED
-   Player tries to discard Joker as finishing move (status = finishing) — ACCEPTED (double win)
-   Player in FINISHING status tries to discard card that fits own meld — ACCEPTED (restriction lifted)
-   Player tries to discard card that would extend their own sequence — REJECTED
-   Player has no opened melds yet — discard restriction does not apply (no own melds on table) — ACCEPTED

## **2.5 Scoring Tests**

-   Ace high (with K/Q/J) = 11 points
-   Ace low (with 2/3) = 1 point
-   J/Q/K = 10 points each
-   Number cards = face value
-   Joker = 0 points toward opening threshold
-   Normal win: 4 players, 10 coin bet — winner gets 30 coins
-   Joker finish: 4 players, 10 coin bet — winner gets 60 coins
-   Perfect Hand: 4 players, 10 coin bet — winner gets 60 coins
-   Maximum payout is always 2x — payouts never stack

## **2.6 Action Validation Tests**

-   Play out of turn — REJECTED
-   Unopened player picks up discard without meeting opening requirement — REJECTED
-   Unopened player picks up discard with 41+ points — ACCEPTED
-   Unopened player picks up discard with 3+ valid melds — ACCEPTED
-   Unopened player adds to opponent meld — REJECTED
-   STEAL\_JOKER on non-finishing turn — REJECTED
-   STEAL\_JOKER with wrong replacement card — REJECTED
-   STEAL\_JOKER with correct replacement card on finishing turn — ACCEPTED
-   TAKE\_FACE\_UP\_CARD by opened player — REJECTED
-   TAKE\_FACE\_UP\_CARD by unopened player who can finish — ACCEPTED

## **2.7 Win Condition Tests**

-   Normal win — detected correctly
-   Joker finish — detected, double payout calculated
-   Perfect Hand — detected, double payout calculated
-   Face-Up Card finish — win detected
-   Face-Up Card + Joker discard — double win
-   Deck exhaustion — reshuffle works, game continues
-   Turn timeout — auto draw + discard, turn advances

# **3\. Server Tests**

## **3.1 API Tests**

-   POST /auth/guest — returns JWT
-   POST /auth/verify — valid Firebase token returns app JWT
-   POST /auth/verify — invalid token returns 401
-   GET /profile/:userId — returns correct profile
-   GET /tables/public — returns tables by tier
-   POST /tables/create — returns room code
-   POST /shop/purchase — valid receipt credits coins

## **3.2 Socket.io Tests**

-   game:action DRAW\_FROM\_DECK — state updates for all players
-   game:action DISCARD blocked card — returns game:action\_rejected with reason
-   game:action DISCARD Joker mid-game — returns game:action\_rejected
-   game:action opening with 3 melds (under 41 pts) — ACCEPTED
-   game:action opening with 41+ pts (under 3 melds) — ACCEPTED
-   Opponent hand data never included in game:state\_update — only count
-   game:round\_over — correct winner, correct payout amounts

## **3.3 Coin Ledger Tests**

-   Winning player balance increases correctly
-   Losing players decrease correctly
-   Double win: 2x amounts verified in database
-   Coin transfer is atomic — no partial transfers possible
-   Player balance never goes below 0

# **4\. Client Tests**

## **4.1 Discard Restriction UX**

-   Tapping discard on card that fits own meld — card shakes, hint bar explains
-   Tapping discard on Joker — card shakes, hint bar explains Joker cannot be discarded
-   Discard button greyed out when card is blocked
-   In FINISHING status — Discard button fully active even for cards that fit own meld
-   Hint bar shows correct message for every blocked and valid discard scenario

## **4.2 Opening Path UX**

-   Onboarding slide 2 clearly explains both opening paths
-   Tutorial tooltip fires when player has 3 melds available: 'You can open with 3 melds!'
-   Tutorial tooltip fires when player has 41+ points available
-   Opening with 3 melds (under 41 pts) works end-to-end in live game

## **4.3 Core Table Screen**

-   Cards dealt animation plays smoothly
-   Your hand displays correctly — all cards tappable
-   Face-up card displayed with gold border
-   Turn timer ring visible and accurate
-   Active player slot glows correctly
-   Action hint bar always shows correct instruction
-   Invalid move — shake animation + error sound + no state change
-   Joker in hand — gold glow visible

## **4.4 Win Animations**

-   Normal win — coin transfer animation correct amounts
-   Joker finish — gold burst + 'JOKER FINISH — DOUBLE WIN!'
-   Perfect Hand — card fan + 'PERFECT HAND!' + gold particles

# **5\. Edge Cases**

## **5.1 Disconnect & Reconnect**

-   Bot takes over within 5 seconds of disconnect
-   Reconnect within 60s — player resumes with correct state
-   Reconnect after 60s — removed, bet forfeited
-   Host disconnect on private table — next player becomes host

## **5.2 Discard Edge Cases**

-   Player's only card fits their meld AND they are finishing — can discard (restriction lifted)
-   Player has Joker as only card — FINISHING status — can discard for double win
-   Sequence on table extended to 7+ cards — players can still add to it
-   Player has card that fits full 5-card sequence — can add to it (extending beyond 5)

## **5.3 Opening Edge Cases**

-   Player opens with exactly 3 melds of 3 cards each (9 cards) — valid
-   Player opens with 4 melds — valid but server confirms only 4 cards left in hand
-   Player tries to open with 2 melds and 40 points — rejected correctly

# **6\. Pre-Launch Checklist**

## **6.1 Legal**

-   Terms of Service live at public URL
-   Privacy Policy live at public URL
-   Age gate — 18+ confirmation at registration
-   Coin economy described correctly — no real money value
-   App Store guidelines reviewed — section 4.3 and 5.2

## **6.2 App Store**

-   App icon — 1024x1024pt
-   All 6 screenshots prepared
-   Age rating set to 17+ / 18+
-   In-app purchases registered and approved
-   TestFlight beta with 10+ real users

## **6.3 Backend**

-   Railway production PostgreSQL provisioned and migrated
-   Redis provisioned
-   All environment variables set in Railway production
-   Sentry receiving events
-   PostHog receiving events
-   GET /health returns 200

*End of QA Checklist — v1.2*

*Every checkbox must be ticked before App Store submission.*