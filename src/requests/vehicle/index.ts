// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import {
  Vehicle, VehicleReservationRequestCreate, VehicleReservationRequestOut,
  AssignVehiclePayload, WorkerVehicleReservationResponse,
} from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getVehicles = async (): Promise<ApiResponse<Vehicle[]>> => {
  await sleep();
  return ok(mockStore.vehicles.map((v) => ({ ...v })));
};

export const getVehicleById = async (id: number): Promise<ApiResponse<Vehicle>> => {
  await sleep();
  const v = mockStore.vehicles.find((v) => v.id === id);
  if (!v) return fail({} as Vehicle, 404);
  return ok({ ...v });
};

// Повертає WorkerVehicleReservationResponse — що і очікує WorkMain.tsx
export const getWorkerReservedVehicle = async (worker_id: number): Promise<ApiResponse<WorkerVehicleReservationResponse>> => {
  await sleep();
  const req = mockStore.vehicleRequests.find(
    (r) => r.worker_id === worker_id && (r.status === "approved" || r.status === "pending")
  );
  if (!req) {
    return ok({ has_reservation: false, reservation: null, vehicle: null });
  }
  const vehicle = mockStore.vehicles.find((v) => v.id === req.vehicle_id) ?? null;
  return ok({ has_reservation: true, reservation: { ...req }, vehicle: vehicle ? { ...vehicle } : null });
};

export const getVehicleRequests = async (_params?: any): Promise<ApiResponse<VehicleReservationRequestOut[]>> => {
  await sleep();
  return ok(mockStore.vehicleRequests.map((r) => ({ ...r })));
};

// Аліас для сумісності з WorkMain.tsx
export const getVehicleReservationRequests = getVehicleRequests;

export const createVehicleRequest = async (data: VehicleReservationRequestCreate): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  await sleep();
  const worker = mockStore.workers.find((w) => w.id === data.worker_id);
  const req: VehicleReservationRequestOut = {
    id: nextId("vehicleRequest"),
    worker_id: data.worker_id,
    worker: worker ? { id: worker.id, first_name: worker.first_name, last_name: worker.last_name, telegram_id: worker.telegram_id, email: worker.email } : null,
    vehicle_id: data.vehicle_id,
    status: "pending",
    date_from: data.date_from ?? null,
    date_to: data.date_to ?? null,
    rejection_reason: null,
    created_at: now(),
    updated_at: now(),
  };
  mockStore.vehicleRequests.push(req);
  return ok({ ...req });
};

// Аліас для сумісності з WorkMain.tsx
export const createVehicleReservationRequest = createVehicleRequest;

export const cancelVehicleReservationRequest = async (id: number): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  await sleep();
  const idx = mockStore.vehicleRequests.findIndex((r) => r.id === id);
  if (idx === -1) return fail({} as VehicleReservationRequestOut, 404);
  mockStore.vehicleRequests[idx] = { ...mockStore.vehicleRequests[idx], status: "cancelled", updated_at: now() };
  return ok({ ...mockStore.vehicleRequests[idx] });
};

export const updateVehicleRequestStatus = async (
  id: number,
  status: "approved" | "rejected" | "pending" | "cancelled"
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  await sleep();
  const idx = mockStore.vehicleRequests.findIndex((r) => r.id === id);
  if (idx === -1) return fail({} as VehicleReservationRequestOut, 404);
  mockStore.vehicleRequests[idx] = { ...mockStore.vehicleRequests[idx], status, updated_at: now() };
  return ok({ ...mockStore.vehicleRequests[idx] });
};

export const assignVehicle = async (vehicle_id: number, payload: AssignVehiclePayload): Promise<ApiResponse<Vehicle>> => {
  await sleep();
  const idx = mockStore.vehicles.findIndex((v) => v.id === vehicle_id);
  if (idx === -1) return fail({} as Vehicle, 404);
  mockStore.vehicles[idx] = { ...mockStore.vehicles[idx], owner_id: payload.owner_id ?? null };
  return ok({ ...mockStore.vehicles[idx] });
};

export const approveVehicleReservationRequest = async (
  id: number,
  _payload?: { vehicle_id?: number }
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  return updateVehicleRequestStatus(id, "approved");
};

export const rejectVehicleReservationRequest = async (
  id: number,
  payload?: { rejection_reason?: string }
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  await sleep();
  const idx = mockStore.vehicleRequests.findIndex((r) => r.id === id);
  if (idx === -1) return fail({} as VehicleReservationRequestOut, 404);
  mockStore.vehicleRequests[idx] = {
    ...mockStore.vehicleRequests[idx],
    status: "rejected",
    rejection_reason: payload?.rejection_reason ?? null,
    updated_at: now(),
  };
  return ok({ ...mockStore.vehicleRequests[idx] });
};

export const unassignVehicle = async (vehicle_id: number): Promise<ApiResponse<Vehicle>> => {
  await sleep();
  const idx = mockStore.vehicles.findIndex((v) => v.id === vehicle_id);
  if (idx === -1) return fail({} as Vehicle, 404);
  mockStore.vehicles[idx] = { ...mockStore.vehicles[idx], owner_id: null };
  return ok({ ...mockStore.vehicles[idx] });
};
