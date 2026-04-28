// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import {
  WorkTaskOut, WorkTaskCreate, WorkTaskUpdate,
  WorkTaskQueryParams, WorkTaskBulkUpdate, WorkTaskBulkUpdateResponse,
} from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getWorkTasks = async (params?: WorkTaskQueryParams): Promise<ApiResponse<WorkTaskOut[]>> => {
  await sleep();
  let list = [...mockStore.workTasks];
  if (params?.facility_id != null) list = list.filter((t) => t.facility_id === params.facility_id);
  if (params?.worker_id != null) list = list.filter((t) => t.worker_id === params.worker_id);
  if (params?.finished != null) list = list.filter((t) => t.finished === params.finished);
  return ok(list.map((t) => ({ ...t })));
};

export const getWorkTaskById = async (id: number): Promise<ApiResponse<WorkTaskOut>> => {
  await sleep();
  const task = mockStore.workTasks.find((t) => t.id === id);
  if (!task) return fail({} as WorkTaskOut, 404);
  return ok({ ...task });
};

export const createWorkTask = async (data: WorkTaskCreate): Promise<ApiResponse<WorkTaskOut>> => {
  await sleep();
  const task: WorkTaskOut = {
    id: nextId("workTask"),
    facility_id: data.facility_id ?? null,
    facility_type_id: data.facility_type_id ?? null,
    text: data.text ?? null,
    finished: data.finished ?? false,
    photo_url: null,
    worker_id: data.worker_id ?? null,
    expires_at: data.expires_at ?? null,
    expired: false,
    created_at: now(),
    updated_at: now(),
  };
  mockStore.workTasks.push(task);
  return ok({ ...task });
};

export const updateWorkTask = async (id: number, data: WorkTaskUpdate): Promise<ApiResponse<WorkTaskOut>> => {
  await sleep();
  const idx = mockStore.workTasks.findIndex((t) => t.id === id);
  if (idx === -1) return fail({} as WorkTaskOut, 404);
  mockStore.workTasks[idx] = { ...mockStore.workTasks[idx], ...(data as any), updated_at: now() };
  return ok({ ...mockStore.workTasks[idx] });
};

export const deleteWorkTask = async (id: number): Promise<ApiResponse<null>> => {
  await sleep();
  const idx = mockStore.workTasks.findIndex((t) => t.id === id);
  if (idx === -1) return fail(null, 404);
  mockStore.workTasks.splice(idx, 1);
  return ok(null);
};

export const bulkUpdateWorkTasks = async (payload: WorkTaskBulkUpdate): Promise<ApiResponse<WorkTaskBulkUpdateResponse>> => {
  await sleep();
  let updatedCount = 0;
  for (const item of payload.tasks) {
    const idx = mockStore.workTasks.findIndex((t) => t.id === item.id);
    if (idx !== -1) {
      mockStore.workTasks[idx] = { ...mockStore.workTasks[idx], finished: item.finished, updated_at: now() };
      updatedCount++;
    }
  }
  return ok({ updated: updatedCount });
};
