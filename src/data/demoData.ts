// ============================================================
// SmartMove Transport Solutions — Realistic Demo Data
// This file is used for the web demo. Oracle sample data
// is in database/oracle/04_sample_data.sql
// ============================================================

import type {
  Vehicle, Driver, Route, Passenger, Trip,
  Booking, Payment, MaintenanceRecord, Feedback
} from '../types';

// ---- VEHICLES (10 records) ---------------------------------
export const vehicles: Vehicle[] = [
  { id: 1, registrationNumber: 'WP-CAB-1234', make: 'Tata', model: 'Starbus', year: 2021, type: 'bus', capacity: 45, status: 'active', fuelType: 'diesel', lastMaintenanceDate: '2024-11-15', nextMaintenanceDate: '2025-05-15' },
  { id: 2, registrationNumber: 'WP-CAD-5678', make: 'Ashok Leyland', model: 'Viking', year: 2020, type: 'bus', capacity: 50, status: 'active', fuelType: 'diesel', lastMaintenanceDate: '2024-12-01', nextMaintenanceDate: '2025-06-01' },
  { id: 3, registrationNumber: 'CP-GHF-9012', make: 'Toyota', model: 'HiAce', year: 2022, type: 'van', capacity: 14, status: 'active', fuelType: 'petrol', lastMaintenanceDate: '2025-01-20', nextMaintenanceDate: '2025-07-20' },
  { id: 4, registrationNumber: 'SP-KLM-3456', make: 'Toyota', model: 'Coaster', year: 2019, type: 'minibus', capacity: 24, status: 'maintenance', fuelType: 'diesel', lastMaintenanceDate: '2024-09-10', nextMaintenanceDate: '2025-03-10' },
  { id: 5, registrationNumber: 'NW-PQR-7890', make: 'Tata', model: 'Winger', year: 2023, type: 'van', capacity: 12, status: 'active', fuelType: 'diesel', lastMaintenanceDate: '2025-02-05', nextMaintenanceDate: '2025-08-05' },
  { id: 6, registrationNumber: 'EP-STU-2345', make: 'Ashok Leyland', model: 'Lynx', year: 2021, type: 'bus', capacity: 40, status: 'active', fuelType: 'diesel', lastMaintenanceDate: '2024-10-25', nextMaintenanceDate: '2025-04-25' },
  { id: 7, registrationNumber: 'WP-VWX-6789', make: 'BYD', model: 'eBus', year: 2024, type: 'bus', capacity: 40, status: 'active', fuelType: 'electric', lastMaintenanceDate: '2025-01-10', nextMaintenanceDate: '2025-07-10' },
  { id: 8, registrationNumber: 'SB-YZA-1357', make: 'Toyota', model: 'HiAce', year: 2020, type: 'van', capacity: 14, status: 'inactive', fuelType: 'petrol', lastMaintenanceDate: '2024-08-30', nextMaintenanceDate: '2025-02-28' },
  { id: 9, registrationNumber: 'NC-BCD-2468', make: 'Tata', model: 'Starbus Ultra', year: 2022, type: 'bus', capacity: 52, status: 'active', fuelType: 'diesel', lastMaintenanceDate: '2024-12-20', nextMaintenanceDate: '2025-06-20' },
  { id: 10, registrationNumber: 'WP-EFG-3579', make: 'Ashok Leyland', model: 'Mitr', year: 2023, type: 'minibus', capacity: 20, status: 'active', fuelType: 'diesel', lastMaintenanceDate: '2025-03-01', nextMaintenanceDate: '2025-09-01' },
];

// ---- DRIVERS (8 records) -----------------------------------
export const drivers: Driver[] = [
  { id: 1, firstName: 'Kamal', lastName: 'Perera', licenseNumber: 'B1234567', licenseExpiry: '2027-04-15', phone: '071-234-5678', email: 'kamal.perera@smartmove.lk', status: 'available', joinedDate: '2020-06-01', totalTrips: 342, rating: 4.7 },
  { id: 2, firstName: 'Nimal', lastName: 'Silva', licenseNumber: 'B2345678', licenseExpiry: '2026-09-22', phone: '072-345-6789', email: 'nimal.silva@smartmove.lk', status: 'on_trip', joinedDate: '2019-03-15', totalTrips: 508, rating: 4.5 },
  { id: 3, firstName: 'Sunil', lastName: 'Fernando', licenseNumber: 'B3456789', licenseExpiry: '2028-01-30', phone: '077-456-7890', email: 'sunil.fernando@smartmove.lk', status: 'available', joinedDate: '2021-11-10', totalTrips: 215, rating: 4.8 },
  { id: 4, firstName: 'Ruwan', lastName: 'Jayasinghe', licenseNumber: 'B4567890', licenseExpiry: '2025-11-05', phone: '070-567-8901', email: 'ruwan.j@smartmove.lk', status: 'off_duty', joinedDate: '2018-07-20', totalTrips: 621, rating: 4.3 },
  { id: 5, firstName: 'Asanka', lastName: 'Dissanayake', licenseNumber: 'B5678901', licenseExpiry: '2027-06-18', phone: '075-678-9012', email: 'asanka.d@smartmove.lk', status: 'available', joinedDate: '2022-02-28', totalTrips: 178, rating: 4.6 },
  { id: 6, firstName: 'Chaminda', lastName: 'Rathnayake', licenseNumber: 'B6789012', licenseExpiry: '2026-12-31', phone: '076-789-0123', email: 'chaminda.r@smartmove.lk', status: 'on_trip', joinedDate: '2020-09-05', totalTrips: 389, rating: 4.4 },
  { id: 7, firstName: 'Priyantha', lastName: 'Kumara', licenseNumber: 'B7890123', licenseExpiry: '2027-03-14', phone: '078-890-1234', email: 'priyantha.k@smartmove.lk', status: 'available', joinedDate: '2021-04-12', totalTrips: 267, rating: 4.9 },
  { id: 8, firstName: 'Dinesh', lastName: 'Wickramasinghe', licenseNumber: 'B8901234', licenseExpiry: '2025-08-20', phone: '074-901-2345', email: 'dinesh.w@smartmove.lk', status: 'suspended', joinedDate: '2017-12-01', totalTrips: 712, rating: 3.8 },
];

// ---- ROUTES (8 records) ------------------------------------
export const routes: Route[] = [
  { id: 1, routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', stops: ['Kelaniya', 'Kadawatha', 'Nittambuwa', 'Kegalle'], distanceKm: 115, estimatedMinutes: 165, fareAmount: 350, isActive: true },
  { id: 2, routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', stops: ['Moratuwa', 'Panadura', 'Kalutara', 'Hikkaduwa'], distanceKm: 119, estimatedMinutes: 180, fareAmount: 320, isActive: true },
  { id: 3, routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', stops: ['Peradeniya', 'Gampola', 'Nawalapitiya'], distanceKm: 78, estimatedMinutes: 120, fareAmount: 250, isActive: true },
  { id: 4, routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', stops: ['Kurunegala', 'Dambulla', 'Vavuniya'], distanceKm: 398, estimatedMinutes: 480, fareAmount: 900, isActive: true },
  { id: 5, routeCode: 'R005', origin: 'Colombo', destination: 'Anuradhapura', stops: ['Kurunegala', 'Mihintale'], distanceKm: 205, estimatedMinutes: 270, fareAmount: 550, isActive: true },
  { id: 6, routeCode: 'R006', origin: 'Colombo', destination: 'Matara', stops: ['Moratuwa', 'Panadura', 'Aluthgama', 'Hikkaduwa', 'Galle'], distanceKm: 160, estimatedMinutes: 210, fareAmount: 420, isActive: true },
  { id: 7, routeCode: 'R007', origin: 'Kandy', destination: 'Badulla', stops: ['Peradeniya', 'Nuwara Eliya', 'Bandarawela'], distanceKm: 125, estimatedMinutes: 195, fareAmount: 380, isActive: true },
  { id: 8, routeCode: 'R008', origin: 'Colombo', destination: 'Trincomalee', stops: ['Kurunegala', 'Dambulla', 'Habarana'], distanceKm: 257, estimatedMinutes: 330, fareAmount: 650, isActive: false },
];

// ---- PASSENGERS (15 records) --------------------------------
export const passengers: Passenger[] = [
  { id: 1, firstName: 'Amali', lastName: 'Gunasekara', email: 'amali.g@email.com', phone: '071-111-2222', address: 'No.12, Main St, Colombo 07', registeredDate: '2023-01-15', totalBookings: 8, passportOrNic: '198512345678' },
  { id: 2, firstName: 'Bandara', lastName: 'Senanayake', email: 'bandara.s@email.com', phone: '072-222-3333', address: '45 Temple Rd, Kandy', registeredDate: '2023-02-20', totalBookings: 12, passportOrNic: '197823456789' },
  { id: 3, firstName: 'Chathu', lastName: 'Rajapaksha', email: 'chathu.r@email.com', phone: '077-333-4444', address: '8/A Galle Rd, Matara', registeredDate: '2023-03-10', totalBookings: 5, passportOrNic: '200134567890' },
  { id: 4, firstName: 'Dilini', lastName: 'Wijewardena', email: 'dilini.w@email.com', phone: '070-444-5555', address: '23 Lake View, Colombo 03', registeredDate: '2023-04-05', totalBookings: 18, passportOrNic: '199045678901' },
  { id: 5, firstName: 'Eshan', lastName: 'Mendis', email: 'eshan.m@email.com', phone: '075-555-6666', address: '56 Hill St, Nuwara Eliya', registeredDate: '2023-05-12', totalBookings: 3, passportOrNic: '199556789012' },
  { id: 6, firstName: 'Fathima', lastName: 'Nazeer', email: 'fathima.n@email.com', phone: '076-666-7777', address: '12 Main Rd, Negombo', registeredDate: '2023-06-18', totalBookings: 7, passportOrNic: '198867890123' },
  { id: 7, firstName: 'Gayan', lastName: 'Prasad', email: 'gayan.p@email.com', phone: '078-777-8888', address: '34 Raja Mawatha, Anuradhapura', registeredDate: '2023-07-22', totalBookings: 10, passportOrNic: '199278901234' },
  { id: 8, firstName: 'Hasini', lastName: 'Bandara', email: 'hasini.b@email.com', phone: '074-888-9999', address: '67 Park Rd, Galle', registeredDate: '2023-08-30', totalBookings: 6, passportOrNic: '200089012345' },
  { id: 9, firstName: 'Isuru', lastName: 'Lakshan', email: 'isuru.l@email.com', phone: '071-999-0000', address: '90 Station Rd, Kurunegala', registeredDate: '2023-09-14', totalBookings: 14, passportOrNic: '199890123456' },
  { id: 10, firstName: 'Jayani', lastName: 'Madushanka', email: 'jayani.m@email.com', phone: '072-000-1111', address: '11 Sea View, Trincomalee', registeredDate: '2023-10-05', totalBookings: 4, passportOrNic: '200001234567' },
  { id: 11, firstName: 'Kasun', lastName: 'Pathirana', email: 'kasun.p@email.com', phone: '077-111-2222', address: '78 Highland Rd, Badulla', registeredDate: '2023-11-20', totalBookings: 9, passportOrNic: '199312345678' },
  { id: 12, firstName: 'Lakmali', lastName: 'Jayawardena', email: 'lakmali.j@email.com', phone: '070-222-3333', address: '45 Lotus Rd, Colombo 10', registeredDate: '2023-12-08', totalBookings: 11, passportOrNic: '199623456789' },
  { id: 13, firstName: 'Malith', lastName: 'Gunawardena', email: 'malith.g@email.com', phone: '075-333-4444', address: '23 Green Path, Colombo 04', registeredDate: '2024-01-15', totalBookings: 2, passportOrNic: '200434567890' },
  { id: 14, firstName: 'Nadeesha', lastName: 'Samaraweera', email: 'nadeesha.s@email.com', phone: '076-444-5555', address: '56 Fort Rd, Jaffna', registeredDate: '2024-02-10', totalBookings: 16, passportOrNic: '198745678901' },
  { id: 15, firstName: 'Osanda', lastName: 'Thilakaratne', email: 'osanda.t@email.com', phone: '078-555-6666', address: '89 Canal Rd, Kalutara', registeredDate: '2024-03-22', totalBookings: 7, passportOrNic: '199956789012' },
];

// ---- TRIPS (15 records) ------------------------------------
export const trips: Trip[] = [
  { id: 1, routeId: 1, vehicleId: 1, driverId: 1, departureTime: '2025-09-25T06:00:00', arrivalTime: '2025-09-25T08:45:00', status: 'scheduled', availableSeats: 20, totalSeats: 45, routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', vehicleReg: 'WP-CAB-1234', driverName: 'Kamal Perera' },
  { id: 2, routeId: 2, vehicleId: 2, driverId: 2, departureTime: '2025-09-25T07:30:00', arrivalTime: '2025-09-25T10:30:00', status: 'scheduled', availableSeats: 15, totalSeats: 50, routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', vehicleReg: 'WP-CAD-5678', driverName: 'Nimal Silva' },
  { id: 3, routeId: 3, vehicleId: 3, driverId: 3, departureTime: '2025-09-25T08:00:00', arrivalTime: '2025-09-25T10:00:00', status: 'in_progress', availableSeats: 3, totalSeats: 14, routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', vehicleReg: 'CP-GHF-9012', driverName: 'Sunil Fernando' },
  { id: 4, routeId: 1, vehicleId: 6, driverId: 5, departureTime: '2025-09-25T09:00:00', arrivalTime: '2025-09-25T11:45:00', status: 'scheduled', availableSeats: 30, totalSeats: 40, routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', vehicleReg: 'EP-STU-2345', driverName: 'Asanka Dissanayake' },
  { id: 5, routeId: 4, vehicleId: 9, driverId: 6, departureTime: '2025-09-25T05:00:00', arrivalTime: '2025-09-25T13:00:00', status: 'in_progress', availableSeats: 0, totalSeats: 52, routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', vehicleReg: 'NC-BCD-2468', driverName: 'Chaminda Rathnayake' },
  { id: 6, routeId: 5, vehicleId: 1, driverId: 7, departureTime: '2025-09-25T13:00:00', arrivalTime: '2025-09-25T17:30:00', status: 'scheduled', availableSeats: 35, totalSeats: 45, routeCode: 'R005', origin: 'Colombo', destination: 'Anuradhapura', vehicleReg: 'WP-CAB-1234', driverName: 'Priyantha Kumara' },
  { id: 7, routeId: 2, vehicleId: 7, driverId: 1, departureTime: '2025-09-25T14:00:00', arrivalTime: '2025-09-25T17:00:00', status: 'scheduled', availableSeats: 28, totalSeats: 40, routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', vehicleReg: 'WP-VWX-6789', driverName: 'Kamal Perera' },
  { id: 8, routeId: 6, vehicleId: 2, driverId: 3, departureTime: '2025-09-26T06:30:00', arrivalTime: '2025-09-26T10:00:00', status: 'scheduled', availableSeats: 40, totalSeats: 50, routeCode: 'R006', origin: 'Colombo', destination: 'Matara', vehicleReg: 'WP-CAD-5678', driverName: 'Sunil Fernando' },
  { id: 9, routeId: 7, vehicleId: 10, driverId: 5, departureTime: '2025-09-26T07:00:00', arrivalTime: '2025-09-26T10:15:00', status: 'scheduled', availableSeats: 18, totalSeats: 20, routeCode: 'R007', origin: 'Kandy', destination: 'Badulla', vehicleReg: 'WP-EFG-3579', driverName: 'Asanka Dissanayake' },
  { id: 10, routeId: 1, vehicleId: 6, driverId: 2, departureTime: '2025-09-24T06:00:00', arrivalTime: '2025-09-24T08:45:00', status: 'completed', availableSeats: 0, totalSeats: 40, routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', vehicleReg: 'EP-STU-2345', driverName: 'Nimal Silva' },
  { id: 11, routeId: 2, vehicleId: 1, driverId: 4, departureTime: '2025-09-24T08:00:00', arrivalTime: '2025-09-24T11:00:00', status: 'completed', availableSeats: 5, totalSeats: 45, routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', vehicleReg: 'WP-CAB-1234', driverName: 'Ruwan Jayasinghe' },
  { id: 12, routeId: 3, vehicleId: 5, driverId: 7, departureTime: '2025-09-24T09:00:00', arrivalTime: '2025-09-24T11:00:00', status: 'completed', availableSeats: 0, totalSeats: 12, routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', vehicleReg: 'NW-PQR-7890', driverName: 'Priyantha Kumara' },
  { id: 13, routeId: 5, vehicleId: 9, driverId: 3, departureTime: '2025-09-24T05:30:00', arrivalTime: '2025-09-24T10:00:00', status: 'completed', availableSeats: 8, totalSeats: 52, routeCode: 'R005', origin: 'Colombo', destination: 'Anuradhapura', vehicleReg: 'NC-BCD-2468', driverName: 'Sunil Fernando' },
  { id: 14, routeId: 6, vehicleId: 10, driverId: 6, departureTime: '2025-09-23T07:00:00', arrivalTime: '2025-09-23T10:30:00', status: 'completed', availableSeats: 0, totalSeats: 20, routeCode: 'R006', origin: 'Colombo', destination: 'Matara', vehicleReg: 'WP-EFG-3579', driverName: 'Chaminda Rathnayake' },
  { id: 15, routeId: 4, vehicleId: 9, driverId: 1, departureTime: '2025-09-23T05:00:00', arrivalTime: '2025-09-23T13:00:00', status: 'cancelled', availableSeats: 52, totalSeats: 52, routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', vehicleReg: 'NC-BCD-2468', driverName: 'Kamal Perera' },
];

// ---- BOOKINGS (30 records) ----------------------------------
export const bookings: Booking[] = [
  { id: 1, tripId: 1, passengerId: 1, seatNumber: 'A01', bookingDate: '2025-09-20', status: 'confirmed', amount: 350, passengerName: 'Amali Gunasekara', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-25T06:00:00' },
  { id: 2, tripId: 1, passengerId: 2, seatNumber: 'A02', bookingDate: '2025-09-20', status: 'confirmed', amount: 350, passengerName: 'Bandara Senanayake', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-25T06:00:00' },
  { id: 3, tripId: 2, passengerId: 3, seatNumber: 'B05', bookingDate: '2025-09-21', status: 'confirmed', amount: 320, passengerName: 'Chathu Rajapaksha', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-25T07:30:00' },
  { id: 4, tripId: 2, passengerId: 4, seatNumber: 'B06', bookingDate: '2025-09-21', status: 'confirmed', amount: 320, passengerName: 'Dilini Wijewardena', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-25T07:30:00' },
  { id: 5, tripId: 3, passengerId: 5, seatNumber: 'C01', bookingDate: '2025-09-22', status: 'confirmed', amount: 250, passengerName: 'Eshan Mendis', routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', departureTime: '2025-09-25T08:00:00' },
  { id: 6, tripId: 3, passengerId: 6, seatNumber: 'C02', bookingDate: '2025-09-22', status: 'confirmed', amount: 250, passengerName: 'Fathima Nazeer', routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', departureTime: '2025-09-25T08:00:00' },
  { id: 7, tripId: 5, passengerId: 7, seatNumber: 'D10', bookingDate: '2025-09-18', status: 'confirmed', amount: 900, passengerName: 'Gayan Prasad', routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', departureTime: '2025-09-25T05:00:00' },
  { id: 8, tripId: 5, passengerId: 8, seatNumber: 'D11', bookingDate: '2025-09-18', status: 'confirmed', amount: 900, passengerName: 'Hasini Bandara', routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', departureTime: '2025-09-25T05:00:00' },
  { id: 9, tripId: 5, passengerId: 9, seatNumber: 'D12', bookingDate: '2025-09-19', status: 'confirmed', amount: 900, passengerName: 'Isuru Lakshan', routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', departureTime: '2025-09-25T05:00:00' },
  { id: 10, tripId: 6, passengerId: 10, seatNumber: 'A05', bookingDate: '2025-09-22', status: 'confirmed', amount: 550, passengerName: 'Jayani Madushanka', routeCode: 'R005', origin: 'Colombo', destination: 'Anuradhapura', departureTime: '2025-09-25T13:00:00' },
  { id: 11, tripId: 10, passengerId: 11, seatNumber: 'B01', bookingDate: '2025-09-22', status: 'completed', amount: 350, passengerName: 'Kasun Pathirana', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-24T06:00:00' },
  { id: 12, tripId: 10, passengerId: 12, seatNumber: 'B02', bookingDate: '2025-09-22', status: 'completed', amount: 350, passengerName: 'Lakmali Jayawardena', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-24T06:00:00' },
  { id: 13, tripId: 11, passengerId: 13, seatNumber: 'A10', bookingDate: '2025-09-22', status: 'completed', amount: 320, passengerName: 'Malith Gunawardena', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-24T08:00:00' },
  { id: 14, tripId: 11, passengerId: 14, seatNumber: 'A11', bookingDate: '2025-09-22', status: 'completed', amount: 320, passengerName: 'Nadeesha Samaraweera', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-24T08:00:00' },
  { id: 15, tripId: 12, passengerId: 15, seatNumber: 'C03', bookingDate: '2025-09-22', status: 'completed', amount: 250, passengerName: 'Osanda Thilakaratne', routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', departureTime: '2025-09-24T09:00:00' },
  { id: 16, tripId: 12, passengerId: 1, seatNumber: 'C04', bookingDate: '2025-09-22', status: 'completed', amount: 250, passengerName: 'Amali Gunasekara', routeCode: 'R003', origin: 'Kandy', destination: 'Nuwara Eliya', departureTime: '2025-09-24T09:00:00' },
  { id: 17, tripId: 13, passengerId: 2, seatNumber: 'A20', bookingDate: '2025-09-21', status: 'completed', amount: 550, passengerName: 'Bandara Senanayake', routeCode: 'R005', origin: 'Colombo', destination: 'Anuradhapura', departureTime: '2025-09-24T05:30:00' },
  { id: 18, tripId: 13, passengerId: 3, seatNumber: 'A21', bookingDate: '2025-09-21', status: 'completed', amount: 550, passengerName: 'Chathu Rajapaksha', routeCode: 'R005', origin: 'Colombo', destination: 'Anuradhapura', departureTime: '2025-09-24T05:30:00' },
  { id: 19, tripId: 14, passengerId: 4, seatNumber: 'A01', bookingDate: '2025-09-20', status: 'completed', amount: 420, passengerName: 'Dilini Wijewardena', routeCode: 'R006', origin: 'Colombo', destination: 'Matara', departureTime: '2025-09-23T07:00:00' },
  { id: 20, tripId: 14, passengerId: 5, seatNumber: 'A02', bookingDate: '2025-09-20', status: 'completed', amount: 420, passengerName: 'Eshan Mendis', routeCode: 'R006', origin: 'Colombo', destination: 'Matara', departureTime: '2025-09-23T07:00:00' },
  { id: 21, tripId: 15, passengerId: 6, seatNumber: 'B15', bookingDate: '2025-09-19', status: 'cancelled', amount: 900, passengerName: 'Fathima Nazeer', routeCode: 'R004', origin: 'Colombo', destination: 'Jaffna', departureTime: '2025-09-23T05:00:00' },
  { id: 22, tripId: 4, passengerId: 7, seatNumber: 'A03', bookingDate: '2025-09-23', status: 'confirmed', amount: 350, passengerName: 'Gayan Prasad', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-25T09:00:00' },
  { id: 23, tripId: 4, passengerId: 8, seatNumber: 'A04', bookingDate: '2025-09-23', status: 'confirmed', amount: 350, passengerName: 'Hasini Bandara', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-25T09:00:00' },
  { id: 24, tripId: 7, passengerId: 9, seatNumber: 'C10', bookingDate: '2025-09-23', status: 'confirmed', amount: 320, passengerName: 'Isuru Lakshan', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-25T14:00:00' },
  { id: 25, tripId: 7, passengerId: 10, seatNumber: 'C11', bookingDate: '2025-09-23', status: 'pending', amount: 320, passengerName: 'Jayani Madushanka', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-25T14:00:00' },
  { id: 26, tripId: 8, passengerId: 11, seatNumber: 'D05', bookingDate: '2025-09-24', status: 'confirmed', amount: 420, passengerName: 'Kasun Pathirana', routeCode: 'R006', origin: 'Colombo', destination: 'Matara', departureTime: '2025-09-26T06:30:00' },
  { id: 27, tripId: 9, passengerId: 12, seatNumber: 'E01', bookingDate: '2025-09-24', status: 'confirmed', amount: 380, passengerName: 'Lakmali Jayawardena', routeCode: 'R007', origin: 'Kandy', destination: 'Badulla', departureTime: '2025-09-26T07:00:00' },
  { id: 28, tripId: 9, passengerId: 13, seatNumber: 'E02', bookingDate: '2025-09-24', status: 'confirmed', amount: 380, passengerName: 'Malith Gunawardena', routeCode: 'R007', origin: 'Kandy', destination: 'Badulla', departureTime: '2025-09-26T07:00:00' },
  { id: 29, tripId: 1, passengerId: 14, seatNumber: 'A15', bookingDate: '2025-09-21', status: 'confirmed', amount: 350, passengerName: 'Nadeesha Samaraweera', routeCode: 'R001', origin: 'Colombo Fort', destination: 'Kandy', departureTime: '2025-09-25T06:00:00' },
  { id: 30, tripId: 2, passengerId: 15, seatNumber: 'B20', bookingDate: '2025-09-21', status: 'confirmed', amount: 320, passengerName: 'Osanda Thilakaratne', routeCode: 'R002', origin: 'Colombo Fort', destination: 'Galle', departureTime: '2025-09-25T07:30:00' },
];

// ---- PAYMENTS --------------------------------------------------
export const payments: Payment[] = [
  { id: 1, bookingId: 1, amount: 350, paymentDate: '2025-09-20', method: 'card', status: 'paid', transactionRef: 'TXN-20250920-001', passengerName: 'Amali Gunasekara', routeCode: 'R001' },
  { id: 2, bookingId: 2, amount: 350, paymentDate: '2025-09-20', method: 'online', status: 'paid', transactionRef: 'TXN-20250920-002', passengerName: 'Bandara Senanayake', routeCode: 'R001' },
  { id: 3, bookingId: 3, amount: 320, paymentDate: '2025-09-21', method: 'card', status: 'paid', transactionRef: 'TXN-20250921-001', passengerName: 'Chathu Rajapaksha', routeCode: 'R002' },
  { id: 4, bookingId: 4, amount: 320, paymentDate: '2025-09-21', method: 'cash', status: 'paid', transactionRef: 'TXN-20250921-002', passengerName: 'Dilini Wijewardena', routeCode: 'R002' },
  { id: 5, bookingId: 5, amount: 250, paymentDate: '2025-09-22', method: 'online', status: 'paid', transactionRef: 'TXN-20250922-001', passengerName: 'Eshan Mendis', routeCode: 'R003' },
  { id: 6, bookingId: 6, amount: 250, paymentDate: '2025-09-22', method: 'card', status: 'paid', transactionRef: 'TXN-20250922-002', passengerName: 'Fathima Nazeer', routeCode: 'R003' },
  { id: 7, bookingId: 7, amount: 900, paymentDate: '2025-09-18', method: 'bank_transfer', status: 'paid', transactionRef: 'TXN-20250918-001', passengerName: 'Gayan Prasad', routeCode: 'R004' },
  { id: 8, bookingId: 8, amount: 900, paymentDate: '2025-09-18', method: 'bank_transfer', status: 'paid', transactionRef: 'TXN-20250918-002', passengerName: 'Hasini Bandara', routeCode: 'R004' },
  { id: 9, bookingId: 9, amount: 900, paymentDate: '2025-09-19', method: 'card', status: 'paid', transactionRef: 'TXN-20250919-001', passengerName: 'Isuru Lakshan', routeCode: 'R004' },
  { id: 10, bookingId: 10, amount: 550, paymentDate: '2025-09-22', method: 'online', status: 'paid', transactionRef: 'TXN-20250922-003', passengerName: 'Jayani Madushanka', routeCode: 'R005' },
  { id: 11, bookingId: 11, amount: 350, paymentDate: '2025-09-22', method: 'card', status: 'paid', transactionRef: 'TXN-20250922-004', passengerName: 'Kasun Pathirana', routeCode: 'R001' },
  { id: 12, bookingId: 12, amount: 350, paymentDate: '2025-09-22', method: 'cash', status: 'paid', transactionRef: 'TXN-20250922-005', passengerName: 'Lakmali Jayawardena', routeCode: 'R001' },
  { id: 13, bookingId: 13, amount: 320, paymentDate: '2025-09-22', method: 'card', status: 'paid', transactionRef: 'TXN-20250922-006', passengerName: 'Malith Gunawardena', routeCode: 'R002' },
  { id: 14, bookingId: 14, amount: 320, paymentDate: '2025-09-22', method: 'online', status: 'paid', transactionRef: 'TXN-20250922-007', passengerName: 'Nadeesha Samaraweera', routeCode: 'R002' },
  { id: 15, bookingId: 15, amount: 250, paymentDate: '2025-09-22', method: 'cash', status: 'paid', transactionRef: 'TXN-20250922-008', passengerName: 'Osanda Thilakaratne', routeCode: 'R003' },
  { id: 16, bookingId: 16, amount: 250, paymentDate: '2025-09-22', method: 'card', status: 'paid', transactionRef: 'TXN-20250922-009', passengerName: 'Amali Gunasekara', routeCode: 'R003' },
  { id: 17, bookingId: 17, amount: 550, paymentDate: '2025-09-21', method: 'online', status: 'paid', transactionRef: 'TXN-20250921-003', passengerName: 'Bandara Senanayake', routeCode: 'R005' },
  { id: 18, bookingId: 18, amount: 550, paymentDate: '2025-09-21', method: 'card', status: 'paid', transactionRef: 'TXN-20250921-004', passengerName: 'Chathu Rajapaksha', routeCode: 'R005' },
  { id: 19, bookingId: 19, amount: 420, paymentDate: '2025-09-20', method: 'card', status: 'paid', transactionRef: 'TXN-20250920-003', passengerName: 'Dilini Wijewardena', routeCode: 'R006' },
  { id: 20, bookingId: 20, amount: 420, paymentDate: '2025-09-20', method: 'cash', status: 'paid', transactionRef: 'TXN-20250920-004', passengerName: 'Eshan Mendis', routeCode: 'R006' },
  { id: 21, bookingId: 21, amount: 900, paymentDate: '2025-09-19', method: 'online', status: 'refunded', transactionRef: 'TXN-20250919-002', passengerName: 'Fathima Nazeer', routeCode: 'R004' },
  { id: 22, bookingId: 22, amount: 350, paymentDate: '2025-09-23', method: 'card', status: 'paid', transactionRef: 'TXN-20250923-001', passengerName: 'Gayan Prasad', routeCode: 'R001' },
  { id: 23, bookingId: 23, amount: 350, paymentDate: '2025-09-23', method: 'online', status: 'paid', transactionRef: 'TXN-20250923-002', passengerName: 'Hasini Bandara', routeCode: 'R001' },
  { id: 24, bookingId: 24, amount: 320, paymentDate: '2025-09-23', method: 'card', status: 'paid', transactionRef: 'TXN-20250923-003', passengerName: 'Isuru Lakshan', routeCode: 'R002' },
  { id: 25, bookingId: 25, amount: 320, paymentDate: '2025-09-23', method: 'card', status: 'pending', transactionRef: 'TXN-20250923-004', passengerName: 'Jayani Madushanka', routeCode: 'R002' },
  { id: 26, bookingId: 26, amount: 420, paymentDate: '2025-09-24', method: 'online', status: 'paid', transactionRef: 'TXN-20250924-001', passengerName: 'Kasun Pathirana', routeCode: 'R006' },
  { id: 27, bookingId: 27, amount: 380, paymentDate: '2025-09-24', method: 'card', status: 'paid', transactionRef: 'TXN-20250924-002', passengerName: 'Lakmali Jayawardena', routeCode: 'R007' },
  { id: 28, bookingId: 28, amount: 380, paymentDate: '2025-09-24', method: 'cash', status: 'paid', transactionRef: 'TXN-20250924-003', passengerName: 'Malith Gunawardena', routeCode: 'R007' },
  { id: 29, bookingId: 29, amount: 350, paymentDate: '2025-09-21', method: 'bank_transfer', status: 'paid', transactionRef: 'TXN-20250921-005', passengerName: 'Nadeesha Samaraweera', routeCode: 'R001' },
  { id: 30, bookingId: 30, amount: 320, paymentDate: '2025-09-21', method: 'online', status: 'paid', transactionRef: 'TXN-20250921-006', passengerName: 'Osanda Thilakaratne', routeCode: 'R002' },
];

// ---- MAINTENANCE RECORDS ------------------------------------
export const maintenanceRecords: MaintenanceRecord[] = [
  { id: 1, vehicleId: 4, maintenanceType: 'repair', description: 'Engine overhaul — oil leak detected', scheduledDate: '2025-03-10', cost: 45000, status: 'in_progress', technicianName: 'Roshan Mechanics', vehicleReg: 'SP-KLM-3456', vehicleMake: 'Toyota Coaster' },
  { id: 2, vehicleId: 8, maintenanceType: 'routine', description: 'Scheduled 6-month service', scheduledDate: '2025-02-28', completedDate: '2025-03-01', cost: 12000, status: 'overdue', technicianName: 'City Auto Service', vehicleReg: 'SB-YZA-1357', vehicleMake: 'Toyota HiAce' },
  { id: 3, vehicleId: 1, maintenanceType: 'inspection', description: 'Annual roadworthiness inspection', scheduledDate: '2025-05-15', cost: 5000, status: 'scheduled', technicianName: 'RTA Inspection Centre', vehicleReg: 'WP-CAB-1234', vehicleMake: 'Tata Starbus' },
  { id: 4, vehicleId: 2, maintenanceType: 'routine', description: 'Oil change and filter replacement', scheduledDate: '2025-06-01', cost: 8000, status: 'scheduled', technicianName: 'Roshan Mechanics', vehicleReg: 'WP-CAD-5678', vehicleMake: 'Ashok Leyland Viking' },
  { id: 5, vehicleId: 6, maintenanceType: 'repair', description: 'Brake pad replacement', scheduledDate: '2025-04-25', cost: 15000, status: 'scheduled', technicianName: 'City Auto Service', vehicleReg: 'EP-STU-2345', vehicleMake: 'Ashok Leyland Lynx' },
  { id: 6, vehicleId: 3, maintenanceType: 'routine', description: 'Tyre rotation and pressure check', scheduledDate: '2025-07-20', cost: 4000, status: 'scheduled', technicianName: 'Namal Tyres', vehicleReg: 'CP-GHF-9012', vehicleMake: 'Toyota HiAce' },
  { id: 7, vehicleId: 9, maintenanceType: 'inspection', description: 'Post-long-route inspection', scheduledDate: '2025-06-20', cost: 6000, status: 'scheduled', technicianName: 'RTA Inspection Centre', vehicleReg: 'NC-BCD-2468', vehicleMake: 'Tata Starbus Ultra' },
  { id: 8, vehicleId: 7, maintenanceType: 'routine', description: 'Battery health check and charging system', scheduledDate: '2025-07-10', cost: 10000, status: 'scheduled', technicianName: 'EV Service Centre', vehicleReg: 'WP-VWX-6789', vehicleMake: 'BYD eBus' },
];

// ---- FEEDBACK -----------------------------------------------
export const feedbackRecords: Feedback[] = [
  { id: 1, passengerId: 1, tripId: 10, driverId: 2, vehicleId: 6, rating: 5, comment: 'Excellent service! The bus was clean and the driver was very professional and punctual.', feedbackDate: '2025-09-24', category: 'service', passengerName: 'Amali Gunasekara', driverName: 'Nimal Silva', vehicleReg: 'EP-STU-2345', routeCode: 'R001' },
  { id: 2, passengerId: 2, tripId: 10, driverId: 2, vehicleId: 6, rating: 4, comment: 'Good ride overall. AC was a bit cold but the driver was courteous and on time.', feedbackDate: '2025-09-24', category: 'vehicle', passengerName: 'Bandara Senanayake', driverName: 'Nimal Silva', vehicleReg: 'EP-STU-2345', routeCode: 'R001' },
  { id: 3, passengerId: 3, tripId: 11, driverId: 4, vehicleId: 1, rating: 3, comment: 'Driver was slightly late to depart. The vehicle was comfortable but the delay was frustrating.', feedbackDate: '2025-09-24', category: 'punctuality', passengerName: 'Chathu Rajapaksha', driverName: 'Ruwan Jayasinghe', vehicleReg: 'WP-CAB-1234', routeCode: 'R002' },
  { id: 4, passengerId: 4, tripId: 11, driverId: 4, vehicleId: 1, rating: 4, comment: 'Comfortable seats and the route was well managed. Would recommend to others.', feedbackDate: '2025-09-24', category: 'service', passengerName: 'Dilini Wijewardena', driverName: 'Ruwan Jayasinghe', vehicleReg: 'WP-CAB-1234', routeCode: 'R002' },
  { id: 5, passengerId: 5, tripId: 12, driverId: 7, vehicleId: 5, rating: 5, comment: 'Best trip I have ever had! The van was spotless and Priyantha is an amazing driver.', feedbackDate: '2025-09-24', category: 'driver', passengerName: 'Eshan Mendis', driverName: 'Priyantha Kumara', vehicleReg: 'NW-PQR-7890', routeCode: 'R003' },
  { id: 6, passengerId: 6, tripId: 12, driverId: 7, vehicleId: 5, rating: 5, comment: 'Smooth journey through beautiful scenery. Highly professional service.', feedbackDate: '2025-09-24', category: 'general', passengerName: 'Fathima Nazeer', driverName: 'Priyantha Kumara', vehicleReg: 'NW-PQR-7890', routeCode: 'R003' },
  { id: 7, passengerId: 7, tripId: 13, driverId: 3, vehicleId: 9, rating: 4, comment: 'Long journey but comfortable. The stops were well planned and the driver was very helpful.', feedbackDate: '2025-09-24', category: 'service', passengerName: 'Gayan Prasad', driverName: 'Sunil Fernando', vehicleReg: 'NC-BCD-2468', routeCode: 'R005' },
  { id: 8, passengerId: 8, tripId: 14, driverId: 6, vehicleId: 10, rating: 4, comment: 'Nice trip to Matara. The minibus was clean and driver was friendly.', feedbackDate: '2025-09-23', category: 'vehicle', passengerName: 'Hasini Bandara', driverName: 'Chaminda Rathnayake', vehicleReg: 'WP-EFG-3579', routeCode: 'R006' },
  { id: 9, passengerId: 9, tripId: 13, driverId: 3, vehicleId: 9, rating: 2, comment: 'The bus was overcrowded and very noisy. AC was not working properly for most of the journey.', feedbackDate: '2025-09-24', category: 'vehicle', passengerName: 'Isuru Lakshan', driverName: 'Sunil Fernando', vehicleReg: 'NC-BCD-2468', routeCode: 'R005' },
  { id: 10, passengerId: 10, tripId: 14, driverId: 6, vehicleId: 10, rating: 5, comment: 'Perfect trip! On time, clean vehicle, polite driver. Will definitely book again with SmartMove.', feedbackDate: '2025-09-23', category: 'general', passengerName: 'Jayani Madushanka', driverName: 'Chaminda Rathnayake', vehicleReg: 'WP-EFG-3579', routeCode: 'R006' },
];
