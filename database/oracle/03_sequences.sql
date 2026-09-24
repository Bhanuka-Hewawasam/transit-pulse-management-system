-- =============================================================================
-- SmartMove Transport Solutions
-- FILE: 03_sequences.sql
-- PURPOSE: Create all Oracle sequences used as surrogate primary keys.
--          Each table has its own dedicated sequence.
--          NOCACHE  -- no pre-allocated blocks; safe for RAC or restart scenarios
--          NOCYCLE  -- sequences do NOT wrap around; error raised at MAXVALUE
-- AUTHOR: SmartMove DBA Team
-- CREATED: 2025-09-24
-- =============================================================================

PROMPT ============================================================
PROMPT  SmartMove -- Creating sequences
PROMPT ============================================================

-- ------------------------------------------------------------------
-- seq_users_id  →  SYSTEM_USERS.user_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_users_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_vehicles_id  →  VEHICLES.vehicle_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_vehicles_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_drivers_id  →  DRIVERS.driver_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_drivers_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_routes_id  →  ROUTES.route_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_routes_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_stops_id  →  ROUTE_STOPS.stop_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_stops_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_passengers_id  →  PASSENGERS.passenger_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_passengers_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_trips_id  →  TRIPS.trip_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_trips_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_bookings_id  →  BOOKINGS.booking_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_bookings_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_payments_id  →  PAYMENTS.payment_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_payments_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_maintenance_id  →  MAINTENANCE_RECORDS.maintenance_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_maintenance_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

-- ------------------------------------------------------------------
-- seq_feedback_id  →  FEEDBACK.feedback_id
-- ------------------------------------------------------------------
CREATE SEQUENCE seq_feedback_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

PROMPT ============================================================
PROMPT  All 11 sequences created successfully.
PROMPT ============================================================
