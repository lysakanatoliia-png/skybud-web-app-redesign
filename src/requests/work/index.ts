// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import {
  WorkProcessStartOut, WorkProcessEndOut,
  StartWorkData, EndWorkData,
  StartWorkOfficeData, EndWorkOfficeData,
} from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

type GetWorkProcessesParams = {
  worker_id?: number | null;
  facility_id?: number | null;
  facility_type_id?: number | null;
  limit?: number;
  offset?: number;
};

export const getWorkProcesses = async (params?: GetWorkProcessesParams | number): Promise<ApiResponse<(WorkProcessStartOut | WorkProcessEndOut)[]>> => {
  await sleep();
  const workerId = typeof params === "number" ? params : params?.worker_id;
  const list = workerId
    ? mockStore.workProcesses.filter((p) => p.worker_id === workerId)
    : [...mockStore.workProcesses];
  return ok(list.map((p) => ({ ...p })));
};

export const getActiveWorkProcess = async (worker_id: number): Promise<ApiResponse<WorkProcessStartOut | null>> => {
  await sleep();
  const active = mockStore.workProcesses.find(
    (p) => p.worker_id === worker_id && !("end_time" in p && (p as any).end_time)
  ) as WorkProcessStartOut | undefined;
  return ok(active ?? null);
};

export const startWork = async (data: StartWorkData): Promise<ApiResponse<WorkProcessStartOut>> => {
  await sleep();
  const process = {
    id: nextId("workProcess"),
    worker_id: data.worker_id,
    facility_id: data.facility_id ?? null,
    start_time: now(),
    start_latitude: data.latitude ?? 52.52,
    start_longitude: data.longitude ?? 13.40,
    created_at: now(),
    updated_at: now(),
  } as WorkProcessStartOut;
  mockStore.workProcesses.push(process);
  return ok({ ...process });
};

export const endWork = async (data: EndWorkData): Promise<ApiResponse<WorkProcessEndOut>> => {
  await sleep();
  const idx = mockStore.workProcesses.findIndex(
    (p) => p.worker_id === data.worker_id && !("end_time" in p && (p as any).end_time)
  );
  if (idx === -1) return fail({} as WorkProcessEndOut, 404);

  const started = mockStore.workProcesses[idx] as WorkProcessStartOut;
  const startMs = new Date(started.start_time).getTime();
  const total_time = Math.round((Date.now() - startMs) / 1000);

  const ended = {
    ...started,
    end_time: now(),
    end_latitude: data.latitude ?? 52.52,
    end_longitude: data.longitude ?? 13.40,
    status_object_finished: data.status_object_finished ?? false,
    report_video_url: null,
    done_work_photos_url: null,
    instrument_photos_url: null,
    lunch_time: null,
    overtime_time: null,
    work_time: total_time,
    summary_rate: Math.round((total_time / 3600) * 20 * 100) / 100,
    updated_at: now(),
  } as WorkProcessEndOut;

  mockStore.workProcesses[idx] = ended;
  return ok({ ...ended });
};

export const startWorkOffice = async (data: StartWorkOfficeData): Promise<ApiResponse<WorkProcessStartOut>> => {
  return startWork({ ...data, facility_id: null });
};

export const endWorkOffice = async (data: EndWorkOfficeData): Promise<ApiResponse<WorkProcessEndOut>> => {
  return endWork({ ...data, status_object_finished: false });
};
