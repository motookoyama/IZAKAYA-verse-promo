# IZAKAYA Lite Phase 2 Specification  

## Overview  
This document defines the Phase 2 specification for IZAKAYA Lite (pre-release). The goal is to integrate a point-based system, role-play rules, logging, and narrative prelude into the existing Lite Preview environment.  

## Point System  
- Initial points: 100 points per user, reset daily at 00:00 UTC.  
- Cost per message: 10 points (adjustable to 5 points if needed).  
- Points are displayed only in a small pin frame on the UI; non-guide characters should not mention points.  

## Admin Functionality  
- Admin ID (`admin`) receives 10,000 points daily.  
- Admin can grant or reset points to any user via an API endpoint.  
- Admin can monitor active sessions.  

## Role-Play System  
- Default characters (e.g., Dr. Orb, Miss Madi) provide guides, updates, and announcements.  
- Guest cards should only role-play and not provide system guidance.  
- Upon card registration, display an introductory greeting from a predefined list.  
- When switching cards, show a short warning message.  

## Logging  
- Provide a "save log" button that allows users to download session logs (JSON).  
- The server does not retain conversation logs; they remain in the browser.  
- Future: offer formatted log share options.  

## Narrative Prelude  
- This version is positioned as the prologue for the full IZAKAYA verse.  
- Default characters will provide hints about upcoming features.  

## Development Tasks  
- Implement API endpoints:  
  - `/api/points`: get/spend/reset points.  
  - `/api/admin/points`: admin operations.  
  - `/api/session`: manage session state.  
- Update frontend to show points, greetings, card-switch warnings, and log download.  
- Create cron script to reset points daily.
