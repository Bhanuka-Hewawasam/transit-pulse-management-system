-- Keep passenger booking counts aligned with confirmed/completed bookings.
CREATE OR REPLACE TRIGGER trg_booking_count
AFTER INSERT OR UPDATE OF status OR DELETE ON bookings
FOR EACH ROW
BEGIN
  IF INSERTING AND :NEW.status IN ('confirmed','completed') THEN
    UPDATE passengers SET total_bookings = total_bookings + 1 WHERE passenger_id=:NEW.passenger_id;
  ELSIF DELETING AND :OLD.status IN ('confirmed','completed') THEN
    UPDATE passengers SET total_bookings = GREATEST(total_bookings - 1, 0) WHERE passenger_id=:OLD.passenger_id;
  ELSIF UPDATING THEN
    IF :OLD.status NOT IN ('confirmed','completed') AND :NEW.status IN ('confirmed','completed') THEN UPDATE passengers SET total_bookings=total_bookings+1 WHERE passenger_id=:NEW.passenger_id; END IF;
    IF :OLD.status IN ('confirmed','completed') AND :NEW.status NOT IN ('confirmed','completed') THEN UPDATE passengers SET total_bookings=GREATEST(total_bookings-1,0) WHERE passenger_id=:NEW.passenger_id; END IF;
  END IF;
END;
/
