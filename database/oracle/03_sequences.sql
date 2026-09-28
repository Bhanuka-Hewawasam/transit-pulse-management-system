










PROMPT ============================================================
PROMPT  SmartMove -- Creating sequences
PROMPT ============================================================




CREATE SEQUENCE seq_users_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_vehicles_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_drivers_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_routes_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_stops_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_passengers_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_trips_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_bookings_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_payments_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_maintenance_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;




CREATE SEQUENCE seq_feedback_id
    START WITH     1
    INCREMENT BY   1
    MINVALUE       1
    MAXVALUE       999999999999
    NOCACHE
    NOCYCLE
    ORDER;

PROMPT ============================================================
PROMPT  All 11 sequences created successfully.
PROMPT ============================================================
