-- Coursework function examples.
CREATE OR REPLACE FUNCTION booking_total(p_passenger_id IN NUMBER) RETURN NUMBER IS l_total NUMBER;
BEGIN SELECT NVL(SUM(amount),0) INTO l_total FROM bookings WHERE passenger_id=p_passenger_id AND status <> 'cancelled'; RETURN l_total; END;
/
CREATE OR REPLACE FUNCTION available_seat_count(p_trip_id IN NUMBER) RETURN NUMBER IS l_seats NUMBER;
BEGIN SELECT available_seats INTO l_seats FROM trips WHERE trip_id=p_trip_id; RETURN l_seats; END;
/
