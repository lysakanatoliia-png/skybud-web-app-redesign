export type AdjustmentTypeEnum = "penalty" | "prepayment" | "award";

export type AdjustmentOut = {
  id: number;
  worker_id: number;
  adjustment_type: AdjustmentTypeEnum;
  amount: number;
  reason: string;
  photo_url: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type AdjustmentCreate = {
  worker_id: number;
  adjustment_type: AdjustmentTypeEnum;
  amount: number;
  reason: string;
  photo?: File | null;
  send_notification?: boolean;
};

export type AdjustmentQueryParams = {
  worker_id: number;
  adjustment_type: AdjustmentTypeEnum;
  date_from?: string | null;
  date_to?: string | null;
};

export type AdjustmentListResponse = {
  data: AdjustmentOut[];
  total_amount: number;
};
