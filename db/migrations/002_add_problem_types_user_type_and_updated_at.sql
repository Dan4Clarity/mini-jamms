-- 002_add_problem_types_user_type_and_updated_at.sql
-- Three changes to public.reports:
--   1. Three more problem types (damaged_attenuator, roadside_littering,
--      roadside_accident) in the reports_problem_type_chk CHECK list.
--   2. user_type column (public / staff / stakeholder), so staff and stakeholder
--      reporting can be measured and incentivised.
--   3. updated_at column, kept current by a trigger, so response time can be
--      measured without relying on application code to remember to set it.
-- Applied by hand in the Supabase SQL editor. Runs as one transaction, so any
-- failure rolls back everything (Postgres DDL is transactional).
--
-- Run the whole file, once. Running it a second time fails at the first
-- ADD COLUMN (the column already exists) and rolls back, leaving the
-- database exactly as it was. That is deliberate: no IF NOT EXISTS, so a
-- half-matching schema is reported instead of silently skipped.
--
-- Locking: each ALTER TABLE takes an ACCESS EXCLUSIVE lock (the equivalent of
-- Sch-M in SQL Server) and holds it until COMMIT, blocking reads and writes.
-- Neither ADD COLUMN rewrites the table: since Postgres 11 a non-volatile
-- default is stored once in the catalog and read back for existing rows, and
-- now() is not volatile (it is fixed for the transaction). The table is
-- scanned for the CHECK validations, and the updated_at backfill writes every
-- existing row once. On a table this size it is milliseconds.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. problem_type: three new allowed values.
-- A CHECK constraint cannot be altered in place, so drop and re-add under the
-- same name. The first five values are copied from 001. Widening the list
-- cannot invalidate existing rows; the re-add still scans the table to verify.
-- ---------------------------------------------------------------------------
ALTER TABLE public.reports
    DROP CONSTRAINT reports_problem_type_chk;

ALTER TABLE public.reports
    ADD CONSTRAINT reports_problem_type_chk
        CHECK (problem_type IN (
            'pothole', 'damaged_fence', 'signage', 'lighting', 'other',
            'damaged_attenuator', 'roadside_littering', 'roadside_accident'
        ));

-- ---------------------------------------------------------------------------
-- 2. user_type: who lodged the report.
-- Existing rows all read as 'public' (the default), which is correct: the only
-- way to lodge a report so far has been the public form.
-- ---------------------------------------------------------------------------
ALTER TABLE public.reports
    ADD COLUMN user_type text NOT NULL DEFAULT 'public'
        CONSTRAINT reports_user_type_chk
            CHECK (user_type IN ('public', 'staff', 'stakeholder'));

-- COMMENT ON is the Postgres counterpart of an MS_Description extended
-- property. It is stored in the catalog.
COMMENT ON COLUMN public.reports.user_type IS
    'Who lodged the report: public, staff or stakeholder. Captured so staff and stakeholder reporting can be measured and incentivised.';

-- ---------------------------------------------------------------------------
-- 3. updated_at: when the row was last updated.
-- Existing rows are backfilled to created_at just below, so old and new rows
-- follow the same rule: updated_at = created_at means "never updated since".
-- 001 never recorded when a status changed, so a row whose status had already
-- changed before this migration will wrongly look untouched.
-- ---------------------------------------------------------------------------
ALTER TABLE public.reports
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.reports.updated_at IS
    'When the row was last updated. Set by the reports_set_updated_at_trg trigger on every UPDATE, in the database rather than application code so it cannot be forgotten. This is what makes response time measurable.';

-- Backfill existing rows. Without this they would all hold the time this
-- migration ran (the column default). It has to sit here, above the trigger:
-- once the trigger exists, any UPDATE (including this one) is stamped with
-- now().
UPDATE public.reports SET updated_at = created_at;

-- ---------------------------------------------------------------------------
-- The trigger. Differences from SQL Server, in the order they appear below.
--
-- Two objects, not one. SQL Server puts the body inside CREATE TRIGGER.
-- Postgres splits it: a function declared RETURNS trigger holds the body, and
-- CREATE TRIGGER only binds that function to a table and an event. The
-- function is not tied to reports, so a later table with an updated_at column
-- can reuse it with its own CREATE TRIGGER.
--
-- LANGUAGE plpgsql. Plain SQL in Postgres has no variables or control flow;
-- PL/pgSQL is the procedural language that supplies them (the role T-SQL
-- plays for both in SQL Server). The body is handed over as a string literal.
--
-- $$ ... $$ is dollar quoting: just another way to write a string literal, so
-- quotes inside the body need no doubling. The BEGIN ... END inside it is a
-- PL/pgSQL block, like T-SQL BEGIN ... END. It is not a transaction and has
-- nothing to do with the BEGIN; / COMMIT; around this file.
--
-- SET search_path = ''. Pins name resolution inside the function instead of
-- inheriting the caller's search_path. Supabase's database linter flags any
-- function without it ("function_search_path_mutable"). now() still resolves
-- because pg_catalog is always searched.
--
-- BEFORE. SQL Server has AFTER and INSTEAD OF only. Postgres also has BEFORE,
-- which runs before the row is written and may change it. So the timestamp is
-- set on the row on its way in: one write. The SQL Server equivalent is an
-- AFTER UPDATE trigger that runs a second UPDATE joined to inserted. (INSTEAD
-- OF exists in Postgres too, but only on views.)
--
-- FOR EACH ROW. A SQL Server trigger fires once per statement and sees every
-- affected row in the inserted and deleted tables. A Postgres row-level
-- trigger fires once per affected row and sees that one row as two record
-- variables: NEW (the inserted counterpart) and OLD (the deleted counterpart).
-- An UPDATE that matches no rows therefore does not fire it at all. Leave
-- FOR EACH ROW off and you get the default, FOR EACH STATEMENT, where NEW and
-- OLD are not available.
--
-- RETURN NEW. In a BEFORE row trigger the returned row is what gets stored,
-- so assign to NEW and return it. RETURN NULL would silently skip the update
-- for that row, with no error. Leaving RETURN out altogether raises an error
-- on every UPDATE.
--
-- EXECUTE FUNCTION names the function to call. No arguments are passed; NEW
-- and OLD arrive implicitly.
--
-- The trigger overwrites whatever the statement supplied, so
-- UPDATE ... SET updated_at = <anything> is ignored. It fires on every UPDATE,
-- including one that sets a column to the value it already has: Postgres
-- writes a new row version for those too. It does not fire on INSERT; the
-- column DEFAULT covers that.
--
-- now() is the start time of the transaction, not of the statement, the same
-- as the created_at default. clock_timestamp() is the wall-clock equivalent.
--
-- Trigger names are scoped to their table, not the schema: to remove this one,
-- DROP TRIGGER reports_set_updated_at_trg ON public.reports;
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER reports_set_updated_at_trg
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- No index on updated_at or user_type yet: no query filters or sorts on them.

COMMIT;
