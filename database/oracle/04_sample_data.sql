-- =============================================================================
-- SmartMove Transport Solutions
-- FILE: 04_sample_data.sql
-- PURPOSE: Populate all tables with realistic Sri Lanka-themed sample data.
--          Uses sequences for all PKs. Dates use TO_DATE / TO_TIMESTAMP.
--          All data mirrors the TypeScript in-memory demo store so the UI
--          and database always display consistent information.
-- RUN AFTER: 03_sequences.sql
-- AUTHOR: SmartMove DBA Team
-- CREATED: 2025-09-24
-- =============================================================================

PROMPT ============================================================
PROMPT  SmartMove -- Inserting sample data
PROMPT ============================================================

-- =============================================================================
-- SECTION 1: SYSTEM_USERS  (3 rows)
-- Passwords are SHA-256 hashes of "SmartMove@2025" for all accounts.
-- =============================================================================
PROMPT Inserting SYSTEM_USERS ...

INSERT INTO system_users (user_id, username, password_hash, full_name, role, email, created_date, is_active)
VALUES (
    seq_users_id.NEXTVAL,                           -- user_id = 1
    'admin',
    'ef92b778bafe771207985d4dc68b9a9c6a3b3c9f1e3e7a5e9b2d4f6c8e0a2b4', -- hashed
    'System Administrator',
    'admin',
    'admin@smartmove.lk',
    TO_DATE('2025-01-01', 'YYYY-MM-DD'),
    1
);

INSERT INTO system_users (user_id, username, password_hash, full_name, role, email, created_date, is_active)
VALUES (
    seq_users_id.NEXTVAL,                           -- user_id = 2
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
    seq_users_id.NEXTVAL,                           -- user_id = 3
    'viewer1',
    'ef92b778bafe771207985d4dc68b9a9c6a3b3c9f1e3e7a5e9b2d4f6c8e0a2b4',
    'Nimal Silva',
    'viewer',
    'nimal.silva@smartmove.lk',
    TO_DATE('2025-03-10', 'YYYY-MM-DD'),
    1
);


-- =============================================================================
-- SECTION 2: VEHICLES  (10 rows)
-- Fleet of buses, minibuses and vans operating Sri Lanka routes.
-- =============================================================================
PROMPT Inserting VEHICLES ...

-- Vehicle 1: Large Tata StarBus -- main highway bus
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 1
    'WP CAB-1234', 'Tata', 'StarBus Ultra',
    2021, 'bus', 52, 'diesel', 'active',
    TO_DATE('2025-08-15', 'YYYY-MM-DD'),
    TO_DATE('2025-11-15', 'YYYY-MM-DD'),
    TO_DATE('2025-01-10', 'YYYY-MM-DD')
);

-- Vehicle 2: Leyland Titan -- intercity express
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 2
    'WP CAB-5678', 'Leyland', 'Titan',
    2019, 'bus', 48, 'diesel', 'active',
    TO_DATE('2025-07-20', 'YYYY-MM-DD'),
    TO_DATE('2025-10-20', 'YYYY-MM-DD'),
    TO_DATE('2025-01-10', 'YYYY-MM-DD')
);

-- Vehicle 3: Toyota Coaster -- minibus for feeder routes
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 3
    'CP GAB-9012', 'Toyota', 'Coaster',
    2022, 'minibus', 26, 'diesel', 'active',
    TO_DATE('2025-09-01', 'YYYY-MM-DD'),
    TO_DATE('2025-12-01', 'YYYY-MM-DD'),
    TO_DATE('2025-01-15', 'YYYY-MM-DD')
);

-- Vehicle 4: Mitsubishi Rosa -- mountain routes
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 4
    'NW HAB-3456', 'Mitsubishi', 'Rosa',
    2020, 'minibus', 30, 'diesel', 'maintenance',
    TO_DATE('2025-09-10', 'YYYY-MM-DD'),
    TO_DATE('2025-09-30', 'YYYY-MM-DD'),
    TO_DATE('2025-02-01', 'YYYY-MM-DD')
);

-- Vehicle 5: KIA Pregio van -- short feeder routes
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 5
    'SG JAB-7890', 'KIA', 'Pregio',
    2023, 'van', 12, 'petrol', 'active',
    TO_DATE('2025-09-05', 'YYYY-MM-DD'),
    TO_DATE('2025-12-05', 'YYYY-MM-DD'),
    TO_DATE('2025-02-10', 'YYYY-MM-DD')
);

-- Vehicle 6: Tata Winger -- airport shuttle
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 6
    'WP LAB-2345', 'Tata', 'Winger',
    2022, 'van', 14, 'diesel', 'active',
    TO_DATE('2025-08-28', 'YYYY-MM-DD'),
    TO_DATE('2025-11-28', 'YYYY-MM-DD'),
    TO_DATE('2025-03-01', 'YYYY-MM-DD')
);

-- Vehicle 7: Ashok Leyland Falcon -- long-distance express
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 7
    'EP MAB-6789', 'Ashok Leyland', 'Falcon',
    2018, 'bus', 54, 'diesel', 'active',
    TO_DATE('2025-06-15', 'YYYY-MM-DD'),
    TO_DATE('2025-09-15', 'YYYY-MM-DD'),
    TO_DATE('2025-03-05', 'YYYY-MM-DD')
);

-- Vehicle 8: BYD electric minibus -- eco pilot fleet
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 8
    'WP NAB-1122', 'BYD', 'C9 Electric',
    2024, 'bus', 45, 'electric', 'active',
    TO_DATE('2025-09-12', 'YYYY-MM-DD'),
    TO_DATE('2025-12-12', 'YYYY-MM-DD'),
    TO_DATE('2025-04-01', 'YYYY-MM-DD')
);

-- Vehicle 9: Toyota HiAce -- tourist short trips
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 9
    'SP PAB-4433', 'Toyota', 'HiAce',
    2021, 'van', 15, 'petrol', 'inactive',
    TO_DATE('2025-05-10', 'YYYY-MM-DD'),
    TO_DATE('2025-08-10', 'YYYY-MM-DD'),
    TO_DATE('2025-04-15', 'YYYY-MM-DD')
);

-- Vehicle 10: Eicher Skyline -- Southern express
INSERT INTO vehicles (vehicle_id, registration_number, make, model, year_of_manufacture,
                      vehicle_type, seating_capacity, fuel_type, status,
                      last_maintenance_date, next_maintenance_date, created_date)
VALUES (
    seq_vehicles_id.NEXTVAL,                        -- vehicle_id = 10
    'SB QAB-9988', 'Eicher', 'Skyline',
    2020, 'bus', 50, 'diesel', 'active',
    TO_DATE('2025-08-01', 'YYYY-MM-DD'),
    TO_DATE('2025-11-01', 'YYYY-MM-DD'),
    TO_DATE('2025-05-01', 'YYYY-MM-DD')
);


-- =============================================================================
-- SECTION 3: DRIVERS  (8 rows)
-- Licensed drivers with realistic Sri Lankan names and licence numbers.
-- =============================================================================
PROMPT Inserting DRIVERS ...

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 1
        'Sunil', 'Rathnayake', 'B1234567',
        TO_DATE('2027-06-30', 'YYYY-MM-DD'),
        '0771234567', 'sunil.r@smartmove.lk',
        'available', TO_DATE('2022-03-15', 'YYYY-MM-DD'), 312, 4.75);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 2
        'Mahesh', 'Fernando', 'B2345678',
        TO_DATE('2026-12-31', 'YYYY-MM-DD'),
        '0772345678', 'mahesh.f@smartmove.lk',
        'on_trip', TO_DATE('2021-07-01', 'YYYY-MM-DD'), 489, 4.60);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 3
        'Pradeep', 'Kumara', 'B3456789',
        TO_DATE('2028-03-31', 'YYYY-MM-DD'),
        '0773456789', 'pradeep.k@smartmove.lk',
        'available', TO_DATE('2023-01-20', 'YYYY-MM-DD'), 145, 4.82);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 4
        'Roshan', 'Wickrama', 'B4567890',
        TO_DATE('2026-09-30', 'YYYY-MM-DD'),
        '0774567890', 'roshan.w@smartmove.lk',
        'off_duty', TO_DATE('2020-11-05', 'YYYY-MM-DD'), 620, 4.50);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 5
        'Chatura', 'Dissanayake', 'B5678901',
        TO_DATE('2025-12-31', 'YYYY-MM-DD'),         -- expires soon
        '0775678901', 'chatura.d@smartmove.lk',
        'available', TO_DATE('2022-06-10', 'YYYY-MM-DD'), 267, 4.30);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 6
        'Lakshan', 'Gunawardane', 'B6789012',
        TO_DATE('2027-08-31', 'YYYY-MM-DD'),
        '0776789012', 'lakshan.g@smartmove.lk',
        'on_trip', TO_DATE('2021-03-22', 'YYYY-MM-DD'), 398, 4.65);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 7
        'Thilak', 'Jayasena', 'B7890123',
        TO_DATE('2026-05-31', 'YYYY-MM-DD'),
        '0777890123', 'thilak.j@smartmove.lk',
        'available', TO_DATE('2023-08-01', 'YYYY-MM-DD'), 88, 4.90);

INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry_date,
                     phone, email, status, joined_date, total_trips, rating)
VALUES (seq_drivers_id.NEXTVAL,                     -- driver_id = 8
        'Sampath', 'Bandara', 'B8901234',
        TO_DATE('2025-11-30', 'YYYY-MM-DD'),         -- expires very soon
        '0778901234', 'sampath.b@smartmove.lk',
        'suspended', TO_DATE('2019-05-14', 'YYYY-MM-DD'), 710, 3.80);


-- =============================================================================
-- SECTION 4: ROUTES  (8 rows) + ROUTE_STOPS
-- Sri Lanka intercity and regional transport corridors.
-- =============================================================================
PROMPT Inserting ROUTES ...

-- Route 1: Colombo to Kandy (main highway)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 1
        'R001', 'Colombo Fort', 'Kandy', 115.50, 180, 350.00, 1,
        TO_DATE('2025-01-01', 'YYYY-MM-DD'));

-- Route 2: Colombo to Galle (Southern Expressway)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 2
        'R002', 'Colombo Fort', 'Galle', 116.00, 130, 320.00, 1,
        TO_DATE('2025-01-01', 'YYYY-MM-DD'));

-- Route 3: Colombo to Jaffna (North Express)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 3
        'R003', 'Colombo Fort', 'Jaffna', 395.00, 480, 950.00, 1,
        TO_DATE('2025-01-01', 'YYYY-MM-DD'));

-- Route 4: Kandy to Nuwara Eliya (Hill Country)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 4
        'R004', 'Kandy', 'Nuwara Eliya', 75.00, 150, 210.00, 1,
        TO_DATE('2025-01-15', 'YYYY-MM-DD'));

-- Route 5: Colombo to Matara (Coastal Express)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 5
        'R005', 'Colombo Fort', 'Matara', 157.00, 210, 420.00, 1,
        TO_DATE('2025-01-15', 'YYYY-MM-DD'));

-- Route 6: Colombo to Badulla (UVA Express)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 6
        'R006', 'Colombo Fort', 'Badulla', 230.00, 360, 580.00, 1,
        TO_DATE('2025-02-01', 'YYYY-MM-DD'));

-- Route 7: Colombo to Anuradhapura (Cultural Triangle)
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 7
        'R007', 'Colombo Fort', 'Anuradhapura', 207.00, 300, 510.00, 1,
        TO_DATE('2025-02-01', 'YYYY-MM-DD'));

-- Route 8: Galle to Matara (Coastal Feeder) -- currently inactive
INSERT INTO routes (route_id, route_code, origin, destination, distance_km,
                    estimated_minutes, fare_amount, is_active, created_date)
VALUES (seq_routes_id.NEXTVAL,                      -- route_id = 8
        'R008', 'Galle', 'Matara', 42.00, 55, 120.00, 0,
        TO_DATE('2025-03-01', 'YYYY-MM-DD'));


-- ------------------------------------------------------------------
-- ROUTE_STOPS: stops for each route
-- ------------------------------------------------------------------
PROMPT Inserting ROUTE_STOPS ...

-- Route 1 stops: Colombo → Kandy
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Kelaniya', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Kegalle', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Mawanella', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 1, 'Kandy', 5);

-- Route 2 stops: Colombo → Galle
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Panadura', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Aluthgama', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Ambalangoda', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 2, 'Galle', 5);

-- Route 3 stops: Colombo → Jaffna
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Kurunegala', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Vavuniya', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Kilinochchi', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 3, 'Jaffna', 5);

-- Route 4 stops: Kandy → Nuwara Eliya
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Kandy', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Gampola', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Nawalapitiya', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Hatton', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 4, 'Nuwara Eliya', 5);

-- Route 5 stops: Colombo → Matara
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Moratuwa', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Kalutara', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Galle', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 5, 'Matara', 5);

-- Route 6 stops: Colombo → Badulla
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Kandy', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Nuwara Eliya', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Welimada', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 6, 'Badulla', 5);

-- Route 7 stops: Colombo → Anuradhapura
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Colombo Fort', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Kurunegala', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Dambulla', 3);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Kekirawa', 4);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 7, 'Anuradhapura', 5);

-- Route 8 stops: Galle → Matara
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 8, 'Galle', 1);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 8, 'Hikkaduwa', 2);
INSERT INTO route_stops VALUES (seq_stops_id.NEXTVAL, 8, 'Matara', 3);


-- =============================================================================
-- SECTION 5: PASSENGERS  (15 rows)
-- Realistic Sri Lankan names, NIC numbers in new format.
-- =============================================================================
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


-- =============================================================================
-- SECTION 6: TRIPS  (15 rows)
-- Scheduled, in-progress, completed, and cancelled trips across routes.
-- =============================================================================
PROMPT Inserting TRIPS ...

-- Trip 1: R001 Colombo→Kandy, scheduled tomorrow morning
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 1, 1, 1,
    TO_TIMESTAMP('2025-09-25 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 42, 52, SYSDATE);

-- Trip 2: R002 Colombo→Galle, scheduled tomorrow morning
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 2, 2, 2,
    TO_TIMESTAMP('2025-09-25 07:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 09:10:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 30, 48, SYSDATE);

-- Trip 3: R003 Colombo→Jaffna, currently in progress
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 3, 7, 6,
    TO_TIMESTAMP('2025-09-24 18:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 02:00:00','YYYY-MM-DD HH24:MI:SS'),
    'in_progress', 10, 54, SYSDATE);

-- Trip 4: R004 Kandy→Nuwara Eliya, scheduled
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 4, 3, 3,
    TO_TIMESTAMP('2025-09-25 08:30:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 20, 26, SYSDATE);

-- Trip 5: R005 Colombo→Matara, scheduled
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 5, 10, 5,
    TO_TIMESTAMP('2025-09-25 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 12:30:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 38, 50, SYSDATE);

-- Trip 6: R006 Colombo→Badulla, scheduled
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 6, 8, 7,
    TO_TIMESTAMP('2025-09-25 05:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-25 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 35, 45, SYSDATE);

-- Trip 7: R007 Colombo→Anuradhapura, scheduled
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 7, 1, 1,
    TO_TIMESTAMP('2025-09-26 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-26 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 45, 52, SYSDATE);

-- Trip 8: R001 Colombo→Kandy, completed (yesterday)
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 1, 2, 2,
    TO_TIMESTAMP('2025-09-23 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-23 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 0, 48, SYSDATE);

-- Trip 9: R002 Colombo→Galle, completed (2 days ago)
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 2, 10, 4,
    TO_TIMESTAMP('2025-09-22 07:30:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-22 09:40:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 2, 50, SYSDATE);

-- Trip 10: R004 Kandy→Nuwara Eliya, completed (3 days ago)
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 4, 3, 3,
    TO_TIMESTAMP('2025-09-21 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-21 11:30:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 0, 26, SYSDATE);

-- Trip 11: R005 Colombo→Matara, cancelled
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 5, 9, 4,
    TO_TIMESTAMP('2025-09-20 08:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-20 11:30:00','YYYY-MM-DD HH24:MI:SS'),
    'cancelled', 15, 15, SYSDATE);

-- Trip 12: R007 Colombo→Anuradhapura, completed
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 7, 7, 6,
    TO_TIMESTAMP('2025-09-19 05:30:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-19 10:30:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 5, 54, SYSDATE);

-- Trip 13: R003 Colombo→Jaffna, completed (last week)
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 3, 7, 6,
    TO_TIMESTAMP('2025-09-17 18:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-18 02:00:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 4, 54, SYSDATE);

-- Trip 14: R001 Colombo→Kandy, scheduled (day after tomorrow)
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 1, 8, 7,
    TO_TIMESTAMP('2025-09-27 06:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-27 09:00:00','YYYY-MM-DD HH24:MI:SS'),
    'scheduled', 40, 45, SYSDATE);

-- Trip 15: R006 Colombo→Badulla, completed (last week)
INSERT INTO trips VALUES (
    seq_trips_id.NEXTVAL, 6, 8, 5,
    TO_TIMESTAMP('2025-09-16 05:00:00','YYYY-MM-DD HH24:MI:SS'),
    TO_TIMESTAMP('2025-09-16 11:00:00','YYYY-MM-DD HH24:MI:SS'),
    'completed', 6, 45, SYSDATE);


-- =============================================================================
-- SECTION 7: BOOKINGS  (30 rows)
-- Covers confirmed, completed, cancelled and pending statuses.
-- FK: trip_id references trips (1–15), passenger_id references passengers (1–15).
-- =============================================================================
PROMPT Inserting BOOKINGS ...

-- Bookings on Trip 8 (completed R001 Colombo-Kandy, Sep 23)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  1, '01A', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  2, '01B', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  3, '02A', TO_DATE('2025-09-21','YYYY-MM-DD'), 'completed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 8,  4, '02B', TO_DATE('2025-09-21','YYYY-MM-DD'), 'completed', 350.00);

-- Bookings on Trip 9 (completed R002 Colombo-Galle, Sep 22)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  5, '03A', TO_DATE('2025-09-19','YYYY-MM-DD'), 'completed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  6, '03B', TO_DATE('2025-09-19','YYYY-MM-DD'), 'completed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  7, '04A', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 9,  8, '04B', TO_DATE('2025-09-20','YYYY-MM-DD'), 'completed', 320.00);

-- Bookings on Trip 10 (completed R004 Kandy-NuwE, Sep 21)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 10,  9, '05A', TO_DATE('2025-09-18','YYYY-MM-DD'), 'completed', 210.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 10, 10, '05B', TO_DATE('2025-09-18','YYYY-MM-DD'), 'completed', 210.00);

-- Bookings on Trip 12 (completed R007 Colombo-Anuradhapura, Sep 19)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 12, 11, '06A', TO_DATE('2025-09-16','YYYY-MM-DD'), 'completed', 510.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 12, 12, '06B', TO_DATE('2025-09-16','YYYY-MM-DD'), 'completed', 510.00);

-- Bookings on Trip 13 (completed R003 Colombo-Jaffna, Sep 17)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 13, 13, '07A', TO_DATE('2025-09-14','YYYY-MM-DD'), 'completed', 950.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 13, 14, '07B', TO_DATE('2025-09-14','YYYY-MM-DD'), 'completed', 950.00);

-- Bookings on Trip 15 (completed R006 Colombo-Badulla, Sep 16)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 15, 15, '08A', TO_DATE('2025-09-13','YYYY-MM-DD'), 'completed', 580.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 15,  1, '08B', TO_DATE('2025-09-13','YYYY-MM-DD'), 'completed', 580.00);

-- Bookings on Trip 1 (scheduled R001 Colombo-Kandy, Sep 25 tomorrow)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  1,  2, '09A', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  1,  3, '09B', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 350.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  1,  4, '10A', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 350.00);

-- Bookings on Trip 2 (scheduled R002 Colombo-Galle, Sep 25)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  2,  5, '11A', TO_DATE('2025-09-22','YYYY-MM-DD'), 'confirmed', 320.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  2,  6, '11B', TO_DATE('2025-09-22','YYYY-MM-DD'), 'confirmed', 320.00);

-- Bookings on Trip 3 (in_progress R003 Colombo-Jaffna)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  3,  7, '12A', TO_DATE('2025-09-21','YYYY-MM-DD'), 'confirmed', 950.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  3,  8, '12B', TO_DATE('2025-09-21','YYYY-MM-DD'), 'confirmed', 950.00);

-- Bookings on Trip 4 (scheduled R004 Kandy-NuwE)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  4,  9, '13A', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 210.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  4, 10, '13B', TO_DATE('2025-09-23','YYYY-MM-DD'), 'confirmed', 210.00);

-- Cancelled booking on cancelled Trip 11
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 11, 11, '14A', TO_DATE('2025-09-17','YYYY-MM-DD'), 'cancelled', 420.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL, 11, 12, '14B', TO_DATE('2025-09-17','YYYY-MM-DD'), 'cancelled', 420.00);

-- Pending bookings on Trip 5 (scheduled Colombo-Matara)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  5, 13, '15A', TO_DATE('2025-09-24','YYYY-MM-DD'), 'pending',   420.00);
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  5, 14, '15B', TO_DATE('2025-09-24','YYYY-MM-DD'), 'pending',   420.00);

-- Confirmed booking on Trip 6 (scheduled Colombo-Badulla)
INSERT INTO bookings VALUES (seq_bookings_id.NEXTVAL,  6, 15, '16A', TO_DATE('2025-09-22','YYYY-MM-DD'), 'confirmed', 580.00);


-- =============================================================================
-- SECTION 8: PAYMENTS  (30 rows, one per booking)
-- payment_id 1-16 are 'paid', 17-24 are 'paid' (confirmed trips),
-- 25-26 are 'refunded' (cancelled), 27-28 are 'pending', 29-30 are 'paid'.
-- transaction_ref format: TXN-YYYYMMDD-NNNN
-- =============================================================================
PROMPT Inserting PAYMENTS ...

-- Payments for completed bookings (booking_id 1-16)
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

-- Payments for upcoming confirmed bookings (booking_id 17-24)
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 17, 350.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250923-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 18, 350.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250923-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 19, 350.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250923-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 20, 320.00, TO_DATE('2025-09-22','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250922-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 21, 320.00, TO_DATE('2025-09-22','YYYY-MM-DD'), 'cash',          'paid',    'TXN-20250922-0002');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 22, 950.00, TO_DATE('2025-09-21','YYYY-MM-DD'), 'bank_transfer', 'paid',    'TXN-20250921-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 23, 950.00, TO_DATE('2025-09-21','YYYY-MM-DD'), 'card',          'paid',    'TXN-20250921-0004');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 24, 210.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'online',        'paid',    'TXN-20250923-0004');

-- Refunded payments for cancelled bookings (booking_id 25-26)
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 25, 420.00, TO_DATE('2025-09-17','YYYY-MM-DD'), 'card',          'refunded','TXN-20250917-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 26, 420.00, TO_DATE('2025-09-17','YYYY-MM-DD'), 'online',        'refunded','TXN-20250917-0002');

-- Pending payments for pending bookings (booking_id 27-28)
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 27, 420.00, TO_DATE('2025-09-24','YYYY-MM-DD'), 'card',          'pending', 'TXN-20250924-0001');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 28, 420.00, TO_DATE('2025-09-24','YYYY-MM-DD'), 'online',        'pending', 'TXN-20250924-0002');

-- Confirmed payment for Trip 6 booking (booking_id 29)
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 29, 580.00, TO_DATE('2025-09-22','YYYY-MM-DD'), 'bank_transfer', 'paid',    'TXN-20250922-0003');
INSERT INTO payments VALUES (seq_payments_id.NEXTVAL, 30, 210.00, TO_DATE('2025-09-23','YYYY-MM-DD'), 'cash',          'paid',    'TXN-20250923-0005');


-- =============================================================================
-- SECTION 9: MAINTENANCE_RECORDS  (8 rows)
-- Mix of completed, scheduled, in_progress and overdue statuses.
-- =============================================================================
PROMPT Inserting MAINTENANCE_RECORDS ...

-- Vehicle 1: Routine oil change (completed)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 1, 'routine',
    'Engine oil and filter change, tyre pressure check, brake fluid top-up.',
    TO_DATE('2025-08-15','YYYY-MM-DD'),
    TO_DATE('2025-08-15','YYYY-MM-DD'),
    8500.00, 'completed', 'K. Jayantha - Fleet Garage Colombo',
    TO_DATE('2025-08-10','YYYY-MM-DD')
);

-- Vehicle 2: Inspection (completed)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 2, 'inspection',
    'Annual roadworthiness inspection by Department of Motor Traffic.',
    TO_DATE('2025-07-20','YYYY-MM-DD'),
    TO_DATE('2025-07-20','YYYY-MM-DD'),
    3000.00, 'completed', 'DMT Inspector - Werahera',
    TO_DATE('2025-07-15','YYYY-MM-DD')
);

-- Vehicle 4: Repair (currently in_progress -- vehicle in maintenance status)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 4, 'repair',
    'Gearbox overhaul required following vibration complaint from driver. Parts ordered.',
    TO_DATE('2025-09-10','YYYY-MM-DD'),
    NULL,
    45000.00, 'in_progress', 'R. Niroshan - AutoFix Kandy',
    TO_DATE('2025-09-08','YYYY-MM-DD')
);

-- Vehicle 7: Overdue routine maintenance
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 7, 'routine',
    'Scheduled 3-month service: engine check, belt replacement, coolant flush.',
    TO_DATE('2025-09-15','YYYY-MM-DD'),
    NULL,
    12000.00, 'overdue', 'Pending Assignment',
    TO_DATE('2025-09-01','YYYY-MM-DD')
);

-- Vehicle 3: Upcoming routine (scheduled next month)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 3, 'routine',
    'Quarterly service: air filter, spark plugs, clutch plate inspection.',
    TO_DATE('2025-12-01','YYYY-MM-DD'),
    NULL,
    9500.00, 'scheduled', 'TBD - Fleet Garage Colombo',
    TO_DATE('2025-09-20','YYYY-MM-DD')
);

-- Vehicle 8: Inspection (scheduled)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 8, 'inspection',
    'Electric vehicle battery health check and charging system inspection.',
    TO_DATE('2025-12-12','YYYY-MM-DD'),
    NULL,
    5000.00, 'scheduled', 'BYD Certified Technician',
    TO_DATE('2025-09-22','YYYY-MM-DD')
);

-- Vehicle 5: Emergency repair (completed)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 5, 'emergency',
    'Flat tyre mid-route on A4 highway. Tyre replaced roadside.',
    TO_DATE('2025-09-05','YYYY-MM-DD'),
    TO_DATE('2025-09-05','YYYY-MM-DD'),
    4200.00, 'completed', 'Roadside Assist - Negombo',
    TO_DATE('2025-09-05','YYYY-MM-DD')
);

-- Vehicle 10: Upcoming routine (scheduled Nov)
INSERT INTO maintenance_records VALUES (
    seq_maintenance_id.NEXTVAL, 10, 'routine',
    '6-month major service: engine oil, all filters, brake pads, wheel alignment.',
    TO_DATE('2025-11-01','YYYY-MM-DD'),
    NULL,
    15000.00, 'scheduled', 'Eicher Service Centre - Colombo',
    TO_DATE('2025-09-20','YYYY-MM-DD')
);


-- =============================================================================
-- SECTION 10: FEEDBACK  (10 rows)
-- Passengers rate completed trips; ratings range 3–5.
-- FK: passenger_id, trip_id, driver_id, vehicle_id must match existing rows.
-- Trips 8, 9, 10, 12, 13, 15 are completed; trips 3 is in_progress (allowed).
-- =============================================================================
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

-- =============================================================================
-- COMMIT all inserted data to the database
-- =============================================================================
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
