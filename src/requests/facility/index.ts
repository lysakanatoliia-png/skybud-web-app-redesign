// MOCK режим: всі запити до API замінені in-memory операціями.
export type { FacilityOut } from "./types";
import { ApiResponse } from "../shared/types";
import { FacilityOut, FacilityCreate, FacilityUpdate, FacilityQueryParams } from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getFacilities = async (_params?: FacilityQueryParams): Promise<ApiResponse<FacilityOut[]>> => {
  await sleep();
  return ok(mockStore.facilities.map((f) => ({ ...f })));
};

export const getFacilityById = async (id: number): Promise<ApiResponse<FacilityOut>> => {
  await sleep();
  const facility = mockStore.facilities.find((f) => f.id === id);
  if (!facility) return fail({} as FacilityOut, 404);
  return ok({ ...facility });
};

export const createFacility = async (data: FacilityCreate): Promise<ApiResponse<FacilityOut>> => {
  await sleep();
  const facilityType = mockStore.facilityTypes.find((ft) => ft.id === data.facility_type_id);
  const newFacility: FacilityOut = {
    id: nextId("facility"),
    ...data,
    facility_type: facilityType ?? null,
    created_at: now(),
    updated_at: now(),
  } as FacilityOut;
  mockStore.facilities.push(newFacility);
  return ok({ ...newFacility });
};

export const updateFacility = async (id: number, data: FacilityUpdate): Promise<ApiResponse<FacilityOut>> => {
  await sleep();
  const idx = mockStore.facilities.findIndex((f) => f.id === id);
  if (idx === -1) return fail({} as FacilityOut, 404);
  if (data.facility_type_id) {
    const ft = mockStore.facilityTypes.find((t) => t.id === data.facility_type_id);
    (data as any).facility_type = ft ?? null;
  }
  mockStore.facilities[idx] = { ...mockStore.facilities[idx], ...(data as any), updated_at: now() };
  return ok({ ...mockStore.facilities[idx] });
};

export const deleteFacility = async (id: number): Promise<ApiResponse<null>> => {
  await sleep();
  const idx = mockStore.facilities.findIndex((f) => f.id === id);
  if (idx === -1) return fail(null, 404);
  mockStore.facilities.splice(idx, 1);
  return ok(null);
};
