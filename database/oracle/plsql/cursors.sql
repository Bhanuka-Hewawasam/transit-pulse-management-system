-- Cursor example for a driver performance listing.
DECLARE
  CURSOR c_drivers IS SELECT driver_id, first_name, last_name, total_trips, rating FROM drivers ORDER BY rating DESC;
BEGIN
  FOR driver_row IN c_drivers LOOP
    DBMS_OUTPUT.PUT_LINE(driver_row.first_name || ' ' || driver_row.last_name || ': ' || driver_row.rating);
  END LOOP;
END;
/
