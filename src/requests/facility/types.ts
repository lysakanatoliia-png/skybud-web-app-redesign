// facility types based on OpenAPI schema
import { UNSET } from "../shared/types.ts";
import { FacilityBudgetNestedOut } from "../facility-budget/types.ts";
import { FacilityTypeOut } from "../facility-type/types.ts";
import { WorkTaskOut } from "../work-task/types.ts";

export type FacilityOut = {
  id: number;
  name: string | null;
  group_id: number | null;
  invite_link: string | null;
  status_active: boolean | null;
  latitude: number | null;
  longitude: number | null;
  facility_type_id: number | null;
  facility_type?: FacilityTypeOut | null;
  budget?: FacilityBudgetNestedOut | null;
  tasks?: WorkTaskOut[];
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type FacilityCreate = {
  name?: string | null;
  group_id?: number | null;
  invite_link?: string | null;
  status_active?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  facility_type_id?: number | null;
};

export type FacilityUpdate = {
  name?: string | UNSET;
  group_id?: number | UNSET;
  invite_link?: string | UNSET;
  status_active?: boolean | UNSET;
  latitude?: number | UNSET;
  longitude?: number | UNSET;
  facility_type_id?: number | UNSET;
};

export type FacilityQueryParams = {
  limit?: number;
  offset?: number;
  facility_type?: number | null;
};
