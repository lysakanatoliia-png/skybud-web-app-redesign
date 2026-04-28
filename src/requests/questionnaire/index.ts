// MOCK режим: анкета завжди повертає успішну відповідь.
import { sleep, ok } from "../../mocks/delay";

export const submitQuestionnaire = async (data: unknown, _extra?: unknown): Promise<{ data: any; status?: number }> => {
  await sleep();
  return ok({
    id: Math.floor(Math.random() * 1000) + 1,
    submitted: true,
    message: "Questionnaire submitted successfully (mock)",
    data,
  });
};
