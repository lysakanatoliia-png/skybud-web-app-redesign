// MOCK режим: причина зупинки завжди зберігається успішно.
import { sleep, ok } from "../../mocks/delay";

export const submitStopReason = async (data: unknown): Promise<{ data: any; status?: number }> => {
  await sleep();
  return ok({
    id: Math.floor(Math.random() * 1000) + 1,
    recorded: true,
    message: "Stop reason recorded (mock)",
    data,
  });
};
