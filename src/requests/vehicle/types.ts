export type Vehicle = {
  id: number;
  license_plate: string | null;
  model: string | null;
  external_id: number | null;
  owner_id: number | null;
};

export type AssignVehiclePayload = {
  owner_id?: number | null;
  date_from?: string | null;
  date_to?: string | null;
};

export type VehicleReservationStatusEnum = "pending" | "approved" | "rejected" | "cancelled";

export type VehicleReservationRequestCreate = {
  vehicle_id: number;
  worker_id: number;
  date_from?: string | null;
  date_to?: string | null;
};

export type VehicleReservationRequestOut = {
  id: number;
  worker_id: number;
  worker?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    telegram_id: number | null;
    email: string | null;
  } | null;
  vehicle_id: number;
  status: VehicleReservationStatusEnum;
  date_from?: string | null;
  date_to?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleReservationRequestApprove = {
  vehicle_id: number;
};

export type VehicleReservationRequestReject = {
  rejection_reason: string;
};

export type VehicleReservationRequestUpdate = {
  worker_id?: number;
  vehicle_id?: number;
  date_from?: string | null;
  date_to?: string | null;
};

export type WorkerVehicleReservationResponse = {
  has_reservation: boolean;
  reservation: VehicleReservationRequestOut | null;
  vehicle: Vehicle | null;
};

