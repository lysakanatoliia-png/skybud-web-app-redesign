/**
 * WebApp Logger - отправка логов фронтенда на бэкенд
 * Интегрируется с существующим logger.ts
 */

import { BOT_API_URL, WEBAPP_LOGS_TOKEN, APP_VERSION } from './env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  ts: string; // ISO timestamp
  url?: string;
  user_agent?: string;
  stack?: string;
  context?: Record<string, any>;
}

interface TelegramUser {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface LogBatch {
  session_id: string;
  client_id: string;
  app_version: string;
  platform: string;
  telegram?: TelegramUser;
  entries: LogEntry[];
}

class WebAppLogger {
  private buffer: LogEntry[] = [];
  private flushInterval: number = 10000; // 10 секунд
  private maxBufferSize: number = 50; // Максимальный размер буфера перед отправкой
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private clientId: string;
  private sessionId: string;
  private appVersion: string;
  private platform: string = 'web';
  private telegramUser: TelegramUser | undefined;

  // API конфигурация
  private readonly apiBase: string;
  private readonly logsToken: string;
  private readonly endpoint: string = '/api/v1/webapp-logs';

  constructor() {
    this.apiBase = BOT_API_URL;
    this.logsToken = WEBAPP_LOGS_TOKEN;
    this.appVersion = APP_VERSION;
    
    // Генерируем или получаем client_id из localStorage
    this.clientId = this.getOrCreateClientId();
    
    // Генерируем новый session_id при каждом запуске
    this.sessionId = this.generateSessionId();
    
    // Определяем платформу
    this.platform = this.detectPlatform();
    
    // Получаем информацию о Telegram WebApp если доступна
    this.detectTelegramWebApp();
    
    // Перехватываем console методы
    this.interceptConsole();
    
    // Перехватываем глобальные ошибки
    this.interceptGlobalErrors();
    
    // Запускаем периодическую отправку
    this.startFlushTimer();
    
    // Отправляем логи при выгрузке страницы
    this.setupUnloadHandler();
    
    console.log('[WebAppLogger] Initialized', {
      clientId: this.clientId,
      sessionId: this.sessionId,
      platform: this.platform,
      telegram: this.telegramUser,
    });
  }

  private getOrCreateClientId(): string {
    const key = 'webapp_logs_client_id';
    let clientId = localStorage.getItem(key);
    
    if (!clientId) {
      // Генерируем уникальный ID: c_<timestamp>_<random>
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      clientId = `c_${timestamp}_${random}`;
      localStorage.setItem(key, clientId);
    }
    
    return clientId;
  }

  private generateSessionId(): string {
    // Генерируем session_id: s_<timestamp>_<random>
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `s_${timestamp}_${random}`;
  }

  private detectPlatform(): string {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('telegram')) {
      return 'telegram';
    } else if (ua.includes('android')) {
      return 'android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      return 'ios';
    } else if (ua.includes('windows')) {
      return 'windows';
    } else if (ua.includes('mac')) {
      return 'macos';
    } else if (ua.includes('linux')) {
      return 'linux';
    }
    
    return 'web';
  }

  private detectTelegramWebApp(): void {
    if (typeof window === 'undefined') return;
    
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      this.platform = 'telegram';
      
      const initData = tg.initDataUnsafe;
      if (initData?.user) {
        this.telegramUser = {
          id: initData.user.id,
          username: initData.user.username,
          first_name: initData.user.first_name,
          last_name: initData.user.last_name,
        };
      }
    }
  }

  private interceptConsole(): void {
    if (typeof window === 'undefined') return;
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      this.addLog('info', this.formatMessage(args));
    };
    
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      const message = this.formatMessage(args);
      const stack = this.extractStack(args);
      this.addLog('error', message, { stack });
    };
    
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      this.addLog('warn', this.formatMessage(args));
    };
    
    console.debug = (...args: any[]) => {
      originalDebug.apply(console, args);
      this.addLog('debug', this.formatMessage(args));
    };
  }

  private interceptGlobalErrors(): void {
    if (typeof window === 'undefined') return;
    
    // Перехватываем window.error
    window.addEventListener('error', (event) => {
      this.addLog('error', event.message || 'Unknown error', {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
    
    // Перехватываем unhandledrejection
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      
      this.addLog('error', `Unhandled promise rejection: ${message}`, {
        stack,
        reason: typeof reason === 'object' ? reason : undefined,
      });
    });
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private extractStack(args: any[]): string | undefined {
    for (const arg of args) {
      if (arg instanceof Error && arg.stack) {
        return arg.stack;
      }
      if (arg?.stack && typeof arg.stack === 'string') {
        return arg.stack;
      }
    }
    return undefined;
  }

  /** IANA timezone (e.g. Europe/Kyiv) и смещение в минутах для контекста логов */
  private getTimezoneContext(): { timezone: string; utcOffsetMinutes: number } {
    let timezone = 'UTC';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
    } catch {
      // fallback остаётся UTC
    }
    // getTimezoneOffset(): положительное = запад UTC, отрицательное = восток; для "минут впереди UTC" инвертируем
    const utcOffsetMinutes = -new Date().getTimezoneOffset();
    return { timezone, utcOffsetMinutes };
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, any>): void {
    const timezoneContext = this.getTimezoneContext();
    const baseContext = { ...timezoneContext };
    const userContext = context ? { ...context, stack: undefined } : {};
    const entry: LogEntry = {
      level,
      message,
      ts: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      stack: context?.stack,
      context: { ...baseContext, ...userContext },
    };
    
    this.buffer.push(entry);
    
    // Если буфер достиг максимального размера, отправляем немедленно
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private setupUnloadHandler(): void {
    if (typeof window === 'undefined') return;
    
    // Используем sendBeacon для надежной отправки при выгрузке страницы
    window.addEventListener('beforeunload', () => {
      if (this.buffer.length > 0) {
        this.flush(true); // Используем sendBeacon
      }
    });
    
    // Также отправляем при скрытии страницы (для мобильных)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.buffer.length > 0) {
        this.flush(true);
      }
    });
  }

  private async flush(useKeepalive: boolean = false): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }
    
    this.isFlushing = true;
    const entries = [...this.buffer];
    this.buffer = [];
    
    const batch: LogBatch = {
      session_id: this.sessionId,
      client_id: this.clientId,
      app_version: this.appVersion,
      platform: this.platform,
      telegram: this.telegramUser,
      entries,
    };
    
    try {
      // Всегда используем fetch, но с keepalive для надежности при выгрузке
      await this.sendLogs(batch, useKeepalive);
    } catch (error) {
      // В случае ошибки возвращаем логи в буфер (кроме последних, чтобы не переполнить)
      console.error('[WebAppLogger] Failed to send logs:', error);
      this.buffer = [...entries.slice(-10), ...this.buffer]; // Оставляем только последние 10
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendLogs(batch: LogBatch, keepalive: boolean = false): Promise<void> {
    const response = await fetch(`${this.apiBase}${this.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WebApp-Logs-Token': this.logsToken,
      },
      body: JSON.stringify(batch),
      keepalive: keepalive, // Для надежности при выгрузке страницы
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to send logs: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    try {
      const result = await response.json();
      console.debug('[WebAppLogger] Logs sent successfully', result);
    } catch {
      // Если ответ не JSON, это нормально - главное что статус OK
      console.debug('[WebAppLogger] Logs sent successfully (no JSON response)');
    }
  }

  // Публичные методы для ручной отправки
  public forceFlush(): Promise<void> {
    return this.flush();
  }

  public addManualLog(level: LogLevel, message: string, context?: Record<string, any>): void {
    this.addLog(level, message, context);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getClientId(): string {
    return this.clientId;
  }
}

// Создаем глобальный экземпляр
let webAppLoggerInstance: WebAppLogger | null = null;

export function initWebAppLogger(): WebAppLogger {
  if (webAppLoggerInstance) {
    return webAppLoggerInstance;
  }
  
  webAppLoggerInstance = new WebAppLogger();
  return webAppLoggerInstance;
}

export function getWebAppLogger(): WebAppLogger | null {
  return webAppLoggerInstance;
}

// Автоматическая инициализация при импорте (только в браузере)
if (typeof window !== 'undefined') {
  // Инициализируем с небольшой задержкой, чтобы не блокировать загрузку
  setTimeout(() => {
    const logger = initWebAppLogger();
    // Сохраняем в глобальной переменной для доступа из других модулей
    (window as any).__webAppLogger = logger;
  }, 100);
}

