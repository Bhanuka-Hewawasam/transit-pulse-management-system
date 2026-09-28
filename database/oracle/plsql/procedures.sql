-- Confirm a booking.
CREATE OR REPLACE PROCEDURE confirm_booking(booking_id_input IN NUMBER) AS
BEGIN
  UPDATE bookings SET status = 'confirmed' WHERE booking_id = booking_id_input;
  IF SQL%ROWCOUNT = 0 THEN RAISE_APPLICATION_ERROR(-20001, 'Booking not found'); END IF;
END;
/
-- Complete a maintenance record.
CREATE OR REPLACE PROCEDURE complete_maintenance(maintenance_id_input IN NUMBER, maintenance_cost_input IN NUMBER) AS
BEGIN
  UPDATE maintenance_records SET status = 'completed', completed_date = SYSDATE, cost = maintenance_cost_input WHERE maintenance_id = maintenance_id_input;
  IF SQL%ROWCOUNT = 0 THEN RAISE_APPLICATION_ERROR(-20002, 'Maintenance record not found'); END IF;
END;
/
