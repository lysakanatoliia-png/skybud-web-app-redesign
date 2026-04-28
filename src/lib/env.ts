/**
 * Centralised access to VITE_* environment variables.
 * Every module that needs a URL / token should import from here
 * instead of reading import.meta.env directly.
 */

export const BOT_API_URL: string =
  import.meta.env.VITE_BOT_API_URL || 'https://bot-api.skybud.de';

export const BOT_API_TOKEN: string =
  import.meta.env.VITE_BOT_API_TOKEN || '';

export const CRM_API_URL: string =
  import.meta.env.VITE_CRM_API_URL || 'https://api-crm.skybud.de';

export const VEHICLE_TRACKER_API_URL: string =
  import.meta.env.VITE_VEHICLE_TRACKER_API_URL || 'https://vehicle-tracker.skybud.de/api/v1';

export const S3_PUBLIC_BASE: string =
  import.meta.env.VITE_S3_PUBLIC_BASE || 'https://eu2.contabostorage.com/98b79ab87f924c309a1865b38fe9f4d2:';

export const TELEGRAM_BOT_TOKEN: string =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';

export const TELEGRAM_CHAT_ID: string =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

export const WEBAPP_LOGS_TOKEN: string =
  import.meta.env.VITE_WEBAPP_LOGS_TOKEN || '';

export const APP_VERSION: string =
  import.meta.env.VITE_APP_VERSION || '1.0.0';
