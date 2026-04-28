import { WorkerOut } from "../worker/types.ts";
import { FacilityOut } from "../facility/types.ts";
import { CommentOut } from "../comment/types.ts";
import { WorkTaskOut } from "../work-task/types.ts";

export type WorkProcessStartOut = {
  worker_id: number;
  facility_id: number | null;
  start_time: string;
  start_latitude: number;
  start_longitude: number;
  id: number;
  worker?: WorkerOut | null;
  facility?: FacilityOut | null;
  comments?: CommentOut[];
  tasks?: WorkTaskOut[];
  created_at: string;
  updated_at: string;
};

export type WorkProcessEndOut = {
  worker_id: number;
  facility_id: number | null;
  shift_id?: number | null;
  start_time: string;
  start_latitude: number;
  start_longitude: number;
  id: number;
  worker?: WorkerOut | null;
  facility?: FacilityOut | null;
  comments?: CommentOut[];
  tasks?: WorkTaskOut[];
  end_time: string;
  end_latitude: number;
  end_longitude: number;
  status_object_finished: boolean;
  // urls come from backend
  report_video_url: string | null;
  done_work_photos_url: string[] | null;
  instrument_photos_url: string[] | null;
  lunch_time: number | null;
  overtime_time: number | null;
  work_time: number | null;
  summary_rate: number | null;
  created_at: string;
  updated_at: string;
};

export type StartWorkData = {
  worker_id: number;
  facility_id?: number | null;
  latitude: number;
  longitude: number;
};

export type EndWorkData = {
  worker_id: number;
  latitude: number;
  longitude: number;
  status_object_finished: boolean;
};

export type StartWorkOfficeData = {
  worker_id: number;
  latitude: number;
  longitude: number;
};

export type EndWorkOfficeData = {
  worker_id: number;
  latitude: number;
  longitude: number;
};