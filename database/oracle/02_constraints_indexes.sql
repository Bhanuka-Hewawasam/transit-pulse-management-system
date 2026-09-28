










PROMPT ============================================================
PROMPT  SmartMove -- Creating indexes and table/column comments
PROMPT ============================================================








CREATE INDEX idx_trips_route_id
    ON trips (route_id);


CREATE INDEX idx_trips_vehicle_id
    ON trips (vehicle_id);


CREATE INDEX idx_trips_driver_id
    ON trips (driver_id);


CREATE INDEX idx_trips_status
    ON trips (status);


CREATE INDEX idx_trips_departure_time
    ON trips (departure_time);









CREATE INDEX idx_bookings_trip_id
    ON bookings (trip_id);


CREATE INDEX idx_bookings_passenger_id
    ON bookings (passenger_id);


CREATE INDEX idx_bookings_status
    ON bookings (status);


CREATE INDEX idx_bookings_booking_date
    ON bookings (booking_date);







CREATE INDEX idx_payments_booking_id
    ON payments (booking_id);


CREATE INDEX idx_payments_status
    ON payments (status);


CREATE INDEX idx_payments_payment_date
    ON payments (payment_date);







CREATE INDEX idx_maintenance_vehicle_id
    ON maintenance_records (vehicle_id);


CREATE INDEX idx_maintenance_status
    ON maintenance_records (status);


CREATE INDEX idx_maintenance_scheduled_date
    ON maintenance_records (scheduled_date);







CREATE INDEX idx_feedback_passenger_id
    ON feedback (passenger_id);


CREATE INDEX idx_feedback_driver_id
    ON feedback (driver_id);


CREATE INDEX idx_feedback_trip_id
    ON feedback (trip_id);








CREATE INDEX idx_vehicles_status
    ON vehicles (status);


CREATE INDEX idx_drivers_status
    ON drivers (status);







CREATE INDEX idx_stops_route_order
    ON route_stops (route_id, stop_order);







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








COMMENT ON COLUMN system_users.role IS
    'Access level: admin = full access, operator = operational, viewer = read-only.';
COMMENT ON COLUMN system_users.is_active IS
    'Soft-delete flag. 1 = account active, 0 = deactivated.';


COMMENT ON COLUMN vehicles.status IS
    'active = in service, maintenance = under repair, inactive = decommissioned.';
COMMENT ON COLUMN vehicles.next_maintenance_date IS
    'Alert is raised in V_MAINTENANCE_ALERTS view when this date is reached.';


COMMENT ON COLUMN drivers.rating IS
    'Weighted average of all feedback ratings received, scale 0.00-5.00.';
COMMENT ON COLUMN drivers.license_expiry_date IS
    'Application must alert operators 30 days before expiry.';


COMMENT ON COLUMN trips.available_seats IS
    'Decremented by 1 on each confirmed booking; must not go below 0.';


COMMENT ON COLUMN bookings.seat_number IS
    'Alphanumeric seat label as printed on the physical ticket (e.g. 12A).';


COMMENT ON COLUMN payments.transaction_ref IS
    'Unique reference returned by the payment gateway or bank.';


COMMENT ON COLUMN maintenance_records.status IS
    'overdue = scheduled_date passed without completion; triggers alert view.';


COMMENT ON COLUMN feedback.rating IS
    'Star rating 1 (very poor) to 5 (excellent) as selected by the passenger.';

PROMPT ============================================================
PROMPT  All indexes and comments created successfully.
PROMPT  Next step: Run 03_sequences.sql
PROMPT ============================================================
