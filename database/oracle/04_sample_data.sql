











PROMPT ============================================================
PROMPT  SmartMove -- Inserting sample data
PROMPT ============================================================





PROMPT Inserting SYSTEM_USERS ...

INSERT INTO system_users (user_id, username, password_hash, full_name, role, email, created_date, is_active)
VALUES (
    seq_users_id.NEXTVAL,
    'admin',
    'ef92b778bafe771207985d4dc68b9a9c6a3b3c9f1e3e7a5e9b2d4f6c8e0a2b4',
    'System Administrator',
    'admin',
    'admin@smartmove.lk',
    TO_DATE('2025-01-01', 'YYYY-MM-DD'),
    1
);

INSERT INTO system_users (user_id, username, password_hash, full_name, role, email, created_date, is_active)
VALUES (
    seq_users_id.NEXTVAL,
    'operator1',
    'ef92b778bafe771207985d4dc68b9a9c6a3b3c9f1e3e7a5e9b2d4f6c8e0a2b4',
    'Kamal Perera',
    'operator',
    'kamal.perera@smartmove.lk',
    TO_DATE('2025-02-15', 'YYYY-MM-DD'),
    1
);

INSERT INTO system_users (user_id, username, password_hash, full_name, role, email, created_date, is_active)
VALUES (
    seq_users_id.NEXTVAL,
    'viewer1',
    'ef92b778bafe771207985d4dc68b9a9c6a3b3c9f1e3e7a5e9b2d4f6c8e0a2b4',
    'Nimal Silva',
    'viewer',
    'nimal.silva@smartmove.lk',
    TO_DATE('2025-03-10', 'YYYY-MM-DD'),
    1
);






PROMPT Inserting VEHICLES ...


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'WP CAB-1234', 'Tata', 'StarBus Ultra',
    2021, 'bus', 52, 'diesel', 'active',
    TO_DATE('2025-08-15', 'YYYY-MM-DD'),
    TO_DATE('2025-11-15', 'YYYY-MM-DD'),
    TO_DATE('2025-01-10', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'WP CAB-5678', 'Leyland', 'Titan',
    2019, 'bus', 48, 'diesel', 'active',
    TO_DATE('2025-07-20', 'YYYY-MM-DD'),
    TO_DATE('2025-10-20', 'YYYY-MM-DD'),
    TO_DATE('2025-01-10', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'CP GAB-9012', 'Toyota', 'Coaster',
    2022, 'minibus', 26, 'diesel', 'active',
    TO_DATE('2025-09-01', 'YYYY-MM-DD'),
    TO_DATE('2025-12-01', 'YYYY-MM-DD'),
    TO_DATE('2025-01-15', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'NW HAB-3456', 'Mitsubishi', 'Rosa',
    2020, 'minibus', 30, 'diesel', 'maintenance',
    TO_DATE('2025-09-10', 'YYYY-MM-DD'),
    TO_DATE('2025-09-30', 'YYYY-MM-DD'),
    TO_DATE('2025-02-01', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'SG JAB-7890', 'KIA', 'Pregio',
    2023, 'van', 12, 'petrol', 'active',
    TO_DATE('2025-09-05', 'YYYY-MM-DD'),
    TO_DATE('2025-12-05', 'YYYY-MM-DD'),
    TO_DATE('2025-02-10', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'WP LAB-2345', 'Tata', 'Winger',
    2022, 'van', 14, 'diesel', 'active',
    TO_DATE('2025-08-28', 'YYYY-MM-DD'),
    TO_DATE('2025-11-28', 'YYYY-MM-DD'),
    TO_DATE('2025-03-01', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'EP MAB-6789', 'Ashok Leyland', 'Falcon',
    2018, 'bus', 54, 'diesel', 'active',
    TO_DATE('2025-06-15', 'YYYY-MM-DD'),
    TO_DATE('2025-09-15', 'YYYY-MM-DD'),
    TO_DATE('2025-03-05', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'WP NAB-1122', 'BYD', 'C9 Electric',
    2024, 'bus', 45, 'electric', 'active',
    TO_DATE('2025-09-12', 'YYYY-MM-DD'),
    TO_DATE('2025-12-12', 'YYYY-MM-DD'),
    TO_DATE('2025-04-01', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'SP PAB-4433', 'Toyota', 'HiAce',
    2021, 'van', 15, 'petrol', 'inactive',
    TO_DATE('2025-05-10', 'YYYY-MM-DD'),
    TO_DATE('2025-08-10', 'YYYY-MM-DD'),
    TO_DATE('2025-04-15', 'YYYY-MM-DD')
);


INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,
    'SB QAB-9988', 'Eicher', 'Skyline',
    2020, 'bus', 50, 'diesel', 'active',
    TO_DATE('2025-08-01', 'YYYY-MM-DD'),
    TO_DATE('2025-11-01', 'YYYY-MM-DD'),
    TO_DATE('2025-05-01', 'YYYY-MM-DD')
);






PROMPT Inserting DRIVERS ...

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Sunil', 'Rathnayake', 'B1234567',
        TO_DATE('2027-06-30', 'YYYY-MM-DD'),
        '0771234567', 'sunil.r@smartmove.lk',
        'available', TO_DATE('2022-03-15', 'YYYY-MM-DD'), 312, 4.75);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Mahesh', 'Fernando', 'B2345678',
        TO_DATE('2026-12-31', 'YYYY-MM-DD'),
        '0772345678', 'mahesh.f@smartmove.lk',
        'on_trip', TO_DATE('2021-07-01', 'YYYY-MM-DD'), 489, 4.60);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Pradeep', 'Kumara', 'B3456789',
        TO_DATE('2028-03-31', 'YYYY-MM-DD'),
        '0773456789', 'pradeep.k@smartmove.lk',
        'available', TO_DATE('2023-01-20', 'YYYY-MM-DD'), 145, 4.82);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Roshan', 'Wickrama', 'B4567890',
        TO_DATE('2026-09-30', 'YYYY-MM-DD'),
        '0774567890', 'roshan.w@smartmove.lk',
        'off_duty', TO_DATE('2020-11-05', 'YYYY-MM-DD'), 620, 4.50);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Chatura', 'Dissanayake', 'B5678901',
        TO_DATE('2025-12-31', 'YYYY-MM-DD'),
        '0775678901', 'chatura.d@smartmove.lk',
        'available', TO_DATE('2022-06-10', 'YYYY-MM-DD'), 267, 4.30);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Lakshan', 'Gunawardane', 'B6789012',
        TO_DATE('2027-08-31', 'YYYY-MM-DD'),
        '0776789012', 'lakshan.g@smartmove.lk',
        'on_trip', TO_DATE('2021-03-22', 'YYYY-MM-DD'), 398, 4.65);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Thilak', 'Jayasena', 'B7890123',
        TO_DATE('2026-05-31', 'YYYY-MM-DD'),
        '0777890123', 'thilak.j@smartmove.lk',
        'available', TO_DATE('2023-08-01', 'YYYY-MM-DD'), 88, 4.90);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,
        'Sampath', 'Bandara', 'B8901234',
        TO_DATE('2025-11-30', 'YYYY-MM-DD'),
        '0778901234', 'sampath.b@smartmove.lk',
        'suspended', TO_DATE('2019-05-14', 'YYYY-MM-DD'), 710, 3.80);






PROMPT Inserting ROUTES ...


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R001', 'Colombo Fort', 'Kandy', 115.50, 180, 350.00, 1,
        TO_DATE('2025-01-01', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R002', 'Colombo Fort', 'Galle', 116.00, 130, 320.00, 1,
        TO_DATE('2025-01-01', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R003', 'Colombo Fort', 'Jaffna', 395.00, 480, 950.00, 1,
        TO_DATE('2025-01-01', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R004', 'Kandy', 'Nuwara Eliya', 75.00, 150, 210.00, 1,
        TO_DATE('2025-01-15', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R005', 'Colombo Fort', 'Matara', 157.00, 210, 420.00, 1,
        TO_DATE('2025-01-15', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R006', 'Colombo Fort', 'Badulla', 230.00, 360, 580.00, 1,
        TO_DATE('2025-02-01', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R007', 'Colombo Fort', 'Anuradhapura', 207.00, 300, 510.00, 1,
        TO_DATE('2025-02-01', 'YYYY-MM-DD'));


INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,
        'R008', 'Galle', 'Matara', 42.00, 55, 120.00, 0,
        TO_DATE('2025-03-01', 'YYYY-MM-DD'));





PROMPT Inserting ROUTE_STOPS ...


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Kelaniya', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Kegalle', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Mawanella', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Kandy', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Panadura', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Aluthgama', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Ambalangoda', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Galle', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Kurunegala', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Vavuniya', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Kilinochchi', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Jaffna', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Kandy', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Gampola', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Nawalapitiya', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Hatton', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Nuwara Eliya', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Moratuwa', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Kalutara', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Galle', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Matara', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Kandy', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Nuwara Eliya', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Welimada', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Badulla', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Kurunegala', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Dambulla', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Kekirawa', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Anuradhapura', 5);


INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 8, 'Galle', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 8, 'Hikkaduwa', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 8, 'Matara', 3);






PROMPT Inserting PASSENGERS ...

INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Amara','Wickramasinghe','amara.w@gmail.com','0711111111','45 Temple Road, Colombo 6','199512345678',TO_DATE('2025-04-01','YYYY-MM-DD'),5);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Buddhika','Jayawardane','buddhika.j@gmail.com','0712222222','12 Lake View, Kandy','199023456789',TO_DATE('2025-04-02','YYYY-MM-DD'),3);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Chamari','Senanayake','chamari.s@yahoo.com','0713333333','78 Sea Street, Galle','199834567890',TO_DATE('2025-04-03','YYYY-MM-DD'),7);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Dilshan','Ranatunga','dilshan.r@gmail.com','0714444444','22 Main St, Matara','199245678901',TO_DATE('2025-04-04','YYYY-MM-DD'),2);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Eranga','Pathirana','eranga.p@gmail.com','0715555555','5 Hill Top, Nuwara Eliya','199056789012',TO_DATE('2025-04-05','YYYY-MM-DD'),4);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Fathima','Nawaz','fathima.n@gmail.com','0716666666','33 Market Rd, Jaffna','199967890123',TO_DATE('2025-04-06','YYYY-MM-DD'),1);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Gayan','Madusanka','gayan.m@gmail.com','0717777777','67 Palm Grove, Negombo','199178901234',TO_DATE('2025-04-07','YYYY-MM-DD'),6);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Hiruni','Perera','hiruni.p@gmail.com','0718888888','14 Rose Lane, Colombo 7','199589012345',TO_DATE('2025-04-08','YYYY-MM-DD'),3);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Isuru','Bandara','isuru.b@gmail.com','0719999999','9 Kings St, Badulla','199390123456',TO_DATE('2025-04-09','YYYY-MM-DD'),2);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Janaki','Kumari','janaki.k@gmail.com','0720000000','88 River Rd, Anuradhapura','199601234567',TO_DATE('2025-04-10','YYYY-MM-DD'),4);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Kavindu','Thilakarathna','kavindu.t@gmail.com','0721111111','3 Coconut Ave, Kalutara','199412345679',TO_DATE('2025-05-01','YYYY-MM-DD'),1);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Lasith','Malinga','lasith.m@gmail.com','0722222222','77 Green Path, Kurunegala','199023456780',TO_DATE('2025-05-02','YYYY-MM-DD'),2);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Manori','Dissanayake','manori.d@gmail.com','0723333333','55 Lotus Rd, Dambulla','199934567891',TO_DATE('2025-05-03','YYYY-MM-DD'),3);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Nuwan','Pradeep','nuwan.p@gmail.com','0724444444','21 Station Rd, Vavuniya','199145678902',TO_DATE('2025-05-04','YYYY-MM-DD'),1);
INSERT INTO passengers VALUES (seq_passengers_id.NEXTVAL,'Oshani','Fernando','oshani.f@gmail.com','0725555555','6 Beach Rd, Hikkaduwa','199956789013',TO_DATE('2025-05-05','YYYY-MM-DD'),2);






PROMPT Inserting TRIPS ...


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 1, 1, 1,
    TO_TIMESTAMP('2025-09-25 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 42, 52, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 2, 2, 2,
    TO_TIMESTAMP('2025-09-25 07:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 09:10:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 30, 48, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 3, 7, 6,
    TO_TIMESTAMP('2025-09-24 18:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 02:00:00','YYYY-MM-DD HH24:MI:SS'),
    'in_progress', 10, 54, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 4, 3, 3,
    TO_TIMESTAMP('2025-09-25 08:30:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 20, 26, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 5, 10, 5,
    TO_TIMESTAMP('2025-09-25 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 12:30:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 38, 50, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 6, 8, 7,
    TO_TIMESTAMP('2025-09-25 05:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 35, 45, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 7, 1, 1,
    TO_TIMESTAMP('2025-09-26 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-26 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 45, 52, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 1, 2, 2,
    TO_TIMESTAMP('2025-09-23 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-23 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 0, 48, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 2, 10, 4,
    TO_TIMESTAMP('2025-09-22 07:30:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-22 09:40:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 2, 50, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 4, 3, 3,
    TO_TIMESTAMP('2025-09-21 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-21 11:30:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 0, 26, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 5, 9, 4,
    TO_TIMESTAMP('2025-09-20 08:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-20 11:30:00','YYYY-MM-DD HH24:MI:SS'),
    'cancelled', 15, 15, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 7, 7, 6,
    TO_TIMESTAMP('2025-09-19 05:30:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-19 10:30:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 5, 54, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 3, 7, 6,
    TO_TIMESTAMP('2025-09-17 18:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-18 02:00:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 4, 54, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 1, 8, 7,
    TO_TIMESTAMP('2025-09-27 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-27 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 40, 45, SYSDATE);


INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 6, 8, 5,
    TO_TIMESTAMP('2025-09-16 05:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-16 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 6, 45, SYSDATE);







PROMPT Inserting BOOKINGS ...


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  1, '01A', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  2, '01B', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  3, '02A', TO_DATE('2025-09-21','YYYY-MM-DD'), 'completed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  4, '02B', TO_DATE('2025-09-21','YYYY-MM-DD'), 'completed', 350.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  5, '03A', TO_DATE('2025-09-19','YYYY-MM-DD'), 'completed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  6, '03B', TO_DATE('2025-09-19','YYYY-MM-DD'), 'completed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  7, '04A', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  8, '04B', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 320.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 10,  9, '05A', TO_DATE('2025-09-18','YYYY-MM-DD'), 'completed', 210.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 10, 10, '05B', TO_DATE('2025-09-18','YYYY-MM-DD'), 'completed', 210.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 12, 11, '06A', TO_DATE('2025-09-16','YYYY-MM-DD'), 'completed', 510.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 12, 12, '06B', TO_DATE('2025-09-16','YYYY-MM-DD'), 'completed', 510.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 13, 13, '07A', TO_DATE('2025-09-14','YYYY-MM-DD'), 'completed', 950.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 13, 14, '07B', TO_DATE('2025-09-14','YYYY-MM-DD'), 'completed', 950.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 15, 15, '08A', TO_DATE('2025-09-13','YYYY-MM-DD'), 'completed', 580.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 15,  1, '08B', TO_DATE('2025-09-13','YYYY-MM-DD'), 'completed', 580.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  1,  2, '09A', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  1,  3, '09B', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  1,  4, '10A', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 350.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  2,  5, '11A', TO_DATE('2025-09-22','YYYY-MM-DD'), 'confirmed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  2,  6, '11B', TO_DATE('2025-09-22','YYYY-MM-DD'), 'confirmed', 320.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  3,  7, '12A', TO_DATE('2025-09-21','YYYY-MM-DD'), 'confirmed', 950.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  3,  8, '12B', TO_DATE('2025-09-21','YYYY-MM-DD'), 'confirmed', 950.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  4,  9, '13A', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 210.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  4, 10, '13B', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 210.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 11, 11, '14A', TO_DATE('2025-09-17','YYYY-MM-DD'), 'cancelled', 420.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 11, 12, '14B', TO_DATE('2025-09-17','YYYY-MM-DD'), 'cancelled', 420.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  5, 13, '15A', TO_DATE('2025-09-24','YYYY-MM-DD'), 'pending',   420.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  5, 14, '15B', TO_DATE('2025-09-24','YYYY-MM-DD'), 'pending',   420.00);


INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  6, 15, '16A', TO_DATE('2025-09-22','YYYY-MM-DD'), 'confirmed', 580.00);








PROMPT Inserting PAYMENTS ...


INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  1, 350.00, TO_DATE('2025-09-20','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250920-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  2, 350.00, TO_DATE('2025-09-20','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250920-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  3, 350.00, TO_DATE('2025-09-21','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250921-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  4, 350.00, TO_DATE('2025-09-21','YYYY-MM-DD'), 'cash',          'paid',    'TXN-20250921-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  5, 320.00, TO_DATE('2025-09-19','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250919-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  6, 320.00, TO_DATE('2025-09-19','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250919-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  7, 320.00, TO_DATE('2025-09-20','YYYY-MM-DD'), 'bank_transfer', 'paid',    'TXN-20250920-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  8, 320.00, TO_DATE('2025-09-20','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250920-0004');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL,  9, 210.00, TO_DATE('2025-09-18','YYYY-MM-DD'), 'cash',          'paid',    'TXN-20250918-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 10, 210.00, TO_DATE('2025-09-18','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250918-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 11, 510.00, TO_DATE('2025-09-16','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250916-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 12, 510.00, TO_DATE('2025-09-16','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250916-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 13, 950.00, TO_DATE('2025-09-14','YYYY-MM-DD'), 'bank_transfer', 'paid',    'TXN-20250914-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 14, 950.00, TO_DATE('2025-09-14','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250914-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 15, 580.00, TO_DATE('2025-09-13','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250913-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 16, 580.00, TO_DATE('2025-09-13','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250913-0002');


INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 17, 350.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250923-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 18, 350.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250923-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 19, 350.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250923-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 20, 320.00, TO_DATE('2025-09-22','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250922-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 21, 320.00, TO_DATE('2025-09-22','YYYY-MM-DD'), 'cash',          'paid',    'TXN-20250922-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 22, 950.00, TO_DATE('2025-09-21','YYYY-MM-DD'), 'bank_transfer', 'paid',    'TXN-20250921-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 23, 950.00, TO_DATE('2025-09-21','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250921-0004');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 24, 210.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250923-0004');


INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 25, 420.00, TO_DATE('2025-09-17','YYYY-MM-DD'), 'card',          'refunded','TXN-20250917-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 26, 420.00, TO_DATE('2025-09-17','YYYY-MM-DD'), 'online',        'refunded','TXN-20250917-0002');


INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 27, 420.00, TO_DATE('2025-09-24','YYYY-MM-DD'), 'card',          'pending', 'TXN-20250924-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 28, 420.00, TO_DATE('2025-09-24','YYYY-MM-DD'), 'online',        'pending', 'TXN-20250924-0002');


INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 29, 580.00, TO_DATE('2025-09-22','YYYY-MM-DD'), 'bank_transfer', 'paid',    'TXN-20250922-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 30, 210.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'cash',          'paid',    'TXN-20250923-0005');






PROMPT Inserting MAINTENANCE_RECORDS ...


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 1, 'routine',
    'Engine oil and filter change, tyre pressure check, brake fluid top-up.',
    TO_DATE('2025-08-15','YYYY-MM-DD'),
    TO_DATE('2025-08-15','YYYY-MM-DD'),
    8500.00, 'completed', 'K. Jayantha - Fleet Garage Colombo',
    TO_DATE('2025-08-10','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 2, 'inspection',
    'Annual roadworthiness inspection by Department of Motor Traffic.',
    TO_DATE('2025-07-20','YYYY-MM-DD'),
    TO_DATE('2025-07-20','YYYY-MM-DD'),
    3000.00, 'completed', 'DMT Inspector - Werahera',
    TO_DATE('2025-07-15','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 4, 'repair',
    'Gearbox overhaul required following vibration complaint from driver. Parts ordered.',
    TO_DATE('2025-09-10','YYYY-MM-DD'),
    NULL,
    45000.00, 'in_progress', 'R. Niroshan - AutoFix Kandy',
    TO_DATE('2025-09-08','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 7, 'routine',
    'Scheduled 3-month service: engine check, belt replacement, coolant flush.',
    TO_DATE('2025-09-15','YYYY-MM-DD'),
    NULL,
    12000.00, 'overdue', 'Pending Assignment',
    TO_DATE('2025-09-01','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 3, 'routine',
    'Quarterly service: air filter, spark plugs, clutch plate inspection.',
    TO_DATE('2025-12-01','YYYY-MM-DD'),
    NULL,
    9500.00, 'scheduled', 'TBD - Fleet Garage Colombo',
    TO_DATE('2025-09-20','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 8, 'inspection',
    'Electric vehicle battery health check and charging system inspection.',
    TO_DATE('2025-12-12','YYYY-MM-DD'),
    NULL,
    5000.00, 'scheduled', 'BYD Certified Technician',
    TO_DATE('2025-09-22','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 5, 'emergency',
    'Flat tyre mid-route on A4 highway. Tyre replaced roadside.',
    TO_DATE('2025-09-05','YYYY-MM-DD'),
    TO_DATE('2025-09-05','YYYY-MM-DD'),
    4200.00, 'completed', 'Roadside Assist - Negombo',
    TO_DATE('2025-09-05','YYYY-MM-DD')
);


INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 10, 'routine',
    '6-month major service: engine oil, all filters, brake pads, wheel alignment.',
    TO_DATE('2025-11-01','YYYY-MM-DD'),
    NULL,
    15000.00, 'scheduled', 'Eicher Service Centre - Colombo',
    TO_DATE('2025-09-20','YYYY-MM-DD')
);








PROMPT Inserting FEEDBACK ...

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 1, 8, 2, 2, 5,
    'Excellent journey! Very punctual and the driver was courteous throughout.',
    TO_DATE('2025-09-23','YYYY-MM-DD'), 'driver');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 2, 8, 2, 2, 4,
    'Clean bus and comfortable seats. A bit slow at Kegalle stop.',
    TO_DATE('2025-09-23','YYYY-MM-DD'), 'vehicle');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 5, 9, 4, 10, 5,
    'Arrived ahead of schedule. Driver Roshan handled the highway stretch perfectly.',
    TO_DATE('2025-09-22','YYYY-MM-DD'), 'punctuality');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 6, 9, 4, 10, 4,
    'Good overall experience. AC could have been colder.',
    TO_DATE('2025-09-22','YYYY-MM-DD'), 'service');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 9, 10, 3, 3, 5,
    'Pradeep is one of the best drivers -- very safe on mountain bends.',
    TO_DATE('2025-09-21','YYYY-MM-DD'), 'driver');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 10, 10, 3, 3, 4,
    'Scenic ride. Minibus was clean and well-maintained.',
    TO_DATE('2025-09-21','YYYY-MM-DD'), 'vehicle');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 11, 12, 6, 7, 4,
    'Long journey but comfortable. Driver Lakshan kept us informed of ETA.',
    TO_DATE('2025-09-19','YYYY-MM-DD'), 'service');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 12, 12, 6, 7, 3,
    'Bus was slightly old but functional. Journey was on time.',
    TO_DATE('2025-09-19','YYYY-MM-DD'), 'general');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 13, 13, 6, 7, 5,
    'Night bus to Jaffna was surprisingly comfortable. Would travel again.',
    TO_DATE('2025-09-18','YYYY-MM-DD'), 'service');

INSERT INTO feedback VALUES (
    seq_feedback_id.NEXTVAL, 15, 15, 5, 8, 4,
    'Good trip to Badulla. The electric bus was quiet and smooth.',
    TO_DATE('2025-09-16','YYYY-MM-DD'), 'vehicle');




COMMIT;

PROMPT ============================================================
PROMPT  Sample data insertion complete and committed.
PROMPT  Summary:
PROMPT    3  SYSTEM_USERS
PROMPT   10  VEHICLES
PROMPT    8  DRIVERS
PROMPT    8  ROUTES  (with stops)
PROMPT   36  ROUTE_STOPS
PROMPT   15  PASSENGERS
PROMPT   15  TRIPS
PROMPT   30  BOOKINGS (booking_id 1-29 + extra)
PROMPT   30  PAYMENTS
PROMPT    8  MAINTENANCE_RECORDS
PROMPT   10  FEEDBACK
PROMPT ============================================================
PROMPT  Next step: Run 05_views.sql
PROMPT ============================================================
