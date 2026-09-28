










PROMPT ============================================================
PROMPT  SmartMove -- Creating tables
PROMPT ============================================================





CREATE TABLE system_users (

    user_id         NUMBER          CONSTRAINT pk_users PRIMARY KEY,


    username        VARCHAR2(50)    NOT NULL
                        CONSTRAINT uq_users_username UNIQUE,


    password_hash   VARCHAR2(255)   NOT NULL,


    full_name       VARCHAR2(100),


    role            VARCHAR2(20)    DEFAULT 'viewer'
                        CONSTRAINT ck_users_role
                        CHECK (role IN ('admin', 'operator', 'viewer')),


    email           VARCHAR2(100)
                        CONSTRAINT uq_users_email UNIQUE,


    created_date    DATE            DEFAULT SYSDATE,


    is_active       NUMBER(1)       DEFAULT 1
                        CONSTRAINT ck_users_active CHECK (is_active IN (0, 1))
);






CREATE TABLE vehicles (
    vehicle_id              NUMBER          CONSTRAINT pk_vehicles PRIMARY KEY,


    registration_number     VARCHAR2(20)    NOT NULL
                                CONSTRAINT uq_vehicles_reg UNIQUE,


    make                    VARCHAR2(50)    NOT NULL,


    model                   VARCHAR2(50)    NOT NULL,


    year_of_manufacture     NUMBER(4)       NOT NULL,


    vehicle_type            VARCHAR2(20)
                                CONSTRAINT ck_vehicles_type
                                CHECK (vehicle_type IN ('bus', 'van', 'minibus')),


    seating_capacity        NUMBER(3)       NOT NULL
                                CONSTRAINT ck_vehicles_capacity CHECK (seating_capacity > 0),


    fuel_type               VARCHAR2(20)
                                CONSTRAINT ck_vehicles_fuel
                                CHECK (fuel_type IN ('diesel', 'petrol', 'electric')),


    status                  VARCHAR2(20)    DEFAULT 'active'
                                CONSTRAINT ck_vehicles_status
                                CHECK (status IN ('active', 'maintenance', 'inactive')),


    last_maintenance_date   DATE,


    next_maintenance_date   DATE,


    created_date            DATE            DEFAULT SYSDATE
);






CREATE TABLE drivers (
    driver_id           NUMBER          CONSTRAINT pk_drivers PRIMARY KEY,
    first_name          VARCHAR2(50)    NOT NULL,
    last_name           VARCHAR2(50)    NOT NULL,


    license_number      VARCHAR2(30)    NOT NULL
                            CONSTRAINT uq_drivers_license UNIQUE,


    license_expiry_date DATE            NOT NULL,


    phone               VARCHAR2(20),


    email               VARCHAR2(100)
                            CONSTRAINT uq_drivers_email UNIQUE,


    status              VARCHAR2(20)    DEFAULT 'available'
                            CONSTRAINT ck_drivers_status
                            CHECK (status IN ('available', 'on_trip', 'off_duty', 'suspended')),


    joined_date         DATE            DEFAULT SYSDATE,


    total_trips         NUMBER          DEFAULT 0,


    rating              NUMBER(3, 2)    DEFAULT 0.00
                            CONSTRAINT ck_drivers_rating CHECK (rating BETWEEN 0 AND 5)
);






CREATE TABLE routes (
    route_id            NUMBER          CONSTRAINT pk_routes PRIMARY KEY,


    route_code          VARCHAR2(10)    NOT NULL
                            CONSTRAINT uq_routes_code UNIQUE,


    origin              VARCHAR2(100)   NOT NULL,


    destination         VARCHAR2(100)   NOT NULL,


    distance_km         NUMBER(6, 2)    NOT NULL,


    estimated_minutes   NUMBER(5)       NOT NULL,


    fare_amount         NUMBER(8, 2)    NOT NULL
                            CONSTRAINT ck_routes_fare CHECK (fare_amount > 0),


    is_active           NUMBER(1)       DEFAULT 1
                            CONSTRAINT ck_routes_active CHECK (is_active IN (0, 1)),


    created_date        DATE            DEFAULT SYSDATE
);






CREATE TABLE route_stops (
    stop_id     NUMBER          CONSTRAINT pk_stops PRIMARY KEY,


    route_id    NUMBER          NOT NULL
                    CONSTRAINT fk_stops_route
                    REFERENCES routes (route_id) ON DELETE CASCADE,


    stop_name   VARCHAR2(100)   NOT NULL,


    stop_order  NUMBER(3)       NOT NULL,


    CONSTRAINT uq_stops_route_order UNIQUE (route_id, stop_order)
);






CREATE TABLE passengers (
    passenger_id        NUMBER          CONSTRAINT pk_passengers PRIMARY KEY,
    first_name          VARCHAR2(50)    NOT NULL,
    last_name           VARCHAR2(50)    NOT NULL,


    email               VARCHAR2(100)   NOT NULL
                            CONSTRAINT uq_passengers_email UNIQUE,


    phone               VARCHAR2(20),


    address             VARCHAR2(255),


    nic_or_passport     VARCHAR2(30)    NOT NULL
                            CONSTRAINT uq_passengers_nic UNIQUE,


    registered_date     DATE            DEFAULT SYSDATE,


    total_bookings      NUMBER          DEFAULT 0
);






CREATE TABLE trips (
    trip_id             NUMBER          CONSTRAINT pk_trips PRIMARY KEY,


    route_id            NUMBER          NOT NULL
                            CONSTRAINT fk_trips_route
                            REFERENCES routes (route_id),


    vehicle_id          NUMBER          NOT NULL
                            CONSTRAINT fk_trips_vehicle
                            REFERENCES vehicles (vehicle_id),


    driver_id           NUMBER          NOT NULL
                            CONSTRAINT fk_trips_driver
                            REFERENCES drivers (driver_id),


    departure_time      TIMESTAMP       NOT NULL,


    arrival_time        TIMESTAMP       NOT NULL,


    status              VARCHAR2(20)    DEFAULT 'scheduled'
                            CONSTRAINT ck_trips_status
                            CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),


    available_seats     NUMBER(3)       NOT NULL,


    total_seats         NUMBER(3)       NOT NULL,


    created_date        DATE            DEFAULT SYSDATE
);






CREATE TABLE bookings (
    booking_id      NUMBER          CONSTRAINT pk_bookings PRIMARY KEY,


    trip_id         NUMBER          NOT NULL
                        CONSTRAINT fk_bookings_trip
                        REFERENCES trips (trip_id),


    passenger_id    NUMBER          NOT NULL
                        CONSTRAINT fk_bookings_passenger
                        REFERENCES passengers (passenger_id),


    seat_number     VARCHAR2(5)     NOT NULL,


    booking_date    DATE            DEFAULT SYSDATE,


    status          VARCHAR2(20)    DEFAULT 'confirmed'
                        CONSTRAINT ck_bookings_status
                        CHECK (status IN ('confirmed', 'cancelled', 'pending', 'completed')),


    amount          NUMBER(8, 2)    NOT NULL,


    CONSTRAINT uq_bookings_seat UNIQUE (trip_id, seat_number)
);






CREATE TABLE payments (
    payment_id      NUMBER          CONSTRAINT pk_payments PRIMARY KEY,


    booking_id      NUMBER          NOT NULL
                        CONSTRAINT fk_payments_booking
                        REFERENCES bookings (booking_id),


    amount          NUMBER(8, 2)    NOT NULL,


    payment_date    DATE            DEFAULT SYSDATE,


    payment_method  VARCHAR2(20)
                        CONSTRAINT ck_payments_method
                        CHECK (payment_method IN ('card', 'cash', 'online', 'bank_transfer')),


    status          VARCHAR2(20)    DEFAULT 'pending'
                        CONSTRAINT ck_payments_status
                        CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),


    transaction_ref VARCHAR2(50)
                        CONSTRAINT uq_payments_ref UNIQUE
);






CREATE TABLE maintenance_records (
    maintenance_id      NUMBER          CONSTRAINT pk_maintenance PRIMARY KEY,


    vehicle_id          NUMBER          NOT NULL
                            CONSTRAINT fk_maint_vehicle
                            REFERENCES vehicles (vehicle_id),


    maintenance_type    VARCHAR2(20)
                            CONSTRAINT ck_maint_type
                            CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'emergency')),


    description         VARCHAR2(500)   NOT NULL,


    scheduled_date      DATE            NOT NULL,


    completed_date      DATE,


    cost                NUMBER(10, 2)   DEFAULT 0,


    status              VARCHAR2(20)    DEFAULT 'scheduled'
                            CONSTRAINT ck_maint_status
                            CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),


    technician_name     VARCHAR2(100),


    created_date        DATE            DEFAULT SYSDATE
);










CREATE TABLE feedback (
    feedback_id         NUMBER          CONSTRAINT pk_feedback PRIMARY KEY,


    passenger_id        NUMBER          NOT NULL
                            CONSTRAINT fk_feedback_passenger
                            REFERENCES passengers (passenger_id),


    trip_id             NUMBER          NOT NULL
                            CONSTRAINT fk_feedback_trip
                            REFERENCES trips (trip_id),


    driver_id           NUMBER          NOT NULL
                            CONSTRAINT fk_feedback_driver
                            REFERENCES drivers (driver_id),


    vehicle_id          NUMBER          NOT NULL
                            CONSTRAINT fk_feedback_vehicle
                            REFERENCES vehicles (vehicle_id),


    rating              NUMBER(1)       NOT NULL
                            CONSTRAINT ck_feedback_rating CHECK (rating BETWEEN 1 AND 5),


    feedback_comment    VARCHAR2(1000),


    feedback_date       DATE            DEFAULT SYSDATE,


    category            VARCHAR2(20)
                            CONSTRAINT ck_feedback_category
                            CHECK (category IN ('service', 'driver', 'vehicle', 'punctuality', 'general'))
);
PROMPT ============================================================
PROMPT  All SmartMove tables created successfully.
PROMPT  Next step: Run 02_constraints_indexes.sql
PROMPT ============================================================
