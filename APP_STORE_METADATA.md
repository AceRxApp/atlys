# NxStops — App Store Submission Reference

## App Information

| Field | Value |
|-------|-------|
| **App Name** | NxStops |
| **Subtitle** | Discover Places & Plan Trips |
| **Bundle ID** | com.nave.nxstops |
| **Apple Team ID** | A7R7S5DAZA |
| **Category (Primary)** | Travel |
| **Category (Secondary)** | Lifestyle |
| **Content Rating** | 4+ (no objectionable content) |
| **Version** | 1.1.0 |
| **Price** | Free |
| **Copyright** | © 2025 Navé |

---

## App Description

**Short Description (Google Play, max 80 chars):**
Discover places, restaurants & events. Build trip plans with vibes you love.

**Full Description:**
NxStops helps you discover what to do right now, wherever you are. Whether you're exploring a new city or finding hidden gems in your own — NxStops curates places, restaurants, nightlife, and events based on the vibes you're feeling.

**Key Features:**
- Vibe-based discovery — filter by Foodie, Nightlife, Culture, Adventure, Chill, and more
- Real-time place details with photos, ratings, hours, and directions
- Multi-day trip planner with drag-and-drop reordering
- Live local events from concerts to food festivals
- Community reviews and tags from real travelers
- Currency converter for international trips
- Safety toolkit with emergency info for every city
- Works across 50+ African cities and growing
- Dark, light, and sunset themes
- Face ID / Touch ID for quick sign-in
- Offline support — view cached places without internet

---

## Keywords (Apple, max 100 chars)

travel,trip,planner,discover,restaurants,events,food,nightlife,africa,cities,vibes,explore,local

---

## Privacy Nutrition Label

### Data Collected

| Data Type | Purpose | Linked to Identity | Tracking |
|-----------|---------|-------------------|----------|
| **Email Address** | App Functionality (account creation) | Yes | No |
| **Name** | App Functionality (profile display) | Yes | No |
| **Coarse Location** | App Functionality (nearby places) | No | No |
| **Photos** | App Functionality (profile avatar) | Yes | No |
| **Usage Data** | Analytics (Vercel Analytics) | No | No |
| **Performance Data** | App Functionality (Sentry errors) | No | No |
| **Product Interaction** | Analytics (feature usage events) | No | No |

### Data NOT Collected
- Precise Location (only coarse/city-level used)
- Financial Information
- Health & Fitness
- Contacts
- Browsing History
- Search History (not sent to third parties)
- Identifiers (no advertising ID)
- Sensitive Information
- Diagnostics beyond crash reports

### Third-Party SDKs

| SDK | Purpose | Data Shared |
|-----|---------|-------------|
| Supabase | Authentication, database | Email, name (stored securely) |
| Vercel Analytics | Anonymous page views | No PII |
| Vercel Speed Insights | Performance metrics | No PII |
| Sentry | Crash reporting | Device info, stack traces (no PII) |
| Google Maps | Map display | Coarse location |
| Google Places | Place search | Search queries, location |

---

## Required Screenshots

### iPhone 6.7" (iPhone 15 Pro Max) — Required
1. Home screen with city view and place cards
2. Place detail modal with photos and reviews
3. Discover screen with vibe filters
4. Trip planner with multi-day itinerary
5. Events screen with local events
6. Profile with theme options

### iPhone 5.5" (iPhone 8 Plus) — Required
Same 6 screenshots at 1242 x 2208 resolution

### iPad Pro 12.9" — Required if supporting iPad
Same 6 screenshots at 2048 x 2732 resolution

### Android — Google Play
Feature Graphic: 1024 x 500 (required)
Phone Screenshots: min 2, max 8 (16:9 or 9:16)

---

## App Review Notes (for Apple reviewer)

**Demo Account:**
Email: reviewer@nxstops.com
Password: [create a demo account before submission]

**Notes for Reviewer:**
- The app requires location permission to find nearby places. You can test with any major city (Lagos, Nairobi, Accra, etc.)
- Account deletion is available in Profile > Danger Zone > Delete My Account
- Content reporting is available on any place detail page via the Report button
- The app works as both a web app (nxstops.com) and native app
- Push notifications require a real device (not simulator)

---

## Android Signing

To generate the upload keystore:
```bash
keytool -genkey -v -keystore nxstops-upload.keystore -alias nxstops -keyalg RSA -keysize 2048 -validity 10000
```

To get the SHA256 fingerprint for assetlinks.json:
```bash
keytool -list -v -keystore nxstops-upload.keystore | grep SHA256
```

Then update `public/.well-known/assetlinks.json` with the fingerprint.

---

## Pre-Submission Checklist

- [ ] Pay Apple Developer Program ($99/year)
- [ ] Pay Google Play Console ($25 one-time)
- [ ] Create demo reviewer account on Supabase
- [ ] Generate Android upload keystore + update assetlinks.json SHA256
- [ ] Take all required screenshots (6 per device size)
- [ ] Create App Store feature graphic (1024x500)
- [ ] Run `supabase/migrations/006_reports.sql` on production database
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel production env
- [ ] Set up Firebase project + download google-services.json and GoogleService-Info.plist
- [ ] Run `npx cap sync` to update native projects
- [ ] Build iOS: `npm run cap:ios` → Archive in Xcode → Upload to App Store Connect
- [ ] Build Android: `npm run cap:android` → Generate signed APK/AAB → Upload to Play Console
- [ ] Fill in privacy nutrition label in App Store Connect
- [ ] Fill in Data Safety form in Google Play Console
- [ ] Submit for review
