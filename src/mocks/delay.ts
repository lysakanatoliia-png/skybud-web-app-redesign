// Імітація мережевої затримки для реалістичності UI
// (щоб лоадери з'являлися на коротку мить)
export const sleep = (ms: number = 200): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Випадкова затримка у певному діапазоні
export const randomSleep = (min: number = 100, max: number = 400): Promise<void> =>
  sleep(min + Math.random() * (max - min));

// Універсальний стандарт відповіді: data + error?
export type MockResponse<T> = { data: T; error?: unknown; status?: number };

export const ok = <T>(data: T, status = 200): MockResponse<T> => ({ data, status });
export const fail = <T>(fallback: T, status = 500): MockResponse<T> => ({
  data: fallback,
  error: new Error(`Mock error ${status}`),
  status,
});
