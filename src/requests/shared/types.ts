export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

export type HTTPValidationError = {
  detail: ValidationError[];
};

export type UNSET = {};

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type DateRangeParams = {
  date_from?: string | null; // YYYY-MM-DD
  date_to?: string | null; // YYYY-MM-DD
};

export type ApiResponse<T> = {
  data: T;
  error?: unknown;
  status?: number;
};
