/**
 * Утилита для логирования с сохранением в localStorage
 * Позволяет просматривать логи на Android устройстве
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userAgent?: string;
  url?: string;
}

const MAX_LOGS = 100; // Максимальное количество логов в хранилище

class Logger {
  private logs: LogEntry[] = [];

  constructor() {
    // Загружаем логи из localStorage при инициализации
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load logs from localStorage', e);
    }
  }

  private saveLogs() {
    try {
      // Оставляем только последние MAX_LOGS записей
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      localStorage.setItem('app_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to save logs to localStorage', e);
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Глубокое копирование
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(entry);
    this.saveLogs();

    // Также выводим в консоль
    const consoleMethod = level === 'error' ? console.error : 
                         level === 'warn' ? console.warn : 
                         level === 'debug' ? console.debug : 
                         console.log;
    
    consoleMethod(`[${level.toUpperCase()}] ${message}`, data || '');
    
    // Отправляем в WebApp Logger для отправки на бэкенд
    // Используем динамический импорт, чтобы избежать циклических зависимостей
    if (typeof window !== 'undefined') {
      try {
        // Получаем webappLogger через глобальную переменную или динамический импорт
        const webAppLogger = (window as any).__webAppLogger;
        if (webAppLogger) {
          const context: Record<string, any> = {};
          if (data) {
            try {
              // Пытаемся сериализовать data для контекста
              context.data = JSON.parse(JSON.stringify(data));
            } catch {
              context.data = String(data);
            }
          }
          webAppLogger.addManualLog(level, message, context);
        }
      } catch (e) {
        // Игнорируем ошибки интеграции
      }
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app_logs');
    console.log('Logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Создаем глобальный экземпляр
export const logger = new Logger();

// Добавляем глобальные функции для доступа из консоли браузера
if (typeof window !== 'undefined') {
  (window as any).getAppLogs = () => {
    const logs = logger.getLogs();
    console.table(logs);
    return logs;
  };

  (window as any).clearAppLogs = () => {
    logger.clearLogs();
  };

  (window as any).exportAppLogs = () => {
    const logs = logger.exportLogs();
    console.log(logs);
    // Также копируем в буфер обмена, если доступно
    if (navigator.clipboard) {
      navigator.clipboard.writeText(logs).then(() => {
        console.log('Logs copied to clipboard');
      });
    }
    return logs;
  };

  (window as any).showAppLogs = () => {
    const logs = logger.getLogs();
    const recentLogs = logs.slice(-20); // Последние 20 логов
    console.log('=== Recent App Logs ===');
    recentLogs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      console.log(`[${time}] [${log.level.toUpperCase()}] ${log.message}`, log.data || '');
    });
    console.log(`\nTotal logs: ${logs.length}`);
    console.log('Use getAppLogs() to see all logs');
    console.log('Use exportAppLogs() to export logs as JSON');
  };
}

