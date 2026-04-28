// comment types based on OpenAPI schema
import { UNSET } from "../shared/types.ts";

export type CommentOut = {
  id: number;
  worker_process_id: number | null;
  text: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type CommentCreate = {
  worker_process_id?: number | null;
  text?: string | null;
};

export type CommentUpdate = {
  worker_process_id?: number | UNSET;
  text?: string | UNSET;
};

export type CommentQueryParams = {
  limit?: number;
  offset?: number;
  worker_process_id?: number | null;
};
