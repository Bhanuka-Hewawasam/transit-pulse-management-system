-- =============================================================================
-- SmartMove Transport Solutions
-- FILE: 01_create_tables.sql
-- PURPOSE: Create all application tables with inline constraints.
--          Oracle-compatible syntax only (VARCHAR2, NUMBER, DATE, TIMESTAMP).
--          Run this file FIRST after 06_drop_all.sql if rebuilding the schema.
-- EXECUTION ORDER: 01 → 02 → 03 → 04 → 05
-- AUTHOR: SmartMove DBA Team
-- CREATED: 2025-09-24
-- =============================================================================

PROMPT ============================================================
PROMPT  SmartMove -- Creating tables
PROMPT ============================================================

-- =============================================================================
-- TABLE: SYSTEM_USERS
-- Stores application login accounts (admins, operators, viewers).
-- =============================================================================
CREATE TABLE system_users (
    -- Surrogate primary key; populated via seq_users_id.NEXTVAL
    user_id         NUMBER          CONSTRAINT pk_users PRIMARY KEY,

    -- Login username must be unique and non-null
    username        VARCHAR2(50)    NOT NULL
                        CONSTRAINT uq_users_username UNIQUE,

    -- Bcrypt / SHA-256 hashed password; never store plain text
    password_hash   VARCHAR2(255)   NOT NULL,

    -- Human-readable display name
    full_name       VARCHAR2(100),

    -- Application role controls UI access levels
    role            VARCHAR2(20)    DEFAULT 'viewer'
                        CONSTRAINT ck_users_role
                        CHECK (role IN ('admin', 'operator', 'viewer')),

    -- Contact email; must be unique across all accounts
    email           VARCHAR2(100)
                        CONSTRAINT uq_users_email UNIQUE,

    -- Automatically populated when the row is inserted
    created_date    DATE            DEFAULT SYSDATE,

    -- Soft-delete flag: 1 = active, 0 = deactivated
    is_active       NUMBER(1)       DEFAULT 1
                        CONSTRAINT ck_users_active CHECK (is_active IN (0, 1))
);


-- =============================================================================
-- TABLE: VEHICLES
-- Fleet of buses, vans, and minibuses used for trips.
-- =============================================================================
CREATE TABLE vehicles (
    vehicle_id              NUMBER          CONSTRAINT pk_vehicles PRIMARY KEY,

    -- Official registration plate; must be unique per vehicle
    registration_number     VARCHAR2(20)    NOT NULL
                                CONSTRAINT uq_vehicles_reg UNIQUE,

    -- Vehicle manufacturer (e.g., Tata, Leyland, Toyota)
    make                    VARCHAR2(50)    NOT NULL,

    -- Model name (e.g., StarBus, Coaster)
    model                   VARCHAR2(50)    NOT NULL,

    -- 4-digit year of manufacture
    year_of_manufacture     NUMBER(4)       NOT NULL,

    -- Physical category of the vehicle
    vehicle_type            VARCHAR2(20)
                                CONSTRAINT ck_vehicles_type
                                CHECK (vehicle_type IN ('bus', 'van', 'minibus')),

    -- Maximum number of passenger seats
    seating_capacity        NUMBER(3)       NOT NULL
                                CONSTRAINT ck_vehicles_capacity CHECK (seating_capacity > 0),

    -- Fuel type for maintenance and cost tracking
    fuel_type               VARCHAR2(20)
                                CONSTRAINT ck_vehicles_fuel
                                CHECK (fuel_type IN ('diesel', 'petrol', 'electric')),

    -- Operational status of the vehicle
    status                  VARCHAR2(20)    DEFAULT 'active'
                                CONSTRAINT ck_vehicles_status
                                CHECK (status IN ('active', 'maintenance', 'inactive')),

    -- Date the vehicle last underwent maintenance
    last_maintenance_date   DATE,

    -- Scheduled date for next maintenance check
    next_maintenance_date   DATE,

    -- Row creation timestamp
    created_date            DATE            DEFAULT SYSDATE
);


-- =============================================================================
-- TABLE: DRIVERS
-- Registered drivers assigned to trips.
-- =============================================================================
CREATE TABLE drivers (
    driver_id           NUMBER          CONSTRAINT pk_drivers PRIMARY KEY,
    first_name          VARCHAR2(50)    NOT NULL,
    last_name           VARCHAR2(50)    NOT NULL,

    -- Government-issued driving licence number; must be unique
    license_number      VARCHAR2(30)    NOT NULL
                            CONSTRAINT uq_drivers_license UNIQUE,

    -- Licence validity date; alert if within 30 days
    license_expiry_date DATE            NOT NULL,

    -- Primary contact phone number
    phone               VARCHAR2(20),

    -- Driver email for notifications; unique across all drivers
    email               VARCHAR2(100)
                            CONSTRAINT uq_drivers_email UNIQUE,

    -- Current operational status of the driver
    status              VARCHAR2(20)    DEFAULT 'available'
                            CONSTRAINT ck_drivers_status
                            CHECK (status IN ('available', 'on_trip', 'off_duty', 'suspended')),

    -- Date driver joined the SmartMove fleet
    joined_date         DATE            DEFAULT SYSDATE,

    -- Running count of completed trips (updated via triggers or app logic)
    total_trips         NUMBER          DEFAULT 0,

    -- Passenger-rated score out of 5.00
    rating              NUMBER(3, 2)    DEFAULT 0.00
                            CONSTRAINT ck_drivers_rating CHECK (rating BETWEEN 0 AND 5)
);


-- =============================================================================
-- TABLE: ROUTES
-- Named transport corridors with fare and distance information.
-- =============================================================================
CREATE TABLE routes (
    route_id            NUMBER          CONSTRAINT pk_routes PRIMARY KEY,

    -- Short unique code used on timetables (e.g., R001, COL-KAN)
    route_code          VARCHAR2(10)    NOT NULL
                            CONSTRAINT uq_routes_code UNIQUE,

    -- Departure city / location name
    origin              VARCHAR2(100)   NOT NULL,

    -- Arrival city / location name
    destination         VARCHAR2(100)   NOT NULL,

    -- Total road distance in kilometres
    distance_km         NUMBER(6, 2)    NOT NULL,

    -- Expected journey duration in minutes
    estimated_minutes   NUMBER(5)       NOT NULL,

    -- Standard fare charged for this route in LKR
    fare_amount         NUMBER(8, 2)    NOT NULL
                            CONSTRAINT ck_routes_fare CHECK (fare_amount > 0),

    -- Flag to enable or disable route without deleting
    is_active           NUMBER(1)       DEFAULT 1
                            CONSTRAINT ck_routes_active CHECK (is_active IN (0, 1)),

    -- Row creation timestamp
    created_date        DATE            DEFAULT SYSDATE
);


-- =============================================================================
-- TABLE: ROUTE_STOPS
-- Ordered intermediate stops along each route.
-- =============================================================================
CREATE TABLE route_stops (
    stop_id     NUMBER          CONSTRAINT pk_stops PRIMARY KEY,

    -- FK to the parent route
    route_id    NUMBER          NOT NULL
                    CONSTRAINT fk_stops_route
                    REFERENCES routes (route_id) ON DELETE CASCADE,

    -- Human-readable stop location name
    stop_name   VARCHAR2(100)   NOT NULL,

    -- Sequence position of this stop on the route (1 = first stop)
    stop_order  NUMBER(3)       NOT NULL,

    -- A route cannot have two stops at the same position
    CONSTRAINT uq_stops_route_order UNIQUE (route_id, stop_order)
);


-- =============================================================================
-- TABLE: PASSENGERS
-- Registered travellers who can search and book trips.
-- =============================================================================
CREATE TABLE passengers (
    passenger_id        NUMBER          CONSTRAINT pk_passengers PRIMARY KEY,
    first_name          VARCHAR2(50)    NOT NULL,
    last_name           VARCHAR2(50)    NOT NULL,

    -- Unique email used for login and notifications
    email               VARCHAR2(100)   NOT NULL
                            CONSTRAINT uq_passengers_email UNIQUE,

    -- Mobile or home phone number
    phone               VARCHAR2(20),

    -- Residential or mailing address
    address             VARCHAR2(255),

    -- National Identity Card or Passport number; unique per person
    nic_or_passport     VARCHAR2(30)    NOT NULL
                            CONSTRAINT uq_passengers_nic UNIQUE,

    -- Timestamp of account creation
    registered_date     DATE            DEFAULT SYSDATE,

    -- Cumulative booking count; updated after each booking
    total_bookings      NUMBER          DEFAULT 0
);


-- =============================================================================
-- TABLE: TRIPS
-- A scheduled journey of a vehicle on a route driven by a driver.
-- =============================================================================
CREATE TABLE trips (
    trip_id             NUMBER          CONSTRAINT pk_trips PRIMARY KEY,

    -- Route this trip follows
    route_id            NUMBER          NOT NULL
                            CONSTRAINT fk_trips_route
                            REFERENCES routes (route_id),

    -- Vehicle allocated for this trip
    vehicle_id          NUMBER          NOT NULL
                            CONSTRAINT fk_trips_vehicle
                            REFERENCES vehicles (vehicle_id),

    -- Driver assigned to this trip
    driver_id           NUMBER          NOT NULL
                            CONSTRAINT fk_trips_driver
                            REFERENCES drivers (driver_id),

    -- Exact scheduled departure date and time
    departure_time      TIMESTAMP       NOT NULL,

    -- Estimated or actual arrival date and time
    arrival_time        TIMESTAMP       NOT NULL,

    -- Lifecycle status of the trip
    status              VARCHAR2(20)    DEFAULT 'scheduled'
                            CONSTRAINT ck_trips_status
                            CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

    -- Seats not yet booked (decremented on each confirmed booking)
    available_seats     NUMBER(3)       NOT NULL,

    -- Total physical seats on the vehicle for this trip
    total_seats         NUMBER(3)       NOT NULL,

    -- Row creation timestamp
    created_date        DATE            DEFAULT SYSDATE
);


-- =============================================================================
-- TABLE: BOOKINGS
-- A passenger's reservation of a specific seat on a trip.
-- =============================================================================
CREATE TABLE bookings (
    booking_id      NUMBER          CONSTRAINT pk_bookings PRIMARY KEY,

    -- The trip being booked
    trip_id         NUMBER          NOT NULL
                        CONSTRAINT fk_bookings_trip
                        REFERENCES trips (trip_id),

    -- The passenger making the booking
    passenger_id    NUMBER          NOT NULL
                        CONSTRAINT fk_bookings_passenger
                        REFERENCES passengers (passenger_id),

    -- Seat label as printed on the ticket (e.g., 12A, 05B)
    seat_number     VARCHAR2(5)     NOT NULL,

    -- Date the booking was made
    booking_date    DATE            DEFAULT SYSDATE,

    -- Current booking lifecycle status
    status          VARCHAR2(20)    DEFAULT 'confirmed'
                        CONSTRAINT ck_bookings_status
                        CHECK (status IN ('confirmed', 'cancelled', 'pending', 'completed')),

    -- Amount charged for this booking in LKR
    amount          NUMBER(8, 2)    NOT NULL,

    -- Prevent two passengers from occupying the same seat on the same trip
    CONSTRAINT uq_bookings_seat UNIQUE (trip_id, seat_number)
);


-- =============================================================================
-- TABLE: PAYMENTS
-- Financial transaction record linked to a booking.
-- =============================================================================
CREATE TABLE payments (
    payment_id      NUMBER          CONSTRAINT pk_payments PRIMARY KEY,

    -- The booking this payment settles
    booking_id      NUMBER          NOT NULL
                        CONSTRAINT fk_payments_booking
                        REFERENCES bookings (booking_id),

    -- Amount collected (may differ from booking amount for partial/refund flows)
    amount          NUMBER(8, 2)    NOT NULL,

    -- Date the payment was processed
    payment_date    DATE            DEFAULT SYSDATE,

    -- Channel through which payment was made
    payment_method  VARCHAR2(20)
                        CONSTRAINT ck_payments_method
                        CHECK (payment_method IN ('card', 'cash', 'online', 'bank_transfer')),

    -- Payment processing status
    status          VARCHAR2(20)    DEFAULT 'pending'
                        CONSTRAINT ck_payments_status
                        CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),

    -- Gateway or bank reference number; unique across all transactions
    transaction_ref VARCHAR2(50)
                        CONSTRAINT uq_payments_ref UNIQUE
);


-- =============================================================================
-- TABLE: MAINTENANCE_RECORDS
-- Scheduled and completed maintenance events for fleet vehicles.
-- =============================================================================
CREATE TABLE maintenance_records (
    maintenance_id      NUMBER          CONSTRAINT pk_maintenance PRIMARY KEY,

    -- Vehicle undergoing maintenance
    vehicle_id          NUMBER          NOT NULL
                            CONSTRAINT fk_maint_vehicle
                            REFERENCES vehicles (vehicle_id),

    -- Nature of the maintenance activity
    maintenance_type    VARCHAR2(20)
                            CONSTRAINT ck_maint_type
                            CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'emergency')),

    -- Detailed description of work to be performed or performed
    description         VARCHAR2(500)   NOT NULL,

    -- Planned date for the maintenance work
    scheduled_date      DATE            NOT NULL,

    -- Date the maintenance was actually finished (NULL if not yet complete)
    completed_date      DATE,

    -- Total cost of maintenance in LKR
    cost                NUMBER(10, 2)   DEFAULT 0,

    -- Workflow status of this maintenance record
    status              VARCHAR2(20)    DEFAULT 'scheduled'
                            CONSTRAINT ck_maint_status
                            CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),

    -- Name of the technician or garage responsible
    technician_name     VARCHAR2(100),

    -- Row creation timestamp
    created_date        DATE            DEFAULT SYSDATE
);


-- =============================================================================
-- TABLE: FEEDBACK
-- Post-trip ratings and comments submitted by passengers.
-- =============================================================================
CREATE TABLE feedback (
    feedback_id     NUMBER          CONSTRAINT pk_feedback PRIMARY KEY,

    -- Passenger who submitted this feedback
    passenger_id    NUMBER          NOT NULL
                        CONSTRAINT fk_feedback_passenger
                        REFERENCES passengers (passenger_id),

    -- Trip the feedback relates to
    trip_id         NUMBER          NOT NULL
                        CONSTRAINT fk_feedback_trip
                        REFERENCES trips (trip_id),

    -- Driver being rated
    driver_id       NUMBER          NOT NULL
                        CONSTRAINT fk_feedback_driver
                        REFERENCES drivers (driver_id),

    -- Vehicle being rated
    vehicle_id      NUMBER          NOT NULL
                        CONSTRAINT fk_feedback_vehicle
                        REFERENCES vehicles (vehicle_id),

    -- Star rating from 1 (poor) to 5 (excellent)
    rating          NUMBER(1)       NOT NULL
                        CONSTRAINT ck_feedback_rating CHECK (rating BETWEEN 1 AND 5),

    -- Optional free-text comment
    comment         VARCHAR2(1000),

    -- Date the feedback was submitted
    feedback_date   DATE            DEFAULT SYSDATE,

    -- Topic category of the feedback
    category        VARCHAR2(20)
                        CONSTRAINT ck_feedback_category
                        CHECK (category IN ('service', 'driver', 'vehicle', 'punctuality', 'general'))
);

PROMPT ============================================================
PROMPT  All SmartMove tables created successfully.
PROMPT  Next step: Run 02_constraints_indexes.sql
PROMPT ============================================================
