-- Coursework procedures: booking and maintenance updates.
CREATE OR REPLACE PROCEDURE confirm_booking(p_booking_id IN NUMBER) AS
BEGIN
  UPDATE bookings SET status = 'confirmed' WHERE booking_id = p_booking_id;
  IF SQL%ROWCOUNT = 0 THEN RAISE_APPLICATION_ERROR(-20001, 'Booking not found'); END IF;
END;
/
CREATE OR REPLACE PROCEDURE complete_maintenance(p_maintenance_id IN NUMBER, p_cost IN NUMBER) AS
BEGIN
  UPDATE maintenance_records SET status = 'completed', completed_date = SYSDATE, cost = p_cost WHERE maintenance_id = p_maintenance_id;
  IF SQL%ROWCOUNT = 0 THEN RAISE_APPLICATION_ERROR(-20002, 'Maintenance record not found'); END IF;
END;
/
