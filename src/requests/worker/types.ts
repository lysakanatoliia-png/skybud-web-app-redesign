// Worker types based on OpenAPI schema
import { UNSET } from "../shared/types.ts";

export type WorkerOut = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  telegram_id: number | null;
  username: string | null;
  language_code: string | null;
  worker_type: WorkerTypeEnum | null;
  rate: number | null;
  email: string | null;
  crm_id: string | null;
  birthday: string | null; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type WorkerTypeEnum = 
  | "admin" 
  | "coder" 
  | "manager" 
  | "smm" 
  | "worker" 
  | "master" 
  | "head_of_sales" 
  | "marketolog" 
  | "foreman" 
  | "engineer" 
  | "assistant";

export type WorkerCreate = {
  first_name?: string | null;
  last_name?: string | null;
  telegram_id?: number | null;
  username?: string | null;
  language_code?: string | null;
  worker_type?: WorkerTypeEnum | null;
  rate?: number | null;
  email?: string | null;
  crm_id?: string | null;
  birthday?: string | null; // ISO date string
};

export type WorkerUpdate = {
  first_name?: string | UNSET;
  last_name?: string | UNSET;
  telegram_id?: number | UNSET;
  username?: string | UNSET;
  language_code?: string | UNSET;
  worker_type?: WorkerTypeEnum | UNSET;
  rate?: number | UNSET;
  email?: string | UNSET;
  birthday?: string | UNSET;
};

export type WorkerLoginData = {
  email: string;
  password: string;
  telegram_id?: number;
  username?: string;
  language_code?: string;
};

export type WorkerRegisterData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  telegram_id?: number;
  username?: string;
  lang_code?: string; // Changed from language_code
  worker_type?: string;
  rate?: number;
  phone_number?: string;
  emergency_relative_phone?: string;
  emergency_relative_name?: string;
  home_address?: string;
  bank_details?: string; // JSON string
  birth_date?: string; // YYYY-MM-DD
  height_cm?: number;
  top_waist_cm?: number;
  chest_cm?: number;
  pants_waist_cm?: number;
  hips_cm?: number;
  inseam_cm?: number;
  head_circumference_cm?: number;
  foot_size?: number; // 0-600
  passport_photo?: File; // Legacy single photo
  driver_license_photo?: File; // Legacy single photo
  passport_photos?: File[];
  driver_license_photos?: File[];
};

// payroll types
export type PayrollPeriod = {
  date_from?: string | null; // ISO date string
  date_to?: string | null; // ISO date string
};

export type PayrollBaseCalculation = {
  total_hours: number;
  base_salary: number;
  work_processes_count: number;
};

export type AdjustmentDetail = {
  id: number;
  amount: number;
  reason: string;
  date: string; // ISO date string
};

export type AdjustmentCategory = {
  total: number;
  count: number;
  details?: AdjustmentDetail[] | null;
};

export type PayrollAdjustments = {
  penalties: AdjustmentCategory;
  prepayments: AdjustmentCategory;
  awards: AdjustmentCategory;
};

export type WorkerPayrollOut = {
  worker_id: number;
  period: PayrollPeriod;
  base_calculation: PayrollBaseCalculation;
  adjustments: PayrollAdjustments;
  final_salary: number;
};

export type WorkerPayrollParams = {
  include_penalties?: boolean;
  include_prepayments?: boolean;
  include_awards?: boolean;
  date_from?: string | null;
  date_to?: string | null;
};
