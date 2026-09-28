













PROMPT ============================================================
PROMPT  SmartMove -- Dropping all tables and sequences
PROMPT ============================================================





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





PROMPT Dropping TRIPS ...
DROP TABLE trips CASCADE CONSTRAINTS PURGE;

PROMPT Dropping PASSENGERS ...
DROP TABLE passengers CASCADE CONSTRAINTS PURGE;





PROMPT Dropping ROUTES ...
DROP TABLE routes CASCADE CONSTRAINTS PURGE;

PROMPT Dropping DRIVERS ...
DROP TABLE drivers CASCADE CONSTRAINTS PURGE;

PROMPT Dropping VEHICLES ...
DROP TABLE vehicles CASCADE CONSTRAINTS PURGE;

PROMPT Dropping SYSTEM_USERS ...
DROP TABLE system_users CASCADE CONSTRAINTS PURGE;





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
