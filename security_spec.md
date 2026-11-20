# Lenzo Party Firestore Security Specification

## 1. Data Invariants & Access Control Matrix
1. **Default Deny:** All unmatched paths (`/{document=**}`) deny read and write (`allow read, write: if false`).
2. **Permanent User Identity (`/users/{uid}`):**
   - `create`: Owner only (`request.auth.uid == uid`), `uid == request.auth.uid`, `accountStatus == 'active'`, and user CANNOT self-grant `isVerified`, `verificationTier` (`!= 'none'`), `verifiedTag`, or `isAdmin`.
   - `update`: Owner cannot modify `uid`, `email`, `authProvider`, `accountStatus`, `isVerified`, `verificationTier`, `verifiedTag`, or `isAdmin` (admin only). Third-party gifters can only credit `diamonds` upward (`incoming().diamonds >= existing().diamonds`).
   - `delete`: Denied (`false`). Account deletion requests go to `/deletion_requests/{uid}`.
3. **Private User Settings (`/user_settings/{uid}`):** Strictly owner or admin for `get`, `list`, `create`, `update`. Validated types and enum `allowDirectMessages in ['everyone', 'followers', 'nobody']`.
4. **Reels (`/reels/{reelId}`):**
   - `create`: Authenticated creator only (`incoming().creatorUID == request.auth.uid`, `incoming().reelID == reelId`, valid HTTPS/URL video, caption <= 500 chars, visibility in `['public', 'friends', 'private']`).
   - `update`: Creator can edit metadata with immutable `creatorUID`/`reelID`; other signed-in users can ONLY touch engagement counters (`['likesCount', 'commentsCount', 'viewsCount', 'sharesCount', 'repostsCount']`).
   - `delete`: Creator (`existing().creatorUID == request.auth.uid`) or Admin only.
5. **Reel Likes (`/reel_likes/{likeId}`) & Views (`/reel_views/{viewId}`):**
   - Deterministic composite key `${reelId}_${request.auth.uid}` prevents duplicate likes/views or spoofing another user's UID.
   - `reel_likes`: Owner can create/delete own like; `update` denied.
   - `reel_views`: Owner can create own view once; `update`/`delete` denied.
6. **Reel Comments (`/reel_comments/{commentId}`):**
   - Authenticated users can create with `userId == request.auth.uid`, non-empty `text <= 400 chars`. `update` denied. Creator or Admin can delete.
7. **Reports (`/reports/{reportId}`):**
   - Authenticated users can create (`reporterUid == request.auth.uid`, `status == 'open'`, `targetType in ['reel', 'user', 'room', 'stream']`).
   - Only reporter or Admin can read; only Admin can update resolution status; delete denied.
8. **Deletion Requests (`/deletion_requests/{uid}`):**
   - Owner can submit (`userId == request.auth.uid`, `status == 'pending'`). Admin can read/manage.
9. **Wallets, Earnings, Inventory, Blocks & Live/Party Rooms:**
   - All existing Lenzo Party protections preserved (`wallets` owner/admin, `withdrawal_requests` admin-only approval, `blocked_users` cross-collection blocking enforcement, immutable transaction ledgers).

## 2. Adversarial Audit ("Dirty Dozen" Payloads)
1. **Unauthenticated Read/Write** on `/users`, `/reels`, `/user_settings`, `/wallets`, `/reports` -> MUST DENY.
2. **Self-Grant Verified Badge** (`users/{uid}` update setting `isVerified: true`, `verificationTier: 'gold'`) -> MUST DENY for non-admin.
3. **Self-Grant Admin Flag** (`users/{uid}` create/update setting `isAdmin: true`) -> MUST DENY.
4. **Cross-User Settings Read/Write** (User A reading/writing `/user_settings/{userB}`) -> MUST DENY.
5. **Reel Impersonation** (User A creating `/reels/reel_1` with `creatorUID: userB`) -> MUST DENY.
6. **Unauthorized Reel Deletion** (User A deleting User B's reel) -> MUST DENY.
7. **Reel Metadata Hijack** (User A updating User B's reel `videoUrl` or `caption`) -> MUST DENY.
8. **Like Spoofing** (User A creating `/reel_likes/reel1_userB` or deleting User B's like) -> MUST DENY.
9. **Comment Spoofing / Oversized Spam** (`userId != auth.uid` or `text.size() > 400`) -> MUST DENY.
10. **Report Tampering** (User A marking own report `status: 'resolved'` or reading User B's reports) -> MUST DENY.
11. **Deletion Request Impersonation** (User A creating `/deletion_requests/{userB}`) -> MUST DENY.
12. **Blocked User Bypass** (Blocked user posting to blocker's `party_rooms/{id}/messages` or `live_streams/{id}/comments`) -> MUST DENY.
