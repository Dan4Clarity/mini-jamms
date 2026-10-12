-- 001_initial_schema.sql
-- Initial Mini-JAMMS schema: the report_statuses lookup table (seeded with the
-- work-order lifecycle) and the reports table for public defect reports.
-- Applied by hand in the Supabase SQL editor. Runs as one transaction, so any
-- failure rolls back everything (Postgres DDL is transactional).

BEGIN;

-- ---------------------------------------------------------------------------
-- report_statuses: lookup table for the work-order lifecycle.
-- A lookup table (rather than a CHECK list) so statuses can be added, relabelled
-- or retired (is_active = false) with plain DML instead of a schema change.
-- ---------------------------------------------------------------------------
CREATE TABLE public.report_statuses (
    code        text    NOT NULL,
    label       text    NOT NULL,
    sort_order  integer NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,

    CONSTRAINT report_statuses_pkey PRIMARY KEY (code),
    CONSTRAINT report_statuses_sort_order_key UNIQUE (sort_order),
    CONSTRAINT report_statuses_code_lowercase_chk CHECK (code = lower(code)),
    CONSTRAINT report_statuses_code_not_empty_chk CHECK (char_length(code) > 0),
    CONSTRAINT report_statuses_label_not_empty_chk CHECK (char_length(label) > 0)
);

-- sort_order spaced by 10 so a status can be slotted in later without renumbering.
INSERT INTO public.report_statuses (code, label, sort_order) VALUES
    ('open',             'Open',             10),
    ('pending',          'Pending',          20),
    ('scheduled',        'Scheduled',        30),
    ('released',         'Released',         40),
    ('in_progress',      'In progress',      50),
    ('rework',           'Rework',           60),
    ('rework_completed', 'Rework completed', 70),
    ('completed',        'Completed',        80),
    ('closed',           'Closed',           90);

-- ---------------------------------------------------------------------------
-- reports: one row per public defect report.
-- id is a uuid (not identity) so a future offline client can generate ids
-- on the device without contacting the database.
-- photo_path holds only the storage object name, never a full URL: a URL
-- would embed the storage vendor in every row and break on migration to
-- Azure Blob Storage.
-- ---------------------------------------------------------------------------
CREATE TABLE public.reports (
    id                uuid        NOT NULL DEFAULT gen_random_uuid(),
    location          text        NOT NULL,
    problem_type      text        NOT NULL,
    description       text        NOT NULL,
    reporter_name     text        NOT NULL,
    reporter_contact  text        NOT NULL,
    photo_path        text        NULL,
    status            text        NOT NULL DEFAULT 'open',
    created_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT reports_pkey PRIMARY KEY (id),

    CONSTRAINT reports_location_length_chk
        CHECK (char_length(location) BETWEEN 3 AND 200),
    CONSTRAINT reports_problem_type_chk
        CHECK (problem_type IN ('pothole', 'damaged_fence', 'signage', 'lighting', 'other')),
    CONSTRAINT reports_description_length_chk
        CHECK (char_length(description) BETWEEN 5 AND 2000),
    CONSTRAINT reports_reporter_name_length_chk
        CHECK (char_length(reporter_name) BETWEEN 1 AND 120),
    CONSTRAINT reports_reporter_contact_length_chk
        CHECK (char_length(reporter_contact) BETWEEN 3 AND 200),
    CONSTRAINT reports_photo_path_length_chk
        CHECK (char_length(photo_path) BETWEEN 1 AND 500),

    -- RESTRICT both ways: a status code in use cannot be deleted or renamed.
    -- Retire a status with is_active = false; change its display text via label.
    CONSTRAINT reports_status_fkey
        FOREIGN KEY (status) REFERENCES public.report_statuses (code)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

-- Admin list shows newest first.
CREATE INDEX reports_created_at_idx ON public.reports (created_at DESC);

-- No index on reports(status) yet: there is no status-filtered query today,
-- and with only nine low-selectivity values it would rarely beat a scan at
-- PoC volumes. Add one in a later migration if a status filter is built.

-- ---------------------------------------------------------------------------
-- Row level security on, with no policies: the Supabase anon/authenticated
-- roles get no access. The API connects as the table owner (postgres), which
-- bypasses RLS, so the API is unaffected.
-- ---------------------------------------------------------------------------
ALTER TABLE public.report_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports         ENABLE ROW LEVEL SECURITY;

-- Defence in depth: in case the Supabase Data API is ever re-enabled, the
-- anon/authenticated roles hold no privileges on these tables at all.
REVOKE ALL ON public.reports, public.report_statuses FROM anon, authenticated;

COMMIT;
