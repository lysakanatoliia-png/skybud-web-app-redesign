// work task types based on OpenAPI schema

export type WorkTaskOut = {
  id: number;
  facility_id: number | null;
  facility_type_id: number | null;
  text: string | null;
  finished: boolean | null;
  photo_url: string | null;
  worker_id: number | null;
  expires_at: string | null; // ISO date string
  expired: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type WorkTaskCreate = {
  facility_id?: number | null;
  facility_type_id?: number | null;
  text: string;
  finished?: boolean;
  photo?: File | null;
  worker_id?: number | null;
  expires_at?: string | null; // ISO date string
  send_notification?: boolean;
};

export type WorkTaskUpdate = {
  facility_id?: number | null;
  text?: string | null;
  finished?: boolean | null;
  photo?: File | null;
  worker_id?: number | null;
  expires_at?: string | null; // ISO date string
};

export type WorkTaskQueryParams = {
  limit?: number;
  offset?: number;
  facility_id?: number | null;
  facility_type_id?: number | null;
  worker_id?: number | null;
  finished?: boolean | null;
};

// bulk update payloads based on OpenAPI schema
export type WorkTaskBulkUpdateItem = {
  id: number;
  finished: boolean;
};

export type WorkTaskBulkUpdate = {
  tasks: WorkTaskBulkUpdateItem[];
};

export type WorkTaskBulkUpdateResponse = {
  updated: number;
  failed?: number[];
};