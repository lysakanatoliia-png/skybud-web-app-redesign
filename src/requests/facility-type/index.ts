// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse, PaginationParams } from "../shared/types";
import { FacilityTypeOut, FacilityTypeCreate, FacilityTypeUpdate } from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getFacilityTypes = async (_params?: PaginationParams): Promise<ApiResponse<FacilityTypeOut[]>> => {
  await sleep();
  return ok(mockStore.facilityTypes.map((ft) => ({ ...ft })));
};

export const getFacilityTypeById = async (id: number): Promise<ApiResponse<FacilityTypeOut>> => {
  await sleep();
  const ft = mockStore.facilityTypes.find((f) => f.id === id);
  if (!ft) return fail({} as FacilityTypeOut, 404);
  return ok({ ...ft });
};

export const createFacilityType = async (data: FacilityTypeCreate): Promise<ApiResponse<FacilityTypeOut>> => {
  await sleep();
  const newFt: FacilityTypeOut = {
    id: nextId("facilityType"),
    ...data,
    created_at: now(),
    updated_at: now(),
  } as FacilityTypeOut;
  mockStore.facilityTypes.push(newFt);
  return ok({ ...newFt });
};

export const updateFacilityType = async (id: number, data: FacilityTypeUpdate): Promise<ApiResponse<FacilityTypeOut>> => {
  await sleep();
  const idx = mockStore.facilityTypes.findIndex((f) => f.id === id);
  if (idx === -1) return fail({} as FacilityTypeOut, 404);
  mockStore.facilityTypes[idx] = { ...mockStore.facilityTypes[idx], ...(data as any), updated_at: now() };
  return ok({ ...mockStore.facilityTypes[idx] });
};

export const deleteFacilityType = async (id: number): Promise<ApiResponse<null>> => {
  await sleep();
  const idx = mockStore.facilityTypes.findIndex((f) => f.id === id);
  if (idx === -1) return fail(null, 404);
  mockStore.facilityTypes.splice(idx, 1);
  return ok(null);
};
