// facility type types based on OpenAPI schema
import { UNSET } from "../shared/types.ts";

export type FacilityTypeOut = {
  id: number;
  name: string | null;
  description: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type FacilityTypeCreate = {
  name?: string | null;
  description?: string | null;
};

export type FacilityTypeUpdate = {
  name?: string | UNSET;
  description?: string | UNSET;
};
