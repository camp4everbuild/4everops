-- ============================================================================
-- 4everOPS — 'admin' role (enum value only)
-- ============================================================================
-- Split into its own migration/transaction on purpose — Postgres won't let
-- a newly added enum value be used (in a function body, a policy, etc.)
-- in the same transaction that added it. See 20260727020000_new_roles.sql
-- for the same pattern used when the head/kitchen roles were added.
--
-- 'admin' is deliberately separate from 'director': director runs the trip
-- day to day; admin is full system control (retriggering notifications,
-- the audit log, and — per 20260730010001 — the only role that can grant
-- or revoke the admin role itself). One person can hold both.
-- ============================================================================

alter type user_role add value 'admin';
