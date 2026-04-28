import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitQuestionnaire } from '@/requests/questionnaire';
import { getFacilities } from '@/requests/facility';
import type { FacilityOut } from '@/requests/facility/types';
import { toastSuccess, toastError } from '@/lib/toasts';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Фикс для иконок маркеров в Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const questionnaireSchema = z.object({
  reason_type: z.enum(['WORK', 'PERSONAL'], {
    message: 'Выберите тип поездки',
  }),
  work_type: z.string().optional(),
  facility_id: z.number().optional().nullable(),
  reason: z.string().optional(),
  destination_description: z.string().optional(),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
})
  .refine(
    (data) => {
      if (data.reason_type === 'WORK') {
        const allowed = ['Домой', 'На объект', 'Мойка', 'Заправка', 'Сервис', 'За запчастями'];
        return data.work_type && allowed.includes(data.work_type);
      }
      return true;
    },
    { message: 'Выберите тип рабочей поездки', path: ['work_type'] }
  )
  .refine(
    (data) => {
      if (data.reason_type === 'WORK' && data.work_type === 'На объект') {
        return data.facility_id != null && data.facility_id > 0;
      }
      return true;
    },
    { message: 'Выберите объект', path: ['facility_id'] }
  )
  .refine(
    (data) => {
      if (data.reason_type === 'WORK') {
        return (data.reason?.trim().length ?? 0) > 0;
      }
      return true;
    },
    { message: 'Причина поездки обязательна для заполнения', path: ['reason'] }
  )
  .refine(
    (data) => {
      if (data.reason_type === 'WORK') {
        return (data.destination_description?.trim().length ?? 0) > 0;
      }
      return true;
    },
    { message: 'Описание места назначения обязательно', path: ['destination_description'] }
  )
  .refine(
    (data) => {
      if (data.reason_type === 'WORK') {
        const lat = data.destination_lat;
        return lat != null && lat >= -90 && lat <= 90;
      }
      return true;
    },
    { message: 'Широта должна быть от -90 до 90', path: ['destination_lat'] }
  )
  .refine(
    (data) => {
      if (data.reason_type === 'WORK') {
        const lng = data.destination_lng;
        return lng != null && lng >= -180 && lng <= 180;
      }
      return true;
    },
    { message: 'Долгота должна быть от -180 до 180', path: ['destination_lng'] }
  );

type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;

// Компонент для обработки кликов по карте
const MapClickHandler: React.FC<{
  onLocationChange: (lat: number, lng: number) => void;
}> = ({ onLocationChange }) => {
  useMapEvents({
    click: (e: any) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });
  return null;
};

// Компонент для перетаскиваемого маркера
const DraggableMarker: React.FC<{
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}> = ({ position, onDragEnd }) => {
  const markerRef = React.useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onDragEnd(lat, lng);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      eventHandlers={eventHandlers}
      position={position}
      draggable
      ref={markerRef}
    />
  );
};

const QuestionnairePage: React.FC = () => {
  const { start_state_id } = useParams<{ start_state_id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const { t } = useTranslation();

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema) as any,
    defaultValues: {
      reason_type: 'WORK' as 'WORK' | 'PERSONAL',
      work_type: undefined,
      facility_id: undefined,
      reason: '',
      destination_description: '',
      destination_lat: 50.4501,
      destination_lng: 30.5234,
    },
  });

  const reasonType = form.watch('reason_type');
  const workType = form.watch('work_type');

  // Загрузка объектов при выборе "На объект"
  useEffect(() => {
    if (workType !== 'На объект') {
      form.setValue('facility_id', undefined);
      return;
    }
    let cancelled = false;
    setFacilitiesLoading(true);
    getFacilities({ limit: 100, offset: 0 })
      .then((res) => {
        if (!cancelled && res.data) setFacilities(res.data);
      })
      .finally(() => {
        if (!cancelled) setFacilitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workType]);

  const destinationLat = form.watch('destination_lat');
  const destinationLng = form.watch('destination_lng');

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleLocationChange = (lat: number, lng: number) => {
    form.setValue('destination_lat', lat, { shouldValidate: true });
    form.setValue('destination_lng', lng, { shouldValidate: true });
  };

  // Поиск координат по адресу через Nominatim API
  const handleSearchAddress = async () => {
    if (!address.trim()) {
      toastError(t('questionnaire.enterAddress') || 'Введите адрес');
      return;
    }

    setIsSearchingAddress(true);
    try {
      // Используем Nominatim API от OpenStreetMap (бесплатный, не требует API ключа)
      const encodedAddress = encodeURIComponent(address.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&accept-language=${navigator.language || 'ru'}`
      );

      if (!response.ok) {
        throw new Error('Ошибка при поиске адреса');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        handleLocationChange(lat, lng);
        toastSuccess(t('questionnaire.addressFound') || 'Координаты найдены');
      } else {
        toastError(t('questionnaire.addressNotFound') || 'Адрес не найден');
      }
    } catch (error) {
      console.error('Ошибка поиска адреса:', error);
      toastError(t('questionnaire.addressNotFound') || 'Ошибка при поиске адреса');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleLocationChange(lat, lng);
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error);
          toastError('Не удалось получить текущее местоположение');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toastError('Геолокация не поддерживается вашим браузером');
    }
  };

  const onSubmit = async (data: QuestionnaireFormData) => {
    if (!start_state_id) {
      toastError(t('questionnaire.errorNoStartStateId'));
      return;
    }

    const startStateIdNum = parseInt(start_state_id);
    if (isNaN(startStateIdNum)) {
      toastError(t('questionnaire.errorInvalidStartStateId'));
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: any = {
        reason_type: data.reason_type as 'WORK' | 'PERSONAL',
      };
      if (data.reason_type === 'WORK') {
        submitData.reason = data.reason ?? '';
        submitData.destination_description = data.destination_description ?? '';
        submitData.destination_lat = data.destination_lat ?? 0;
        submitData.destination_lng = data.destination_lng ?? 0;
        if (data.work_type) submitData.work_type = data.work_type;
        if (data.work_type === 'На объект' && data.facility_id != null) submitData.facility_id = data.facility_id;
      }
      await submitQuestionnaire(startStateIdNum, submitData);
      toastSuccess(t('questionnaire.success'));
      form.reset();
    } catch (error: any) {
      toastError(error.message || t('questionnaire.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const position: [number, number] = [destinationLat || 50.4501, destinationLng || 30.5234];

  if (!start_state_id) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('common.error', 'Ошибка')}</h1>
          <p className="text-muted-foreground">
            {t('questionnaire.errorNoStartStateIdInUrl')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Safe area для Telegram кнопок сверху */}
      <div className="pb-4 px-4 md:px-6" style={{ paddingTop: '16rem', marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold mb-2">{t('questionnaire.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('questionnaire.subtitle')}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
            {/* Тип поездки */}
            <FormField
              control={form.control}
              name="reason_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('questionnaire.tripType')} *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== 'WORK') {
                        form.setValue('work_type', undefined);
                        form.setValue('facility_id', undefined);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder={t('questionnaire.tripTypePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WORK" className="text-base py-3">{t('questionnaire.work')}</SelectItem>
                      <SelectItem value="PERSONAL" className="text-base py-3">{t('questionnaire.personal')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Остальные поля только для рабочей поездки */}
            {reasonType === 'WORK' && (
              <>
            <FormField
                control={form.control}
                name="work_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{t('questionnaire.workType')} *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'На объект') form.setValue('facility_id', undefined);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder={t('questionnaire.workTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Домой" className="text-base py-3">{t('questionnaire.workHome')}</SelectItem>
                        <SelectItem value="На объект" className="text-base py-3">{t('questionnaire.workToFacility')}</SelectItem>
                        <SelectItem value="Мойка" className="text-base py-3">{t('questionnaire.wash')}</SelectItem>
                        <SelectItem value="Заправка" className="text-base py-3">{t('questionnaire.fuel')}</SelectItem>
                        <SelectItem value="Сервис" className="text-base py-3">{t('questionnaire.service')}</SelectItem>
                        <SelectItem value="За запчастями" className="text-base py-3">{t('questionnaire.parts')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            {/* Выбор объекта (только при "На объект") */}
            {workType === 'На объект' && (
              <FormField
                control={form.control}
                name="facility_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{t('questionnaire.facility')} *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === '' ? undefined : parseInt(value, 10))}
                      value={field.value != null ? String(field.value) : ''}
                      disabled={facilitiesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder={facilitiesLoading ? t('questionnaire.loadingFacilities') : t('questionnaire.facilityPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)} className="text-base py-3">
                            {f.name || `Объект #${f.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Причина поездки */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('questionnaire.reason')} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('questionnaire.reasonPlaceholder')}
                      className="min-h-[100px] text-base resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Описание места назначения */}
            <FormField
              control={form.control}
              name="destination_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('questionnaire.destinationDescription')} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('questionnaire.destinationDescriptionPlaceholder')}
                      className="min-h-[100px] text-base resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Координаты места назначения */}
            <div className="space-y-3 md:space-y-4">
              <Label className="text-base font-semibold">{t('questionnaire.coordinates')} *</Label>
              
              {/* Поле для ввода адреса */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t('questionnaire.enterAddress')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchAddress();
                      }
                    }}
                    placeholder={t('questionnaire.addressPlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchAddress}
                    disabled={isSearchingAddress || !address.trim()}
                    className="whitespace-nowrap"
                  >
                    {isSearchingAddress ? t('questionnaire.searching') : t('questionnaire.searchAddress')}
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMap(!showMap)}
                  className="flex-1 h-11 text-base"
                >
                  {showMap ? t('questionnaire.hideMap') : t('questionnaire.showMap')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCurrentLocation}
                  className="h-11 text-base whitespace-nowrap"
                >
                  📍 {t('questionnaire.currentLocation')}
                </Button>
              </div>

              {showMap && (
                <div className="mb-3 border-2 border-border rounded-lg overflow-hidden shadow-sm" style={{ height: '250px' }}>
                  <MapContainer
                    center={position}
                    zoom={destinationLat && destinationLng ? 15 : 13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onLocationChange={handleLocationChange} />
                    {destinationLat && destinationLng && (
                      <DraggableMarker
                        position={[destinationLat, destinationLng]}
                        onDragEnd={handleLocationChange}
                      />
                    )}
                  </MapContainer>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <FormField
                  control={form.control}
                  name="destination_lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('questionnaire.latitude')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="50.4501"
                          className="h-11 text-base"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination_lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('questionnaire.longitude')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="30.5234"
                          className="h-11 text-base"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                💡 {t('questionnaire.mapHint')}
              </p>
            </div>
              </>
            )}

            {/* Кнопка отправки */}
            <div className="pt-2 pb-safe" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold shadow-lg"
                size="lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('questionnaire.submitting')}
                  </span>
                ) : (
                  `✓ ${t('questionnaire.submit')}`
                )}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </div>
    </div>
  );
};

export default QuestionnairePage;

