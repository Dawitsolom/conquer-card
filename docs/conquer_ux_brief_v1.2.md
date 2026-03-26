**CONQUER CARD**

UI / UX Design Brief

*Visual Identity, Screen Design & Interaction Language*

Version 1.2 | Global positioning — artisan premium aesthetic

# **1\. Design Philosophy**

Conquer Card is a premium social card game. The design must communicate one thing instantly: this is a serious, well-crafted product. Not a clone. Not a generic card game. A considered, artisan experience.

***"Premium warmth. Strategic depth. Feel the table."***

| **Pillar** | **What it means in practice** |
| --- | --- |
| Warm, not flashy | Earth tones and natural textures — not neon, not chrome, not casino gold |
| Artisan, not generic | The geometric lattice pattern and warm palette feel considered — designed for this product |
| Social, not solitary | Every screen reminds you there are real people at the table with you |
| Clear, not cluttered | A player in mid-game has a lot to process — the UI never adds to that load |
| Premium, not expensive | Quality comes from restraint and consistency, not ornamentation |

# **2\. Color System**

## **2.1 Primary Palette**

| **Color name** | **Hex value & usage** |
| --- | --- |
| Deep Brown (primary) | #3D1C02 — App bars, headers, primary text, card backs |
| Terracotta (accent) | #C1440E — Primary action buttons, key highlights, win states |
| Warm Gold (secondary) | #B8860B — Turn indicators, coin UI, special card glow, dividers |
| Rich Amber (interactive) | #D4770A — Hover states, active states, meld borders, tap feedback |
| Warm Cream (background) | #FDF3E3 — Primary background — feels like aged linen |
| Off-White (card face) | #FAF7F2 — Playing card face — slightly warm, not stark white |
| Light Tan (surface) | #F5EBD8 — List items, secondary surfaces |
| Muted Brown (secondary text) | #7A5C4A — Subtitles, hints, secondary labels |

## **2.2 Semantic Colors**

| **Purpose** | **Color** |
| --- | --- |
| Success / Win | Forest green #1A7A4A |
| Error / Invalid move | Brick red #C0392B |
| Joker glow | Pure gold #FFD700 — Joker card only |
| Active turn ring | Terracotta #C1440E |
| Cannot discard indicator | Brick red #C0392B — subtle pulse on blocked card |

# **3\. Typography**

| **Role** | **Font** |
| --- | --- |
| Display / Wordmark | Playfair Display Bold — premium, memorable, artisan weight |
| UI headings | DM Sans Medium — clean, modern, warm |
| Body / labels | DM Sans Regular — consistent, legible at all sizes |
| Numbers / coins | DM Mono — monospace for aligned coin amounts |
| Future language support | Noto Sans (relevant script) — designed for non-Latin scripts |

# **4\. Playing Card Design**

## **4.1 Card Face**

| **Element** | **Specification** |
| --- | --- |
| Background | Off-white #FAF7F2 — warm, not stark |
| Corner radius | 6pt — subtle rounding |
| Rank display | Top-left and bottom-right — DM Sans Bold 18pt |
| Suit colors | Spades + Clubs: Deep Brown / Hearts + Diamonds: Terracotta |
| Face card art | Geometric abstract renditions of J, Q, K — artisan style |
| Selected state | Scale 1.08x + terracotta glow border |
| Invalid state | Brief horizontal shake — soft error sound |
| Blocked discard state | Subtle red pulse when card cannot be discarded |

## **4.2 Card Back**

-   Base: Deep Brown #3D1C02
-   Pattern: Geometric artisan lattice — diamond and cross repeating motif
-   Pattern color: Warm Gold #C9A84C at 30% opacity — subtle and sophisticated
-   Border: 3pt warm cream frame
-   Center: Small stylized 'C' medallion or geometric mark

## **4.3 Joker Card**

-   Background: Deep Brown to Warm Gold gradient — only card with non-white background
-   Center: Abstract geometric starburst in gold
-   Text: 'JOKER' in Playfair Display — warm cream
-   Glow state: Gold pulse animation when selected or played
-   Blocked discard: If player tries to discard Joker, card pulses red briefly

# **5\. Table Screen Layout**

## **5.1 Zone Map**

| **Zone** | **Content** |
| --- | --- |
| Status bar | Round number, bet amount, settings — Deep Brown background |
| Opponent slots | Avatar, name, hand count, turn ring — arc arrangement |
| Table center | Draw deck + discard pile + Face-Up Card (gold border) + all melds |
| Action hint bar | Contextual — always active during player's turn. Shows discard restrictions. |
| Player hand | Fan/arc — your cards. Selected card lifts. Blocked cards show subtle indicator. |
| HUD bottom bar | Coin balance + Meld button + Discard button (greyed when blocked) |

*Note: The Discard button must visually grey out when the player holds a card that fits their own meld or when they hold the Joker. The action hint bar explains why.*

## **5.2 Discard Restriction UX**

This is one of the most important UX challenges in the game. Players need to understand why they cannot discard without reading a rule book.

| **Scenario** | **UX response** |
| --- | --- |
| Player taps discard on a card that fits their meld | Card shakes back. Hint bar: 'Add this card to your meld first.' Card gets a subtle amber highlight showing which meld it fits. |
| Player taps discard on Joker | Card shakes back. Hint bar: 'Jokers cannot be discarded. Play it in a meld or use it to finish.' |
| Player is in FINISHING status — restriction lifted | Discard button fully active. Hint bar: 'Discard your final card to win!' |

# **6\. Card Interactions & Animations**

| **Interaction** | **Animation** | **Duration** |
| --- | --- | --- |
| Card deal | Fan from center to each player, staggered 80ms | 600ms total |
| Card select | Scale 1.08x + lift 12pt | 120ms ease-out |
| Card discard (valid) | Slides to discard pile with slight rotation — 'slap' sound | 250ms |
| Card discard blocked (meld fit) | Shake + amber pulse on fitting meld + hint bar update | 300ms |
| Card discard blocked (Joker) | Shake + hint bar update | 300ms |
| Meld laid | Cards group and slide to table zone as a unit | 350ms ease-out |
| Turn timer warning | Ring pulses last 5s — terracotta | Looping |
| Joker finish | Gold burst → coin rain → all slots highlight | 800ms + coin anim |
| Perfect Hand | Cards fan rapidly → badge → gold particles | 1000ms total |

# **7\. Screen-by-Screen Direction**

## **7.1 Onboarding Slides**

| **Slide** | **Visual & copy** |
| --- | --- |
| Slide 1 — Goal | Card hand animation — cards meld, one remains, discarded. 'Meld your cards. Discard the last one. Win.' |
| Slide 2 — Opening | Split view: '41 points' path vs '3 melds' path — both glow green. 'Two ways to open your game.' |
| Slide 3 — Social | Players around a table. 'Play with friends anywhere. Voice chat. Real stakes.' |

## **7.2 Home Screen**

| **Zone** | **Design** |
| --- | --- |
| Top bar | App name left, coin balance right (DM Mono in amber) |
| Daily bonus | Amber card — pulsing if unclaimed. '20 coins — claim your daily bonus' |
| Public tables | Grouped by tier — each card shows player count and join button |
| Create private table | Terracotta button — prominent |
| Bottom nav | Home, Lobby, Profile, Shop |

## **7.3 Round Over Screen**

-   Winner and win type displayed prominently — 'ALEX WON — JOKER FINISH!'
-   Coin transfer animation — amounts fly from losers to winner
-   Updated balances shown for all players
-   'Next round in X seconds...' countdown
-   'Leave table' button — secondary, bottom

# **8\. Emoji Reactions**

-   Tap own avatar to open picker — 8 reactions in fan layout
-   Selected emoji floats from slot, 64pt, rises and fades over 1.5s
-   All players see the emoji simultaneously

| **Emoji** | **Use** |
| --- | --- |
| 😂 | Laughing — funny moment |
| 🔥 | Fire — great play |
| 😤 | Fuming — bad card |
| 👏 | Clapping — congratulate winner |
| 😱 | Shocked — surprise win |
| 🤦 | Facepalm — missed opportunity |
| 💰 | Money bag — coins flowing your way |
| 👑 | Crown — winner claiming the throne |

# **9\. Design System Components**

| **Component** | **Key properties** |
| --- | --- |
| PrimaryButton | Full width. Terracotta background. Cream text. 14pt DM Sans Medium. 48pt height. |
| CoinBadge | Amber pill. DM Mono Bold. Coin icon left. |
| PlayerCard | 80x80pt rounded square. Avatar or initials. Name below. Hand count badge. |
| MeldCard | Horizontal card group. Terracotta 1pt border. Owner label above. |
| ToastNotification | Bottom-center. Warm brown. Slides up, fades after 2.5s. For rule violations. |
| TurnTimerRing | Circular arc. Starts gold → amber → terracotta (last 5s) → pulses. |
| DisabledDiscardButton | Greyed out with lock icon when discard is blocked. Tap shows hint. |

# **10\. Accessibility**

| **Requirement** | **Specification** |
| --- | --- |
| Touch targets | Minimum 44pt x 44pt — no exceptions |
| Color contrast | WCAG AA — 4.5:1 body, 3:1 large text |
| Suit differentiation | Text labels for suits — not color alone |
| Font scaling | Relative units — respects system preferences |
| Reduced motion | All animations check prefers-reduced-motion |
| Discard block feedback | Both visual (shake) AND text (hint bar) — never visual alone |

# **11\. Design Deliverables Checklist**

## **Phase 1 — Foundation**

-   Color tokens defined in shared constants file
-   Typography scale defined and fonts sourced
-   Card face design — tested at 40pt, 80pt, 120pt
-   Card back design — geometric artisan lattice — tested at thumbnail size
-   Joker card design
-   App icon — 1024x1024pt, works at 60pt and 20pt
-   Splash screen

## **Phase 2 — Core Screens**

-   Table screen — all zones labeled
-   Discard restriction UX — all three blocked states designed
-   Action hint bar — all possible messages written
-   Onboarding — all 3 slides including new opening-path slide
-   Round over overlay — normal, Joker, Perfect Hand variants

*End of UI/UX Design Brief — v1.2*