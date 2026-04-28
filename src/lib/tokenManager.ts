// MOCK режим: всі token-функції повертають заглушки.
export const getAuthToken = (): string | null => "mock-token";
export const getRefreshToken = (): string | null => null;
export const saveTokens = (_access: string, _refresh?: string): void => {};
export const clearTokens = (): void => {};
export const validateToken = async (_token: string): Promise<boolean> => true;
export const regenerateTokenWithRefresh = async (_refresh: string): Promise<string | null> => "mock-token";
export const regenerateTokenWithLogin = async (_email: string, _password: string): Promise<string | null> => "mock-token";
export const getDefaultCrmToken = async (): Promise<string | null> => "mock-token";
export const regenerateToken = async (): Promise<string | null> => "mock-token";
export const ensureValidToken = async (): Promise<string | null> => "mock-token";
