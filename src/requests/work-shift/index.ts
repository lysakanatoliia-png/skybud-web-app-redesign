// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import { WorkShiftOut, StartWorkShiftData, EndWorkShiftData } from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getActiveWorkShift = async (worker_id: number): Promise<ApiResponse<WorkShiftOut | null>> => {
  await sleep();
  const active = mockStore.workShifts.find(
    (s) => s.worker_id === worker_id && !s.end_time
  );
  if (!active) return { data: null, status: 404 };
  return ok({ ...active });
};

export const getWorkShifts = async (worker_id?: number): Promise<ApiResponse<WorkShiftOut[]>> => {
  await sleep();
  const list = worker_id
    ? mockStore.workShifts.filter((s) => s.worker_id === worker_id)
    : [...mockStore.workShifts];
  return ok(list.map((s) => ({ ...s })));
};

export const startWorkShift = async (data: StartWorkShiftData): Promise<ApiResponse<WorkShiftOut>> => {
  await sleep();
  const existing = mockStore.workShifts.find(
    (s) => s.worker_id === data.worker_id && !s.end_time
  );
  if (existing) return ok({ ...existing });

  const shift: WorkShiftOut = {
    id: nextId("workShift"),
    worker_id: data.worker_id,
    start_time: now(),
    end_time: null,
    total_time: null,
    summary_rate: null,
  } as WorkShiftOut;
  mockStore.workShifts.push(shift);
  return ok({ ...shift });
};

export const endWorkShift = async (data: EndWorkShiftData): Promise<ApiResponse<WorkShiftOut>> => {
  await sleep();
  const idx = mockStore.workShifts.findIndex(
    (s) => s.worker_id === data.worker_id && !s.end_time
  );
  if (idx === -1) return fail({} as WorkShiftOut, 404);

  const shift = mockStore.workShifts[idx];
  const startMs = new Date(shift.start_time).getTime();
  const total_time = Math.round((Date.now() - startMs) / 1000);

  mockStore.workShifts[idx] = {
    ...shift,
    end_time: now(),
    total_time,
    summary_rate: Math.round((total_time / 3600) * 20 * 100) / 100,
  };
  return ok({ ...mockStore.workShifts[idx] });
};
