import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Утилиты для переопределения Telegram ID (для тестирования)
 * Использование в консоли браузера:
 * - enableTelegramOverride(6315604689) - включить переопределение
 * - disableTelegramOverride() - отключить переопределение
 * - getTelegramOverride() - проверить текущее значение
 */
if (typeof window !== 'undefined') {
  (window as any).enableTelegramOverride = (telegramId: number) => {
    localStorage.setItem('override_telegram_id', String(telegramId));
    console.log(`✅ Telegram ID override enabled: ${telegramId}`);
    console.log('🔄 Reloading page...');
    setTimeout(() => window.location.reload(), 500);
  };

  (window as any).disableTelegramOverride = () => {
    localStorage.removeItem('override_telegram_id');
    console.log('❌ Telegram ID override disabled');
    console.log('🔄 Reloading page...');
    setTimeout(() => window.location.reload(), 500);
  };

  (window as any).getTelegramOverride = () => {
    const value = localStorage.getItem('override_telegram_id');
    if (value && value !== 'disabled') {
      console.log(`📱 Current override: ${value}`);
      return value;
    } else {
      console.log('📱 No override set (using real Telegram ID)');
      return null;
    }
  };
}
