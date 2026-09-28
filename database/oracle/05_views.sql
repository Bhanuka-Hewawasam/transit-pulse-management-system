









PROMPT ============================================================
PROMPT  SmartMove -- Creating views
PROMPT ============================================================






CREATE OR REPLACE VIEW v_trip_details AS
SELECT

    t.trip_id,
    t.departure_time,
    t.arrival_time,
    t.status                            AS trip_status,
    t.available_seats,
    t.total_seats,
    (t.total_seats - t.available_seats) AS booked_seats,


    r.route_id,
    r.route_code,
    r.origin,
    r.destination,
    r.distance_km,
    r.estimated_minutes,
    r.fare_amount,


    v.vehicle_id,
    v.registration_number,
    v.make                              AS vehicle_make,
    v.model                             AS vehicle_model,
    v.vehicle_type,
    v.seating_capacity,
    v.status                            AS vehicle_status,


    d.driver_id,
    d.first_name || ' ' || d.last_name  AS driver_name,
    d.phone                             AS driver_phone,
    d.license_number,
    d.status                            AS driver_status,
    d.rating                            AS driver_rating,


    ROUND(
        ((t.total_seats - t.available_seats) / NULLIF(t.total_seats, 0)) * 100,
        2
    )                                   AS occupancy_pct,


    t.created_date

FROM trips       t
JOIN routes      r ON r.route_id   = t.route_id
JOIN vehicles    v ON v.vehicle_id = t.vehicle_id
JOIN drivers     d ON d.driver_id  = t.driver_id;

COMMENT ON TABLE v_trip_details IS
    'Pre-joined view combining trips with route, vehicle and driver information.';







CREATE OR REPLACE VIEW v_booking_details AS
SELECT

    b.booking_id,
    b.seat_number,
    b.booking_date,
    b.status                            AS booking_status,
    b.amount                            AS booking_amount,


    p.passenger_id,
    p.first_name || ' ' || p.last_name  AS passenger_name,
    p.email                             AS passenger_email,
    p.phone                             AS passenger_phone,
    p.nic_or_passport,


    t.trip_id,
    t.departure_time,
    t.arrival_time,
    t.status                            AS trip_status,


    r.route_id,
    r.route_code,
    r.origin,
    r.destination,
    r.fare_amount                       AS route_fare,


    d.first_name || ' ' || d.last_name  AS driver_name,


    v.registration_number               AS vehicle_reg,
    v.vehicle_type

FROM bookings    b
JOIN trips       t ON t.trip_id      = b.trip_id
JOIN passengers  p ON p.passenger_id = b.passenger_id
JOIN routes      r ON r.route_id     = t.route_id
JOIN drivers     d ON d.driver_id    = t.driver_id
JOIN vehicles    v ON v.vehicle_id   = t.vehicle_id;

COMMENT ON TABLE v_booking_details IS
    'Booking view including passenger, trip, route, vehicle and driver details for ticket generation.';







CREATE OR REPLACE VIEW v_payment_summary AS
SELECT

    py.payment_id,
    py.amount                           AS payment_amount,
    py.payment_date,
    py.payment_method,
    py.status                           AS payment_status,
    py.transaction_ref,


    b.booking_id,
    b.seat_number,
    b.booking_date,
    b.status                            AS booking_status,
    b.amount                            AS booking_amount,


    p.passenger_id,
    p.first_name || ' ' || p.last_name  AS passenger_name,
    p.email                             AS passenger_email,


    t.trip_id,
    t.departure_time,
    r.route_code,
    r.origin,
    r.destination,


    (b.amount - py.amount)              AS amount_discrepancy

FROM payments    py
JOIN bookings    b  ON b.booking_id   = py.booking_id
JOIN passengers  p  ON p.passenger_id = b.passenger_id
JOIN trips       t  ON t.trip_id      = b.trip_id
JOIN routes      r  ON r.route_id     = t.route_id;

COMMENT ON TABLE v_payment_summary IS
    'Financial summary view joining payments, bookings and passengers for revenue reporting.';









CREATE OR REPLACE VIEW v_maintenance_alerts AS
SELECT

    m.maintenance_id,
    m.maintenance_type,
    m.description,
    m.scheduled_date,
    m.completed_date,
    m.cost,
    m.status                            AS maintenance_status,
    m.technician_name,
    m.created_date,


    v.vehicle_id,
    v.registration_number,
    v.make                              AS vehicle_make,
    v.model                             AS vehicle_model,
    v.vehicle_type,
    v.status                            AS vehicle_status,


    TRUNC(SYSDATE) - TRUNC(m.scheduled_date) AS days_overdue,


    CASE
        WHEN m.status = 'overdue'                           THEN 'CRITICAL'
        WHEN TRUNC(SYSDATE) > TRUNC(m.scheduled_date)
             AND m.status != 'completed'                    THEN 'OVERDUE'
        WHEN m.status = 'in_progress'                       THEN 'IN PROGRESS'
        WHEN TRUNC(m.scheduled_date) = TRUNC(SYSDATE)      THEN 'DUE TODAY'
        ELSE                                                     'UPCOMING'
    END                                 AS urgency_label

FROM maintenance_records m
JOIN vehicles            v ON v.vehicle_id = m.vehicle_id
WHERE m.status IN ('overdue', 'in_progress', 'scheduled')
   OR (m.scheduled_date <= SYSDATE AND m.status != 'completed');

COMMENT ON TABLE v_maintenance_alerts IS
    'Alert view for overdue, in-progress or due-today maintenance records with urgency labelling.';







CREATE OR REPLACE VIEW v_feedback_summary AS
SELECT

    d.driver_id,
    d.first_name || ' ' || d.last_name  AS driver_name,
    d.license_number,
    d.status                            AS driver_status,


    v.vehicle_id,
    v.registration_number,
    v.make                              AS vehicle_make,
    v.model                             AS vehicle_model,


    COUNT(f.feedback_id)                AS total_feedback_count,
    ROUND(AVG(f.rating), 2)            AS avg_rating,
    MIN(f.rating)                       AS min_rating,
    MAX(f.rating)                       AS max_rating,


    SUM(CASE WHEN f.rating = 5 THEN 1 ELSE 0 END) AS five_star_count,
    SUM(CASE WHEN f.rating = 4 THEN 1 ELSE 0 END) AS four_star_count,
    SUM(CASE WHEN f.rating = 3 THEN 1 ELSE 0 END) AS three_star_count,
    SUM(CASE WHEN f.rating = 2 THEN 1 ELSE 0 END) AS two_star_count,
    SUM(CASE WHEN f.rating = 1 THEN 1 ELSE 0 END) AS one_star_count,


    MAX(f.feedback_date)                AS last_feedback_date

FROM feedback   f
JOIN drivers    d ON d.driver_id  = f.driver_id
JOIN vehicles   v ON v.vehicle_id = f.vehicle_id
GROUP BY
    d.driver_id,
    d.first_name,
    d.last_name,
    d.license_number,
    d.status,
    v.vehicle_id,
    v.registration_number,
    v.make,
    v.model;

COMMENT ON TABLE v_feedback_summary IS
    'Aggregated driver and vehicle performance ratings from passenger feedback with star histogram.';







CREATE OR REPLACE VIEW v_route_booking_count AS
SELECT

    r.route_id,
    r.route_code,
    r.origin,
    r.destination,
    r.distance_km,
    r.fare_amount,
    r.is_active,


    COUNT(b.booking_id)                 AS total_bookings,


    SUM(CASE WHEN b.status = 'confirmed'  THEN 1 ELSE 0 END) AS confirmed_bookings,
    SUM(CASE WHEN b.status = 'completed'  THEN 1 ELSE 0 END) AS completed_bookings,
    SUM(CASE WHEN b.status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled_bookings,
    SUM(CASE WHEN b.status = 'pending'    THEN 1 ELSE 0 END) AS pending_bookings,


    SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.amount ELSE 0 END)
                                        AS total_revenue_lkr,


    ROUND(
        AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.amount END),
        2
    )                                   AS avg_booking_amount,


    COUNT(DISTINCT t.trip_id)           AS total_trips

FROM routes     r
LEFT JOIN trips     t ON t.route_id   = r.route_id
LEFT JOIN bookings  b ON b.trip_id    = t.trip_id
GROUP BY
    r.route_id,
    r.route_code,
    r.origin,
    r.destination,
    r.distance_km,
    r.fare_amount,
    r.is_active
ORDER BY total_bookings DESC;

COMMENT ON TABLE v_route_booking_count IS
    'Route popularity and revenue analytics view with booking status breakdown and trip count.';


PROMPT ============================================================
PROMPT  All 6 views created successfully.
PROMPT  SmartMove database setup is now complete.
PROMPT ============================================================
