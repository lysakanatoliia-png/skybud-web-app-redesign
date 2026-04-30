import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import i18n from '@/i18n/config';
import { Play, Square, MapPin, MessageCircle, ListChecks, Car, Unlock, Loader2, Clock, X, UserPlus, ChevronRight, Rocket, Lock, Calendar } from 'lucide-react';
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
    <div className="page">

      {errorDetails && (
        <ErrorDetails
          title={errorDetails.title}
          message={errorDetails.message}
          details={errorDetails.details}
          onClose={() => setErrorDetails(null)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-orange)", marginBottom: 4 }}>
            {formatToday()}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--color-text-strong)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0, textTransform: "uppercase" }}>
            {isWorking ? t('work.working', 'В РОБОТІ') : t('work.title', 'РОБОТА')}
          </h1>
        </div>
        {user?.worker_type && (
          <span style={{
            marginTop: 4, flexShrink: 0,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            padding: "5px 14px", borderRadius: "var(--radius-full)",
            background: "var(--color-orange)",
            color: "#fff", textTransform: "uppercase",
            boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
          }}>
            {t(`admin.workers.types.${user.worker_type}`, user.worker_type).toUpperCase()}
          </span>
        )}
      </div>

      {/* ── WORKING STATE ── */}
      {isWorking ? (
        <>
          <div className="glass" style={{
            borderRadius: 20, padding: 16,
            border: "1px solid rgba(249,115,22,0.2)",
            boxShadow: "0 0 32px rgba(249,115,22,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--color-success)",
                boxShadow: "0 0 0 4px rgba(34,197,94,0.15)",
                animation: "pulse 2s infinite", flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t('work.working', 'АКТИВНА РОБОТА')}
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              background: "var(--color-orange-bg)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 14, marginBottom: 14,
              boxShadow: "0 0 20px rgba(249,115,22,0.12)",
            }}>
              <MapPin size={18} color="var(--color-orange)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-strong)" }}>
                {canSelectObjectsAndVehicles
                  ? (selectedFacility?.name || t('work.unnamedObject'))
                  : t('work.office', 'Офіс')}
              </span>
            </div>
            <button onClick={handleStopWork} style={{
              width: "100%", padding: "18px", borderRadius: 14,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#EF4444", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              cursor: "pointer", marginBottom: 10,
            }}>
              <Square size={18} />
              {t('work.stopWork', 'ЗУПИНИТИ РОБОТУ')}
            </button>
            {canSelectObjectsAndVehicles && (
              <button onClick={handleTelegramGroup} style={{
                width: "100%", height: 44, borderRadius: 12,
                background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--color-text-muted)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer",
              }}>
                <MessageCircle size={15} />
                {t('work.joinTelegramGroup', 'TELEGRAM ГРУПА')}
              </button>
            )}
          </div>

          <div className="glass" style={{ borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              {t('work.todoList', 'ЗАВДАННЯ')}
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
          {/* ── Bento action grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => setIsDelegateTaskDialogOpen(true)}
              className="glass"
              style={{
                padding: 16, borderRadius: 20, height: 120,
                display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start",
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
            >
              <UserPlus size={28} color="var(--color-orange)" />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", textAlign: "left", lineHeight: 1.4 }}>
                {t('work.delegateTask.button', 'ДЕЛЕГУВАТИ ЗАДАЧУ')}
              </span>
            </button>
            <button
              onClick={onShowHistory}
              className="glass"
              style={{
                padding: 16, borderRadius: 20, height: 120,
                display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start",
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
            >
              <ListChecks size={28} color="#6c94ff" />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", textAlign: "left", lineHeight: 1.4 }}>
                {t('work.history.viewButton', 'ІСТОРІЯ РОБІТ')}
              </span>
            </button>
          </div>

          {/* ── Work type toggle ── */}
          {canChooseWorkType && (
            <div className="glass" style={{ borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <MapPin size={16} color="var(--color-orange)" />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
                  {t('work.selectWorkType', 'ТИП РОБОТИ')}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {([['facility', MapPin, t('work.workTypeFacility', "НА ОБ'ЄКТІ")] , ['office', MessageCircle, t('work.workTypeOffice', 'ОФІС')]] as const).map(([type, Icon, label]) => (
                  <button key={type} onClick={() => setWorkType(type as 'facility' | 'office')} style={{
                    flex: 1, height: 52, borderRadius: 12,
                    border: `1px solid ${workType === type ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.08)"}`,
                    background: workType === type ? "var(--color-orange-bg)" : "rgba(255,255,255,0.03)",
                    color: workType === type ? "var(--color-orange)" : "var(--color-text-muted)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    cursor: "pointer",
                    boxShadow: workType === type ? "0 0 16px rgba(249,115,22,0.18)" : "none",
                  }}>
                    <Icon size={18} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Shift / Working day card ── */}
          {canSelectObjectsAndVehicles && (
            <div className="glass" style={{ borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={16} color="var(--color-orange)" />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
                    {t('work.shift.title', 'РОБОЧИЙ ДЕНЬ')}
                  </span>
                </div>
                {activeWorkShift && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: "rgba(34,197,94,0.12)", color: "var(--color-success)",
                    border: "1px solid rgba(34,197,94,0.2)", letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>
                    {t('work.shift.activeBadge', 'АКТИВНА')}
                  </span>
                )}
              </div>
              {activeWorkShift ? (
                <>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
                    {t('work.shift.startTime', 'Початок')}: {new Date(activeWorkShift.start_time).toLocaleTimeString()}
                  </p>
                  <button onClick={handleEndShift} disabled={isShiftActionLoading || isWorking} style={{
                    width: "100%", padding: "18px", borderRadius: 14,
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                    color: "#EF4444", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    cursor: isShiftActionLoading || isWorking ? "not-allowed" : "pointer",
                    opacity: isShiftActionLoading || isWorking ? 0.5 : 1,
                  }}>
                    {isShiftActionLoading ? <Loader2 size={20} className="animate-spin" /> : <Square size={20} />}
                    {t('work.shift.end', 'ЗАВЕРШИТИ ДЕНЬ')}
                  </button>
                  {isWorking && (
                    <p style={{ fontSize: 11, color: "#EAB308", textAlign: "center", marginTop: 8 }}>
                      {t('work.shift.cannotEndWhileWorking')}
                    </p>
                  )}
                </>
              ) : (
                <button onClick={handleStartShift} disabled={isShiftActionLoading} style={{
                  width: "100%", padding: "20px", borderRadius: 14,
                  background: "var(--color-orange)", border: "none",
                  color: "#fff", fontSize: 17, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  cursor: isShiftActionLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
                  transition: "all var(--transition-fast)",
                }}>
                  {isShiftActionLoading ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} />}
                  {t('work.shift.start', 'ПОЧАТИ РОБОЧИЙ ДЕНЬ')}
                </button>
              )}
            </div>
          )}

          {/* ── Object selector ── */}
          {canSelectObjectsAndVehicles && workType !== 'office' && (
            <div className="glass" style={{ borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={16} color="var(--color-orange)" />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
                    {t('work.selectObject', "ОБЕРІТЬ ОБ'ЄКТ")}
                  </span>
                </div>
                {facilities.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: "rgba(255,255,255,0.08)", color: "var(--color-text-muted)", letterSpacing: "0.04em",
                  }}>
                    {facilities.length} {t('work.objectsCount', "ОБ'ЄКТІВ")}
                  </span>
                )}
              </div>
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 64 }}>
                  <Loader2 size={20} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              ) : facilities.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>
                  {t('work.noObjects', "Немає об'єктів")}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }} className="custom-scrollbar">
                  {facilities.map((facility) => {
                    const selected = selectedObject === facility.id.toString();
                    return (
                      <button key={facility.id} onClick={() => onObjectSelect(facility.id.toString())} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: 14, textAlign: "left",
                        border: `1px solid ${selected ? "rgba(249,115,22,0.45)" : "rgba(255,255,255,0.06)"}`,
                        background: selected ? "var(--color-orange-bg)" : "rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        boxShadow: selected ? "0 0 18px rgba(249,115,22,0.14)" : "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: selected ? "var(--color-orange)" : "rgba(255,255,255,0.07)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <MapPin size={16} color={selected ? "#fff" : "var(--color-text-muted)"} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-strong)", lineHeight: 1.1 }}>
                              {facility.name || t('work.unnamedObject')}
                            </div>
                            {facility.status_active === false && (
                              <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>inactive</div>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={18} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Vehicle booking ── */}
          {!isRestricted && canSelectObjectsAndVehicles && (
            <div className="glass" style={{ borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Car size={16} color="var(--color-orange)" />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
                    {t('work.vehicle.sectionTitle', 'БРОНЮВАННЯ АВТО')}
                  </span>
                </div>
                {availableVehicles.length > 0 && !reservedVehicle && !reservationRequest && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-orange)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {t('work.vehicle.availableCount', 'ДОСТУПНИХ')}: {availableVehicles.length}
                  </span>
                )}
              </div>

              {isVehiclesLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                  <Loader2 size={18} className="animate-spin" color="var(--color-text-muted)" />
                </div>
              ) : reservedVehicle && reservationRequest?.status === 'approved' ? (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    background: "var(--color-orange-bg)", border: "1px solid rgba(249,115,22,0.25)",
                    borderRadius: 14, marginBottom: 12,
                    boxShadow: "0 0 20px rgba(249,115,22,0.12)",
                  }}>
                    <Car size={20} color="var(--color-orange)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", letterSpacing: "0.06em", marginBottom: 2 }}>{reservedVehicle.model}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-strong)", lineHeight: 1 }}>{reservedVehicle.license_plate}</div>
                    </div>
                  </div>
                  <button onClick={handleReleaseVehicle} disabled={isVehicleActionLoading} style={{
                    width: "100%", height: 44, borderRadius: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--color-text-muted)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    cursor: "pointer",
                  }}>
                    {isVehicleActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                    {t('work.vehicle.releaseButton', 'ЗВІЛЬНИТИ')}
                  </button>
                </>
              ) : reservationRequest ? (
                <div style={{
                  padding: "12px 14px", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Car size={18} color="var(--color-text-muted)" />
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-strong)" }}>
                      {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.model || t('work.vehicle.unknownModel')}
                    </span>
                  </div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
                    borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                    background: reservationRequest.status === 'pending' ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                    color: reservationRequest.status === 'pending' ? "#CA8A04" : "#EF4444",
                  }}>
                    {reservationRequest.status === 'pending' ? <Clock size={11} /> : <X size={11} />}
                    {reservationRequest.status === 'pending'
                      ? t('work.vehicle.awaitingApproval', 'ОЧІКУЄ ПІДТВЕРДЖЕННЯ')
                      : t(`work.vehicle.request${reservationRequest.status.charAt(0).toUpperCase() + reservationRequest.status.slice(1)}`, reservationRequest.status)}
                  </div>
                  {reservationRequest.status === 'pending' && (
                    <button onClick={handleCancelRequest} disabled={isVehicleActionLoading} style={{
                      marginTop: 10, width: "100%", height: 38, borderRadius: 10,
                      background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#EF4444", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      cursor: "pointer",
                    }}>
                      <X size={12} />
                      {t('work.vehicle.cancelRequest', 'СКАСУВАТИ')}
                    </button>
                  )}
                </div>
              ) : availableVehicles.length > 0 ? (
                <>
                  {/* Horizontal car scroll */}
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10, marginBottom: 14, scrollbarWidth: "none" }}>
                    {availableVehicles.map((vehicle) => {
                      const isSel = selectedVehicleId === vehicle.id;
                      return (
                        <button key={vehicle.id} onClick={() => handleSelectVehicle(vehicle.id)} style={{
                          minWidth: 140, padding: "12px 14px", borderRadius: 14, textAlign: "left", flexShrink: 0,
                          border: `1px solid ${isSel ? "rgba(249,115,22,0.45)" : "rgba(255,255,255,0.06)"}`,
                          background: isSel ? "var(--color-orange-bg)" : "rgba(255,255,255,0.04)",
                          cursor: "pointer",
                          boxShadow: isSel ? "0 0 18px rgba(249,115,22,0.16)" : "none",
                        }}>
                          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>
                            {vehicle.model || t('work.vehicle.unknownModel')}
                          </p>
                          <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-strong)", lineHeight: 1.2, marginBottom: 4 }}>
                            {vehicle.license_plate}
                          </p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-success)", letterSpacing: "0.04em" }}>● ВІЛЬНО</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {([['dateFrom', dateFrom, setDateFrom, t('work.vehicle.dateFrom', 'ДАТА З')], ['dateTo', dateTo, setDateTo, t('work.vehicle.dateTo', 'ДАТА ДО')]] as const).map(([key, val, setter, label]) => (
                      <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                          <Calendar size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                          <input
                            type="date"
                            value={val}
                            onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            style={{ fontSize: 13, background: "transparent", border: "none", color: "var(--color-text-strong)", outline: "none", width: "100%", colorScheme: "dark" }}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleReserveVehicle}
                    disabled={!selectedVehicleId || !(dateFrom || dateTo) || isVehicleActionLoading}
                    style={{
                      width: "100%", height: 48, borderRadius: 12,
                      background: "transparent",
                      border: `2px solid ${selectedVehicleId && (dateFrom || dateTo) ? "var(--color-orange)" : "rgba(255,255,255,0.12)"}`,
                      color: selectedVehicleId && (dateFrom || dateTo) ? "var(--color-orange)" : "var(--color-text-muted)",
                      fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: selectedVehicleId && (dateFrom || dateTo) ? "pointer" : "not-allowed",
                    }}
                  >
                    {isVehicleActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                    {t('work.vehicle.createRequest', selectedVehicleId && (dateFrom || dateTo) ? 'ЗАБРОНЮВАТИ' : 'ОБЕРІТЬ ДАТУ')}
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", padding: "12px 0" }}>
                  {t('work.vehicle.noAvailable', 'Немає доступних авто')}
                </p>
              )}
            </div>
          )}

          {/* ── Start object CTA ── */}
          <div className="glass" style={{ borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
            {isRestricted ? (
              <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
                {t('work.waitForAdminApproval', 'Очікуйте підтвердження адміна')}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Rocket size={16} color={startBtnEnabled ? "var(--color-orange)" : "var(--color-text-muted)"} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
                    {t('work.ctaTitle', "ГОТОВІ ПОЧАТИ ОБ'ЄКТ?")}
                  </span>
                </div>
                <button
                  onClick={handleStartWork}
                  disabled={!startBtnEnabled}
                  style={{
                    width: "100%", padding: "16px", borderRadius: 14,
                    background: startBtnEnabled
                      ? "linear-gradient(135deg, var(--color-orange) 0%, var(--color-orange-accent) 100%)"
                      : "rgba(255,255,255,0.04)",
                    border: "none",
                    color: startBtnEnabled ? "#fff" : "var(--color-text-muted)",
                    fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    cursor: startBtnEnabled ? "pointer" : "not-allowed",
                    boxShadow: startBtnEnabled ? "0 4px 24px rgba(249,115,22,0.4)" : "none",
                    transition: "all var(--transition-normal)",
                  }}
                >
                  {startBtnEnabled ? (
                    isStartingWork
                      ? <><Loader2 size={20} className="animate-spin" />{t('work.startingWork', 'ПОЧИНАЄМО...')}</>
                      : <><Play size={20} />{t('work.startWork', "ПОЧАТИ ОБ'ЄКТ")}</>
                  ) : (
                    <><Lock size={18} />{t('work.startWork', "ПОЧАТИ ОБ'ЄКТ")}</>
                  )}
                </button>
                {!startBtnEnabled && !isRestricted && (
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                    {canSelectObjectsAndVehicles && (canChooseWorkType ? workType === 'facility' : true) && !activeWorkShift
                      ? t('work.shift.startFirst', "Спершу потрібно почати робочий день та обрати об'єкт")
                      : t('work.selectObjectFirst', "Оберіть об'єкт для початку")}
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
