// facility budget types based on OpenAPI schema
import { UNSET } from "../shared/types.ts";

export type FacilityBudgetNestedOut = {
  id: number;
  total_budget: number | null;
  salary_budget: number | null;
  vehicle_budget: number | null;
  created_at: string;
  updated_at: string;
};

export type FacilityBudgetOut = {
  id: number;
  facility_id: number | null;
  total_budget: number | null;
  salary_budget: number | null;
  vehicle_budget: number | null;
  created_at: string;
  updated_at: string;
};

export type FacilityBudgetCreate = {
  facility_id?: number | null;
  total_budget?: number | null;
  salary_budget?: number | null;
  vehicle_budget?: number | null;
};

export type FacilityBudgetUpdate = {
  facility_id?: number | UNSET;
  total_budget?: number | UNSET;
  salary_budget?: number | UNSET;
  vehicle_budget?: number | UNSET;
};

