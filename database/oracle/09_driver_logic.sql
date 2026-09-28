PROMPT ============================================================
PROMPT  SmartMove -- Driver trip and profile logic
PROMPT  Run as the same schema used by the application.
PROMPT  Start-trip early window: 30 minutes before departure.
PROMPT  Completion increments DRIVERS.total_trips once; no TRIPS/DRIVERS
PROMPT  triggers are installed in the verified SMARTMOVE schema.
PROMPT ============================================================
SET SERVEROUTPUT ON;

CREATE OR REPLACE PROCEDURE driver_start_trip(
  p_driver_id IN NUMBER,
  p_trip_id IN NUMBER
) IS
  v_trip_driver_id trips.driver_id%TYPE;
  v_trip_status trips.status%TYPE;
  v_departure_time trips.departure_time%TYPE;
  v_active_count NUMBER;
  v_locked_driver_id drivers.driver_id%TYPE;
BEGIN
  IF p_driver_id IS NULL OR p_driver_id <= 0 OR p_trip_id IS NULL OR p_trip_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20201, 'driverId and tripId must be positive numbers');
  END IF;

  SELECT driver_id, status, departure_time
    INTO v_trip_driver_id, v_trip_status, v_departure_time
    FROM trips
   WHERE trip_id = p_trip_id
     FOR UPDATE;

  IF v_trip_driver_id <> p_driver_id THEN
    RAISE_APPLICATION_ERROR(-20202, 'Trip is not assigned to this driver');
  END IF;
  IF v_trip_status <> 'scheduled' THEN
    RAISE_APPLICATION_ERROR(-20203, 'Only scheduled trips can be started');
  END IF;
  IF v_departure_time > SYSTIMESTAMP + INTERVAL '30' MINUTE THEN
    RAISE_APPLICATION_ERROR(-20204, 'Trip can only be started within 30 minutes of departure');
  END IF;

  SELECT driver_id INTO v_locked_driver_id
    FROM drivers WHERE driver_id = p_driver_id FOR UPDATE;

  SELECT COUNT(*) INTO v_active_count
    FROM trips
   WHERE driver_id = p_driver_id AND status = 'in_progress' AND trip_id <> p_trip_id;
  IF v_active_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20205, 'Driver already has another in-progress trip');
  END IF;

  UPDATE trips SET status = 'in_progress' WHERE trip_id = p_trip_id;
  UPDATE drivers SET status = 'on_trip' WHERE driver_id = p_driver_id;
  IF SQL%ROWCOUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20206, 'Driver was not found');
  END IF;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20207, 'Trip was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20208, 'Invalid start-trip value');
  WHEN OTHERS THEN
    RAISE;
END;
/

CREATE OR REPLACE PROCEDURE driver_complete_trip(
  p_driver_id IN NUMBER,
  p_trip_id IN NUMBER
) IS
  v_trip_driver_id trips.driver_id%TYPE;
  v_trip_status trips.status%TYPE;
  v_total_trips drivers.total_trips%TYPE;
  v_locked_driver_id drivers.driver_id%TYPE;
BEGIN
  IF p_driver_id IS NULL OR p_driver_id <= 0 OR p_trip_id IS NULL OR p_trip_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20220, 'driverId and tripId must be positive numbers');
  END IF;

  SELECT driver_id, status
    INTO v_trip_driver_id, v_trip_status
    FROM trips
   WHERE trip_id = p_trip_id
     FOR UPDATE;
  IF v_trip_driver_id <> p_driver_id THEN
    RAISE_APPLICATION_ERROR(-20221, 'Trip is not assigned to this driver');
  END IF;
  IF v_trip_status <> 'in_progress' THEN
    RAISE_APPLICATION_ERROR(-20222, 'Only in-progress trips can be completed');
  END IF;

  SELECT driver_id INTO v_locked_driver_id
    FROM drivers WHERE driver_id = p_driver_id FOR UPDATE;

  SELECT total_trips INTO v_total_trips
    FROM drivers
   WHERE driver_id = p_driver_id
     FOR UPDATE;

  UPDATE trips SET status = 'completed', arrival_time = SYSTIMESTAMP WHERE trip_id = p_trip_id;
  UPDATE bookings SET status = 'completed' WHERE trip_id = p_trip_id AND status = 'confirmed';
  UPDATE drivers SET total_trips = NVL(v_total_trips, 0) + 1, status = 'available'
   WHERE driver_id = p_driver_id;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20223, 'Trip or driver was not found');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20224, 'Invalid complete-trip value');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- The schema permits a unique nullable email; license, rating and status stay unchanged.
CREATE OR REPLACE PROCEDURE driver_update_profile(
  p_driver_id IN NUMBER,
  p_phone IN VARCHAR2,
  p_email IN VARCHAR2
) IS
BEGIN
  IF p_driver_id IS NULL OR p_driver_id <= 0 THEN
    RAISE_APPLICATION_ERROR(-20230, 'driverId must be a positive number');
  END IF;
  IF p_phone IS NOT NULL AND LENGTH(TRIM(p_phone)) > 20 THEN
    RAISE_APPLICATION_ERROR(-20231, 'Phone must be 20 characters or fewer');
  END IF;
  IF p_email IS NOT NULL AND LENGTH(TRIM(p_email)) > 100 THEN
    RAISE_APPLICATION_ERROR(-20232, 'Email must be 100 characters or fewer');
  END IF;

  UPDATE drivers
     SET phone = TRIM(p_phone), email = TRIM(p_email)
   WHERE driver_id = p_driver_id;
  IF SQL%ROWCOUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20233, 'Driver was not found');
  END IF;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    RAISE_APPLICATION_ERROR(-20234, 'Email already belongs to another driver');
  WHEN VALUE_ERROR THEN
    RAISE_APPLICATION_ERROR(-20235, 'Invalid driver profile value');
  WHEN OTHERS THEN
    RAISE;
END;
/

-- Test start-trip validation and state transition. All trip changes roll back.
DECLARE
  v_driver_id drivers.driver_id%TYPE;
  v_other_driver_id drivers.driver_id%TYPE;
  v_trip_id trips.trip_id%TYPE;
  v_second_trip_id trips.trip_id%TYPE;
  v_other_trip_id trips.trip_id%TYPE;
BEGIN
  SAVEPOINT driver_start_tests;
  SELECT driver_id INTO v_driver_id
    FROM (SELECT t.driver_id FROM trips t WHERE t.status = 'scheduled'
          GROUP BY t.driver_id HAVING COUNT(*) >= 2
          AND NOT EXISTS (SELECT 1 FROM trips active_trip WHERE active_trip.driver_id = t.driver_id AND active_trip.status = 'in_progress'))
   WHERE ROWNUM = 1;
  SELECT MIN(trip_id), MAX(trip_id) INTO v_trip_id, v_second_trip_id
    FROM trips WHERE driver_id = v_driver_id AND status = 'scheduled';
  SELECT driver_id, trip_id INTO v_other_driver_id, v_other_trip_id FROM (
    SELECT driver_id, trip_id FROM trips WHERE driver_id <> v_driver_id AND status = 'scheduled' ORDER BY trip_id
  ) WHERE ROWNUM = 1;

  UPDATE trips SET departure_time = SYSTIMESTAMP + INTERVAL '31' MINUTE WHERE trip_id = v_trip_id;
  BEGIN
    driver_start_trip(v_driver_id, v_trip_id);
    RAISE_APPLICATION_ERROR(-20980, 'Expected early start to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20204 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('starting more than 30 minutes early rejected');

  BEGIN
    driver_start_trip(v_driver_id, v_other_trip_id);
    RAISE_APPLICATION_ERROR(-20981, 'Expected someone else''s trip to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20202 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('someone else''s trip rejected');

  UPDATE trips SET status = 'completed', departure_time = SYSTIMESTAMP + INTERVAL '10' MINUTE WHERE trip_id = v_trip_id;
  BEGIN
    driver_start_trip(v_driver_id, v_trip_id);
    RAISE_APPLICATION_ERROR(-20982, 'Expected wrong trip status to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20203 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('starting a non-scheduled trip rejected');

  UPDATE trips SET status = 'scheduled', departure_time = SYSTIMESTAMP + INTERVAL '10' MINUTE WHERE trip_id = v_trip_id;
  UPDATE trips SET departure_time = SYSTIMESTAMP + INTERVAL '10' MINUTE WHERE trip_id = v_second_trip_id;
  driver_start_trip(v_driver_id, v_trip_id);
  DBMS_OUTPUT.PUT_LINE('scheduled trip started');
  BEGIN
    driver_start_trip(v_driver_id, v_second_trip_id);
    RAISE_APPLICATION_ERROR(-20983, 'Expected second in-progress trip to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20205 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('starting a second trip rejected');
  ROLLBACK TO driver_start_tests;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK TO driver_start_tests;
    DBMS_OUTPUT.PUT_LINE('Start-trip tests NOT RUN: scheduled fixture trips missing');
END;
/

-- Test complete-trip ownership, status, booking completion and exact total increment.
DECLARE
  v_driver_id drivers.driver_id%TYPE;
  v_other_driver_id drivers.driver_id%TYPE;
  v_trip_id trips.trip_id%TYPE;
  v_wrong_status_trip_id trips.trip_id%TYPE;
  v_other_trip_id trips.trip_id%TYPE;
  v_total_before drivers.total_trips%TYPE;
  v_total_after drivers.total_trips%TYPE;
  v_status trips.status%TYPE;
  v_arrival_time trips.arrival_time%TYPE;
  v_confirmed_count NUMBER;
BEGIN
  SAVEPOINT driver_complete_tests;
  SELECT driver_id INTO v_driver_id
    FROM (SELECT t.driver_id FROM trips t WHERE t.status = 'scheduled'
          GROUP BY t.driver_id HAVING COUNT(*) >= 2
          AND NOT EXISTS (SELECT 1 FROM trips active_trip WHERE active_trip.driver_id = t.driver_id AND active_trip.status = 'in_progress'))
   WHERE ROWNUM = 1;
  SELECT MIN(trip_id), MAX(trip_id) INTO v_trip_id, v_wrong_status_trip_id
    FROM trips WHERE driver_id = v_driver_id AND status = 'scheduled';
  SELECT driver_id, trip_id INTO v_other_driver_id, v_other_trip_id FROM (
    SELECT driver_id, trip_id FROM trips WHERE driver_id <> v_driver_id AND status = 'scheduled' ORDER BY trip_id
  ) WHERE ROWNUM = 1;
  SELECT total_trips INTO v_total_before FROM drivers WHERE driver_id = v_driver_id;

  UPDATE trips SET departure_time = SYSTIMESTAMP + INTERVAL '10' MINUTE WHERE trip_id = v_trip_id;
  UPDATE trips SET departure_time = SYSTIMESTAMP + INTERVAL '10' MINUTE WHERE trip_id = v_wrong_status_trip_id;
  driver_start_trip(v_driver_id, v_trip_id);
  BEGIN
    driver_complete_trip(v_driver_id, v_wrong_status_trip_id);
    RAISE_APPLICATION_ERROR(-20984, 'Expected scheduled trip completion to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20222 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('completing a non-in-progress trip rejected');

  BEGIN
    driver_complete_trip(v_driver_id, v_other_trip_id);
    RAISE_APPLICATION_ERROR(-20985, 'Expected someone else''s trip completion to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20221 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('completing someone else''s trip rejected');

  UPDATE bookings SET status = 'confirmed' WHERE trip_id = v_trip_id AND status = 'pending';
  driver_complete_trip(v_driver_id, v_trip_id);
  SELECT status, arrival_time INTO v_status, v_arrival_time FROM trips WHERE trip_id = v_trip_id;
  SELECT total_trips INTO v_total_after FROM drivers WHERE driver_id = v_driver_id;
  IF v_status <> 'completed' OR v_arrival_time > SYSTIMESTAMP OR v_total_after <> NVL(v_total_before, 0) + 1 THEN
    RAISE_APPLICATION_ERROR(-20986, 'Trip completion or total_trips update failed');
  END IF;
  SELECT COUNT(*) INTO v_confirmed_count FROM bookings WHERE trip_id = v_trip_id AND status = 'confirmed';
  IF v_confirmed_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20987, 'Confirmed trip bookings were not completed');
  END IF;
  DBMS_OUTPUT.PUT_LINE('trip, confirmed bookings and total_trips completed exactly once');
  ROLLBACK TO driver_complete_tests;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK TO driver_complete_tests;
    DBMS_OUTPUT.PUT_LINE('Complete-trip tests NOT RUN: scheduled fixture trips missing');
END;
/

-- Test phone/email profile update and unique-email error; fixture updates roll back.
DECLARE
  v_driver_id drivers.driver_id%TYPE;
  v_other_email drivers.email%TYPE;
  v_phone drivers.phone%TYPE;
  v_email drivers.email%TYPE;
BEGIN
  SAVEPOINT driver_profile_tests;
  SELECT driver_id INTO v_driver_id FROM drivers WHERE ROWNUM = 1;
  SELECT email INTO v_other_email FROM drivers WHERE driver_id <> v_driver_id AND email IS NOT NULL AND ROWNUM = 1;
  driver_update_profile(v_driver_id, '071-555-0101', 'driver-test@example.com');
  SELECT phone, email INTO v_phone, v_email FROM drivers WHERE driver_id = v_driver_id;
  IF v_phone <> '071-555-0101' OR v_email <> 'driver-test@example.com' THEN
    RAISE_APPLICATION_ERROR(-20988, 'Driver profile update failed');
  END IF;
  BEGIN
    driver_update_profile(v_driver_id, v_phone, v_other_email);
    RAISE_APPLICATION_ERROR(-20989, 'Expected duplicate driver email to fail');
  EXCEPTION WHEN OTHERS THEN IF SQLCODE != -20234 THEN RAISE; END IF; END;
  DBMS_OUTPUT.PUT_LINE('driver profile update and duplicate email validation passed');
  ROLLBACK TO driver_profile_tests;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK TO driver_profile_tests;
    DBMS_OUTPUT.PUT_LINE('Profile tests NOT RUN: driver/email fixtures missing');
END;
/

ROLLBACK;
PROMPT ============================================================
PROMPT  Driver procedures created; test fixture changes rolled back.
PROMPT ============================================================
