import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import i18n from '@/i18n/config';
import { Play, Square, MapPin, Calendar, MessageCircle, ListChecks, Car, Unlock, Loader2, Clock, X, AlertCircle, UserPlus, User } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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


  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Error Details */}
        {errorDetails && (
          <ErrorDetails
            title={errorDetails.title}
            message={errorDetails.message}
            details={errorDetails.details}
            onClose={() => setErrorDetails(null)}
          />
        )}
        
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-theme-text-primary">{t('work.title')}</h1>
            <div className="flex flex-wrap items-center gap-3 text-theme-text-secondary text-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{t('work.today')}: {formatToday()}</span>
              </div>
              {user?.worker_type && (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>{t('work.role', 'Роль')}:</span>
                  <Badge className="bg-theme-accent text-white">
                    {t(`admin.workers.types.${user.worker_type}`, user.worker_type)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full md:w-auto text-lg font-semibold gap-3 px-6 py-4"
              onClick={() => setIsDelegateTaskDialogOpen(true)}
            >
              <UserPlus className="h-6 w-6" />
              {t('work.delegateTask.button', 'Делегировать задачу')}
            </Button>
            <Button
              variant="default"
              size="lg"
              className="w-full md:w-auto text-lg font-semibold gap-3 px-6 py-4"
              onClick={onShowHistory}
            >
              <ListChecks className="h-6 w-6" />
              {t('work.history.viewButton')}
            </Button>
          </div>
        </div>

        {/* Выбор типа работы для foreman, engineer, assistant */}
        {!isWorking && canChooseWorkType && (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-theme-text-primary mb-4">
              {t('work.selectWorkType', 'Выберите тип работы')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setWorkType('facility')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  workType === 'facility'
                    ? 'border-theme-accent bg-theme-accent/10'
                    : 'border-theme-border hover:border-theme-accent/50'
                }`}
              >
                <MapPin className="h-6 w-6 text-theme-accent mb-2 mx-auto" />
                <div className="font-semibold text-theme-text-primary">
                  {t('work.workTypeFacility', 'На объекте')}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setWorkType('office')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  workType === 'office'
                    ? 'border-theme-accent bg-theme-accent/10'
                    : 'border-theme-border hover:border-theme-accent/50'
                }`}
              >
                <MessageCircle className="h-6 w-6 text-theme-accent mb-2 mx-auto" />
                <div className="font-semibold text-theme-text-primary">
                  {t('work.workTypeOffice', 'В офисе')}
                </div>
              </button>
            </div>
          </div>
        )}

        {!isWorking && canSelectObjectsAndVehicles && workType !== 'office' && (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-theme-text-primary mb-4">{t('work.selectObject')}</h2>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-theme-text-secondary text-lg">{t('common.loading')}</div>
              </div>
            ) : facilities.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-theme-text-secondary text-lg">{t('work.noObjects')}</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedObject === facility.id.toString()
                      ? 'border-theme-accent bg-theme-accent/10'
                      : 'border-theme-border hover:border-theme-accent/50'
                      }`}
                    onClick={() => onObjectSelect(facility.id.toString())}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-theme-accent mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-theme-text-primary mb-1">
                          {facility.name || t('work.unnamedObject')}
                        </h3>
                        {facility.latitude && facility.longitude && (
                          <p className="text-theme-text-secondary">
                            {facility.latitude.toFixed(6)}, {facility.longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                      {selectedObject === facility.id.toString() && (
                        <div className="w-4 h-4 bg-theme-accent rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isRestricted && canSelectObjectsAndVehicles && (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-bold text-theme-text-primary">
                  {reservedVehicle && reservationRequest?.status === 'approved' 
                    ? t('work.vehicle.alreadyReservedTitle') 
                    : reservationRequest?.status === 'pending'
                    ? t('work.vehicle.requestPendingTitle', 'Запрос на бронирование')
                    : t('work.vehicle.sectionTitle')}
                </h2>
              </div>
              {isVehiclesLoading ? (
                <div className="flex justify-center items-center py-4 text-sm text-theme-text-secondary">
                  {t('common.loading')}
                </div>
              ) : reservedVehicle && reservationRequest?.status === 'approved' ? (
                <>
                  <div className="bg-theme-accent/15 border border-theme-accent rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Car className="h-5 w-5 text-theme-text-primary flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-base font-semibold text-theme-text-primary truncate">
                          {reservedVehicle.model || t('work.vehicle.unknownModel')}
                        </span>
                        <span className="text-sm text-theme-text-secondary truncate">
                          {reservedVehicle.license_plate
                            ? t('work.vehicle.licensePlate', { plate: reservedVehicle.license_plate })
                            : t('work.vehicle.noLicensePlate')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-sm font-semibold py-2.5 h-auto"
                    onClick={handleReleaseVehicle}
                    disabled={isVehicleActionLoading}
                  >
                    {isVehicleActionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2">{t('work.vehicle.releaseLoading')}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        <span className="ml-2">{t('work.vehicle.releaseButton')}</span>
                      </>
                    )}
                  </Button>
                </>
              ) : reservationRequest ? (
                <>
                  <div className="border border-theme-border rounded-lg p-4 bg-theme-bg-card">
                    <div className="flex flex-col gap-3">
                      {/* Vehicle Info */}
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                          reservationRequest.status === 'pending'
                            ? 'bg-amber-200 border-2 border-amber-400'
                            : reservationRequest.status === 'rejected'
                            ? 'bg-rose-200 border-2 border-rose-400'
                            : 'bg-theme-accent/20 border-2 border-theme-accent/30'
                        }`}>
                          <Car className="h-6 w-6 text-theme-text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold text-theme-text-primary mb-1">
                            {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.model || t('work.vehicle.unknownModel')}
                          </div>
                          {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.license_plate && (
                            <div className="text-sm text-theme-text-secondary font-medium">
                              {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.license_plate}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ${
                          reservationRequest.status === 'pending'
                            ? 'bg-amber-200 text-amber-900 border border-amber-400'
                            : reservationRequest.status === 'rejected'
                            ? 'bg-rose-200 text-rose-900 border border-rose-400'
                            : 'bg-slate-200 text-slate-900 border border-slate-400'
                        }`}>
                          {reservationRequest.status === 'pending' && (
                            <>
                              <Clock className="h-4 w-4 text-amber-900" />
                              {t('work.vehicle.awaitingApproval', 'Ожидается подтверждение')}
                            </>
                          )}
                          {reservationRequest.status === 'rejected' && (
                            <>
                              <X className="h-4 w-4 text-rose-900" />
                              {t('work.vehicle.requestRejected', 'Запрос отклонен')}
                            </>
                          )}
                          {reservationRequest.status === 'cancelled' && (
                            <>
                              <AlertCircle className="h-4 w-4 text-slate-900" />
                              {t('work.vehicle.requestCancelled', 'Запрос отменен')}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Dates Info */}
                      {(reservationRequest.date_from || reservationRequest.date_to) && (
                        <div className="text-sm text-theme-text-secondary space-y-1">
                          {reservationRequest.date_from && (
                            <div>
                              <span className="font-medium text-theme-text-primary">{t('work.vehicle.dateFrom', 'Дата с')}:</span>{' '}
                              {new Date(reservationRequest.date_from).toLocaleDateString(
                                { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                              )}
                            </div>
                          )}
                          {reservationRequest.date_to && (
                            <div>
                              <span className="font-medium text-theme-text-primary">{t('work.vehicle.dateTo', 'Дата по')}:</span>{' '}
                              {new Date(reservationRequest.date_to).toLocaleDateString(
                                { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {reservationRequest.status === 'rejected' && reservationRequest.rejection_reason && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                          <div className="text-sm font-semibold text-rose-900 mb-1">
                            {t('work.vehicle.rejectionReason', 'Причина отклонения')}:
                          </div>
                          <div className="text-sm text-rose-800">
                            {reservationRequest.rejection_reason}
                          </div>
                        </div>
                      )}

                      {/* Date Info */}
                      <div className="text-sm text-theme-text-secondary">
                        <span className="font-medium text-theme-text-primary">{t('work.vehicle.requestCreatedAt', 'Запрос создан')}:</span>{' '}
                        {new Date(reservationRequest.created_at).toLocaleString(
                          { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                        )}
                      </div>

                      {/* Cancel Button */}
                      {reservationRequest.status === 'pending' && (
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-sm font-semibold px-4 py-2 border-rose-400 text-rose-700 bg-rose-50"
                            onClick={handleCancelRequest}
                            disabled={isVehicleActionLoading}
                          >
                            {isVehicleActionLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {t('common.processing', 'Обработка...')}
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                {t('work.vehicle.cancelRequest', 'Отменить запрос')}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {availableVehicles.length > 0 ? (
                    <>
                      <div className="bg-theme-bg-tertiary border border-theme-border rounded-lg p-2.5 flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-theme-text-primary flex-shrink-0" />
                        <span className="text-xs font-semibold text-theme-text-primary">
                          {t('work.vehicle.availableCount', { count: availableVehicles.length })}
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                        {availableVehicles.map((vehicle) => {
                          const isSelected = selectedVehicleId === vehicle.id;
                          return (
                            <button
                              key={vehicle.id}
                              type="button"
                              onClick={() => handleSelectVehicle(vehicle.id)}
                              className={`relative group w-full text-left bg-gradient-to-r from-theme-bg-secondary to-theme-bg-tertiary border-2 rounded-xl p-3.5 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md ${
                                isSelected
                                  ? 'border-theme-accent bg-theme-accent/10 shadow-lg shadow-theme-accent/20'
                                  : 'border-theme-border hover:border-theme-accent/40'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-theme-accent border-theme-accent'
                                    : 'bg-theme-accent/20 border-theme-accent/30'
                                }`}>
                                  <Car className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-theme-text-primary'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-bold text-theme-text-primary truncate mb-0.5">
                                    {vehicle.model || t('work.vehicle.unknownModel')}
                                  </div>
                                  <div className="text-xs font-medium text-theme-text-secondary">
                                    {vehicle.license_plate || t('work.vehicle.noLicensePlate')}
                                  </div>
                                </div>
                                <div className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-md ${
                                  isSelected
                                    ? 'text-white bg-theme-accent'
                                    : 'text-theme-accent bg-theme-accent/10'
                                }`}>
                                  {isSelected ? t('work.vehicle.selected', 'Выбрано') : t('work.vehicle.available', 'Доступно')}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-theme-accent rounded-full animate-pulse" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Date Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-theme-text-primary flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('work.vehicle.dateFrom', 'Дата с')}
                          </span>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:ring-2 focus:ring-theme-accent focus:border-transparent"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-theme-text-primary flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('work.vehicle.dateTo', 'Дата по')}
                          </span>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:ring-2 focus:ring-theme-accent focus:border-transparent"
                            min={dateFrom || new Date().toISOString().split('T')[0]}
                          />
                        </label>
                      </div>
                      
                      <Button
                        size="sm"
                        className={`w-full text-sm font-bold py-3 h-auto shadow-lg mt-3 transition-all ${
                          selectedVehicleId && (dateFrom || dateTo)
                            ? 'bg-theme-accent hover:bg-theme-accent/90 text-white'
                            : 'bg-theme-bg-tertiary text-theme-text-muted border border-theme-border'
                        }`}
                        onClick={handleReserveVehicle}
                        disabled={!selectedVehicleId || !(dateFrom || dateTo) || isVehicleActionLoading}
                      >
                        {isVehicleActionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">{t('work.vehicle.reserveLoading', 'Бронирование...')}</span>
                          </>
                        ) : (
                          <>
                            <Car className="h-4 w-4" />
                            <span className="ml-2">
                              {!selectedVehicleId
                                ? t('work.vehicle.selectVehicleFirst', 'Выберите авто')
                                : !(dateFrom || dateTo)
                                ? t('work.vehicle.selectDateFirst', 'Выберите дату')
                                : t('work.vehicle.createRequest', 'Подать запрос')
                              }
                            </span>
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-sm text-theme-text-muted">
                        {t('work.vehicle.noAvailable')}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Управление сменами (только для неофисных работников) */}
        {canSelectObjectsAndVehicles && (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-theme-text-primary mb-4">
              {t('work.shift.title', 'Рабочая смена')}
            </h2>
            {activeWorkShift ? (
              <div className="space-y-4">
                <div className="bg-theme-accent/20 border border-theme-accent rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-theme-text-primary">
                      {t('work.shift.active')}
                    </span>
                    <Badge className="bg-green-500 text-white">
                      {t('work.shift.activeBadge')}
                    </Badge>
                  </div>
                  <div className="text-sm text-theme-text-secondary space-y-1">
                    <div>
                      <span className="font-medium">{t('work.shift.startTime', 'Начало')}:</span>{' '}
                      {new Date(activeWorkShift.start_time).toLocaleString(
                        { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                      )}
                    </div>
                    {activeWorkShift.object_time > 0 && (
                      <div>
                        <span className="font-medium">{t('work.shift.objectTime', 'Время на объектах')}:</span>{' '}
                        {Math.floor(activeWorkShift.object_time / 3600)}ч {Math.floor((activeWorkShift.object_time % 3600) / 60)}м
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full text-lg font-semibold gap-3"
                  onClick={handleEndShift}
                  disabled={isShiftActionLoading || isWorking}
                >
                  {isShiftActionLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t('work.shift.ending', 'Завершение...')}
                    </>
                  ) : (
                    <>
                      <Square className="h-5 w-5" />
                      {t('work.shift.end', 'Завершить смену')}
                    </>
                  )}
                </Button>
                {isWorking && (
                  <p className="text-sm text-amber-600 mt-2 text-center">
                    {t('work.shift.cannotEndWhileWorking', 'Нельзя завершить смену, пока не завершена работа на объекте')}
                  </p>
                )}
              </div>
            ) : (
              <Button
                variant="default"
                size="lg"
                className="w-full text-lg font-semibold gap-3"
                onClick={handleStartShift}
                disabled={isShiftActionLoading}
              >
                {isShiftActionLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('work.shift.starting', 'Начало...')}
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    {t('work.shift.start', 'Начать смену')}
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {!isWorking ? (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6">
            <div className="text-center">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary mb-4">
                  {t('work.readyToStart')}
                </h2>
                {isRestricted ? (
                  <p className="text-theme-text-secondary text-lg font-medium">{t('work.waitForAdminApproval', 'Wait for admin approval')}</p>
                ) : (
                  <>
                    <button
                      onClick={handleStartWork}
                      disabled={
                        (canChooseWorkType && workType === 'facility' && !selectedObject) ||
                        (!canChooseWorkType && canSelectObjectsAndVehicles && !selectedObject) ||
                        (canSelectObjectsAndVehicles && (canChooseWorkType ? workType === 'facility' : true) && !activeWorkShift) ||
                        isStartingWork
                      }
                      className={`px-8 py-4 rounded-xl text-xl font-bold transition-all flex items-center gap-3 mx-auto ${
                        ((canChooseWorkType && workType === 'office') ||
                         (canChooseWorkType && workType === 'facility' && selectedObject && activeWorkShift) ||
                         (!canChooseWorkType && canSelectObjectsAndVehicles && selectedObject && activeWorkShift) ||
                         (!canSelectObjectsAndVehicles)) && !isStartingWork
                          ? 'bg-theme-accent hover:bg-theme-accent-hover text-white shadow-lg hover:shadow-xl'
                          : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
                      }`}
                    >
                      {isStartingWork ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          {t('work.startingWork')}
                        </>
                      ) : (
                        <>
                          <Play className="h-6 w-6" />
                          {t('work.startWork')}
                        </>
                      )}
                    </button>
                    {((canChooseWorkType && workType === 'facility' && !selectedObject) ||
                      (!canChooseWorkType && canSelectObjectsAndVehicles && !selectedObject)) && (
                      <p className="text-theme-text-muted mt-3">
                        {t('work.selectObjectFirst')}
                      </p>
                    )}
                    {canSelectObjectsAndVehicles && (canChooseWorkType ? workType === 'facility' : true) && !activeWorkShift && (
                      <p className="text-theme-text-muted mt-3">
                        {t('work.shift.startFirst', 'Сначала необходимо начать смену')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-theme-bg-card border border-theme-border rounded-xl text-center p-6">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary mb-4">
                  {t('work.working')}
                </h2>
                <div className="bg-theme-accent/20 border border-theme-accent rounded-xl p-4 mb-6">
                  <p className="text-theme-text-primary font-medium">
                    {canSelectObjectsAndVehicles 
                      ? `${t('work.currentObject')}: ${facilities.find(facility => facility.id.toString() === selectedObject)?.name || t('work.unnamedObject')}`
                      : `${t('work.workPlace')}: ${t('work.office')}`
                    }
                  </p>
                </div>
                <button
                  onClick={handleStopWork}
                  className="px-8 py-4 rounded-xl text-xl font-bold bg-theme-error hover:bg-theme-error/80 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-3 mx-auto"
                >
                  <Square className="h-6 w-6" />
                  {t('work.stopWork')}
                </button>

                {canSelectObjectsAndVehicles && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleTelegramGroup}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <MessageCircle className="h-5 w-5" />
                      {t('work.joinTelegramGroup')}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-theme-bg-card mt-6 border border-theme-border text-center rounded-xl p-6">
              <div className="text-xl font-semibold text-theme-text-primary mb-3">{t('work.todoList')}</div>
              <TodoList
                embedded
                facilityId={selectedObject ? Number(selectedObject) : null}
                facilityTypeId={facilities.find(f => f.id.toString() === selectedObject)?.facility_type_id ?? null}
              />
            </div>
          </>
        )}
      </div>

      {/* Диалог делегирования задач */}
      <DelegateTaskDialog
        open={isDelegateTaskDialogOpen}
        onOpenChange={setIsDelegateTaskDialogOpen}
        currentWorkerId={user?.id}
      />
    </div>
  );
};

export default WorkMain;
