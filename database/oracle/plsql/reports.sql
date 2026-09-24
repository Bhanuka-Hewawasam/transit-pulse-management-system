-- SmartMove PL/SQL reports. Run after 01-05 scripts.
-- Report 1: most frequently used routes
SELECT r.route_code, r.origin, r.destination, COUNT(b.booking_id) booking_count
FROM routes r JOIN trips t ON t.route_id = r.route_id JOIN bookings b ON b.trip_id = t.trip_id
WHERE b.status <> 'cancelled' GROUP BY r.route_code, r.origin, r.destination ORDER BY booking_count DESC;
-- Report 2: paid revenue by month
SELECT TO_CHAR(p.payment_date, 'YYYY-MM') period, SUM(p.amount) total_revenue
FROM payments p WHERE p.status = 'paid' GROUP BY TO_CHAR(p.payment_date, 'YYYY-MM') ORDER BY period;
-- Report 3: passenger travel history (bind :passenger_id)
SELECT p.first_name || ' ' || p.last_name passenger, t.departure_time, r.route_code, b.status, b.amount
FROM passengers p JOIN bookings b ON b.passenger_id=p.passenger_id JOIN trips t ON t.trip_id=b.trip_id JOIN routes r ON r.route_id=t.route_id
WHERE p.passenger_id = :passenger_id ORDER BY t.departure_time DESC;
-- Report 4: vehicles due for maintenance
SELECT v.registration_number, v.next_maintenance_date, v.status FROM vehicles v
WHERE v.next_maintenance_date <= SYSDATE OR v.status = 'maintenance' ORDER BY v.next_maintenance_date;
-- Report 5: driver performance
SELECT d.driver_id, d.first_name || ' ' || d.last_name driver, d.total_trips, d.rating
FROM drivers d ORDER BY d.rating DESC, d.total_trips DESC;
