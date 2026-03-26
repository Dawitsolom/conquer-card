**CONQUER CARD**

Engine Update Brief

*Two new rules to implement after 100-test baseline*

# **Overview**

The engine has 100 passing tests covering the original ruleset. Two new rules have been confirmed that require engine updates. These must be implemented and tested before Phase 2 server work begins.

*Important: Do not start Phase 2 server work until both rules are implemented and all tests pass including new tests for these rules.*

# **Rule 1 — No Discarding a Playable Card**

## **The Rule**

A player cannot discard a card on their turn if that card could legally be added to one of their own melds already on the table. They must add the card to the meld instead.

## **Scope**

-   Applies to the player's OWN melds only — not opponent melds
-   If the card fits an opponent's meld but not your own, you CAN discard it
-   If a sequence is already at any length, any card extending either end blocks the discard
-   Joker is ALWAYS blocked from discard regardless of melds — see Rule 1b below

## **Rule 1b — Joker Can Never Be Discarded**

The Joker is permanently blocked from the DISCARD action. It is too strategically valuable to discard. The only ways to remove a Joker from your hand are:

-   Use it in a meld (LAY\_MELD or ADD\_TO\_MELD)
-   Discard it as a finishing move (which triggers double win)
-   Use it as a replacement to steal a Joker from an opponent's meld (STEAL\_JOKER finishing move)

## **Where to Implement**

In actions.ts, in the DISCARD case of validateAction():

Step 1: If action.card.rank === 'JOKER' → return { valid: false, reason: 'Cannot discard a Joker' }

Step 2: Get all melds owned by this player from state.allMelds

Step 3: For each meld, check if action.card can be legally added

Step 4: If any meld accepts the card → return { valid: false, reason: 'Must add card to your meld' }

Step 5: Otherwise → return { valid: true }

## **Exception: Finishing Move**

When a player is in 'finishing' status and their last card happens to fit one of their own melds — should they be forced to add it and then have zero cards with no discard? This creates a dead-end. Resolution: if the player is in 'finishing' status, the playable-card restriction does not apply. They can discard their final card even if it fits their own meld.

## **New Tests Required**

-   Player tries to discard 6♠ when they own a 5♠-7♠ sequence on table → REJECTED
-   Player tries to discard 6♠ when opponent owns 5♠-7♠ but player has no matching meld → ACCEPTED
-   Player tries to discard Joker mid-game → REJECTED
-   Player tries to discard Joker as finishing move (status = finishing) → ACCEPTED (triggers double win)
-   Player in finishing status tries to discard a card that fits their own meld → ACCEPTED

# **Rule 2 — Three Melds Bypass 41-Point Threshold**

## **The Rule**

When a player opens for the first time, they can open by EITHER meeting the 41-point threshold OR by laying down at least 3 separate valid melds — regardless of their total point value.

## **Details**

-   Exactly 3 melds is sufficient — any combination of sets and sequences
-   4 or more melds also satisfies the rule
-   Jokers in melds count normally — a meld with a Joker still counts as one meld
-   The 3-meld count is the number of separate melds laid, not the number of cards
-   Both conditions (41 points OR 3 melds) satisfy the opening requirement independently

## **Where to Implement**

In actions.ts, in the opening validation logic inside PICK\_UP\_DISCARD handling, update meetsOpeningThreshold() or the inline check:

Current: meetsOpeningThreshold(melds) → checks 41 points only

Updated: meetsOpeningThreshold(melds) → true if:

totalPoints >= 41 OR melds.length >= 3

## **New Tests Required**

-   Player opens with 3 melds totalling only 28 points → ACCEPTED (3-meld rule)
-   Player opens with 2 melds totalling 45 points → ACCEPTED (41-point rule)
-   Player opens with 2 melds totalling 38 points → REJECTED (neither rule met)
-   Player opens with 4 melds totalling 20 points → ACCEPTED (4 melds >= 3)
-   Player opens with 1 meld totalling 50 points → REJECTED (1 meld, under 41 total? — wait, 50 >= 41 so ACCEPTED)
-   Player opens with 1 meld totalling 35 points → REJECTED (1 meld < 3, and 35 < 41)

# **Rule 3 — Sequences Have No Upper Length Limit on Table**

## **The Rule**

The 5-card limit applies ONLY when a sequence is first laid as a meld. Once a sequence is on the table, any opened player can extend it beyond 5 cards by adding to either end. There is no upper limit.

## **Where to Implement**

In actions.ts, in the ADD\_TO\_MELD validation. Currently the validator may be calling validateMeld() on the combined cards (existing + new) which would reject a sequence of 6+. This check must be relaxed for ADD\_TO\_MELD:

LAY\_MELD validation: validateMeld() with 5-card max → unchanged

ADD\_TO\_MELD validation: check consecutiveness + same suit only

do NOT apply the 5-card length limit

## **New Tests Required**

-   ADD\_TO\_MELD: add 8♠ to existing 5♠-6♠-7♠ sequence → ACCEPTED (extends to 4 cards)
-   ADD\_TO\_MELD: add 4♠ then 3♠ then 2♠ to existing 5♠-6♠-7♠-8♠-9♠ → each ACCEPTED (extends beyond 5)
-   ADD\_TO\_MELD: add K♥ to existing 5♠-6♠-7♠ (wrong suit) → REJECTED

# **Summary — What to Build in Order**

1.  Patch STEAL\_JOKER fitness check first (already identified — confirm it uses replaceFirst not replaceAll for Joker)
2.  Update validateAction DISCARD case: block Joker + block playable-card-to-own-meld
3.  Update meetsOpeningThreshold: add melds.length >= 3 condition
4.  Update ADD\_TO\_MELD validation: remove 5-card limit for extensions
5.  Write all new tests listed above
6.  Run full test suite — all 100 original + new tests must pass
7.  Commit with message: 'feat(engine): add discard restrictions and 3-meld opening rule'
8.  Only then start Phase 2 server work

*End of Engine Update Brief — v1.0*