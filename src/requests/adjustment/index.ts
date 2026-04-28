// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import { AdjustmentOut, AdjustmentCreate, AdjustmentQueryParams, AdjustmentListResponse } from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getAdjustments = async (
  params?: AdjustmentQueryParams | number
): Promise<ApiResponse<AdjustmentListResponse>> => {
  await sleep();
  let list = [...mockStore.adjustments];
  if (typeof params === "number") {
    list = list.filter((a) => a.worker_id === params);
  } else if (params) {
    if (params.worker_id) list = list.filter((a) => a.worker_id === params.worker_id);
    if (params.adjustment_type) list = list.filter((a) => a.adjustment_type === params.adjustment_type);
  }
  const total_amount = list.reduce((s, a) => s + a.amount, 0);
  return ok({ data: list.map((a) => ({ ...a })), total_amount });
};

export const createAdjustment = async (data: AdjustmentCreate): Promise<ApiResponse<AdjustmentOut>> => {
  await sleep();
  const adjustment: AdjustmentOut = {
    id: nextId("adjustment"),
    worker_id: data.worker_id,
    adjustment_type: data.adjustment_type,
    amount: data.amount,
    reason: data.reason,
    photo_url: null,
    created_at: now(),
    updated_at: now(),
  };
  mockStore.adjustments.push(adjustment);
  return ok({ ...adjustment });
};

export const deleteAdjustment = async (id: number): Promise<ApiResponse<null>> => {
  await sleep();
  const idx = mockStore.adjustments.findIndex((a) => a.id === id);
  if (idx === -1) return fail(null, 404);
  mockStore.adjustments.splice(idx, 1);
  return ok(null);
};
