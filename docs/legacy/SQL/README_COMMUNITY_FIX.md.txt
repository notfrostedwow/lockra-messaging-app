# Community Policies Fix

This document explains how to fix the infinite recursion errors in the community-related policies.

## The Problem

When clicking on the communities tab, you're seeing these errors:

```
ERROR Error fetching public communities: {"code": "42P17", "details": null, "hint": null, "message": "infinite recursion detected in policy for relation \"community_members\""}
```

or

```
ERROR Error fetching public communities: {"code": "42P17", "details": null, "hint": null, "message": "infinite recursion detected in policy for relation \"communities\""}
```

These happen because the Row Level Security (RLS) policies for the `community_members` and `communities` tables are causing infinite recursions. The policies try to check if a user is a member of a community by creating circular references.

## The Solution

We've created files to fix both issues:

1. For the `community_members` table:
   - `SQL/fix_community_members_policy.sql` - Contains the SQL statements to fix the policy
   - `scripts/fix_community_members_policy.js` - A Node.js script to run the SQL statements

2. For the `communities` table:
   - `SQL/fix_communities_policy.sql` - Contains the SQL statements to fix the policy
   - `scripts/fix_communities_policy.js` - A Node.js script to run the SQL statements

### Option 1: Run the SQL directly in the Supabase SQL Editor

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of the appropriate SQL file
4. Run the SQL statements

### Option 2: Run the Node.js scripts

1. Make sure your `.env` file contains the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   ```

2. Run the scripts:
   ```
   node scripts/fix_community_members_policy.js
   node scripts/fix_communities_policy.js
   ```

## What the Fixes Do

### For community_members table:

The fix replaces the problematic policy with two separate policies:

1. `Anyone can view public community members` - Allows anyone to view members of public communities
2. `Members can see private community members` - Allows members to view other members of private communities they belong to

### For communities table:

The fix updates the policies to:

1. Simplify the "Anyone can view public communities" policy
2. Rewrite the "Members can view their private communities" policy to avoid recursion

Both fixes avoid recursive references by using direct joins or simpler conditions that don't create circular dependencies.

## UI Improvements

We've also improved the error display in the Communities tab to make error messages more visible with white text on a red background.

## Verification

After applying the fixes, refresh the Communities tab. You should no longer see the infinite recursion errors, and you should be able to view public communities properly. 