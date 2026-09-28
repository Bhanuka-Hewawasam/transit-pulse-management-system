PROMPT ============================================================
PROMPT  SmartMove -- Passenger booking and profile logic
PROMPT  Run as the same schema used by the application.
PROMPT  Existing trg_booking_count is used when enabled; count fallback is guarded.
PROMPT ============================================================
SET SERVEROUTPUT ON;

-- Return the fare attached to a trip's route.
CREATE OR REPLACE FUNCTION passenger_trip_fare(
  p_trip_id IN NUMBER
) RETURN NUMBER IS
  v_fare routes.fare_amount%TYPE;
BEGIN
  IF p_trip_id IS NULL OR p_trip_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20101, 'tripId must be a positive number');
  END IF;
  SELECT r.fare_amount INTO v_fare
  FROM trips t JOIN routes r ON r.route_id = t.route_id
  WHERE t.trip_id = p_trip_id;
  RETURN v_fare;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20102, 'Trip was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20103, 'Invalid trip fare value');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Reserve one numeric seat. The trip row lock serializes seat allocation.
CREATE OR REPLACE PROCEDURE passenger_book_seat(
  p_passenger_id IN NUMBER,
  p_trip_id IN NUMBER,
  p_seat_number IN VARCHAR2,
  p_booking_id OUT NUMBER
) IS
  v_trip_status trips.status%TYPE;
  v_departure_time trips.departure_time%TYPE;
  v_total_seats trips.total_seats%TYPE;
  v_available_seats trips.available_seats%TYPE;
  v_seat_number NUMBER;
  v_count NUMBER;
  v_amount bookings.amount%TYPE;
BEGIN
  IF p_passenger_id IS NULL OR p_passenger_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20110, 'passengerId must be a positive number');
  END IF;
  IF p_trip_id IS NULL OR p_trip_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20111, 'tripId must be a positive number');
  END IF;
  IF p_seat_number IS NULL OR NOT REGEXP_LIKE(TRIM(p_seat_number), '^[0-9]+$') THEN
    RAISE_APPLICATION_ERROR(-20112, 'Seat number must be a whole number');
  END IF;
  v_seat_number := TO_NUMBER(TRIM(p_seat_number));

  SELECT status, departure_time, total_seats, available_seats
    INTO v_trip_status, v_departure_time, v_total_seats, v_available_seats
    FROM trips
   WHERE trip_id = p_trip_id
     FOR UPDATE;

  IF v_trip_status <> 'scheduled' THEN
    RAISE_APPLICATION_ERROR(-20113, 'Only scheduled trips can be booked');
  END IF;
  IF v_departure_time <= SYSTIMESTAMP THEN
    RAISE_APPLICATION_ERROR(-20114, 'Trip has already departed or is not in the future');
  END IF;
  IF v_seat_number < 1 OR v_seat_number > v_total_seats THEN
    RAISE_APPLICATION_ERROR(-20115, 'Seat number must be between 1 and trip capacity');
  END IF;
  SELECT COUNT(*) INTO v_count FROM bookings
   WHERE trip_id = p_trip_id
     AND REGEXP_LIKE(seat_number, '[0-9]+')
     AND TO_NUMBER(REGEXP_SUBSTR(seat_number, '[0-9]+')) = v_seat_number
     AND status IN ('pending', 'confirmed');
  IF v_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20116, 'That seat is already booked on this trip');
  END IF;
  IF v_available_seats <= 0 THEN
    RAISE_APPLICATION_ERROR(-20117, 'Trip is full');
  END IF;
  SELECT COUNT(*) INTO v_count FROM bookings
   WHERE trip_id = p_trip_id AND passenger_id = p_passenger_id
     AND status IN ('pending', 'confirmed');
  IF v_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20118, 'Passenger already has an active booking on this trip');
  END IF;
  SELECT COUNT(*) INTO v_count FROM passengers WHERE passenger_id = p_passenger_id;
  IF v_count = 0 THEN
    RAISE_APPLICATION_ERROR(-20119, 'Passenger was not found');
  END IF;

  v_amount := passenger_trip_fare(p_trip_id);
  p_booking_id := seq_bookings_id.NEXTVAL;
  INSERT INTO bookings (booking_id, trip_id, passenger_id, seat_number, booking_date, status, amount)
  VALUES (p_booking_id, p_trip_id, p_passenger_id, TO_CHAR(v_seat_number), SYSDATE, 'pending', v_amount);
  UPDATE trips SET available_seats = available_seats - 1 WHERE trip_id = p_trip_id;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20120, 'Trip was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20121, 'Invalid booking value');
  WHEN DUP_VAL_ON_INDEX THEN
    RAISE_APPLICATION_ERROR(-20116, 'That seat is already booked on this trip');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Settle a passenger-owned pending booking and confirm it in this transaction.
CREATE OR REPLACE PROCEDURE passenger_pay_booking(
  p_passenger_id IN NUMBER,
  p_booking_id IN NUMBER,
  p_amount IN NUMBER,
  p_method IN VARCHAR2
) IS
  v_booking_passenger_id bookings.passenger_id%TYPE;
  v_booking_status bookings.status%TYPE;
  v_booking_amount bookings.amount%TYPE;
  v_payment_count NUMBER;
  v_trigger_count NUMBER;
  v_method payments.payment_method%TYPE;
BEGIN
  IF p_passenger_id IS NULL OR p_passenger_id <= 0 OR p_booking_id IS NULL OR p_booking_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20130, 'passengerId and bookingId must be positive numbers');
  END IF;
  SELECT passenger_id, status, amount
    INTO v_booking_passenger_id, v_booking_status, v_booking_amount
    FROM bookings WHERE booking_id = p_booking_id FOR UPDATE;
  IF v_booking_passenger_id <> p_passenger_id THEN
    RAISE_APPLICATION_ERROR(-20131, 'Booking does not belong to this passenger');
  END IF;
  SELECT COUNT(*) INTO v_payment_count FROM payments
   WHERE booking_id = p_booking_id AND status = 'paid';
  IF v_payment_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20133, 'Booking has already been paid');
  END IF;
  IF v_booking_status <> 'pending' THEN
    RAISE_APPLICATION_ERROR(-20132, 'Only pending bookings can be paid');
  END IF;
  IF p_amount IS NULL OR p_amount <> v_booking_amount THEN
    RAISE_APPLICATION_ERROR(-20134, 'Payment amount must equal the booking amount');
  END IF;
  v_method := LOWER(TRIM(p_method));
  IF v_method IS NULL OR v_method NOT IN ('card', 'cash', 'online', 'bank_transfer') THEN
    RAISE_APPLICATION_ERROR(-20135, 'Payment method must be card, cash, online, or bank_transfer');
  END IF;

  INSERT INTO payments (payment_id, booking_id, amount, payment_date, payment_method, status, transaction_ref)
  VALUES (seq_payments_id.NEXTVAL, p_booking_id, p_amount, SYSDATE, v_method, 'paid',
          'SM-' || RAWTOHEX(SYS_GUID()));
  UPDATE bookings SET status = 'confirmed' WHERE booking_id = p_booking_id;
  IF SQL%ROWCOUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20139, 'Booking was not found while confirming payment');
  END IF;
  SELECT COUNT(*) INTO v_trigger_count FROM user_triggers
   WHERE trigger_name = 'TRG_BOOKING_COUNT' AND status = 'ENABLED';
  IF v_trigger_count = 0 THEN
    UPDATE passengers SET total_bookings = total_bookings + 1 WHERE passenger_id = p_passenger_id;
  END IF;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20136, 'Booking was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20137, 'Invalid payment value');
  WHEN DUP_VAL_ON_INDEX THEN
    RAISE_APPLICATION_ERROR(-20138, 'A payment already exists for this booking');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Cancellation cutoff: the passenger must cancel at least two hours before departure.
CREATE OR REPLACE PROCEDURE passenger_cancel_booking(
  p_passenger_id IN NUMBER,
  p_booking_id IN NUMBER
) IS
  v_booking_passenger_id bookings.passenger_id%TYPE;
  v_booking_status bookings.status%TYPE;
  v_trip_id bookings.trip_id%TYPE;
  v_departure_time trips.departure_time%TYPE;
  v_trigger_count NUMBER;
BEGIN
  IF p_passenger_id IS NULL OR p_passenger_id <= 0 OR p_booking_id IS NULL OR p_booking_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20150, 'passengerId and bookingId must be positive numbers');
  END IF;
  SELECT passenger_id, status, trip_id
    INTO v_booking_passenger_id, v_booking_status, v_trip_id
    FROM bookings WHERE booking_id = p_booking_id FOR UPDATE;
  IF v_booking_passenger_id <> p_passenger_id THEN
    RAISE_APPLICATION_ERROR(-20151, 'Booking does not belong to this passenger');
  END IF;
  IF v_booking_status NOT IN ('pending', 'confirmed') THEN
    RAISE_APPLICATION_ERROR(-20152, 'Only pending or confirmed bookings can be cancelled');
  END IF;
  SELECT departure_time INTO v_departure_time FROM trips WHERE trip_id = v_trip_id FOR UPDATE;
  IF v_departure_time <= SYSTIMESTAMP + INTERVAL '2' HOUR THEN
    RAISE_APPLICATION_ERROR(-20153, 'Bookings cannot be cancelled within two hours of departure');
  END IF;

  SELECT COUNT(*) INTO v_trigger_count FROM user_triggers
   WHERE trigger_name = 'TRG_BOOKING_COUNT' AND status = 'ENABLED';
  UPDATE bookings SET status = 'cancelled' WHERE booking_id = p_booking_id;
  IF v_trigger_count = 0 AND v_booking_status = 'confirmed' THEN
    UPDATE passengers SET total_bookings = GREATEST(total_bookings - 1, 0) WHERE passenger_id = p_passenger_id;
  END IF;
  UPDATE trips SET available_seats = LEAST(total_seats, available_seats + 1) WHERE trip_id = v_trip_id;
  UPDATE payments SET status = 'refunded' WHERE booking_id = p_booking_id AND status = 'paid';
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20154, 'Booking or trip was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20155, 'Invalid cancellation value');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Submit one rating for a completed trip with a non-cancelled passenger booking.
CREATE OR REPLACE PROCEDURE passenger_submit_feedback(
  p_passenger_id IN NUMBER,
  p_trip_id IN NUMBER,
  p_rating IN NUMBER,
  p_comment IN VARCHAR2,
  p_category IN VARCHAR2 DEFAULT 'general'
) IS
  v_trip_status trips.status%TYPE;
  v_driver_id trips.driver_id%TYPE;
  v_vehicle_id trips.vehicle_id%TYPE;
  v_count NUMBER;
  v_category feedback.category%TYPE;
BEGIN
  IF p_passenger_id IS NULL OR p_passenger_id <= 0 OR p_trip_id IS NULL OR p_trip_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20160, 'passengerId and tripId must be positive numbers');
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR p_rating <> TRUNC(p_rating) THEN
    RAISE_APPLICATION_ERROR(-20161, 'Rating must be a whole number from 1 to 5');
  END IF;
  v_category := LOWER(TRIM(NVL(p_category, 'general')));
  IF v_category NOT IN ('service', 'driver', 'vehicle', 'punctuality', 'general') THEN
    RAISE_APPLICATION_ERROR(-20162, 'Feedback category is not valid');
  END IF;
  SELECT status, driver_id, vehicle_id
    INTO v_trip_status, v_driver_id, v_vehicle_id
    FROM trips WHERE trip_id = p_trip_id FOR UPDATE;
  IF v_trip_status <> 'completed' THEN
    RAISE_APPLICATION_ERROR(-20163, 'Feedback is allowed only for completed trips');
  END IF;
  SELECT COUNT(*) INTO v_count FROM bookings
   WHERE passenger_id = p_passenger_id AND trip_id = p_trip_id AND status <> 'cancelled';
  IF v_count = 0 THEN
    RAISE_APPLICATION_ERROR(-20164, 'Passenger must have a non-cancelled booking for this trip');
  END IF;
  SELECT COUNT(*) INTO v_count FROM feedback
   WHERE passenger_id = p_passenger_id AND trip_id = p_trip_id;
  IF v_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20165, 'Passenger has already submitted feedback for this trip');
  END IF;

  INSERT INTO feedback (feedback_id, passenger_id, trip_id, driver_id, vehicle_id, rating, feedback_comment, feedback_date, category)
  VALUES (seq_feedback_id.NEXTVAL, p_passenger_id, p_trip_id, v_driver_id, v_vehicle_id, p_rating,
          SUBSTR(p_comment, 1, 1000), SYSDATE, v_category);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20166, 'Trip was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20167, 'Invalid feedback value');
  WHEN DUP_VAL_ON_INDEX THEN
    RAISE_APPLICATION_ERROR(-20168, 'Feedback already exists for this passenger and trip');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Email and NIC/passport are deliberately unchanged because they are not editable profile fields.
CREATE OR REPLACE PROCEDURE passenger_update_profile(
  p_passenger_id IN NUMBER,
  p_first_name IN VARCHAR2,
  p_last_name IN VARCHAR2,
  p_phone IN VARCHAR2,
  p_address IN VARCHAR2
) IS
BEGIN
  IF p_passenger_id IS NULL OR p_passenger_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20170, 'passengerId must be a positive number');
  END IF;
  IF TRIM(p_first_name) IS NULL OR TRIM(p_last_name) IS NULL THEN
    RAISE_APPLICATION_ERROR(-20171, 'First name and last name are required');
  END IF;
  UPDATE passengers
     SET first_name = TRIM(p_first_name), last_name = TRIM(p_last_name),
         phone = TRIM(p_phone), address = TRIM(p_address)
   WHERE passenger_id = p_passenger_id;
  IF SQL%ROWCOUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20172, 'Passenger was not found');
  END IF;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    RAISE_APPLICATION_ERROR(-20173, 'Email or NIC/passport already belongs to another passenger');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20174, 'Profile value is too long or invalid');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Test fare lookup, booking failures, and seat allocation. All fixture changes roll back.
DECLARE
  v_trip_id trips.trip_id%TYPE;
  v_passenger_id passengers.passenger_id%TYPE;
  v_other_passenger_id passengers.passenger_id%TYPE;
  v_total_seats trips.total_seats%TYPE;
  v_seat NUMBER;
  v_other_seat NUMBER;
  v_count NUMBER;
  v_booking_id NUMBER;
  v_fare NUMBER;
BEGIN
  SAVEPOINT passenger_book_tests;
  SELECT trip_id, total_seats INTO v_trip_id, v_total_seats FROM trips WHERE ROWNUM = 1;
  SELECT MIN(passenger_id), MAX(passenger_id) INTO v_passenger_id, v_other_passenger_id FROM passengers;
  UPDATE trips SET status = 'scheduled', departure_time = SYSTIMESTAMP + INTERVAL '1' DAY,
                   available_seats = total_seats WHERE trip_id = v_trip_id;
  SELECT MIN(seat_no) INTO v_seat FROM (
    SELECT LEVEL AS seat_no FROM dual CONNECT BY LEVEL <= v_total_seats
  ) s WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.trip_id = v_trip_id AND b.status IN ('pending', 'confirmed')
      AND REGEXP_LIKE(b.seat_number, '[0-9]+')
      AND TO_NUMBER(REGEXP_SUBSTR(b.seat_number, '[0-9]+')) = s.seat_no
  );
  IF v_seat IS NULL THEN RAISE_APPLICATION_ERROR(-20980, 'Test trip has no unused seat'); END IF;
  v_fare := passenger_trip_fare(v_trip_id);
  passenger_book_seat(v_passenger_id, v_trip_id, TO_CHAR(v_seat), v_booking_id);
  DBMS_OUTPUT.PUT_LINE('book_seat happy path and route fare passed');

  BEGIN
    passenger_book_seat(v_passenger_id, v_trip_id, TO_CHAR(v_seat + 1), v_booking_id);
    RAISE_APPLICATION_ERROR(-20981, 'Expected duplicate passenger booking to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20118 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('double booking rejected');

  BEGIN
    passenger_book_seat(v_other_passenger_id, v_trip_id, TO_CHAR(v_seat), v_booking_id);
    RAISE_APPLICATION_ERROR(-20982, 'Expected taken seat to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20116 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('taken seat rejected');

  BEGIN
    passenger_book_seat(v_other_passenger_id, v_trip_id, TO_CHAR(v_total_seats + 1), v_booking_id);
    RAISE_APPLICATION_ERROR(-20983, 'Expected out-of-range seat to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20115 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('out-of-range seat rejected');

  UPDATE trips SET available_seats = 0 WHERE trip_id = v_trip_id;
  SELECT MIN(seat_no) INTO v_other_seat FROM (
    SELECT LEVEL AS seat_no FROM dual CONNECT BY LEVEL <= v_total_seats
  ) s WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.trip_id = v_trip_id AND b.status IN ('pending', 'confirmed')
      AND REGEXP_LIKE(b.seat_number, '[0-9]+')
      AND TO_NUMBER(REGEXP_SUBSTR(b.seat_number, '[0-9]+')) = s.seat_no
  );
  BEGIN
    passenger_book_seat(v_other_passenger_id, v_trip_id, TO_CHAR(v_other_seat), v_booking_id);
    RAISE_APPLICATION_ERROR(-20984, 'Expected full trip to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20117 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('full trip rejected');
  ROLLBACK TO passenger_book_tests;
EXCEPTION WHEN NO_DATA_FOUND THEN ROLLBACK TO passenger_book_tests; DBMS_OUTPUT.PUT_LINE('Booking tests NOT RUN: fixture data missing');
END;
/

-- Test payment ownership, amount matching, successful payment, and duplicate payment.
DECLARE
  v_trip_id trips.trip_id%TYPE;
  v_passenger_id passengers.passenger_id%TYPE;
  v_other_passenger_id passengers.passenger_id%TYPE;
  v_total_seats trips.total_seats%TYPE;
  v_seat NUMBER;
  v_booking_id NUMBER;
  v_fare NUMBER;
  v_booking_count_before NUMBER;
  v_booking_count_after NUMBER;
BEGIN
  SAVEPOINT passenger_pay_tests;
  SELECT trip_id, total_seats INTO v_trip_id, v_total_seats FROM trips WHERE ROWNUM = 1;
  SELECT MIN(passenger_id), MAX(passenger_id) INTO v_passenger_id, v_other_passenger_id FROM passengers;
  UPDATE trips SET status = 'scheduled', departure_time = SYSTIMESTAMP + INTERVAL '1' DAY,
                   available_seats = total_seats WHERE trip_id = v_trip_id;
  SELECT MIN(seat_no) INTO v_seat FROM (
    SELECT LEVEL AS seat_no FROM dual CONNECT BY LEVEL <= v_total_seats
  ) s WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.trip_id = v_trip_id AND b.status IN ('pending', 'confirmed')
      AND REGEXP_LIKE(b.seat_number, '[0-9]+')
      AND TO_NUMBER(REGEXP_SUBSTR(b.seat_number, '[0-9]+')) = s.seat_no
  );
  SELECT total_bookings INTO v_booking_count_before FROM passengers WHERE passenger_id = v_passenger_id;
  passenger_book_seat(v_passenger_id, v_trip_id, TO_CHAR(v_seat), v_booking_id);
  SELECT total_bookings INTO v_booking_count_after FROM passengers WHERE passenger_id = v_passenger_id;
  IF v_booking_count_after <> v_booking_count_before THEN
    RAISE_APPLICATION_ERROR(-20995, 'Pending booking must not increment total_bookings');
  END IF;
  v_fare := passenger_trip_fare(v_trip_id);

  BEGIN
    passenger_pay_booking(v_other_passenger_id, v_booking_id, v_fare, 'cash');
    RAISE_APPLICATION_ERROR(-20985, 'Expected another passenger payment to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20131 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('someone else''s booking payment rejected');

  BEGIN
    passenger_pay_booking(v_passenger_id, v_booking_id, v_fare + 1, 'cash');
    RAISE_APPLICATION_ERROR(-20986, 'Expected wrong amount to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20134 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('wrong payment amount rejected');

  passenger_pay_booking(v_passenger_id, v_booking_id, v_fare, 'cash');
  SELECT total_bookings INTO v_booking_count_after FROM passengers WHERE passenger_id = v_passenger_id;
  IF v_booking_count_after <> v_booking_count_before + 1 THEN
    RAISE_APPLICATION_ERROR(-20996, 'Pending-to-confirmed must increment total_bookings exactly once');
  END IF;
  DBMS_OUTPUT.PUT_LINE('payment happy path passed');
  BEGIN
    passenger_pay_booking(v_passenger_id, v_booking_id, v_fare, 'cash');
    RAISE_APPLICATION_ERROR(-20987, 'Expected duplicate payment to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20132 AND SQLCODE != -20133 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('paying twice rejected');
  ROLLBACK TO passenger_pay_tests;
EXCEPTION WHEN NO_DATA_FOUND THEN ROLLBACK TO passenger_pay_tests; DBMS_OUTPUT.PUT_LINE('Payment tests NOT RUN: fixture data missing');
END;
/

-- Test cancellation ownership, two-hour cutoff, refund, and seat-count restoration.
DECLARE
  v_trip_id trips.trip_id%TYPE;
  v_passenger_id passengers.passenger_id%TYPE;
  v_other_passenger_id passengers.passenger_id%TYPE;
  v_total_seats trips.total_seats%TYPE;
  v_available_before trips.available_seats%TYPE;
  v_seat NUMBER;
  v_booking_id NUMBER;
  v_fare NUMBER;
  v_booking_status bookings.status%TYPE;
  v_payment_status payments.status%TYPE;
  v_available_after trips.available_seats%TYPE;
  v_booking_count_before NUMBER;
  v_booking_count_after NUMBER;
BEGIN
  SAVEPOINT passenger_cancel_tests;
  SELECT trip_id, total_seats INTO v_trip_id, v_total_seats FROM trips WHERE ROWNUM = 1;
  SELECT MIN(passenger_id), MAX(passenger_id) INTO v_passenger_id, v_other_passenger_id FROM passengers;
  UPDATE trips SET status = 'scheduled', departure_time = SYSTIMESTAMP + INTERVAL '1' DAY,
                   available_seats = total_seats WHERE trip_id = v_trip_id;
  SELECT available_seats INTO v_available_before FROM trips WHERE trip_id = v_trip_id;
  SELECT MIN(seat_no) INTO v_seat FROM (
    SELECT LEVEL AS seat_no FROM dual CONNECT BY LEVEL <= v_total_seats
  ) s WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.trip_id = v_trip_id AND b.status IN ('pending', 'confirmed')
      AND REGEXP_LIKE(b.seat_number, '[0-9]+')
      AND TO_NUMBER(REGEXP_SUBSTR(b.seat_number, '[0-9]+')) = s.seat_no
  );
  SELECT total_bookings INTO v_booking_count_before FROM passengers WHERE passenger_id = v_passenger_id;
  passenger_book_seat(v_passenger_id, v_trip_id, TO_CHAR(v_seat), v_booking_id);
  v_fare := passenger_trip_fare(v_trip_id);
  passenger_pay_booking(v_passenger_id, v_booking_id, v_fare, 'cash');

  BEGIN
    passenger_cancel_booking(v_other_passenger_id, v_booking_id);
    RAISE_APPLICATION_ERROR(-20988, 'Expected someone else''s cancellation to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20151 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('someone else''s booking cancellation rejected');

  UPDATE trips SET departure_time = SYSTIMESTAMP + INTERVAL '1' HOUR WHERE trip_id = v_trip_id;
  BEGIN
    passenger_cancel_booking(v_passenger_id, v_booking_id);
    RAISE_APPLICATION_ERROR(-20989, 'Expected late cancellation to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20153 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('cancellation within two hours rejected');

  UPDATE trips SET departure_time = SYSTIMESTAMP + INTERVAL '3' HOUR WHERE trip_id = v_trip_id;
  passenger_cancel_booking(v_passenger_id, v_booking_id);
  SELECT status INTO v_booking_status FROM bookings WHERE booking_id = v_booking_id;
  SELECT status INTO v_payment_status FROM payments WHERE booking_id = v_booking_id;
  SELECT available_seats INTO v_available_after FROM trips WHERE trip_id = v_trip_id;
  IF v_booking_status <> 'cancelled' OR v_payment_status <> 'refunded' OR v_available_after <> v_available_before THEN
    RAISE_APPLICATION_ERROR(-20990, 'Cancellation did not update booking, refund, and seat count correctly');
  END IF;
  SELECT total_bookings INTO v_booking_count_after FROM passengers WHERE passenger_id = v_passenger_id;
  IF v_booking_count_after <> v_booking_count_before THEN
    RAISE_APPLICATION_ERROR(-20997, 'Confirmed-to-cancelled must decrement total_bookings exactly once');
  END IF;
  DBMS_OUTPUT.PUT_LINE('cancellation refund and seat count passed');
  ROLLBACK TO passenger_cancel_tests;
EXCEPTION WHEN NO_DATA_FOUND THEN ROLLBACK TO passenger_cancel_tests; DBMS_OUTPUT.PUT_LINE('Cancellation tests NOT RUN: fixture data missing');
END;
/

-- Test rejection for incomplete trips and duplicate feedback on completed trips.
DECLARE
  v_trip_id trips.trip_id%TYPE;
  v_passenger_id passengers.passenger_id%TYPE;
  v_total_seats trips.total_seats%TYPE;
  v_seat NUMBER;
  v_booking_id NUMBER;
BEGIN
  SAVEPOINT passenger_feedback_tests;
  SELECT trip_id, total_seats INTO v_trip_id, v_total_seats FROM trips WHERE ROWNUM = 1;
  SELECT MIN(passenger_id) INTO v_passenger_id FROM passengers;
  UPDATE trips SET status = 'scheduled', departure_time = SYSTIMESTAMP + INTERVAL '1' DAY,
                   available_seats = total_seats WHERE trip_id = v_trip_id;
  SELECT MIN(seat_no) INTO v_seat FROM (
    SELECT LEVEL AS seat_no FROM dual CONNECT BY LEVEL <= v_total_seats
  ) s WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.trip_id = v_trip_id AND b.seat_number = TO_CHAR(s.seat_no));
  passenger_book_seat(v_passenger_id, v_trip_id, TO_CHAR(v_seat), v_booking_id);
  BEGIN
    passenger_submit_feedback(v_passenger_id, v_trip_id, 5, 'Test before completion');
    RAISE_APPLICATION_ERROR(-20991, 'Expected incomplete trip feedback to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20163 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('rating an uncompleted trip rejected');

  UPDATE trips SET status = 'completed', departure_time = SYSTIMESTAMP - INTERVAL '1' DAY WHERE trip_id = v_trip_id;
  UPDATE bookings SET status = 'completed' WHERE booking_id = v_booking_id;
  passenger_submit_feedback(v_passenger_id, v_trip_id, 5, 'Test completed trip');
  BEGIN
    passenger_submit_feedback(v_passenger_id, v_trip_id, 4, 'Duplicate test');
    RAISE_APPLICATION_ERROR(-20992, 'Expected duplicate feedback to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20165 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('duplicate feedback rejected');
  ROLLBACK TO passenger_feedback_tests;
EXCEPTION WHEN NO_DATA_FOUND THEN ROLLBACK TO passenger_feedback_tests; DBMS_OUTPUT.PUT_LINE('Feedback tests NOT RUN: fixture data missing');
END;
/

-- Test profile changes and missing-passenger validation; fixture updates roll back.
DECLARE
  v_passenger_id passengers.passenger_id%TYPE;
  v_first_name passengers.first_name%TYPE;
BEGIN
  SAVEPOINT passenger_profile_tests;
  SELECT passenger_id, first_name INTO v_passenger_id, v_first_name FROM passengers WHERE ROWNUM = 1;
  passenger_update_profile(v_passenger_id, 'Profile Test', 'Passenger', NULL, 'Test address');
  SELECT first_name INTO v_first_name FROM passengers WHERE passenger_id = v_passenger_id;
  IF v_first_name <> 'Profile Test' THEN RAISE_APPLICATION_ERROR(-20993, 'Profile update failed'); END IF;
  BEGIN
    passenger_update_profile(999999999, 'Nobody', 'Here', NULL, NULL);
    RAISE_APPLICATION_ERROR(-20994, 'Expected missing passenger profile update to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20172 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('profile update and missing-passenger validation passed');
  ROLLBACK TO passenger_profile_tests;
EXCEPTION WHEN NO_DATA_FOUND THEN ROLLBACK TO passenger_profile_tests; DBMS_OUTPUT.PUT_LINE('Profile tests NOT RUN: passenger fixture missing');
END;
/

PROMPT ============================================================
PROMPT  Passenger procedures created; test blocks rolled back fixtures.
PROMPT  Existing UQ_BOOKINGS_SEAT prevents reusing a cancelled seat label.
PROMPT ============================================================
