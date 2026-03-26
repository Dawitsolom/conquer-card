**CONQUER CARD**

Licensing & Legal Brief

Version 1.2

*DISCLAIMER: This document provides general guidance only and is not legal advice. Consult a qualified attorney before launching.*

# **1\. Business Structure**

## **1.1 Recommended Setup**

Form a legal entity before submitting to any app store or collecting payments. This protects you personally and is required by Apple and Google for apps with IAP.

| **Option** | **Recommendation** |
| --- | --- |
| LLC (US-based) | Best for US residents — limited liability, pass-through taxation. Cost: $50-$500. Best states: Wyoming, Delaware, or your home state. |
| Sole Proprietorship | Simplest — no formal registration. No liability protection. OK for testing only. |
| Ltd Company (UK) | If UK-based. Register at Companies House. Cost: GBP 12 online. |
| Other jurisdictions | Consult a local attorney for the equivalent entity type in your country. |

*Note: Open a separate business bank account immediately after forming your entity. Never mix personal and business money.*

# **2\. Developer Accounts**

| **Account** | **Cost & details** |
| --- | --- |
| Apple Developer Program | $99 USD/year — developer.apple.com/programs/enroll — Individual or Organization — 24-48hrs Individual, 2-5 days Organization |
| Google Play Developer | $25 USD one-time — play.google.com/console/signup — 48hr approval |

*Note: Register both accounts early — Apple Organization accounts can take weeks. You need a D-U-N-S number for Organization enrollment (free, 5 business days).*

# **3\. IAP & Payment Compliance**

-   All digital goods in iOS apps MUST use Apple IAP — no exceptions
-   All digital goods in Android apps MUST use Google Play Billing — no exceptions
-   Apple takes 30% (15% under Small Business Program — under $1M/year revenue)
-   Google takes 30% (15% for first $1M/year)
-   Browser version (v1.5) can use Stripe — no Apple/Google cut
-   Never link to external payment page from within the iOS app

# **4\. Coin Economy Compliance**

-   Coins have no real-world cash value — state clearly in ToS and in-app
-   Coins cannot be redeemed for real money — ever
-   Do not describe coins as 'winnings' — use 'coins' or 'in-game currency'
-   Apple App Store: 17+ age rating for simulated gambling
-   Google Play: mark as containing simulated gambling content

*Important: Never implement any feature that allows coins to convert to real money. This triggers gambling license requirements in multiple jurisdictions.*

# **5\. Required Legal Documents**

## **5.1 Terms of Service**

-   Acceptance of terms on download/use
-   Virtual currency — no real value, non-refundable, non-transferable
-   Age requirement — 18+ (21+ where required)
-   User conduct — no cheating, no harassment, no fraud
-   Account suspension rights
-   Limitation of liability
-   Governing law — your jurisdiction
-   Contact info for legal notices

*Note: Use Termly (termly.io) or PrivacyPolicies.com to generate a reviewed template. Cost: free to $20/month.*

## **5.2 Privacy Policy**

Required by law in most jurisdictions and by both app stores.

| **Data collected** | **Purpose** |
| --- | --- |
| Email / phone | Authentication |
| Display name | Shown to other players |
| Gameplay data | Match history, balance, stats |
| Device info | Crash reporting — Sentry |
| Usage analytics | PostHog — product improvement |
| Voice data | Agora.io processes live — not stored by Conquer Card |
| Video data (v1.5) | Agora.io processes live — not stored by Conquer Card |
| Purchase history | RevenueCat — IAP processing |

-   State clearly: you do NOT sell user data
-   List all third parties: Firebase, Agora, RevenueCat, PostHog, Sentry, Railway
-   Include data deletion request process
-   GDPR compliance required if any EU users

## **5.3 Hosting Legal Documents**

-   Host at a public URL — GitHub Pages (free) or Carrd.co ($19/year)
-   Suggested format: conquercardapp.com/terms and conquercardapp.com/privacy
-   Both must be live before App Store submission

# **6\. Gambling & Gaming Regulations**

| **Factor** | **Conquer Card position** |
| --- | --- |
| Real money at stake? | NO — virtual coins only |
| Can you win real money? | NO — coins only |
| Classification | Social casino / skill game — not regulated gambling in most jurisdictions |
| App Store classification | Simulated Gambling — age-gate 17+/18+ |

*Important: Some jurisdictions have strict definitions. If you have significant users in Netherlands, Belgium, South Korea, or certain US states, consult a gaming attorney.*

# **7\. Intellectual Property**

## **7.1 Trademark**

-   Search USPTO (tess2.uspto.gov) — confirm 'Conquer Card' is not already registered
-   Filing not required to launch but protects from copycats — $250-350 per class in US
-   Consider filing Class 41 (entertainment) and Class 9 (software) once you have revenue

## **7.2 Copyright**

-   Your code, design, and documents are automatically copyright-protected
-   Add: Copyright 2025 \[Your Company Name\]. All rights reserved.
-   The game rules (as a traditional game) are not copyrightable
-   Your implementation, UI, and design ARE copyrightable and belong to you

## **7.3 Third-Party Licenses**

| **Dependency** | **License** | **Commercial use** |
| --- | --- | --- |
| React Native | MIT | Yes — free |
| Expo | MIT | Yes — free |
| Socket.io | MIT | Yes — free |
| Prisma | Apache 2.0 | Yes — free |
| Firebase SDK | Apache 2.0 | Yes — fees at scale |
| Agora.io SDK | Proprietary | Yes — usage-based pricing |
| RevenueCat | Proprietary | Yes — free under $2,500/mo revenue |
| PostHog | MIT / Proprietary | Yes — free tier |
| Sentry | BSL cloud | Yes — free tier |
| DM Sans font | SIL Open Font | Yes — free |
| Playfair Display | SIL Open Font | Yes — free |
| Phosphor Icons | MIT | Yes — free |

# **8\. Pre-Launch Legal Checklist**

-   Business entity formed
-   Business bank account opened
-   Apple Developer account registered ($99/year)
-   Google Play account registered ($25 one-time)
-   Terms of Service live at public URL
-   Privacy Policy live at public URL
-   Age rating set to 17+ (Apple) / appropriate rating (Google)
-   Simulated gambling content disclosed in store listings
-   Coin economy described correctly — no real money value
-   Tax info submitted to Apple and Google (W-9 or W-8BEN)
-   D-U-N-S number obtained if using Apple Organization account
-   Trademark search completed for 'Conquer Card'
-   Copyright notice added to app
-   All third-party licenses reviewed
-   GDPR compliance reviewed if EU users expected

*End of Licensing & Legal Brief — v1.2*

*This document is guidance only — not legal advice. Consult a qualified attorney.*