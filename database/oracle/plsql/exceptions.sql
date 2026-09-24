-- Exception-handling example for safe passenger lookup.
DECLARE
  l_name VARCHAR2(101);
BEGIN
  SELECT first_name || ' ' || last_name INTO l_name FROM passengers WHERE passenger_id = 1;
  DBMS_OUTPUT.PUT_LINE(l_name);
EXCEPTION
  WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('Passenger was not found');
  WHEN TOO_MANY_ROWS THEN DBMS_OUTPUT.PUT_LINE('Data integrity error: multiple passengers found');
  WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Unexpected error: ' || SQLERRM);
END;
/
