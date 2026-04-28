import { WorkerOut } from "../worker/types.ts";

export type WorkShiftOut = {
  id: number;
  worker_id: number;
  start_time: string; // UTC
  start_latitude: number;
  start_longitude: number;
  end_time: string | null; // UTC
  end_latitude: number | null;
  end_longitude: number | null;
  total_time: number | null; // секунды
  object_time: number; // секунды
  travel_time: number; // секунды
  summary_rate: number | null;
  is_voided: boolean;
  void_reason: string | null;
  created_at: string; // UTC
  updated_at: string; // UTC
  worker?: WorkerOut | null;
};

export type StartWorkShiftData = {
  worker_id: number;
  latitude: number;
  longitude: number;
};

export type EndWorkShiftData = {
  worker_id: number;
  latitude: number;
  longitude: number;
};

