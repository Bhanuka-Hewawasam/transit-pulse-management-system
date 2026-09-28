-- Calculate passenger booking total.
CREATE OR REPLACE FUNCTION booking_total(passenger_id_input IN NUMBER) RETURN NUMBER IS booking_revenue_amount NUMBER;
BEGIN SELECT NVL(SUM(amount),0) INTO booking_revenue_amount FROM bookings WHERE passenger_id=passenger_id_input AND status <> 'cancelled'; RETURN booking_revenue_amount; END;
/
-- Return available seats.
CREATE OR REPLACE FUNCTION available_seat_count(trip_id_input IN NUMBER) RETURN NUMBER IS available_seat_total NUMBER;
BEGIN SELECT available_seats INTO available_seat_total FROM trips WHERE trip_id=trip_id_input; RETURN available_seat_total; END;
/
