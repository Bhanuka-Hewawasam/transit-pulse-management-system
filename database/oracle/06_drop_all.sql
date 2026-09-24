-- =============================================================================
-- SmartMove Transport Solutions
-- FILE: 06_drop_all.sql
-- PURPOSE: Drop all database objects in safe reverse-dependency order.
--          Run this script BEFORE re-running 01_create_tables.sql to start fresh.
--          Children are dropped before parents to honour FK constraints.
-- AUTHOR: SmartMove DBA Team
-- CREATED: 2025-09-24
-- =============================================================================

-- NOTE: CASCADE CONSTRAINTS removes all referential-integrity constraints
--       that point TO the table being dropped.
--       PURGE bypasses the Oracle recycle-bin so no flashback is possible.

PROMPT ============================================================
PROMPT  SmartMove -- Dropping all tables and sequences
PROMPT ============================================================

-- ------------------------------------------------------------
-- STEP 1: Drop leaf / child tables first
-- ------------------------------------------------------------

PROMPT Dropping FEEDBACK ...
DROP TABLE feedback CASCADE CONSTRAINTS PURGE;

PROMPT Dropping PAYMENTS ...
DROP TABLE payments CASCADE CONSTRAINTS PURGE;

PROMPT Dropping BOOKINGS ...
DROP TABLE bookings CASCADE CONSTRAINTS PURGE;

PROMPT Dropping MAINTENANCE_RECORDS ...
DROP TABLE maintenance_records CASCADE CONSTRAINTS PURGE;

PROMPT Dropping ROUTE_STOPS ...
DROP TABLE route_stops CASCADE CONSTRAINTS PURGE;

-- ------------------------------------------------------------
-- STEP 2: Drop mid-level tables (depend on root entities)
-- ------------------------------------------------------------

PROMPT Dropping TRIPS ...
DROP TABLE trips CASCADE CONSTRAINTS PURGE;

PROMPT Dropping PASSENGERS ...
DROP TABLE passengers CASCADE CONSTRAINTS PURGE;

-- ------------------------------------------------------------
-- STEP 3: Drop root / parent tables
-- ------------------------------------------------------------

PROMPT Dropping ROUTES ...
DROP TABLE routes CASCADE CONSTRAINTS PURGE;

PROMPT Dropping DRIVERS ...
DROP TABLE drivers CASCADE CONSTRAINTS PURGE;

PROMPT Dropping VEHICLES ...
DROP TABLE vehicles CASCADE CONSTRAINTS PURGE;

PROMPT Dropping SYSTEM_USERS ...
DROP TABLE system_users CASCADE CONSTRAINTS PURGE;

-- ------------------------------------------------------------
-- STEP 4: Drop all sequences
-- ------------------------------------------------------------

PROMPT Dropping sequences ...

DROP SEQUENCE seq_users_id;
DROP SEQUENCE seq_vehicles_id;
DROP SEQUENCE seq_drivers_id;
DROP SEQUENCE seq_routes_id;
DROP SEQUENCE seq_stops_id;
DROP SEQUENCE seq_passengers_id;
DROP SEQUENCE seq_trips_id;
DROP SEQUENCE seq_bookings_id;
DROP SEQUENCE seq_payments_id;
DROP SEQUENCE seq_maintenance_id;
DROP SEQUENCE seq_feedback_id;

-- ------------------------------------------------------------
-- STEP 5: Drop views (if they exist from 05_views.sql)
-- ------------------------------------------------------------

PROMPT Dropping views ...

DROP VIEW v_trip_details;
DROP VIEW v_booking_details;
DROP VIEW v_payment_summary;
DROP VIEW v_maintenance_alerts;
DROP VIEW v_feedback_summary;
DROP VIEW v_route_booking_count;

PROMPT ============================================================
PROMPT  All SmartMove objects dropped successfully.
PROMPT  You may now re-run the creation scripts in order:
PROMPT    01_create_tables.sql
PROMPT    02_constraints_indexes.sql
PROMPT    03_sequences.sql
PROMPT    04_sample_data.sql
PROMPT    05_views.sql
PROMPT ============================================================
