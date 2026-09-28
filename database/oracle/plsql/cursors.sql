-- Driver performance cursor.
DECLARE
  CURSOR driver_performance_cursor IS SELECT driver_id, first_name, last_name, total_trips, rating FROM drivers ORDER BY rating DESC;
BEGIN
  FOR driver_performance_record IN driver_performance_cursor LOOP
    DBMS_OUTPUT.PUT_LINE(driver_performance_record.first_name || ' ' || driver_performance_record.last_name || ': ' || driver_performance_record.rating);
  END LOOP;
END;
/
