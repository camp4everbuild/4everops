-- ============================================================================
-- 4everOPS — New roles for the department model
-- ============================================================================
-- Split into its own migration on purpose: Postgres won't let a newly added
-- enum value be used (even inside a function body) in the same transaction
-- that added it, and the SQL editor runs a pasted script as one implicit
-- transaction. Run this one first, then
-- 20260727020001_multi_role_departments.sql, as two separate pastes.
-- ============================================================================

alter type user_role add value if not exists 'head_counselor';
alter type user_role add value if not exists 'head_support';
alter type user_role add value if not exists 'head_kitchen';
alter type user_role add value if not exists 'kitchen_staff';
