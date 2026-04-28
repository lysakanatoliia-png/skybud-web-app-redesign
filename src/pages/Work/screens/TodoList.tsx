import { FC, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { endWork, endWorkOffice } from '../../../requests/work';
import { logger } from '../../../lib/logger';
import { WorkProcessEndOut } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';
import { ErrorDetails } from '@/components/ui/ErrorDetails';
import { createWorkTask, getWorkTasks, bulkUpdateWorkTasks, updateWorkTask } from '../../../requests/work-task';
import { createComment } from '../../../requests/comment';
import ImageViewer from '@/components/ui/ImageViewer';
import { WorkTaskOut } from '../../../requests/work-task/types';
import { TELEGRAM_BOT_TOKEN as TELEGRAM_BOT_TOKEN_ENV, TELEGRAM_CHAT_ID as TELEGRAM_CHAT_ID_ENV, BOT_API_URL } from '../../../lib/env';

interface Task {
  id: string;
  text: string;
  status: 'pending' | 'completed' | 'not-completed';
  isCustom: boolean;
  photo_url?: string | null;
}

interface TodoListProps {
  onComplete?: (workData: WorkProcessEndOut) => void;
  onBack?: () => void;
  facilityId?: number | null;
  facilityTypeId?: number | null;
  embedded?: boolean;
  hideBack?: boolean;
}

const TodoList: FC<TodoListProps> = ({ onComplete, onBack, facilityId = null, facilityTypeId = null, embedded = false, hideBack = false }) => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [newTaskText, setNewTaskText] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [workComment, setWorkComment] = useState('');
  const [isObjectCompleted, setIsObjectCompleted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    details?: any;
  } | null>(null);
  const [lastErrorSummary, setLastErrorSummary] = useState<string | null>(null);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const [heartbeatTick, setHeartbeatTick] = useState(0);
  const [activeSpeedInfo, setActiveSpeedInfo] = useState<{
    mbps: number;
    quality: 'good' | 'medium' | 'poor';
    stable: boolean;
    samples: number[];
  } | null>(null);
  const hasInitialSpeedCheck = useRef(false);
  
  const tgBotToken = TELEGRAM_BOT_TOKEN_ENV;
  const tgChatId = TELEGRAM_CHAT_ID_ENV;
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setUploadLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  const getConnectionInfo = () => {
    const connection = (navigator as any).connection;
    if (!connection) return null;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  };
  
  const getConnectionQuality = () => {
    const info = getConnectionInfo();
    if (!info) return 'unknown' as const;
    const effectiveType = info.effectiveType;
    const downlink = typeof info.downlink === 'number' ? info.downlink : null;
    const rtt = typeof info.rtt === 'number' ? info.rtt : null;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'poor' as const;
    if (downlink !== null && downlink < 0.5) return 'poor' as const;
    if (rtt !== null && rtt > 800) return 'poor' as const;
    if (effectiveType === '3g') return 'medium' as const;
    if (downlink !== null && downlink < 2) return 'medium' as const;
    if (rtt !== null && rtt > 300) return 'medium' as const;
    return 'good' as const;
  };
  
  const testDownloadSpeed = async () => {
    const testUrl = new URL('/speed-test-49mb.txt', window.location.origin);
    testUrl.searchParams.set('cacheBust', Date.now().toString());
    const rangeBytes = 5 * 1024 * 1024; // 5MB sample to avoid large downloads
    const start = performance.now();
    const response = await fetch(testUrl.toString(), {
      cache: 'no-store',
      headers: {
        Range: `bytes=0-${rangeBytes - 1}`,
      },
    });
    const buffer = await response.arrayBuffer();
    const end = performance.now();
    const bytes = buffer.byteLength;
    const seconds = Math.max((end - start) / 1000, 0.001);
    const mbps = (bytes * 8) / (seconds * 1024 * 1024);
    try {
      addLog(`Тест скорости: загружено ${(bytes / 1024 / 1024).toFixed(2)} MB, данные не сохраняются`);
    } catch {
      // ignore log errors
    }
    return mbps;
  };
  
  const runSpeedCheck = async () => {
    try {
      const samples: number[] = [];
      // two samples to check stability
      samples.push(await testDownloadSpeed());
      samples.push(await testDownloadSpeed());
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((a, b) => a + Math.abs(b - avg), 0) / samples.length;
      const stable = variance / Math.max(avg, 0.1) < 0.5;
      let quality: 'good' | 'medium' | 'poor';
      if (avg < 1.5) {
        quality = 'poor';
      } else if (avg < 5) {
        quality = 'medium';
      } else {
        quality = 'good';
      }
      setActiveSpeedInfo({
        mbps: Number(avg.toFixed(2)),
        quality,
        stable,
        samples: samples.map(s => Number(s.toFixed(2))),
      });
      return { avg, quality, stable };
    } catch {
      setActiveSpeedInfo(null);
      return null;
    }
  };
  
  useEffect(() => {
    if (embedded || hasInitialSpeedCheck.current) return;
    hasInitialSpeedCheck.current = true;
    void runSpeedCheck();
  }, [embedded]);
  
  useEffect(() => {
    if (!isCompleting) return;
    const interval = setInterval(() => {
      setHeartbeatTick((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [isCompleting]);
  
  
  const sendErrorToTelegram = async (text: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text,
          disable_web_page_preview: true,
        }),
      });
    } catch {
      // игнорируем ошибки отправки
    }
  };
  
  // Перехватываем console.log, console.error, console.warn для вывода в UI
  useEffect(() => {
    if (!isCompleting) return;
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      addLog(`[LOG] ${message}`);
    };
    
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      addLog(`[ERROR] ${message}`);
    };
    
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      addLog(`[WARN] ${message}`);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isCompleting]);

  const allowedWorkerTypes = ['admin', 'coder', 'worker', 'master', 'foreman', 'engineer', 'assistant'];
  const canSelectObjectsAndVehicles = user?.worker_type && allowedWorkerTypes.includes(user.worker_type);

  const queryParams = useMemo(() => {
    if (canSelectObjectsAndVehicles) {
      // Для работников с объектами - фильтрация по facility_id и facility_type_id
      return {
        facility_id: facilityId,
        facility_type_id: facilityTypeId,
        finished: null as boolean | null,
      };
    } else {
      // Для офисных работников - фильтрация по worker_id
      return {
        worker_id: user?.id || null,
        finished: null as boolean | null,
      };
    }
  }, [canSelectObjectsAndVehicles, facilityId, facilityTypeId, user?.id]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await getWorkTasks(queryParams);
        if (response.error) return;
        const fetched = (response.data || []) as WorkTaskOut[];
        const mapped: Task[] = fetched.map((t) => ({
          id: String(t.id),
          text: t.text || '',
          status: t.finished ? 'completed' : 'pending',
          isCustom: false,
          photo_url: t.photo_url || null,
        }));
        setTasks(mapped);
      } catch {
        // silent
      }
    };
    loadTasks();
  }, [queryParams]);

  const handleTaskComplete = async (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'completed' } : task
    ));
    if (embedded) {
      const numericId = Number(taskId);
      if (!isNaN(numericId)) {
        try { await updateWorkTask(numericId, { finished: true }); } catch {}
      }
    }
  };

  const handleTaskNotComplete = async (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'not-completed' } : task
    ));
    if (embedded) {
      const numericId = Number(taskId);
      if (!isNaN(numericId)) {
        try { await updateWorkTask(numericId, { finished: false }); } catch {}
      }
    }
  };

  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      const text = newTaskText.trim();
      if (embedded) {
        try {
          const res = await createWorkTask({
            text,
            facility_id: canSelectObjectsAndVehicles ? (facilityId ?? undefined) : undefined,
            facility_type_id: canSelectObjectsAndVehicles ? (facilityTypeId ?? undefined) : undefined,
            worker_id: user?.id,
          });
          if (!res.error && res.data) {
            const created: Task = {
              id: String(res.data.id),
              text: res.data.text || text,
              status: res.data.finished ? 'completed' : 'pending',
              isCustom: false,
              photo_url: res.data.photo_url || null,
            };
            setTasks(prev => [created, ...prev]);
            setNewTaskText('');
            return;
          }
        } catch {}
      }
      const newTask: Task = {
        id: Date.now().toString(),
        text,
        status: 'pending',
        isCustom: true
      };
      setTasks(prev => [...prev, newTask]);
      setNewTaskText('');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const notCompletedTasks = tasks.filter(task => task.status === 'not-completed').length;
  const markedTasks = tasks.filter(task => task.status !== 'pending').length;
  const totalTasks = tasks.length;
  const allTasksMarked = markedTasks === totalTasks;

  const handleCompleteWork = async () => {
    if (embedded) return; // embedded mode doesn't finish work
    if (!user?.id) return;
    await startCompletion();
  };
  
  const startCompletion = async () => {

    // Очищаем предыдущие логи
    setUploadLogs([]);
    setErrorDetails(null);
    setLastErrorSummary(null);

    addLog('Начало завершения работы...');
    addLog(`Пользователь: ID ${user.id}, тип: ${user.worker_type}`);

    logger.info('handleCompleteWork called', {
      user: { id: user.id, worker_type: user.worker_type },
      canSelectObjectsAndVehicles,
      facilityId,
      facilityTypeId,
      tasksCount: tasks.length,
      isObjectCompleted,
    });

    setIsCompleting(true);

    try {
      // update server tasks in bulk and create custom tasks one-by-one
      const existingTasks = tasks.filter(t => !t.isCustom);
      const customTasks = tasks.filter(t => t.isCustom);

      addLog(`Обновление задач: существующих ${existingTasks.length}, новых ${customTasks.length}`);

      if (existingTasks.length > 0) {
        addLog('Отправка обновлений существующих задач...');
        const bulkPayload = {
          tasks: existingTasks.map(t => ({ id: Number(t.id), finished: t.status === 'completed' }))
        };
        logger.debug('Bulk updating tasks', bulkPayload);
        await bulkUpdateWorkTasks(bulkPayload);
        addLog('✓ Задачи обновлены успешно');
      }

      for (const ct of customTasks) {
        if (ct.text.trim().length === 0) continue;
        addLog(`Создание новой задачи: "${ct.text.trim().substring(0, 30)}..."`);
        logger.debug('Creating custom task', { text: ct.text.trim(), status: ct.status });
        await createWorkTask({
          text: ct.text.trim(),
          facility_id: canSelectObjectsAndVehicles ? (facilityId ?? undefined) : undefined,
          facility_type_id: canSelectObjectsAndVehicles ? (facilityTypeId ?? undefined) : undefined,
          worker_id: user.id,
          finished: ct.status === 'completed',
        });
        addLog('✓ Задача создана');
      }

      // Получаем геолокацию
      addLog('Запрос геолокации...');
      // На Android может быть проблема с повторным запросом геолокации с высоким приоритетом
      // Используем те же параметры, что и при начале работы, для консистентности
      const isAndroid = /android/i.test(navigator.userAgent);
      const geolocationOptions = {
        enableHighAccuracy: canSelectObjectsAndVehicles,
        timeout: 60000, // увеличено для снижения таймаутов
        maximumAge: 120000
      };

      logger.debug('Requesting geolocation for work completion', {
        ...geolocationOptions,
        canSelectObjectsAndVehicles,
        isAndroid,
        userAgent: navigator.userAgent,
      });
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const startTime = Date.now();
        let retryAttempt = 0;
        
        const tryGetPosition = (useHighAccuracy: boolean) => {
          const currentOptions = {
            ...geolocationOptions,
            enableHighAccuracy: useHighAccuracy,
          };
          
          const successCallback = (pos: GeolocationPosition) => {
            const elapsed = Date.now() - startTime;
            logger.info('Geolocation obtained for work completion', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              elapsedMs: elapsed,
              attempt: retryAttempt + 1,
              usedHighAccuracy: useHighAccuracy,
              isAndroid,
            });
            resolve(pos);
          };
          
          const errorCallback = (error: GeolocationPositionError) => {
            const elapsed = Date.now() - startTime;
            const errorMsg = error.code === 1 ? 'Доступ запрещен' : error.code === 2 ? 'Недоступна' : 'Таймаут';
            addLog(`✗ Ошибка геолокации: ${errorMsg} (${elapsed}мс)`);
            logger.error('Geolocation error when completing work', {
              code: error.code,
              message: error.message,
              elapsedMs: elapsed,
              attempt: retryAttempt + 1,
              usedHighAccuracy: useHighAccuracy,
              isAndroid,
              errorCode1: 'PERMISSION_DENIED',
              errorCode2: 'POSITION_UNAVAILABLE',
              errorCode3: 'TIMEOUT'
            });
            
            // Если первая попытка с высоким приоритетом не удалась, пробуем с низким
            if (retryAttempt === 0 && useHighAccuracy && error.code !== 1) {
              retryAttempt++;
              addLog(`Повторная попытка геолокации с низкой точностью...`);
              logger.debug('Retrying geolocation with lower accuracy on Android', {
                attempt: retryAttempt + 1,
              });
              setTimeout(() => {
                tryGetPosition(false);
              }, 500); // Небольшая задержка перед повторной попыткой
            } else {
              reject(error);
            }
          };
          
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, currentOptions);
        };
        
        // Начинаем с запрошенной точности
        tryGetPosition(canSelectObjectsAndVehicles);
      });
      
      logger.debug('Geolocation obtained, continuing with work completion');

      addLog(`Подготовка данных для отправки...`);

      let response;
      let requestData;
      
      if (canSelectObjectsAndVehicles) {
        // Для admin, coder, worker, master - обычный эндпоинт без файлов
        requestData = {
          worker_id: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status_object_finished: isObjectCompleted,
        };
        addLog(`Отправка запроса на завершение работы...`);
        addLog(`URL: ${BOT_API_URL}/api/v1/work/end`);
        addLog(`Метод: POST`);
        addLog(`Данные запроса:`);
        addLog(`  - worker_id: ${requestData.worker_id}`);
        addLog(`  - latitude: ${requestData.latitude}`);
        addLog(`  - longitude: ${requestData.longitude}`);
        addLog(`  - status_object_finished: ${requestData.status_object_finished}`);
        logger.info('Ending facility work', requestData);
        
        response = await endWork(requestData);
      } else {
        // Для остальных - офисный эндпоинт без facility_id, instrument_photos, фото и видео
        requestData = {
          worker_id: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        addLog(`Отправка запроса на завершение офисной работы...`);
        addLog(`URL: ${BOT_API_URL}/api/v1/work/end-office`);
        addLog(`Метод: POST`);
        addLog(`Данные запроса:`);
        addLog(`  - worker_id: ${requestData.worker_id}`);
        addLog(`  - latitude: ${requestData.latitude}`);
        addLog(`  - longitude: ${requestData.longitude}`);
        logger.info('Ending office work', requestData);
        response = await endWorkOffice(requestData);
      }
      
      logger.debug('Work end API response received', {
        hasError: !!response.error,
        hasData: !!response.data,
        status: response.status,
        error: response.error,
      });

      if (response.error) {
        addLog(`✗ Ошибка при отправке запроса`);
        const errorData = response.error as any;
        addLog(`Код ошибки: ${errorData?.code || 'неизвестно'}`);
        addLog(`HTTP статус: ${errorData?.response?.status || response.status || 'неизвестно'}`);
        addLog(`Статус текст: ${errorData?.response?.statusText || 'неизвестно'}`);
        if (errorData?.message) {
          addLog(`Сообщение: ${errorData.message}`);
        }
        if (errorData?.response?.data) {
          addLog(`Ответ сервера: ${JSON.stringify(errorData.response.data)}`);
        }
        const isAndroid = /android/i.test(navigator.userAgent);
        
        // Детальное логирование ошибки для диагностики
        const errorDetails = {
          requestData: {
            ...requestData,
          },
          response: {
            error: response.error,
            status: response.status,
            message: errorData?.message,
            code: errorData?.code,
            responseData: errorData?.response?.data,
            responseStatus: errorData?.response?.status,
            responseStatusText: errorData?.response?.statusText,
          },
          environment: {
            isAndroid,
            userAgent: navigator.userAgent,
            connectionType: (navigator as any).connection?.effectiveType,
          },
        };
        
        logger.error('Failed to end work', errorDetails);
        console.error('Failed to end work:', errorDetails);
        
        // Более информативное сообщение об ошибке
        let errorMessage = t('work.endWorkError');
        
        if (errorData?.code === 'ERR_NETWORK' || errorData?.message?.includes('Network Error') || errorData?.message?.includes('Failed to fetch')) {
          errorMessage = 'Не удалось отправить запрос. Проверьте интернет-соединение и попробуйте снова.';
        } else if (errorData?.code === 'ERR_BAD_RESPONSE') {
          // Специальная обработка для ERR_BAD_RESPONSE
          const httpStatus = errorData?.response?.status;
          const responseMessage = errorData?.message || '';
          
          if (responseMessage.includes('Empty response')) {
            errorMessage = 'Сервер вернул пустой ответ. Возможно, проблема на стороне сервера. Попробуйте позже или обратитесь в поддержку.';
          } else if (responseMessage.includes('Failed to parse')) {
            errorMessage = 'Сервер вернул некорректный ответ. Возможно, проблема на стороне сервера. Попробуйте позже или обратитесь в поддержку.';
          } else if (httpStatus === 413) {
            errorMessage = 'Запрос слишком большой. Обратитесь в поддержку.';
          } else if (httpStatus === 408 || errorData?.code === 'ECONNABORTED') {
            errorMessage = 'Превышено время ожидания. Проверьте интернет-соединение и попробуйте снова.';
          } else if (httpStatus >= 500) {
            errorMessage = `Ошибка сервера (${httpStatus}). Сервер временно недоступен. Попробуйте позже или обратитесь в поддержку.`;
          } else if (httpStatus === 400) {
            errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова. Если проблема повторяется, обратитесь в поддержку.';
          } else if (httpStatus === 401 || httpStatus === 403) {
            errorMessage = 'Ошибка авторизации. Перезайдите в приложение.';
          } else if (httpStatus === 404) {
            errorMessage = 'Эндпоинт не найден. Возможно, проблема с конфигурацией сервера. Обратитесь в поддержку.';
          } else if (httpStatus === 429) {
            errorMessage = 'Слишком много запросов. Подождите немного и попробуйте снова.';
          } else if (httpStatus) {
            errorMessage = `Ошибка сервера (${httpStatus}): ${responseMessage || 'Неизвестная ошибка'}. Попробуйте позже или обратитесь в поддержку.`;
          } else {
            errorMessage = `Ошибка при получении ответа от сервера: ${responseMessage || 'Неизвестная ошибка'}. Проверьте интернет-соединение и попробуйте снова.`;
          }
        } else if (errorData?.response?.status === 413) {
          errorMessage = 'Запрос слишком большой. Обратитесь в поддержку.';
        } else if (errorData?.response?.status === 408 || errorData?.code === 'ECONNABORTED') {
          errorMessage = 'Превышено время ожидания. Проверьте интернет-соединение и попробуйте снова.';
        } else if (errorData?.response?.status >= 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже.';
        } else if (errorData?.response?.status === 400) {
          errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова.';
        } else if (errorData?.response?.status === 401 || errorData?.response?.status === 403) {
          errorMessage = 'Ошибка авторизации. Перезайдите в приложение.';
        }
        
        // Сохраняем детали ошибки для отображения в UI
        const errorSummaryParts = [
          `Ошибка: ${errorMessage}`,
          errorData?.response?.status ? `HTTP ${errorData.response.status}` : null,
          errorData?.code ? `Код ${errorData.code}` : null,
        ].filter(Boolean);
        setLastErrorSummary(errorSummaryParts.join(' | '));
        const connectionInfo = getConnectionInfo();
        const errorText = [
          'Ошибка завершения работы',
          `User: ${user.id} (${user.worker_type || 'unknown'})`,
          `HTTP: ${errorData?.response?.status || response.status || 'unknown'}`,
          `Code: ${errorData?.code || 'unknown'}`,
          `Message: ${errorMessage}`,
          connectionInfo
            ? `Connection: ${JSON.stringify(connectionInfo)}`
            : 'Connection: unknown',
        ].join('\n');
        void sendErrorToTelegram(errorText);
        
        setErrorDetails({
          title: 'Ошибка завершения работы',
          message: errorMessage,
          details: {
            status: errorData?.response?.status || response.status,
            statusText: errorData?.response?.statusText,
            code: errorData?.code,
            responseData: errorData?.response?.data,
            requestData: {
              worker_id: requestData.worker_id,
              latitude: requestData.latitude,
              longitude: requestData.longitude,
              status_object_finished: requestData.status_object_finished,
            },
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
              connectionType: (navigator as any).connection?.effectiveType,
            },
          },
        });
        
        toastError(errorMessage);
        setIsCompleting(false);
        return;
      }

      addLog(`✓ Запрос успешно отправлен!`);
      addLog(`HTTP статус ответа: ${response.status || 200}`);
      addLog(`Ответ сервера:`);
      addLog(`  - ID процесса: ${response.data?.id || 'неизвестно'}`);
      addLog(`  - worker_id: ${response.data?.worker_id || 'неизвестно'}`);
      addLog(`  - facility_id: ${response.data?.facility_id || 'null'}`);
      addLog(`  - end_time: ${response.data?.end_time || 'неизвестно'}`);
      addLog(`  - После завершения работы вам будет отправлено Telegram сообщение с кнопками для загрузки медиа`);
      
      logger.info('Work completed successfully', {
        workProcessId: response.data?.id,
      });

      // optional comment after getting process id
      try {
        const text = workComment.trim();
        if (text.length > 0) {
          addLog(`Добавление комментария...`);
          logger.debug('Adding work comment', { workProcessId: response.data.id, commentLength: text.length });
          await createComment({ worker_process_id: response.data.id, text });
          addLog(`✓ Комментарий добавлен`);
        }
      } catch (error) {
        addLog(`✗ Ошибка при добавлении комментария`);
        logger.warn('Failed to add work comment', { error });
      }

      addLog(`✓ Работа успешно завершена!`);
      addLog(`Проверьте Telegram - вам будет отправлено сообщение с кнопками для загрузки медиа`);
      toastSuccess(t('work.workEnded'));
      onComplete && onComplete(response.data);
    } catch (error) {
      addLog(`✗ Исключение при завершении работы`);
      if (error instanceof Error) {
        addLog(`Тип: ${error.name}`);
        addLog(`Сообщение: ${error.message}`);
      } else {
        addLog(`Ошибка: ${String(error)}`);
      }
      
      logger.error('Exception when completing work', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      console.error('Error ending work:', error);
      
      let errorMessage = t('work.endWorkError');
      let errorTitle = 'Ошибка завершения работы';
      
      if (error instanceof GeolocationPositionError) {
        errorTitle = 'Ошибка геолокации';
        errorMessage = error.code === 1 
          ? 'Доступ к геолокации запрещен. Разрешите доступ в настройках устройства.'
          : error.code === 2 
          ? 'Геолокация недоступна. Проверьте настройки GPS.'
          : 'Превышено время ожидания геолокации. Попробуйте снова.';
        
        setErrorDetails({
          title: errorTitle,
          message: errorMessage,
          details: {
            code: error.code,
            message: error.message,
            errorCode1: 'PERMISSION_DENIED',
            errorCode2: 'POSITION_UNAVAILABLE',
            errorCode3: 'TIMEOUT',
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
            },
          },
        });
      } else {
        const errorData = error as any;
        
        // Улучшенная обработка ERR_BAD_RESPONSE в блоке catch
        if (errorData?.code === 'ERR_BAD_RESPONSE') {
          const httpStatus = errorData?.response?.status;
          const responseMessage = errorData?.message || '';
          
          if (responseMessage.includes('Empty response')) {
            errorMessage = 'Сервер вернул пустой ответ. Возможно, проблема на стороне сервера. Попробуйте позже или обратитесь в поддержку.';
          } else if (responseMessage.includes('Failed to parse')) {
            errorMessage = 'Сервер вернул некорректный ответ. Возможно, проблема на стороне сервера. Попробуйте позже или обратитесь в поддержку.';
          } else if (httpStatus >= 500) {
            errorMessage = `Ошибка сервера (${httpStatus}). Сервер временно недоступен. Попробуйте позже.`;
          } else if (httpStatus === 400) {
            errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова.';
          } else if (httpStatus === 401 || httpStatus === 403) {
            errorMessage = 'Ошибка авторизации. Перезайдите в приложение.';
          } else if (httpStatus) {
            errorMessage = `Ошибка сервера (${httpStatus}): ${responseMessage || 'Неизвестная ошибка'}. Попробуйте позже.`;
          } else {
            errorMessage = `Ошибка при получении ответа от сервера: ${responseMessage || 'Неизвестная ошибка'}. Проверьте интернет-соединение.`;
          }
        }
        
        const errorSummaryParts = [
          `Ошибка: ${errorMessage}`,
          errorData?.code ? `Код ${errorData.code}` : null,
          errorData?.response?.status ? `HTTP ${errorData.response.status}` : null,
        ].filter(Boolean);
        setLastErrorSummary(errorSummaryParts.join(' | '));
        const connectionInfo = getConnectionInfo();
        const errorText = [
          'Ошибка завершения работы (исключение)',
          `User: ${user?.id || 'unknown'} (${user?.worker_type || 'unknown'})`,
          `Code: ${errorData?.code || 'unknown'}`,
          `HTTP: ${errorData?.response?.status || 'unknown'}`,
          `Message: ${errorMessage}`,
          connectionInfo
            ? `Connection: ${JSON.stringify(connectionInfo)}`
            : 'Connection: unknown',
        ].join('\n');
        void sendErrorToTelegram(errorText);
        
        setErrorDetails({
          title: errorTitle,
          message: errorMessage,
          details: {
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
            } : String(error),
            code: errorData?.code,
            response: errorData?.response,
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
              connectionType: (navigator as any).connection?.effectiveType,
            },
          },
        });
      }
      
      toastError(errorMessage);
      setIsCompleting(false);
    }
  };

  return (
    <div className={`bg-theme-bg-primary p-6 overflow-x-hidden ${embedded ? '' : 'min-h-screen page'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Error Details */}
        {lastErrorSummary && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Последняя ошибка:
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 break-words">
              {lastErrorSummary}
            </div>
          </div>
        )}

        {errorDetails && (
          <ErrorDetails
            title={errorDetails.title}
            message={errorDetails.message}
            details={errorDetails.details}
            onClose={() => setErrorDetails(null)}
          />
        )}
        
        {/* Connection status */}
        {!embedded && (
          <div className="bg-theme-bg-card border border-theme-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-theme-text-primary">
                Скорость соединения
              </div>
              <div className="text-xs text-theme-text-secondary">
                {activeSpeedInfo
                  ? `${activeSpeedInfo.mbps} Mbps`
                  : (() => {
                    const info = getConnectionInfo();
                    return typeof info?.downlink === 'number'
                      ? `${info.downlink} Mbps`
                      : 'нет данных';
                  })()}
              </div>
            </div>
            <div className="mt-2 text-xs">
              {(() => {
                const quality = activeSpeedInfo?.quality || getConnectionQuality();
                if (quality === 'good') {
                  return <span className="text-green-600">Хорошее соединение</span>;
                }
                if (quality === 'medium') {
                  return <span className="text-amber-600">Среднее соединение</span>;
                }
                if (quality === 'poor') {
                  return <span className="text-red-600">Плохое соединение</span>;
                }
                return <span className="text-theme-text-muted">Нет данных о сети</span>;
              })()}
              {activeSpeedInfo && (
                <div className="text-theme-text-muted mt-1">
                  {activeSpeedInfo.stable ? 'Стабильное' : 'Нестабильное'} · samples: {activeSpeedInfo.samples.join(', ')} Mbps
                </div>
              )}
            </div>
          </div>
        )}
        
        {!embedded && isCompleting && (
          <div className="bg-theme-bg-card border border-theme-border rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold text-theme-text-primary mb-2">
              Завершение работы
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-theme-text-secondary">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-theme-accent"></div>
                Отправка запроса на сервер{'.'.repeat((heartbeatTick % 3) + 1)}
              </div>
            </div>
          </div>
        )}
        
        
        {/* Upload Progress and Logs */}
        {(isCompleting || uploadLogs.length > 0) && !['worker', 'master'].includes(user?.worker_type) && (
          <div className="bg-theme-bg-card border border-theme-border rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-theme-text-primary mb-3">
              {isCompleting ? 'Завершение работы...' : 'Логи операции'}
            </h3>
            
            {/* Logs */}
            {uploadLogs.length > 0 && (
              <div className="bg-theme-bg-tertiary rounded p-3 max-h-60 overflow-y-auto">
                <div className="space-y-1">
                  {[...uploadLogs].reverse().map((log, index) => (
                    <div key={index} className="text-xs font-mono text-theme-text-secondary">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Header */}
        {!embedded && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
            {t('work.todoList')}
          </h1>
          <p className="text-theme-text-secondary mb-2">
            {t('work.todoDescription')}
          </p>
          <div className="text-theme-accent font-medium">
            {t('work.step')} 3 {t('work.of')} 3: {t('work.todoList')}
          </div>
        </div>
        )}

        {/* Progress Steps */}
        {!embedded && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 max-[350px]:gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-theme-text-secondary text-sm">{t('work.workPhotosStep')}</span>
            </div>
            <div className="w-8 h-0.5 bg-theme-accent max-[400px]:hidden"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-theme-text-secondary text-sm">{t('work.toolsStep')}</span>
            </div>
            <div className="w-8 h-0.5 bg-theme-accent max-[400px]:hidden"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-theme-accent text-sm font-medium">{t('work.todoList')}</span>
            </div>
          </div>
        </div>
        )}

        {!embedded && (
        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-4 mb-6">
          <div className="text-theme-text-primary font-semibold">
            {t('work.progress')}: {markedTasks}/{totalTasks}
          </div>
          <div className="w-full bg-theme-bg-tertiary rounded-full h-2 mt-2">
            <div 
              className="bg-theme-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(markedTasks / totalTasks) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-theme-text-secondary mt-2">
            <span>✅ {completedTasks} {t('work.completed')}</span>
            <span>❌ {notCompletedTasks} {t('work.notCompleted')}</span>
          </div>
        </div>
        )}

        {/* Tasks List */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="space-y-2">
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all w-full ${
                    task.status === 'completed'
                      ? 'bg-theme-accent/10 border-theme-accent'
                      : task.status === 'not-completed'
                      ? 'bg-theme-error/10 border-theme-error'
                      : 'bg-theme-bg-tertiary border-theme-border hover:border-theme-accent/50'
                  }`}
                >
                  {/* Task action buttons */}
                  <div className="flex items-center gap-2">
                    {/* Complete button */}
                    <button
                      onClick={() => handleTaskComplete(task.id)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                        task.status === 'completed'
                          ? 'bg-theme-accent border-theme-accent text-white'
                          : 'border-theme-border text-theme-text-muted hover:border-theme-accent hover:bg-theme-accent/10'
                      }`}
                      title={t('work.complete')}
                    >
                      <Check className="h-4 w-4" />
                    </button>

                    {/* Not complete button */}
                    <button
                      onClick={() => handleTaskNotComplete(task.id)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                        task.status === 'not-completed'
                          ? 'bg-theme-error border-theme-error text-white'
                          : 'border-theme-border text-theme-text-muted hover:border-theme-error hover:bg-theme-error/10'
                      }`}
                      title={t('work.notComplete')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Task text */}
                  <div className="flex-1">
                    <span className={`text-lg break-words leading-snug ${
                      task.status === 'completed' 
                        ? 'line-through text-theme-text-muted' 
                        : task.status === 'not-completed'
                        ? 'text-theme-error'
                        : 'text-theme-text-primary'
                    }`}>
                      {task.text}
                    </span>
                    {task.isCustom && (
                      <span className="ml-2 text-xs text-theme-accent bg-theme-accent/20 px-2 py-1 rounded">
                        {t('work.custom')}
                      </span>
                    )}
                  </div>

                  {/* Delete button for custom tasks */}
                  {task.isCustom && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-theme-error hover:text-theme-error/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Task photos */}
                {!task.isCustom && task.photo_url && (
                  <ImageViewer images={[task.photo_url]} thumbnailClassName="w-28 h-28 object-cover rounded border border-theme-border" containerClassName="grid grid-cols-4 gap-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add new task */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('work.addNewTask')}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('work.taskPlaceholder')}
              className="flex-1 w-full px-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-lg text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 w-full sm:w-auto ${
                newTaskText.trim()
                  ? 'bg-theme-accent text-white hover:bg-theme-accent-hover'
                  : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4" />
              {t('work.add')}
            </button>
          </div>
        </div>

        {/* Work comment */}
        {!embedded && (
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">{t('work.commentsAboutWork')}</h3>
          <textarea
            className="w-full min-h-24 px-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-lg text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
            placeholder={t('work.commentPlaceholder')}
            value={workComment}
            onChange={(e) => setWorkComment(e.target.value)}
          />
        </div>
        )}

        {/* Object Completion Checkbox - только для работников с объектами */}
        {!embedded && canSelectObjectsAndVehicles && (
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="object-completed"
              checked={isObjectCompleted}
              onChange={(e) => setIsObjectCompleted(e.target.checked)}
              className="w-5 h-5 text-theme-accent bg-theme-bg-primary border-theme-border rounded focus:ring-theme-accent focus:ring-2"
            />
            <label htmlFor="object-completed" className="text-theme-text-primary font-medium cursor-pointer">
              {t('work.objectCompletedCheckbox')}
            </label>
          </div>
        </div>
        )}

        {/* Navigation */}
        {!embedded && (
        <div className={`flex flex-col sm:flex-row ${hideBack ? 'justify-end' : 'justify-between'} gap-3`}>
          {!hideBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-bg-hover transition-colors w-full sm:w-auto"
            >
              {t('work.back')}
            </button>
          )}
          
          <button
            onClick={handleCompleteWork}
            disabled={!allTasksMarked || isCompleting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto ${
              allTasksMarked && !isCompleting
                ? 'bg-theme-accent text-white hover:bg-theme-accent-hover'
                : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            }`}
          >
            {isCompleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('work.completingWork')}
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                {t('work.finishWork')}
              </>
            )}
          </button>
        </div>
        )}

        {/* Completion message */}
        {!embedded && allTasksMarked && (
          <div className="mt-6 bg-theme-accent/10 border border-theme-accent rounded-lg p-4 text-center">
            <div className="text-theme-accent font-semibold text-lg">
              {t('work.allTasksMarked')}
            </div>
            <div className="text-theme-text-secondary text-sm mt-1">
              {t('work.readyToFinish')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;