// MOCK режим: всі запити до API замінені in-memory операціями.
import { ApiResponse } from "../shared/types";
import { CommentOut, CommentCreate, CommentUpdate, CommentQueryParams } from "./types";
import { mockStore, nextId, now } from "../../mocks/store";
import { sleep, ok, fail } from "../../mocks/delay";

export const getComments = async (params?: CommentQueryParams): Promise<ApiResponse<CommentOut[]>> => {
  await sleep();
  let list = [...mockStore.comments];
  if (params?.worker_process_id != null) {
    list = list.filter((c) => c.worker_process_id === params.worker_process_id);
  }
  return ok(list.map((c) => ({ ...c })));
};

export const getCommentById = async (id: number): Promise<ApiResponse<CommentOut>> => {
  await sleep();
  const comment = mockStore.comments.find((c) => c.id === id);
  if (!comment) return fail({} as CommentOut, 404);
  return ok({ ...comment });
};

export const createComment = async (data: CommentCreate): Promise<ApiResponse<CommentOut>> => {
  await sleep();
  const comment: CommentOut = {
    id: nextId("comment"),
    worker_process_id: data.worker_process_id ?? null,
    text: data.text ?? null,
    created_at: now(),
    updated_at: now(),
  };
  mockStore.comments.push(comment);
  return ok({ ...comment });
};

export const updateComment = async (id: number, data: CommentUpdate): Promise<ApiResponse<CommentOut>> => {
  await sleep();
  const idx = mockStore.comments.findIndex((c) => c.id === id);
  if (idx === -1) return fail({} as CommentOut, 404);
  mockStore.comments[idx] = { ...mockStore.comments[idx], ...(data as any), updated_at: now() };
  return ok({ ...mockStore.comments[idx] });
};

export const deleteComment = async (id: number): Promise<ApiResponse<null>> => {
  await sleep();
  const idx = mockStore.comments.findIndex((c) => c.id === id);
  if (idx === -1) return fail(null, 404);
  mockStore.comments.splice(idx, 1);
  return ok(null);
};
