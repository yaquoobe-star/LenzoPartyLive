/**
 * Lenzo Party Firestore Security Rules Verification Specification
 * Covers data invariants and adversarial scenarios defined in security_spec.md.
 */

export interface SecurityRuleTestCase {
  id: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: 'anonymous' | 'owner' | 'other_user' | 'blocked_user' | 'admin';
  description: string;
  expected: 'allow' | 'deny';
}

export const SECURITY_RULE_TEST_MATRIX: SecurityRuleTestCase[] = [
  {
    id: 'user-no-self-verify',
    collection: '/users/{uid}',
    operation: 'update',
    actor: 'owner',
    description: 'Owner attempting to self-grant isVerified=true or verificationTier=gold',
    expected: 'deny',
  },
  {
    id: 'user-no-self-admin',
    collection: '/users/{uid}',
    operation: 'create',
    actor: 'owner',
    description: 'New user attempting to set isAdmin=true on account creation',
    expected: 'deny',
  },
  {
    id: 'user-owner-profile-edit',
    collection: '/users/{uid}',
    operation: 'update',
    actor: 'owner',
    description: 'Owner editing fullName, bio, profileImage, lastActiveAt with immutable identity fields',
    expected: 'allow',
  },
  {
    id: 'settings-owner-only-read',
    collection: '/user_settings/{uid}',
    operation: 'get',
    actor: 'other_user',
    description: 'Other authenticated user reading another user settings document',
    expected: 'deny',
  },
  {
    id: 'settings-owner-write',
    collection: '/user_settings/{uid}',
    operation: 'update',
    actor: 'owner',
    description: 'Owner updating notificationsEnabled, darkMode, language, allowDirectMessages',
    expected: 'allow',
  },
  {
    id: 'reel-create-impersonation',
    collection: '/reels/{reelId}',
    operation: 'create',
    actor: 'other_user',
    description: 'User attempting to create a reel with another user creatorUID',
    expected: 'deny',
  },
  {
    id: 'reel-delete-non-owner',
    collection: '/reels/{reelId}',
    operation: 'delete',
    actor: 'other_user',
    description: 'Non-owner attempting to delete someone else reel',
    expected: 'deny',
  },
  {
    id: 'reel-metadata-hijack',
    collection: '/reels/{reelId}',
    operation: 'update',
    actor: 'other_user',
    description: 'Non-owner attempting to overwrite reel videoUrl or caption',
    expected: 'deny',
  },
  {
    id: 'reel-like-spoof',
    collection: '/reel_likes/{likeId}',
    operation: 'create',
    actor: 'other_user',
    description: 'User creating a like document with mismatched composite key or userId',
    expected: 'deny',
  },
  {
    id: 'reel-comment-oversized',
    collection: '/reel_comments/{commentId}',
    operation: 'create',
    actor: 'owner',
    description: 'User submitting empty or >400 char comment',
    expected: 'deny',
  },
  {
    id: 'report-tamper-status',
    collection: '/reports/{reportId}',
    operation: 'update',
    actor: 'owner',
    description: 'Reporter attempting to modify report status to resolved',
    expected: 'deny',
  },
  {
    id: 'deletion-request-impersonation',
    collection: '/deletion_requests/{uid}',
    operation: 'create',
    actor: 'other_user',
    description: 'User submitting an account deletion request for another UID',
    expected: 'deny',
  },
  {
    id: 'blocked-user-room-message',
    collection: '/party_rooms/{roomId}/messages/{messageId}',
    operation: 'create',
    actor: 'blocked_user',
    description: 'Blocked user attempting to post chat message in blocker party room',
    expected: 'deny',
  },
];
