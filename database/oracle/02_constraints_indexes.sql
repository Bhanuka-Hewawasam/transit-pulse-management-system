-- =============================================================================
-- SmartMove Transport Solutions
-- FILE: 02_constraints_indexes.sql
-- PURPOSE: Create performance indexes on high-frequency query columns.
--          Also adds COMMENT ON TABLE / COMMENT ON COLUMN metadata for
--          documentation and Oracle data dictionary queries.
-- RUN AFTER: 01_create_tables.sql
-- AUTHOR: SmartMove DBA Team
-- CREATED: 2025-09-24
-- =============================================================================

PROMPT ============================================================
PROMPT  SmartMove -- Creating indexes and table/column comments
PROMPT ============================================================

-- =============================================================================
-- SECTION 1: TRIPS indexes
-- Trips are the most frequently queried table -- filter by route, vehicle,
-- driver, status and departure window constantly.
-- =============================================================================

-- Supports route-based trip searches (e.g., "find trips on route R001")
CREATE INDEX idx_trips_route_id
    ON trips (route_id);

-- Supports vehicle schedule queries (e.g., "what trips is vehicle 5 on?")
CREATE INDEX idx_trips_vehicle_id
    ON trips (vehicle_id);

-- Supports driver roster queries (e.g., "what trips is driver 3 assigned to?")
CREATE INDEX idx_trips_driver_id
    ON trips (driver_id);

-- Supports status-based filtering (scheduled / in_progress / completed)
CREATE INDEX idx_trips_status
    ON trips (status);

-- Supports date-range searches for timetable display
CREATE INDEX idx_trips_departure_time
    ON trips (departure_time);


-- =============================================================================
-- SECTION 2: BOOKINGS indexes
-- Bookings are the second most-queried table; filter by trip, passenger,
-- status and booking date.
-- =============================================================================

-- Supports "show all bookings for trip X" queries
CREATE INDEX idx_bookings_trip_id
    ON bookings (trip_id);

-- Supports "show booking history for passenger Y" queries
CREATE INDEX idx_bookings_passenger_id
    ON bookings (passenger_id);

-- Supports filtering by booking lifecycle (confirmed / cancelled / pending)
CREATE INDEX idx_bookings_status
    ON bookings (status);

-- Supports date-range booking reports
CREATE INDEX idx_bookings_booking_date
    ON bookings (booking_date);


-- =============================================================================
-- SECTION 3: PAYMENTS indexes
-- =============================================================================

-- Supports payment lookup per booking (most common join)
CREATE INDEX idx_payments_booking_id
    ON payments (booking_id);

-- Supports revenue reports filtered by payment status
CREATE INDEX idx_payments_status
    ON payments (status);

-- Supports daily/monthly payment reconciliation queries
CREATE INDEX idx_payments_payment_date
    ON payments (payment_date);


-- =============================================================================
-- SECTION 4: MAINTENANCE_RECORDS indexes
-- =============================================================================

-- Supports "show all maintenance for vehicle Z" queries
CREATE INDEX idx_maintenance_vehicle_id
    ON maintenance_records (vehicle_id);

-- Supports overdue / in_progress maintenance alert queries
CREATE INDEX idx_maintenance_status
    ON maintenance_records (status);

-- Supports upcoming maintenance schedule reports
CREATE INDEX idx_maintenance_scheduled_date
    ON maintenance_records (scheduled_date);


-- =============================================================================
-- SECTION 5: FEEDBACK indexes
-- =============================================================================

-- Supports "show all feedback submitted by passenger" queries
CREATE INDEX idx_feedback_passenger_id
    ON feedback (passenger_id);

-- Supports driver performance rating aggregation
CREATE INDEX idx_feedback_driver_id
    ON feedback (driver_id);

-- Supports trip-level feedback summaries
CREATE INDEX idx_feedback_trip_id
    ON feedback (trip_id);


-- =============================================================================
-- SECTION 6: VEHICLES and DRIVERS status indexes
-- Used frequently by the dispatch dashboard to find available resources.
-- =============================================================================

-- Supports fleet availability dashboard (filter by active / maintenance)
CREATE INDEX idx_vehicles_status
    ON vehicles (status);

-- Supports driver dispatch panel (filter by available / on_trip / off_duty)
CREATE INDEX idx_drivers_status
    ON drivers (status);


-- =============================================================================
-- SECTION 7: ROUTE_STOPS index
-- =============================================================================

-- Supports stop lookup ordered by route and sequence position
CREATE INDEX idx_stops_route_order
    ON route_stops (route_id, stop_order);


-- =============================================================================
-- SECTION 8: Table-level comments (visible in Oracle data dictionary)
-- Query with: SELECT * FROM user_tab_comments;
-- =============================================================================

COMMENT ON TABLE system_users IS
    'Application user accounts with role-based access control for SmartMove portal.';

COMMENT ON TABLE vehicles IS
    'Fleet inventory of buses, vans and minibuses operated by SmartMove.';

COMMENT ON TABLE drivers IS
    'Licensed drivers employed by or contracted to SmartMove Transport Solutions.';

COMMENT ON TABLE routes IS
    'Named transport corridors defining origin, destination, fare and duration.';

COMMENT ON TABLE route_stops IS
    'Ordered intermediate stops along a route used for boarding and alighting.';

COMMENT ON TABLE passengers IS
    'Registered travellers who search, book and pay for trips via SmartMove.';

COMMENT ON TABLE trips IS
    'A single scheduled journey of a vehicle on a route driven by a driver.';

COMMENT ON TABLE bookings IS
    'Seat reservation made by a passenger for a specific trip.';

COMMENT ON TABLE payments IS
    'Financial transaction settling a booking; tracks method and status.';

COMMENT ON TABLE maintenance_records IS
    'Planned and completed maintenance events for fleet vehicles.';

COMMENT ON TABLE feedback IS
    'Post-trip ratings and comments submitted by passengers.';


-- =============================================================================
-- SECTION 9: Key column-level comments for the most important columns
-- Query with: SELECT * FROM user_col_comments WHERE table_name = 'TRIPS';
-- =============================================================================

-- SYSTEM_USERS
COMMENT ON COLUMN system_users.role IS
    'Access level: admin = full access, operator = operational, viewer = read-only.';
COMMENT ON COLUMN system_users.is_active IS
    'Soft-delete flag. 1 = account active, 0 = deactivated.';

-- VEHICLES
COMMENT ON COLUMN vehicles.status IS
    'active = in service, maintenance = under repair, inactive = decommissioned.';
COMMENT ON COLUMN vehicles.next_maintenance_date IS
    'Alert is raised in V_MAINTENANCE_ALERTS view when this date is reached.';

-- DRIVERS
COMMENT ON COLUMN drivers.rating IS
    'Weighted average of all feedback ratings received, scale 0.00-5.00.';
COMMENT ON COLUMN drivers.license_expiry_date IS
    'Application must alert operators 30 days before expiry.';

-- TRIPS
COMMENT ON COLUMN trips.available_seats IS
    'Decremented by 1 on each confirmed booking; must not go below 0.';

-- BOOKINGS
COMMENT ON COLUMN bookings.seat_number IS
    'Alphanumeric seat label as printed on the physical ticket (e.g. 12A).';

-- PAYMENTS
COMMENT ON COLUMN payments.transaction_ref IS
    'Unique reference returned by the payment gateway or bank.';

-- MAINTENANCE_RECORDS
COMMENT ON COLUMN maintenance_records.status IS
    'overdue = scheduled_date passed without completion; triggers alert view.';

-- FEEDBACK
COMMENT ON COLUMN feedback.rating IS
    'Star rating 1 (very poor) to 5 (excellent) as selected by the passenger.';

PROMPT ============================================================
PROMPT  All indexes and comments created successfully.
PROMPT  Next step: Run 03_sequences.sql
PROMPT ============================================================
