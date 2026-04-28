// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import { WorkerOut, WorkerCreate, WorkerUpdate, WorkerLoginData, WorkerPayrollOut } from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getWorkers = async (_params?: any): Promise<ApiResponse<WorkerOut[]>> => {
  await sleep();
  return ok([...mockStore.workers]);
};

export const getWorkerById = async (id: number): Promise<ApiResponse<WorkerOut>> => {
  await sleep();
  const worker = mockStore.workers.find((w) => w.id === id);
  if (!worker) return fail({} as WorkerOut, 404);
  return ok({ ...worker });
};

export const getWorkerByTelegramId = async (telegram_id: number): Promise<ApiResponse<WorkerOut>> => {
  await sleep();
  const worker = mockStore.workers.find((w) => w.telegram_id === telegram_id);
  if (!worker) return fail({} as WorkerOut, 404);
  return ok({ ...worker });
};

export const createWorker = async (data: WorkerCreate): Promise<ApiResponse<WorkerOut>> => {
  await sleep();
  const newWorker = {
    id: nextId("worker"),
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    telegram_id: data.telegram_id ?? null,
    username: data.username ?? null,
    language_code: data.language_code ?? null,
    worker_type: data.worker_type ?? null,
    rate: data.rate ?? null,
    email: data.email ?? null,
    crm_id: data.crm_id ?? null,
    birthday: data.birthday ?? null,
    created_at: now(),
    updated_at: now(),
  } as WorkerOut;
  mockStore.workers.push(newWorker);
  return ok({ ...newWorker });
};

export const updateWorker = async (id: number, data: WorkerUpdate, _extra?: any): Promise<ApiResponse<WorkerOut>> => {
  await sleep();
  const idx = mockStore.workers.findIndex((w) => w.id === id);
  if (idx === -1) return fail({} as WorkerOut, 404);
  mockStore.workers[idx] = { ...mockStore.workers[idx], ...(data as any), updated_at: now() };
  return ok({ ...mockStore.workers[idx] });
};

export const deleteWorker = async (id: number): Promise<ApiResponse<null>> => {
  await sleep();
  const idx = mockStore.workers.findIndex((w) => w.id === id);
  if (idx === -1) return fail(null, 404);
  mockStore.workers.splice(idx, 1);
  return ok(null);
};

export const loginWorker = async (data: WorkerLoginData): Promise<ApiResponse<WorkerOut>> => {
  await sleep();
  const worker = mockStore.workers.find((w) => w.email === data.email);
  if (!worker) return fail({} as WorkerOut, 401);
  return ok({ ...worker });
};

export const getWorkerPayroll = async (worker_id: number, _params?: any): Promise<ApiResponse<WorkerPayrollOut>> => {
  await sleep();
  const processes = mockStore.workProcesses.filter(
    (p) => p.worker_id === worker_id && "work_time" in p
  );
  const total_hours = processes.reduce((sum, p: any) => sum + ((p.work_time ?? 0) / 3600), 0);
  const worker = mockStore.workers.find((w) => w.id === worker_id);
  const rate = worker?.rate ?? 20;
  const base_salary = Math.round(total_hours * rate * 100) / 100;

  const adjustments = mockStore.adjustments.filter((a) => a.worker_id === worker_id);
  const penalties = adjustments.filter((a) => a.adjustment_type === "penalty");
  const prepayments = adjustments.filter((a) => a.adjustment_type === "prepayment");
  const awards = adjustments.filter((a) => a.adjustment_type === "award");

  const payroll: WorkerPayrollOut = {
    worker_id,
    period: { date_from: null, date_to: null },
    base_calculation: {
      total_hours: Math.round(total_hours * 100) / 100,
      base_salary,
      work_processes_count: processes.length,
    },
    adjustments: {
      penalties: { total: penalties.reduce((s, a) => s + a.amount, 0), count: penalties.length },
      prepayments: { total: prepayments.reduce((s, a) => s + a.amount, 0), count: prepayments.length },
      awards: { total: awards.reduce((s, a) => s + a.amount, 0), count: awards.length },
    },
    final_salary: base_salary
      + awards.reduce((s, a) => s + a.amount, 0)
      - penalties.reduce((s, a) => s + a.amount, 0)
      - prepayments.reduce((s, a) => s + a.amount, 0),
  };
  return ok(payroll);
};
