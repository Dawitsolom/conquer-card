**CONQUER CARD**

Official Game Rules & Design Document

*Social Card Game — Mobile Edition*

Version 1.2 — Updated with complete ruleset

# **1\. Game Overview**

Conquer Card is a social card game for mobile — a Rummy-style melding game played with a double deck, combining strategy, memory, and social interaction. The mobile version is inspired by Pokerface — featuring live audio, emoji reactions, and video in v1.5 so players can experience the social energy of a real table regardless of where they are in the world.

| **Property** | **Value** |
| --- | --- |
| Players | 2 to 5 per table |
| Deck | 2 × 52 cards (104 cards) + 0, 2, or 4 Jokers (configurable) |
| Cards dealt | 13 cards per player; dealer receives 14 |
| Game mode options | Sets + Sequences (default) or Sequences Only |
| Objective | Be first to meld all cards except one, then discard the final card to win the round |
| Session type | Living table — ongoing until players leave; no fixed end |
| Platform | iOS and Android (React Native) |

# **2\. Deck & Card Values**

## **2.1 Deck Configuration**

The game uses two full standard 52-card decks shuffled together (104 cards). The number of Jokers is configurable in the game lobby:

-   No Jokers — 104 cards total
-   2 Jokers — 106 cards total (one per deck)
-   4 Jokers — 108 cards total (two per deck, default)

## **2.2 Card Point Values**

Card values are used only for calculating whether a player's opening meld meets the 41-point threshold. They do not affect end-of-round scoring.

| **Card** | **Point Value** | **Notes** |
| --- | --- | --- |
| Ace (A) | 11 or 1 | 11 when paired with K, Q, J, or other Aces; 1 when paired with 2, 3 |
| King (K) | 10 |  |
| Queen (Q) | 10 |  |
| Jack (J) | 10 |  |
| 10 through 2 | Face value | e.g. 9 = 9 points, 5 = 5 points |
| Joker | Wild | No point value for opening threshold; acts as substitute for any card |

## **2.3 Ace Positioning Rules**

The Ace is a flexible card that can be high or low depending on context:

-   High Ace: A-K-Q, A-K-Q-J, A-K-Q-J-10 (Ace counts as 11)
-   Low Ace: A-2-3, A-2-3-4, A-2-3-4-5 (Ace counts as 1)
-   Wraparound sequences are NOT valid — Q-K-A-2 is illegal

# **3\. Game Setup**

## **3.1 The Face-Up Card**

Before cards are dealt, one card is placed face-up and visible to all players underneath the draw deck. This is called the Face-Up Card and has special rules (see Section 7.4).

## **3.2 Dealing**

-   Cards are dealt clockwise starting from the player to the dealer's left
-   Each player receives 13 cards
-   The dealer receives 14 cards (one extra)
-   The remaining cards form the draw deck (with the Face-Up Card beneath it)
-   The dealer opens play by discarding one card face-up to start the discard pile

## **3.3 Dealer Assignment**

-   First round: dealer is assigned randomly
-   Subsequent rounds: the winner of the previous round becomes the dealer
-   If the previous winner has left the table: dealership passes to the next clockwise player

## **3.4 Turn Order**

Play proceeds clockwise from the dealer.

# **4\. Turn Structure**

On each turn a player must complete the following steps in order:

## **Step 1 — Pick Up (mandatory)**

The player must do one of the following:

-   **Pick up the top card from the discard pile**
-   **Draw the top card from the draw deck**
-   **Take the Face-Up Card (only under specific conditions — see Section 7.4)**

Important restriction: A player who has NOT yet opened (laid down their first meld) may ONLY draw from the draw deck. They cannot pick up from the discard pile until they have opened.

## **Step 2 — Meld / Add to Melds (optional)**

After picking up, the player may optionally:

-   Lay down new melds on the table (sets or sequences — see Section 5)
-   Add cards to their own existing melds
-   Add cards to other players' existing melds
-   Steal a Joker from any meld on the table (only when finishing — see Section 7.3)

A player who has NOT yet opened may not add to any meld on the table — not their own (they have none) and not other players'. Melding rights are unlocked only after opening.

## **Step 3 — Discard (mandatory)**

The player discards exactly one card face-up onto the discard pile to end their turn. The next player may then choose to pick it up or draw from the deck.

Discard restrictions — a player may NOT discard:

-   **A card that can legally extend one of their own melds already on the table — they must add it to their meld instead**
-   **A Joker — ever. The Joker is too valuable to discard. If a player wishes to remove it from their hand they must use it in a meld, use it as a finisher, or steal a Joker with it. Discarding a Joker is always blocked.**

Note: these restrictions apply to your OWN melds only. You may discard a card that fits an opponent's meld — though this is rarely strategically wise since it gives them a free card and potentially helps them finish faster.

Note on extended sequences: once a sequence is on the table, other players may extend it beyond 5 cards by adding to it. There is no upper limit on a sequence's length once it is on the table — the 5-card limit applies only to the initial meld as laid down.

# **5\. Melds**

## **5.1 Valid Meld Types**

A meld is a combination of cards laid face-up on the table. Two types are valid (subject to game mode settings):

**Sets**

Three or four cards of the same rank, each from a different suit.

-   Valid: 7♠ 7♥ 7♦ (three 7s, different suits)
-   Valid: K♠ K♥ K♦ K♣ (four Kings, all different suits)
-   Invalid: 7♠ 7♠ 7♥ (two cards from same suit — even from the second deck)
-   Sets of 5 are NOT valid — only 3 or 4 cards

**Sequences (Runs)**

Three, four, or five consecutive cards of the same suit when initially laid as a meld.

-   Valid: 5♠ 6♠ 7♠ (3-card sequence)
-   Valid: 5♠ 6♠ 7♠ 8♠ (4-card sequence)
-   Valid: 9♠ 10♠ J♠ Q♠ K♠ (5-card sequence — maximum when first laid)
-   Invalid as initial meld: 5♠ 6♠ 7♠ 8♠ 9♠ 10♠ (6 cards — must be split into two separate melds)
-   A Joker may substitute for any missing card in a sequence
-   Once a sequence is on the table, other players may extend it beyond 5 cards — no upper limit on length after initial placement

## **5.2 Meld Size Rules**

| **Meld size** | **Rule** |
| --- | --- |
| 3 cards | Valid for both sets and sequences |
| 4 cards | Valid for both sets and sequences |
| 5 cards | Valid for sequences only — 5 of the same rank is not valid |
| 6+ cards | Must be split into two or more separate melds (e.g. two 3-card melds, or one 3 + one 4-card meld) |

## **5.3 Opening Meld — Two Valid Ways to Open**

The first time a player picks up from the discard pile, they must immediately open by laying down melds. There are two valid ways to open:

**Option A — 41-Point Threshold**

-   Lay down any number of melds whose combined point value totals at least 41 points
-   The 41-point total is calculated using the card point values in Section 2.2
-   A Joker used in a meld does not contribute to the 41-point count
-   Example: 7♠ 7♥ 7♦ (21 points) + J♠ Q♠ K♠ (30 points) = 51 points — valid opening

**Option B — Three Melds Rule**

-   Lay down at least 3 separate valid melds regardless of their combined point value
-   Any combination of sets and sequences counts toward the 3-meld minimum
-   Jokers in melds count normally — a meld containing a Joker still counts as one meld
-   Laying 4 or more melds also satisfies this rule — but is strategically risky
-   Example: three 3-card melds totalling only 30 points — still a valid opening

Strategic note: Option B is a double-edged sword. Laying 3 melds of 3 cards uses 9 cards — leaving only 4 in hand. The round is nearly over for that player. But every meld on the table is a dumping ground for opponents. Use Option B only when the melds are low-value cards you want off your hand.

General opening rules (apply to both options):

-   The player must lay down all qualifying melds before discarding
-   After opening, the player discards normally to end their turn
-   A player may open with more melds or points than required — there is no upper limit

## **5.4 Adding to Existing Melds**

After opening, a player may add cards to any meld on the table — their own or any opponent's. This is called building. There is no limit to how many cards can be added in a single turn.

-   Adding to a sequence: extend either end with consecutive same-suit cards
-   Adding to a set: add a fourth card (if only 3 were laid), must be same rank, different suit
-   A player who has not yet opened may NOT add to any meld on the table

Strategic note: allowing opponents to add to your melds is an inherent risk. Other players can use your melds as dumping grounds to shed cards faster. This is by design — melding is a double-edged sword.

# **6\. The Joker**

## **6.1 Mid-Game Use**

-   A Joker acts as a wild card and can substitute for any card in a set or sequence
-   When a Joker is placed in a meld, it stays in that meld and is visible to all players
-   The Joker cannot be picked up or stolen by other players during normal play
-   The Joker contributes 0 points toward the 41-point opening threshold
-   A player may hold a Joker in their hand for any number of turns without using it

## **6.2 Joker Replacement (Finishing Only)**

A player may steal a Joker from any meld on the table, but ONLY as part of their finishing move. This cannot be done as a mid-game action.

The finishing sequence when stealing a Joker:

-   Player picks up from discard pile or draws from deck (mandatory step 1)
-   Player lays down all remaining melds — they are now down to exactly one card
-   That final card is the replacement card for a Joker sitting in a meld on the table
-   Player places their replacement card into the meld, removing the Joker
-   Player discards the Joker as their final card — round ends
-   Since the final discard is a Joker, the player wins double coins

The replacement card must naturally fit the meld (e.g. replacing a Joker in 5♠-\[Joker\]-7♠ requires the 6♠). If both copies of the replacement card are already in play elsewhere, the Joker cannot be stolen.

## **6.3 Joker as Finisher — Double Win**

If a player's final discarded card is a Joker (whether held from their original hand or stolen from a meld), they win the round with a double payout. See Section 8 for coin calculations.

# **7\. Special Rules**

## **7.1 The Draw Deck Runs Out**

If the draw deck is exhausted during play, the discard pile is immediately collected, shuffled, and placed face-down to form a new draw deck. The top card of the new draw deck is turned face-up to restart the discard pile. Play continues normally.

## **7.2 Game Mode: Sequences Only**

Players can enable Sequences Only mode in the game lobby settings. In this mode:

-   Only sequence melds are valid — sets are not allowed
-   The 41-point opening threshold still applies
-   All other rules remain unchanged

## **7.3 The Face-Up Card**

At the start of every round, one card is placed face-up and visible to everyone, positioned under the draw deck. This card follows special rules:

-   The Face-Up Card can ONLY be used by a player to finish the round — not as a regular draw
-   To take it, the player must have ZERO melds on the table (completely unopened)
-   If the player has laid down even a single meld previously, they permanently lose the right to take the Face-Up Card for that round
-   Taking the Face-Up Card replaces Step 1 of the player's turn (the pickup step)
-   After taking the Face-Up Card, the player must immediately finish — lay down all melds and discard one card to go out
-   A player who uses the Face-Up Card may NOT add cards to other players' melds during that finishing turn
-   If the Face-Up Card is a Joker, the player may either use it as their final discard (double win) or place it in one of their melds and discard a normal card (normal win)
-   If nobody claims the Face-Up Card during the entire round, it remains in place and the round ends normally when someone else finishes

Strategic note: The Face-Up Card creates a hidden hunting strategy. A player can stay completely under the radar — never melding, never revealing their hand — and wait for the perfect moment to finish in one explosive turn. The entire table can see the card, but nobody knows who is hunting it.

## **7.4 The Perfect Hand — Instant Double Win**

A second way to win double coins. This is a rare and powerful finishing move that happens entirely within a single turn:

Requirements for the Perfect Hand:

-   Player has 13 cards, draws 1 from the deck (14 cards total in hand)
-   Player lays down exactly 5 pairs of identical cards (same rank, same suit — only possible with the double deck)
-   Player lays down 1 meld of 3 (set or valid sequence)
-   Player discards 1 final card
-   Total: 10 + 3 + 1 = 14 cards — entire hand played in one turn

Rules and payouts:

-   The meld of 3 may include a Joker
-   This wins double coins from all players — same payout as a Joker finish
-   If the final discarded card is a Joker, the win is still double (not quadruple — double is the maximum payout)
-   This move can only be executed on the turn the player draws their 14th card

# **8\. Winning a Round & Coins**

## **8.1 How to Win a Round**

A player wins the round by melding all cards except one, then discarding that final card. The round ends immediately when this happens.

-   Step 1: Pick up from discard pile or draw deck (or take the Face-Up Card)
-   Step 2: Lay down all remaining melds — player now holds exactly one card
-   Step 3: Discard the final card — round over, player wins

## **8.2 Payout Structure**

| **Win condition** | **Payout** |
| --- | --- |
| Normal win | Winner collects the agreed bet amount from every other player |
| Joker finish (final discard = Joker) | Winner collects 2× the agreed bet amount from every other player |
| Perfect Hand (5 identical pairs + meld of 3) | Winner collects 2× the agreed bet amount from every other player |
| Perfect Hand with Joker discard | Still 2× — double is the maximum, payouts do not stack |
| Face-Up Card finish | Normal win payout (2× only if final discard is a Joker) |

Example — 4 players, 10-coin bet:

-   Normal win: winner receives 10 + 10 + 10 = 30 coins total
-   Joker finish: winner receives 20 + 20 + 20 = 60 coins total

## **8.3 End-of-Round Scoring**

Losing players pay the flat agreed bet amount regardless of how many cards remain in their hand. There are no card-count penalties — only the pre-agreed bet is at stake.

# **9\. Table & Session Rules**

## **9.1 Table Types**

| **Table type** | **Description** |
| --- | --- |
| Public table | Open to any player; bet amount is preset per tier (e.g. 10, 50, 100, 500 coins) |
| Private table | Created by a host; host sets custom bet amount; players join via room code or friends list |

## **9.2 Living Table**

-   Tables stay open indefinitely — there is no fixed number of rounds or end condition
-   Players may leave at any time between rounds
-   A player who wants to stop playing must leave the table — they cannot skip rounds while seated
-   New players may join the table at any time but must wait for the current round to finish before being dealt in
-   Minimum 2 players required to start or continue a round

## **9.3 Pre-Round Countdown**

-   A configurable countdown timer (default: 30 seconds) runs before each round starts
-   Players who are seated when the timer reaches zero are dealt in
-   Players who join during the countdown are included in the deal
-   Players who join after cards are dealt wait for the next round
-   On private tables, the host may adjust the countdown duration

## **9.4 Turn Timer**

-   Each player has 30 seconds to complete their turn
-   A visible countdown is displayed during the active player's turn
-   If the timer expires: auto-draw from deck + auto-discard the drawn card

## **9.5 Disconnect & Reconnect Rules**

| **Scenario** | **Behavior** |
| --- | --- |
| Disconnect under 60 seconds | Bot takes over the player's turns; player can reconnect and resume |
| Disconnect over 60 seconds | Player is removed from the game; their bet for that round is forfeited |
| Host disconnects (private table) | Longest-sitting remaining player automatically becomes the new host |
| Phone locked / app backgrounded | Treated as disconnect; 60-second grace period applies |
| Force quit | Treated as disconnect; 60-second grace period applies |

# **10\. Social Features**

## **10.1 Communication Options**

Players can choose their preferred social mode per session. All options are available simultaneously — players are not required to use any of them.

| **Mode** | **Details** |
| --- | --- |
| Live video | Front camera feed displayed in a grid around the table; active player's feed is highlighted and enlarged on their turn; earns time-based coin bonus (see Section 11.2) |
| Live audio | Voice chat during the game |
| Emoji reactions | Tap-to-react emoji panel for players who prefer to stay off camera |

## **10.2 Video Incentive — Time-Based Coin Reward**

Players earn coins based on cumulative camera-on time within each 12-hour window. Time is cumulative — the camera can be toggled off and on freely and the timer keeps adding up.

| **Cumulative camera-on time (per 12-hour window)** | **Coins earned** |
| --- | --- |
| 5 minutes | 5 coins (Tier 1) |
| 10 minutes total | 10 additional coins (Tier 2) |
| Maximum per 12-hour period | 15 coins total |

-   The 12-hour reward window resets automatically after each period
-   Camera time accumulates across all tables and sessions within the window
-   This incentive drives the social presence that makes Conquer unique and viral

## **10.3 Private Table Social Features**

-   Room code sharing — host generates a code to share with friends
-   Friends list invites — invite directly from in-app friends list
-   Both methods can be used simultaneously

# **11\. Coin Economy**

## **11.1 Starting Balance**

-   New players receive 200 coins upon registration — no purchase required to start playing

## **11.2 Earning Coins**

| **Source** | **Amount / Details** |
| --- | --- |
| New player welcome bonus | 200 coins (one-time) |
| Video bonus — Tier 1 | 5 coins after 5 cumulative minutes of camera-on time (per 12-hour window) |
| Video bonus — Tier 2 | 10 additional coins after 10 cumulative minutes of camera-on time (15 coins total per 12-hour window) |
| Daily login bonus | TBD — to be defined in product roadmap |
| Promotional events | TBD — seasonal challenges and special events |
| In-app purchase | Coin packs purchased directly in the app |

## **11.3 Public Table Bet Tiers**

| **Tier** | **Bet per player per round** |
| --- | --- |
| Beginner | 10 coins |
| Standard | 50 coins |
| High Stakes | 100 coins |
| Elite | 500 coins |

## **11.4 Spending Coins**

-   Table bet — wagered each round at the chosen table tier
-   Cosmetic purchases — card backs, table themes, avatar frames
-   Optional one-time Supporter purchase — unlocks all current cosmetics

## **11.5 Monetization Model**

-   Free to play — no ads during gameplay
-   Coin packs available for purchase (primary revenue stream)
-   Optional one-time Supporter purchase for cosmetics
-   No pay-to-win mechanics — all gameplay advantages come from skill only
-   Bot AI plays conservatively and only fills seats when no real players are available

# **12\. Configurable Game Settings**

| **Setting** | **Options** |
| --- | --- |
| Joker count | 0 Jokers / 2 Jokers / 4 Jokers (default) |
| Game mode | Sets + Sequences (default) / Sequences Only |
| Table type | Public (preset tiers) / Private (custom bet) |
| Pre-round countdown | 15 / 30 (default) / 60 seconds (private table only) |
| Turn timer | 30 seconds (fixed for fairness) |
| Player count | 2 to 5 |

# **13\. Quick Reference — Rules Summary**

| **Rule** | **Detail** |
| --- | --- |
| Deck | 104 cards (2×52) + configurable Jokers |
| Deal | 13 cards each, 14 to dealer |
| Face-Up Card | 1 card placed face-up under deck before dealing |
| Turn | Pick up → meld (optional) → discard |
| Opening — Option A | First pickup from discard: lay melds totalling 41+ points |
| Opening — Option B | First pickup from discard: lay at least 3 separate melds (any point value) |
| Before opening | Draw from deck only; cannot pick up discard or add to any meld |
| After opening | Full access: pick up discard, add to any meld, lay new melds |
| Valid melds (initial) | Sets (3-4 cards) or sequences (3-5 cards when first laid) |
| Sequences on table | Can be extended beyond 5 cards by any opened player — no upper limit |
| 6+ consecutive cards | Must split into 2+ separate melds when laying initially |
| Duplicate cards in meld | Two identical cards (e.g. two 7♠) cannot share a meld |
| Discard restriction | Cannot discard a card that fits your own melds already on the table |
| Joker discard | Joker can NEVER be discarded — must be used in a meld or as a finisher |
| Win condition | Meld all cards except one, discard final card |
| Normal win payout | Collect agreed bet from each other player |
| Joker finish | Final discard = Joker → collect 2× bet from each player |
| Perfect Hand | 5 identical pairs + meld of 3 + discard = collect 2× bet |
| Maximum payout | 2× bet — payouts do not stack |
| Face-Up Card | Only claimable to finish; player must have zero melds on table |
| Joker replacement | Only possible as finishing move; replace with fitting card, discard Joker |
| Deck exhausted | Shuffle discard pile into new draw deck |
| Turn timer | 30 seconds; timeout = auto draw + discard drawn card |
| Disconnect | 60-second grace period; then removed and bet forfeited |
| Dealer next round | Previous round winner becomes dealer |
| Turn order | Clockwise |

*End of Rules Document — v1.2*

*This document is the canonical reference for all game development, design, and testing.*