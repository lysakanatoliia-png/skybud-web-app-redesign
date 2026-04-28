// MOCK режим: бюджет зберігається безпосередньо у facility.budget.
import { ApiResponse } from "../shared/types";
import { FacilityBudgetOut, FacilityBudgetCreate, FacilityBudgetUpdate } from "./types";
import { mockStore, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getFacilityBudgets = async (facility_id?: number | null): Promise<ApiResponse<FacilityBudgetOut[]>> => {
  await sleep();
  const list = mockStore.facilities
    .filter((f) => (!facility_id || f.id === facility_id) && f.budget != null)
    .map((f) => ({ facility_id: f.id, ...(f.budget as any) } as FacilityBudgetOut));
  return ok(list);
};

export const getFacilityBudgetById = async (id: number): Promise<ApiResponse<FacilityBudgetOut>> => {
  await sleep();
  const f = mockStore.facilities.find((f) => f.id === id && f.budget != null);
  if (!f) return fail({} as FacilityBudgetOut, 404);
  return ok({ facility_id: f.id, ...(f.budget as any) } as FacilityBudgetOut);
};

export const createFacilityBudget = async (data: FacilityBudgetCreate): Promise<ApiResponse<FacilityBudgetOut>> => {
  await sleep();
  const idx = mockStore.facilities.findIndex((f) => f.id === data.facility_id);
  if (idx === -1) return fail({} as FacilityBudgetOut, 404);
  mockStore.facilities[idx] = { ...mockStore.facilities[idx], budget: { ...data, updated_at: now() } as any };
  return ok({ facility_id: data.facility_id, ...data } as FacilityBudgetOut);
};

export const updateFacilityBudget = async (facility_id: number, data: FacilityBudgetUpdate): Promise<ApiResponse<FacilityBudgetOut>> => {
  await sleep();
  const idx = mockStore.facilities.findIndex((f) => f.id === facility_id);
  if (idx === -1) return fail({} as FacilityBudgetOut, 404);
  const prev = (mockStore.facilities[idx].budget as any) ?? {};
  mockStore.facilities[idx] = {
    ...mockStore.facilities[idx],
    budget: { ...prev, ...data, updated_at: now() } as any,
  };
  return ok({ facility_id, ...mockStore.facilities[idx].budget } as FacilityBudgetOut);
};
