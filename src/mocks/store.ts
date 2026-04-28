// Мутабельний in-memory store для mock-режиму.
// Імітує бекенд: дозволяє CRUD-операції на ході, повертає актуальні дані до перезавантаження сторінки.

import {
  SEED_FACILITIES, SEED_FACILITY_TYPES, SEED_WORKERS, SEED_VEHICLES,
  SEED_VEHICLE_REQUESTS, SEED_WORK_TASKS, SEED_COMMENTS, SEED_WORK_PROCESSES,
  SEED_WORK_SHIFTS, SEED_ADJUSTMENTS, SEED_DEFAULT_USER_ID,
} from "./data";

import type { WorkerOut } from "../requests/worker/types";
import type { FacilityOut } from "../requests/facility/types";
import type { FacilityTypeOut } from "../requests/facility-type/types";
import type { WorkTaskOut } from "../requests/work-task/types";
import type { Vehicle, VehicleReservationRequestOut } from "../requests/vehicle/types";
import type { WorkProcessStartOut, WorkProcessEndOut } from "../requests/work/types";
import type { WorkShiftOut } from "../requests/work-shift/types";
import type { CommentOut } from "../requests/comment/types";
import type { AdjustmentOut } from "../requests/adjustment/types";

type Store = {
  currentUserId: number;
  workers: WorkerOut[];
  facilities: FacilityOut[];
  facilityTypes: FacilityTypeOut[];
  vehicles: Vehicle[];
  vehicleRequests: VehicleReservationRequestOut[];
  workTasks: WorkTaskOut[];
  comments: CommentOut[];
  workProcesses: (WorkProcessStartOut | WorkProcessEndOut)[];
  workShifts: WorkShiftOut[];
  adjustments: AdjustmentOut[];
  nextIds: Record<string, number>;
};

const buildInitialStore = (): Store => ({
  currentUserId: SEED_DEFAULT_USER_ID,
  workers: SEED_WORKERS.map((w) => ({ ...w })),
  facilities: SEED_FACILITIES.map((f) => ({ ...f })),
  facilityTypes: SEED_FACILITY_TYPES.map((ft) => ({ ...ft })),
  vehicles: SEED_VEHICLES.map((v) => ({ ...v })),
  vehicleRequests: SEED_VEHICLE_REQUESTS.map((r) => ({ ...r })),
  workTasks: SEED_WORK_TASKS.map((t) => ({ ...t })),
  comments: SEED_COMMENTS.map((c) => ({ ...c })),
  workProcesses: SEED_WORK_PROCESSES.map((p) => ({ ...p })),
  workShifts: SEED_WORK_SHIFTS.map((s) => ({ ...s })),
  adjustments: SEED_ADJUSTMENTS.map((a) => ({ ...a })),
  nextIds: {
    worker: 100, facility: 100, facilityType: 100, vehicle: 100,
    vehicleRequest: 100, workTask: 100, comment: 100,
    workProcess: 100, workShift: 200, adjustment: 100,
  },
});

export const mockStore: Store = buildInitialStore();

// Скинути state до seed-даних
export const resetMockStore = () => {
  Object.assign(mockStore, buildInitialStore());
};

// Отримати наступний ID для сутності та інкрементувати лічильник
export const nextId = (entity: keyof Store["nextIds"]): number => {
  const id = mockStore.nextIds[entity]++;
  return id;
};

// Поточний користувач (для useInitialFetching і MockModeSwitcher)
export const getCurrentUser = (): WorkerOut | null => {
  return mockStore.workers.find((w) => w.id === mockStore.currentUserId) ?? null;
};

export const setCurrentUserId = (id: number) => {
  mockStore.currentUserId = id;
};

// Допоміжна функція для імітації ISO timestamp
export const now = (): string => new Date().toISOString();
