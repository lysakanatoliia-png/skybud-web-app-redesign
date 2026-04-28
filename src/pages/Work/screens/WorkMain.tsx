import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import i18n from '@/i18n/config';
import { Play, Square, MapPin, MessageCircle, ListChecks, Car, Unlock, Loader2, Clock, X, UserPlus } from 'lucide-react';
import { getFacilities } from '../../../requests/facility';
import { FacilityOut } from '../../../requests/facility/types';
import { startWork, startWorkOffice, getActiveWorkProcess } from '../../../requests/work';
import { getActiveWorkShift, startWorkShift, endWorkShift } from '../../../requests/work-shift';
import { WorkShiftOut } from '../../../requests/work-shift/types';
import DelegateTaskDialog from './components/DelegateTaskDialog';
import { WorkProcessStartOut } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';
import { logger } from '../../../lib/logger';
import { ErrorDetails } from '@/components/ui/ErrorDetails';
import TodoList from './TodoList';
import { getVehicles, unassignVehicle, createVehicleReservationRequest, getWorkerReservedVehicle, getVehicleReservationRequests, cancelVehicleReservationRequest } from '../../../requests/vehicle';
import { Vehicle, VehicleReservationRequestOut } from '../../../requests/vehicle/types';
import type { RootState } from '@/store/config';

interface WorkMainProps {
  onStartWork: (objectId: string) => void;
  onStopWork: () => void;
  selectedObject: string;
  onObjectSelect: (objectId: string) => void;
  onShowHistory: () => void;
}

const WorkMain: FC<WorkMainProps> = ({ onStartWork, onStopWork, selectedObject, onObjectSelect, onShowHistory }) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.data.user);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setActiveWorkProcess] = useState<WorkProcessStartOut | null>(null);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [activeWorkShift, setActiveWorkShift] = useState<WorkShiftOut | null>(null);
  const [isShiftActionLoading, setIsShiftActionLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservedVehicle, setReservedVehicle] = useState<Vehicle | null>(null);
  const [reservationRequest, setReservationRequest] = useState<VehicleReservationRequestOut | null>(null);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [isVehicleActionLoading, setIsVehicleActionLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isDelegateTaskDialogOpen, setIsDelegateTaskDialogOpen] = useState(false);
  const [workType, setWorkType] = useState<'facility' | 'office'>('facility'); // Для foreman, engineer, assistant
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    details?: any;
  } | null>(null);
  const isRestricted = !user?.rate || user?.worker_type == null;
  const LAST_KNOWN_POSITION_KEY = 'last_known_position';
  const saveLastKnownPosition = (pos: GeolocationPosition) => {
    try {
      const payload = {
        timestamp: Date.now(),
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      };
      localStorage.setItem(LAST_KNOWN_POSITION_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  };
  const getLastKnownPosition = (): GeolocationPosition | null => {
    try {
      const raw = localStorage.getItem(LAST_KNOWN_POSITION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.coords?.latitude || !parsed?.coords?.longitude) return null;
      const ageMs = Date.now() - (parsed.timestamp || 0);
      if (ageMs > 30 * 60 * 1000) return null; // older than 30 minutes
      return {
        coords: {
          latitude: parsed.coords.latitude,
          longitude: parsed.coords.longitude,
          accuracy: parsed.coords.accuracy || 0,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: parsed.timestamp || Date.now(),
      } as GeolocationPosition;
    } catch {
      return null;
    }
  };
  
  // Разрешенные типы работников для выбора объектов и бронирования авто
  const allowedWorkerTypes = ['admin', 'coder', 'worker', 'master', 'foreman', 'engineer', 'assistant'];
  const canSelectObjectsAndVehicles = user?.worker_type && allowedWorkerTypes.includes(user.worker_type);
  
  // Типы работников, которые могут выбирать между работой на объекте и офисной работой
  const canChooseWorkType = user?.worker_type && ['foreman', 'engineer', 'assistant'].includes(user.worker_type);
  
  const availableVehicles = useMemo(
    () => vehicles.filter(vehicle => (vehicle.owner_id == null || vehicle.owner_id === 0) && vehicle.external_id != null),
    [vehicles]
  );

  useEffect(() => {
    const fetchFacilities = async () => {
      if (!canSelectObjectsAndVehicles) {
        setIsLoading(false);
        return;
      }

      try {
        // Объекты загружаются из bot-api со статическим токеном, не нужно ждать JWT токен
        console.log('[WorkMain] Fetching facilities from bot-api...');
        const response = await getFacilities();

        if (response.error) {
          console.error('[WorkMain] Failed to fetch facilities:', response);
          // Retry один раз через 2 секунды
          setTimeout(() => {
            getFacilities().then(retryResponse => {
              if (!retryResponse.error) {
                const facilitiesData = Array.isArray(retryResponse.data) ? retryResponse.data : [];
                setFacilities(facilitiesData);
                setIsLoading(false);
              } else {
                toastError(t('work.loadError'));
                setIsLoading(false);
              }
            });
          }, 2000);
          return;
        }

        // Ensure data is an array
        const facilitiesData = Array.isArray(response.data) ? response.data : [];
        console.log('[WorkMain] Facilities loaded:', facilitiesData.length);
        setFacilities(facilitiesData);
        setIsLoading(false);
      } catch (error) {
        console.error('[WorkMain] Error fetching facilities:', error);
        // Retry через 2 секунды
        setTimeout(() => {
          getFacilities().then(retryResponse => {
            if (!retryResponse.error) {
              const facilitiesData = Array.isArray(retryResponse.data) ? retryResponse.data : [];
              setFacilities(facilitiesData);
              setIsLoading(false);
            } else {
              toastError(t('work.loadError'));
              setIsLoading(false);
            }
          });
        }, 2000);
      }
    };

    fetchFacilities();
  }, [t, canSelectObjectsAndVehicles]);

  const fetchVehicles = useCallback(async () => {
    if (!user?.id || isRestricted) {
      setVehicles([]);
      setReservedVehicle(null);
      setSelectedVehicleId(null);
      setIsVehiclesLoading(false);
      return;
    }

    setIsVehiclesLoading(true);
    try {
      const response = await getVehicles();

      if (response.error) {
        console.error('Failed to fetch vehicles:', response);
        toastError(t('work.vehicle.loadError'));
        return;
      }

      const vehiclesList = response.data ?? [];
      
      // Check worker's reservation status
      // Only check if we don't already have a reservation request in state (to avoid overwriting just-created requests)
      if (user?.id && !reservationRequest) {
        // Use the simplified endpoint that returns reservation status for the worker
        const reservationResponse = await getWorkerReservedVehicle(user.id);
        if (reservationResponse.data) {
          if (reservationResponse.data.has_reservation && reservationResponse.data.reservation?.status === 'approved') {
            setReservedVehicle(reservationResponse.data.vehicle);
            setReservationRequest(reservationResponse.data.reservation);
          } else if (reservationResponse.data.reservation) {
            // Has pending/rejected/cancelled request
            setReservationRequest(reservationResponse.data.reservation);
            setReservedVehicle(null);
          } else {
            // Check for pending requests using worker_id filter
            try {
              const pendingRequestsResponse = await getVehicleReservationRequests({ 
                worker_id: user.id,
                status: 'pending',
                limit: 1,
                offset: 0
              });
              if (pendingRequestsResponse.data && pendingRequestsResponse.data.length > 0) {
                setReservationRequest(pendingRequestsResponse.data[0]);
                setReservedVehicle(null);
              } else {
                setReservedVehicle(null);
                setReservationRequest(null);
              }
            } catch (error) {
              console.error('Error checking pending requests:', error);
              setReservedVehicle(null);
              setReservationRequest(null);
            }
          }
        } else {
          setReservedVehicle(null);
          setReservationRequest(null);
        }
      }

      const visibleVehicles = vehiclesList.filter(
        vehicle => !(vehicle.external_id === null && vehicle.owner_id !== null && vehicle.owner_id !== 0)
      );
      setVehicles(visibleVehicles);

      if (reservedVehicle) {
        setSelectedVehicleId(reservedVehicle.id);
      } else {
        const firstAvailable = visibleVehicles.find(vehicle => vehicle.owner_id == null || vehicle.owner_id === 0);
        setSelectedVehicleId(firstAvailable ? firstAvailable.id : null);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toastError(t('work.vehicle.loadError'));
    } finally {
      setIsVehiclesLoading(false);
    }
  }, [user?.id, isRestricted, t]);

  useEffect(() => {
    const checkActiveWork = async () => {
      if (!user?.id) return;

      const response = await getActiveWorkProcess(user.id);

      if (response.error) {
        console.error('Failed to check active work:', response);
        return;
      }

      if (response.data) {
        setActiveWorkProcess(response.data);
        setIsWorking(true);
        onStartWork(response.data.facility_id?.toString() || '');
      }
    };

    checkActiveWork();
  }, [user?.id, onStartWork]);

  // Проверка активной смены (только для неофисных работников)
  useEffect(() => {
    const checkActiveShift = async () => {
      if (!user?.id || !canSelectObjectsAndVehicles) return;

      const response = await getActiveWorkShift(user.id);

      if (response.error) {
        console.error('Failed to check active work shift:', response);
        return;
      }

      setActiveWorkShift(response.data);
    };

    checkActiveShift();
  }, [user?.id, canSelectObjectsAndVehicles]);

  useEffect(() => {
    if (canSelectObjectsAndVehicles && !isRestricted && user?.id) {
      fetchVehicles();
    }
  }, [fetchVehicles, canSelectObjectsAndVehicles, isRestricted, user?.id]);

  const formatToday = () => {
    const today = new Date();
    // Map i18n language codes to locale strings for date formatting
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return today.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleStartWork = async () => {
    logger.info('handleStartWork called', {
      user: { id: user?.id, worker_type: user?.worker_type },
      canChooseWorkType,
      canSelectObjectsAndVehicles,
      workType,
      selectedObject,
    });

    // Для foreman, engineer, assistant проверяем выбранный тип работы
    if (canChooseWorkType) {
      if (workType === 'facility' && !selectedObject) {
        logger.warn('Cannot start work: object not selected (foreman/engineer/assistant)');
        toastError(t('work.selectObjectFirst'));
        return;
      }
    } else if (canSelectObjectsAndVehicles && !selectedObject) {
      // Для admin, coder, worker, master требуется выбор объекта
      logger.warn('Cannot start work: object not selected', {
        worker_type: user?.worker_type,
        canSelectObjectsAndVehicles,
      });
      toastError(t('work.selectObjectFirst'));
      return;
    }

    // Проверка активной смены перед началом работы на объекте (только для неофисных)
    if (canSelectObjectsAndVehicles && (canChooseWorkType ? workType === 'facility' : true)) {
      if (!activeWorkShift) {
        logger.warn('Cannot start work on facility: work shift not started');
        toastError('Сначала необходимо начать смену');
        return;
      }
    }

    setIsStartingWork(true);

    try {
      logger.debug('Requesting geolocation for work start');
      toastSuccess(t('work.requestingGeolocation'));

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const startTime = Date.now();
        
        const successCallback = (pos: GeolocationPosition) => {
          const elapsed = Date.now() - startTime;
          logger.info('Geolocation obtained for work start', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            elapsedMs: elapsed,
          });
          saveLastKnownPosition(pos);
          resolve(pos);
        };
        
        const errorCallback = (error: GeolocationPositionError) => {
          const elapsed = Date.now() - startTime;
          logger.error('Geolocation error when starting work', {
            code: error.code,
            message: error.message,
            elapsedMs: elapsed,
            errorCode1: 'PERMISSION_DENIED',
            errorCode2: 'POSITION_UNAVAILABLE',
            errorCode3: 'TIMEOUT',
          });
          reject(error);
        };

        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      let response;
      let requestData;
      
      // Для foreman, engineer, assistant проверяем выбранный тип работы
      if (canChooseWorkType && workType === 'office') {
        // Офисная работа
        requestData = {
          worker_id: user?.id || 0,
          latitude,
          longitude
        };
        logger.info('Starting office work', requestData);
        response = await startWorkOffice(requestData);
      } else if (canSelectObjectsAndVehicles) {
        // Работа на объекте (admin, coder, worker, master, или foreman/engineer/assistant с workType='facility')
        requestData = {
          worker_id: user?.id || 0,
          facility_id: parseInt(selectedObject),
          latitude,
          longitude
        };
        logger.info('Starting facility work', requestData);
        response = await startWork(requestData);
      } else {
        // Для остальных - офисный эндпоинт без facility_id
        requestData = {
          worker_id: user?.id || 0,
          latitude,
          longitude
        };
        logger.info('Starting office work (default)', requestData);
        response = await startWorkOffice(requestData);
      }

      logger.debug('Work start API response received', {
        hasError: !!response.error,
        hasData: !!response.data,
        status: response.status,
        error: response.error,
      });

      if (response.error) {
        const errorData = response.error as any;
        const isAndroid = /android/i.test(navigator.userAgent);
        
        let errorMessage = t('work.startWorkError');
        if (errorData?.response?.status === 408 || errorData?.code === 'ECONNABORTED') {
          errorMessage = 'Превышено время ожидания. Проверьте интернет-соединение и попробуйте снова.';
        } else if (errorData?.response?.status >= 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже.';
        } else if (errorData?.response?.status === 400) {
          errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова.';
        }
        
        setErrorDetails({
          title: 'Ошибка начала работы',
          message: errorMessage,
          details: {
            status: errorData?.response?.status || response.status,
            statusText: errorData?.response?.statusText,
            code: errorData?.code,
            responseData: errorData?.response?.data,
            requestData: {
              worker_id: requestData.worker_id,
              facility_id: requestData.facility_id,
              latitude: requestData.latitude,
              longitude: requestData.longitude,
            },
            environment: {
              isAndroid,
              userAgent: navigator.userAgent,
              connectionType: (navigator as any).connection?.effectiveType,
            },
          },
        });
        
        logger.error('Failed to start work', {
          requestData,
          response: {
            error: response.error,
            status: response.status,
            message: errorData?.message,
            responseData: errorData?.response?.data,
          },
        });
        console.error('Failed to start work:', response);
        toastError(errorMessage);
        setIsStartingWork(false);
        return;
      }

      logger.info('Work started successfully', {
        workProcessId: response.data?.id,
        facilityId: response.data?.facility_id,
      });

      setActiveWorkProcess(response.data);
      setIsWorking(true);
      // Для офисных работников selectedObject может быть пустым
      onStartWork(canSelectObjectsAndVehicles ? selectedObject : '');
      toastSuccess(t('work.workStarted'));
    } catch (error) {
      logger.error('Exception when starting work', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      console.error('Error starting work:', error);
      
      let errorMessage = t('work.startWorkError');
      let errorTitle = 'Ошибка начала работы';
      
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
        setErrorDetails({
          title: errorTitle,
          message: errorMessage,
          details: {
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
            } : String(error),
            code: errorData?.code,
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
            },
          },
        });
      }
      
      toastError(errorMessage);
    } finally {
      setIsStartingWork(false);
    }
  };

  const handleStopWork = () => {
    onStopWork();
  };

  const handleStartShift = async () => {
    if (!user?.id) return;

    setIsShiftActionLoading(true);

    try {
      logger.debug('Requesting geolocation for shift start');
      toastSuccess(t('work.requestingGeolocation'));

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const startTime = Date.now();
        
        const successCallback = (pos: GeolocationPosition) => {
          const elapsed = Date.now() - startTime;
          logger.info('Geolocation obtained for shift start', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            elapsedMs: elapsed,
          });
          saveLastKnownPosition(pos);
          resolve(pos);
        };
        
        const errorCallback = (error: GeolocationPositionError) => {
          const elapsed = Date.now() - startTime;
          logger.error('Geolocation error when starting shift', {
            code: error.code,
            message: error.message,
            elapsedMs: elapsed,
          });
          reject(error);
        };

        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        });
      });

      const response = await startWorkShift({
        worker_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (response.error) {
        const errorData = response.error as any;
        let errorMessage = t('work.shift.startError');
        if (errorData?.response?.status === 400) {
          errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова.';
        } else if (errorData?.response?.status >= 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже.';
        }
        toastError(errorMessage);
        logger.error('Failed to start work shift', { error: response.error });
        return;
      }

      setActiveWorkShift(response.data);
      toastSuccess(t('work.shift.startSuccess'));
      logger.info('Work shift started successfully', { shiftId: response.data?.id });
      
      // Обновляем информацию о смене
      const refreshResponse = await getActiveWorkShift(user.id);
      if (!refreshResponse.error && refreshResponse.data) {
        setActiveWorkShift(refreshResponse.data);
      }
    } catch (error) {
      logger.error('Exception when starting work shift', { error });
      console.error('Error starting work shift:', error);
      
      if (error instanceof GeolocationPositionError) {
        const errorMessage = error.code === 1
          ? 'Доступ к геолокации запрещен. Разрешите доступ в настройках устройства.'
          : error.code === 2
            ? 'Геолокация недоступна. Проверьте настройки GPS.'
            : 'Превышено время ожидания геолокации. Попробуйте снова.';
        toastError(errorMessage);
      } else {
        toastError(t('work.shift.startError'));
      }
    } finally {
      setIsShiftActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!user?.id || !activeWorkShift) return;

    // Проверяем, не начата ли работа на объекте
    if (isWorking) {
      toastError(t('work.shift.cannotEndWhileWorking'));
      logger.warn('Cannot end shift: work on facility is active', {
        worker_id: user.id,
        isWorking,
      });
      return;
    }

    setIsShiftActionLoading(true);

    try {
      logger.debug('Requesting geolocation for shift end');
      toastSuccess(t('work.requestingGeolocation'));

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const startTime = Date.now();
        let retryAttempt = 0;
        
        const tryGetPosition = (useHighAccuracy: boolean) => {
          const successCallback = (pos: GeolocationPosition) => {
            const elapsed = Date.now() - startTime;
            logger.info('Geolocation obtained for shift end', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              elapsedMs: elapsed,
              attempt: retryAttempt + 1,
              usedHighAccuracy: useHighAccuracy,
            });
            saveLastKnownPosition(pos);
            resolve(pos);
          };
          
          const errorCallback = (error: GeolocationPositionError) => {
            const elapsed = Date.now() - startTime;
            logger.error('Geolocation error when ending shift', {
              code: error.code,
              message: error.message,
              elapsedMs: elapsed,
              attempt: retryAttempt + 1,
              usedHighAccuracy: useHighAccuracy,
            });
            
            // если таймаут/недоступна, пробуем без высокой точности
            if (retryAttempt === 0 && useHighAccuracy && error.code !== 1) {
              retryAttempt++;
              setTimeout(() => {
                tryGetPosition(false);
              }, 500);
            } else {
              const cached = getLastKnownPosition();
              if (cached && error.code !== 1) {
                logger.warn('Using cached geolocation for shift end', {
                  latitude: cached.coords.latitude,
                  longitude: cached.coords.longitude,
                  accuracy: cached.coords.accuracy,
                });
                resolve(cached);
                return;
              }
              reject(error);
            }
          };
          
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
            enableHighAccuracy: useHighAccuracy,
            timeout: 45000,
            maximumAge: 60000
          });
        };
        
        tryGetPosition(true);
      });

      const response = await endWorkShift({
        worker_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (response.error) {
        const errorData = response.error as any;
        let errorMessage = t('work.shift.endError');
        if (errorData?.response?.status === 400) {
          errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова.';
        } else if (errorData?.response?.status >= 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже.';
        }
        toastError(errorMessage);
        logger.error('Failed to end work shift', { error: response.error });
        return;
      }

      // Показываем информацию о завершенной смене
      const shift = response.data;
      if (shift) {
        const totalHours = shift.total_time ? (shift.total_time / 3600).toFixed(2) : '0';
        const objectHours = shift.object_time ? (shift.object_time / 3600).toFixed(2) : '0';
        const summary = shift.summary_rate ? shift.summary_rate.toFixed(2) : '0';
        
        toastSuccess(t('work.shift.endSuccess', { totalHours, objectHours, summary }));
      } else {
        toastSuccess(t('work.shift.endSuccessSimple'));
      }
      
      // Обновляем состояние - смена завершена, активной смены нет
      setActiveWorkShift(null);
      
      logger.info('Work shift ended successfully', { shiftId: shift?.id });
    } catch (error) {
      logger.error('Exception when ending work shift', { error });
      console.error('Error ending work shift:', error);
      
      if (error instanceof GeolocationPositionError) {
        const errorMessage = error.code === 1
          ? 'Доступ к геолокации запрещен. Разрешите доступ в настройках устройства.'
          : error.code === 2
            ? 'Геолокация недоступна. Проверьте настройки GPS.'
            : 'Превышено время ожидания геолокации. Попробуйте снова.';
        toastError(errorMessage);
      } else {
        toastError(t('work.shift.endError'));
      }
    } finally {
      setIsShiftActionLoading(false);
    }
  };


  const handleSelectVehicle = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleReserveVehicle = async () => {
    if (!selectedVehicleId || !user?.id) {
      toastError(t('work.vehicle.selectVehicleFirst'));
      return;
    }

    // Validate that at least one date is selected
    if (!dateFrom && !dateTo) {
      toastError(t('work.vehicle.selectDateFirst', 'Пожалуйста, выберите дату бронирования'));
      return;
    }

    // All users create reservation requests, not direct assign
    setIsVehicleActionLoading(true);
    try {
      const payload: any = {
        vehicle_id: selectedVehicleId,
        worker_id: user.id,
      };
      
      // Add dates if provided
      if (dateFrom) {
        payload.date_from = dateFrom;
      }
      if (dateTo) {
        payload.date_to = dateTo;
      }
      
      const response = await createVehicleReservationRequest(payload);

      if (response.error) {
        console.error('Failed to create reservation request:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || t('work.vehicle.actionError');
        toastError(errorMsg);
        return;
      }

      // Update reservation request state immediately
      if (response.data) {
        setReservationRequest(response.data);
        setReservedVehicle(null);
      }

      toastSuccess(t('work.vehicle.requestSent', 'Запрос на бронирование авто успешно отправлен'));
      setSelectedVehicleId(null);
      setDateFrom('');
      setDateTo('');
      
      // Refresh vehicles list, but preserve the reservation request we just created
      const createdRequest = response.data;
      
      // Don't call fetchVehicles immediately - it might overwrite the state
      // Instead, just refresh the vehicles list without checking reservation status
      try {
        const vehiclesResponse = await getVehicles();
        if (!vehiclesResponse.error && vehiclesResponse.data) {
          const vehiclesList = vehiclesResponse.data;
          const visibleVehicles = vehiclesList.filter(
            vehicle => !(vehicle.external_id === null && vehicle.owner_id !== null && vehicle.owner_id !== 0)
          );
          setVehicles(visibleVehicles);
        }
      } catch (error) {
        console.error('Error refreshing vehicles:', error);
      }
      
      // Ensure reservation request is set
      if (createdRequest) {
        setReservationRequest(createdRequest);
        setReservedVehicle(null);
      }
    } catch (error) {
      console.error('Error creating reservation request:', error);
      toastError(t('work.vehicle.actionError'));
    } finally {
      setIsVehicleActionLoading(false);
    }
  };

  const handleReleaseVehicle = async () => {
    if (!reservedVehicle) {
      return;
    }

    setIsVehicleActionLoading(true);
    try {
      const response = await unassignVehicle(reservedVehicle.id);

      if (response.error) {
        console.error('Failed to release vehicle:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || t('work.vehicle.actionError');
        toastError(errorMsg);
        return;
      }

      toastSuccess(t('work.vehicle.releaseSuccess'));
      setReservedVehicle(null);
      setReservationRequest(null);
      await fetchVehicles();
    } catch (error) {
      console.error('Error releasing vehicle:', error);
      toastError(t('work.vehicle.actionError'));
    } finally {
      setIsVehicleActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!reservationRequest || reservationRequest.status !== 'pending') {
      return;
    }

    setIsVehicleActionLoading(true);
    try {
      const response = await cancelVehicleReservationRequest(reservationRequest.id);

      if (response.error) {
        console.error('Failed to cancel request:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || t('work.vehicle.actionError');
        toastError(errorMsg);
        return;
      }

      toastSuccess(t('work.vehicle.requestCancelled', 'Запрос отменен'));
      setReservationRequest(null);
      await fetchVehicles();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toastError(t('work.vehicle.actionError'));
    } finally {
      setIsVehicleActionLoading(false);
    }
  };

  const handleTelegramGroup = () => {
    const selectedFacility = facilities.find(facility => facility.id.toString() === selectedObject);
    const telegramGroupUrl = selectedFacility?.invite_link || 'https://t.me/skybud_workers';
    window.open(telegramGroupUrl, '_blank');
  };


  // ─── helpers ────────────────────────────────────────────────────────────────
  const startBtnEnabled =
    !isStartingWork &&
    !isRestricted &&
    ((canChooseWorkType && workType === 'office') ||
      (canChooseWorkType && workType === 'facility' && !!selectedObject && !!activeWorkShift) ||
      (!canChooseWorkType && canSelectObjectsAndVehicles && !!selectedObject && !!activeWorkShift) ||
      (!canSelectObjectsAndVehicles));

  const selectedFacility = facilities.find(f => f.id.toString() === selectedObject);

  return (
    <div className="page" style={{ background: "var(--color-bg)" }}>

      {/* ── Error details ── */}
      {errorDetails && (
        <ErrorDetails
          title={errorDetails.title}
          message={errorDetails.message}
          details={errorDetails.details}
          onClose={() => setErrorDetails(null)}
        />
      )}
        
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 2 }}>
            {formatToday()}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-strong)", lineHeight: 1.2, margin: 0 }}>
            {isWorking ? t('work.working', 'Working') : t('work.title', 'Work')}
          </h1>
          {user?.worker_type && (
            <span style={{
              display: "inline-block", marginTop: 6,
              fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
              padding: "2px 8px", borderRadius: 99,
              background: "var(--color-orange-bg)",
              color: "var(--color-orange)",
              textTransform: "uppercase",
            }}>
              {t(`admin.workers.types.${user.worker_type}`, user.worker_type)}
            </span>
          )}
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setIsDelegateTaskDialogOpen(true)}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--color-text-muted)",
            }}
            title={t('work.delegateTask.button', 'Delegate task')}
          >
            <UserPlus size={18} />
          </button>
          <button onClick={onShowHistory}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--color-text-muted)",
            }}
            title={t('work.history.viewButton', 'History')}
          >
            <ListChecks size={18} />
          </button>
        </div>
      </div>

      {/* ── WORKING STATE ── */}
      {isWorking ? (
        <>
          {/* Active work card */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "16px",
            boxShadow: "var(--shadow-sm)",
          }}>
            {/* Pulsing status dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--color-success)",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
                animation: "pulse 2s infinite",
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-success)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t('work.working', 'Working')}
              </span>
            </div>

            {/* Current object */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px",
              background: "var(--color-orange-bg)",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 14,
            }}>
              <MapPin size={18} color="var(--color-orange)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-strong)" }}>
                {canSelectObjectsAndVehicles
                  ? (selectedFacility?.name || t('work.unnamedObject'))
                  : t('work.office', 'Office')}
              </span>
            </div>

            {/* Stop + Telegram buttons */}
            <button onClick={handleStopWork} style={{
              width: "100%", height: 52, borderRadius: "var(--radius-sm)",
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444", fontSize: 15, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer",
            }}>
              <Square size={18} />
              {t('work.stopWork', 'Stop work')}
            </button>

            {canSelectObjectsAndVehicles && (
              <button onClick={handleTelegramGroup} style={{
                width: "100%", height: 44, borderRadius: "var(--radius-sm)",
                background: "transparent", border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)", fontSize: 14, fontWeight: 500,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer", marginTop: 10,
              }}>
                <MessageCircle size={16} />
                {t('work.joinTelegramGroup', 'Telegram group')}
              </button>
            )}
          </div>

          {/* Embedded TodoList */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "16px",
            boxShadow: "var(--shadow-sm)",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              {t('work.todoList', 'Tasks')}
            </p>
            <TodoList
              embedded
              facilityId={selectedObject ? Number(selectedObject) : null}
              facilityTypeId={facilities.find(f => f.id.toString() === selectedObject)?.facility_type_id ?? null}
            />
          </div>
        </>
      ) : (
        <>
          {/* ── Work type toggle (foreman/engineer/assistant) ── */}
          {canChooseWorkType && (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                {t('work.selectWorkType', 'Work type')}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {([['facility', MapPin, t('work.workTypeFacility', 'On-site')] , ['office', MessageCircle, t('work.workTypeOffice', 'Office')]] as const).map(([type, Icon, label]) => (
                  <button key={type} onClick={() => setWorkType(type as 'facility' | 'office')} style={{
                    flex: 1, height: 52, borderRadius: "var(--radius-sm)",
                    border: `2px solid ${workType === type ? "var(--color-orange)" : "var(--color-border)"}`,
                    background: workType === type ? "var(--color-orange-bg)" : "transparent",
                    color: workType === type ? "var(--color-orange)" : "var(--color-text-muted)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    cursor: "pointer", transition: "all var(--transition-fast)",
                  }}>
                    <Icon size={18} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Object selector ── */}
          {canSelectObjectsAndVehicles && workType !== 'office' && (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                {t('work.selectObject', 'Select object')}
              </p>
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 64 }}>
                  <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              ) : facilities.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>
                  {t('work.noObjects', 'No objects')}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }} className="custom-scrollbar">
                  {facilities.map((facility) => {
                    const selected = selectedObject === facility.id.toString();
                    return (
                      <button key={facility.id} onClick={() => onObjectSelect(facility.id.toString())} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${selected ? "var(--color-orange)" : "var(--color-border)"}`,
                        background: selected ? "var(--color-orange-bg)" : "transparent",
                        cursor: "pointer", textAlign: "left",
                        transition: "all var(--transition-fast)",
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: selected ? "var(--color-orange)" : "var(--color-asphalt)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <MapPin size={14} color={selected ? "#fff" : "var(--color-text-muted)"} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {facility.name || t('work.unnamedObject')}
                          </div>
                          {facility.status_active === false && (
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>inactive</div>
                          )}
                        </div>
                        {selected && (
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-orange)", flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Shift card ── */}
          {canSelectObjectsAndVehicles && (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: activeWorkShift ? 10 : 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t('work.shift.title', 'Shift')}
                </p>
                {activeWorkShift && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                    background: "rgba(34,197,94,0.12)", color: "var(--color-success)",
                  }}>
                    {t('work.shift.activeBadge', 'Active')}
                  </span>
                )}
              </div>

              {activeWorkShift ? (
                <>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10 }}>
                    {t('work.shift.startTime', 'Started')}: {new Date(activeWorkShift.start_time).toLocaleTimeString()}
                  </p>
                  <button onClick={handleEndShift} disabled={isShiftActionLoading || isWorking} style={{
                    width: "100%", height: 48, borderRadius: "var(--radius-sm)",
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                    color: "#EF4444", fontSize: 14, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    cursor: isShiftActionLoading || isWorking ? "not-allowed" : "pointer",
                    opacity: isShiftActionLoading || isWorking ? 0.5 : 1,
                  }}>
                    {isShiftActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                    {t('work.shift.end', 'End shift')}
                  </button>
                  {isWorking && (
                    <p style={{ fontSize: 11, color: "#EAB308", textAlign: "center", marginTop: 6 }}>
                      {t('work.shift.cannotEndWhileWorking')}
                    </p>
                  )}
                </>
              ) : (
                <button onClick={handleStartShift} disabled={isShiftActionLoading} style={{
                  width: "100%", height: 48, borderRadius: "var(--radius-sm)",
                  background: "var(--color-asphalt)", border: "1px solid var(--color-border)",
                  color: "var(--color-text-strong)", fontSize: 14, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  cursor: isShiftActionLoading ? "not-allowed" : "pointer",
                  marginTop: 10,
                }}>
                  {isShiftActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {t('work.shift.start', 'Start shift')}
                </button>
              )}
            </div>
          )}

          {/* ── Vehicle card ── */}
          {!isRestricted && canSelectObjectsAndVehicles && (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                {t('work.vehicle.sectionTitle', 'Vehicle')}
              </p>

              {isVehiclesLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                  <Loader2 size={18} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              ) : reservedVehicle && reservationRequest?.status === 'approved' ? (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    background: "var(--color-orange-bg)", border: "1px solid rgba(249,115,22,0.2)",
                    borderRadius: "var(--radius-sm)", marginBottom: 10,
                  }}>
                    <Car size={18} color="var(--color-orange)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{reservedVehicle.model}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{reservedVehicle.license_plate}</div>
                    </div>
                  </div>
                  <button onClick={handleReleaseVehicle} disabled={isVehicleActionLoading} style={{
                    width: "100%", height: 44, borderRadius: "var(--radius-sm)",
                    background: "transparent", border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    cursor: "pointer",
                  }}>
                    {isVehicleActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                    {t('work.vehicle.releaseButton', 'Release')}
                  </button>
                </>
              ) : reservationRequest ? (
                <div style={{
                  padding: "10px 12px", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)", background: "var(--color-asphalt)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Car size={16} color="var(--color-text-muted)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>
                      {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.model || t('work.vehicle.unknownModel')}
                    </span>
                  </div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
                    borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: reservationRequest.status === 'pending' ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                    color: reservationRequest.status === 'pending' ? "#CA8A04" : "#EF4444",
                  }}>
                    {reservationRequest.status === 'pending' ? <Clock size={11} /> : <X size={11} />}
                    {reservationRequest.status === 'pending'
                      ? t('work.vehicle.awaitingApproval', 'Pending')
                      : t(`work.vehicle.request${reservationRequest.status.charAt(0).toUpperCase() + reservationRequest.status.slice(1)}`, reservationRequest.status)}
                  </div>
                  {reservationRequest.status === 'pending' && (
                    <button onClick={handleCancelRequest} disabled={isVehicleActionLoading} style={{
                      marginTop: 8, width: "100%", height: 36, borderRadius: "var(--radius-sm)",
                      background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#EF4444", fontSize: 12, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      cursor: "pointer",
                    }}>
                      <X size={12} />
                      {t('work.vehicle.cancelRequest', 'Cancel')}
                    </button>
                  )}
                </div>
              ) : availableVehicles.length > 0 ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", marginBottom: 10 }} className="custom-scrollbar">
                    {availableVehicles.map((vehicle) => {
                      const isSel = selectedVehicleId === vehicle.id;
                      return (
                        <button key={vehicle.id} onClick={() => handleSelectVehicle(vehicle.id)} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                          borderRadius: "var(--radius-sm)", textAlign: "left",
                          border: `1px solid ${isSel ? "var(--color-orange)" : "var(--color-border)"}`,
                          background: isSel ? "var(--color-orange-bg)" : "transparent",
                          cursor: "pointer", transition: "all var(--transition-fast)",
                        }}>
                          <Car size={16} color={isSel ? "var(--color-orange)" : "var(--color-text-muted)"} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {vehicle.model || t('work.vehicle.unknownModel')}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{vehicle.license_plate}</div>
                          </div>
                          {isSel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-orange)", flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[['dateFrom', dateFrom, setDateFrom, t('work.vehicle.dateFrom', 'From')], ['dateTo', dateTo, setDateTo, t('work.vehicle.dateTo', 'To')]] .map(([key, val, setter, label]) => (
                      <label key={key as string} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>{label as string}</span>
                        <input type="date" value={val as string}
                          onChange={(e) => (setter as any)(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{ padding: "8px 10px", fontSize: 13, background: "var(--color-asphalt)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-strong)" }}
                        />
                      </label>
                    ))}
                  </div>
                  <button onClick={handleReserveVehicle} disabled={!selectedVehicleId || !(dateFrom || dateTo) || isVehicleActionLoading} style={{
                    width: "100%", height: 44, borderRadius: "var(--radius-sm)",
                    background: selectedVehicleId && (dateFrom || dateTo) ? "var(--color-orange)" : "var(--color-asphalt)",
                    border: "none", color: selectedVehicleId && (dateFrom || dateTo) ? "#fff" : "var(--color-text-muted)",
                    fontSize: 14, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    cursor: selectedVehicleId && (dateFrom || dateTo) ? "pointer" : "not-allowed",
                    transition: "all var(--transition-fast)",
                  }}>
                    {isVehicleActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                    {t('work.vehicle.createRequest', 'Request vehicle')}
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", padding: "12px 0" }}>
                  {t('work.vehicle.noAvailable', 'No vehicles available')}
                </p>
              )}
            </div>
          )}

          {/* ── Main CTA ── */}
          <div style={{ paddingTop: 4 }}>
            {isRestricted ? (
              <div style={{
                padding: "16px", borderRadius: "var(--radius)",
                background: "var(--color-asphalt)", border: "1px solid var(--color-border)",
                textAlign: "center", color: "var(--color-text-muted)", fontSize: 14,
              }}>
                {t('work.waitForAdminApproval', 'Wait for admin approval')}
              </div>
            ) : (
              <>
                <button onClick={handleStartWork} disabled={!startBtnEnabled} style={{
                  width: "100%", height: 58, borderRadius: "var(--radius)",
                  background: startBtnEnabled
                    ? "linear-gradient(135deg, var(--color-orange) 0%, var(--color-orange-accent) 100%)"
                    : "var(--color-asphalt)",
                  border: "none",
                  color: startBtnEnabled ? "#fff" : "var(--color-text-muted)",
                  fontSize: 17, fontWeight: 700, letterSpacing: "0.01em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  cursor: startBtnEnabled ? "pointer" : "not-allowed",
                  boxShadow: startBtnEnabled ? "0 4px 20px rgba(249,115,22,0.35)" : "none",
                  transition: "all var(--transition-normal)",
                }}>
                  {isStartingWork
                    ? <><Loader2 size={22} className="animate-spin" />{t('work.startingWork', 'Starting...')}</>
                    : <><Play size={22} />{t('work.startWork', 'Start work')}</>
                  }
                </button>

                {/* Hint messages */}
                {!startBtnEnabled && !isRestricted && (
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginTop: 8 }}>
                    {canSelectObjectsAndVehicles && (canChooseWorkType ? workType === 'facility' : true) && !activeWorkShift
                      ? t('work.shift.startFirst', 'Start a shift first')
                      : t('work.selectObjectFirst', 'Select an object first')}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Delegate task dialog ── */}
      <DelegateTaskDialog
        open={isDelegateTaskDialogOpen}
        onOpenChange={setIsDelegateTaskDialogOpen}
        currentWorkerId={user?.id}
      />
    </div>
  );
};

export default WorkMain;
