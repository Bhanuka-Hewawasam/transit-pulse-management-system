// ============================================================
// SmartMove Transport Solutions — All Application Types
// ============================================================

export type VehicleStatus = 'active' | 'maintenance' | 'inactive';
export type VehicleType = 'bus' | 'van' | 'minibus';

export interface Vehicle {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  capacity: number;
  status: VehicleStatus;
  fuelType: 'diesel' | 'petrol' | 'electric';
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
}

export type DriverStatus = 'available' | 'on_trip' | 'off_duty' | 'suspended';

export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry: string;
  phone: string;
  email: string;
  status: DriverStatus;
  joinedDate: string;
  totalTrips: number;
  rating: number;
}

export interface Route {
  id: number;
  routeCode: string;
  origin: string;
  destination: string;
  stops: string[];
  distanceKm: number;
  estimatedMinutes: number;
  fareAmount: number;
  isActive: boolean;
}

export interface Passenger {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  registeredDate: string;
  totalBookings: number;
  passportOrNic: string;
}

export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: number;
  routeId: number;
  vehicleId: number;
  driverId: number;
  departureTime: string;
  arrivalTime: string;
  status: TripStatus;
  availableSeats: number;
  totalSeats: number;
  // Joined fields
  routeCode?: string;
  origin?: string;
  destination?: string;
  vehicleReg?: string;
  driverName?: string;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending' | 'completed';

export interface Booking {
  id: number;
  tripId: number;
  passengerId: number;
  seatNumber: string;
  bookingDate: string;
  status: BookingStatus;
  amount: number;
  // Joined fields
  passengerName?: string;
  routeCode?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'cash' | 'online' | 'bank_transfer';

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef: string;
  // Joined fields
  passengerName?: string;
  routeCode?: string;
}

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue';
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'emergency';

export interface MaintenanceRecord {
  id: number;
  vehicleId: number;
  maintenanceType: MaintenanceType;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  cost: number;
  status: MaintenanceStatus;
  technicianName: string;
  // Joined fields
  vehicleReg?: string;
  vehicleMake?: string;
}

export interface Feedback {
  id: number;
  passengerId: number;
  tripId: number;
  driverId: number;
  vehicleId: number;
  rating: number;          // 1-5
  comment: string;
  feedbackDate: string;
  category: 'service' | 'driver' | 'vehicle' | 'punctuality' | 'general';
  // Joined fields
  passengerName?: string;
  driverName?: string;
  vehicleReg?: string;
  routeCode?: string;
}

export interface DashboardSummary {
  totalVehicles: number;
  activeDrivers: number;
  upcomingTrips: number;
  totalBookings: number;
  totalRevenue: number;
  maintenanceAlerts: number;
  recentBookings: Booking[];
}
