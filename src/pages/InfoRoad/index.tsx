import React, { FC, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './InfoRoad.css';
import { toastSuccess, toastError } from '@/lib/toasts';

// Фикс для иконок маркеров в Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
    [onDragEnd],
  );

  return (
    <Marker
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      draggable
    />
  );
};

const InfoRoad: FC = () => {
  const { tg_id } = useParams<{ tg_id: string }>();
  const [searchParams] = useSearchParams();

  // Данные из query параметров (от бота)
  const transportFromBot = searchParams.get('transport') || '';
  const timeFromBot = searchParams.get('time') || '';

  // Состояние формы
  const [reason, setReason] = useState('');
  const [transport, setTransport] = useState(transportFromBot);
  const [time, setTime] = useState(timeFromBot);
  const [destinationLat, setDestinationLat] = useState<number | null>(null);
  const [destinationLng, setDestinationLng] = useState<number | null>(null);
  const [currentLat, setCurrentLat] = useState(50.4501); // Киев по умолчанию
  const [currentLng, setCurrentLng] = useState(30.5234);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = React.useRef<L.Map>(null);

  // Обновляем транспорт и время при изменении query параметров
  useEffect(() => {
    if (transportFromBot) {
      setTransport(transportFromBot);
    }
    if (timeFromBot) {
      setTime(timeFromBot);
    }
  }, [transportFromBot, timeFromBot]);

  // Получаем текущее местоположение при загрузке
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 13);
          }
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleLocationChange = (lat: number, lng: number) => {
    setDestinationLat(lat);
    setDestinationLng(lng);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setCurrentLat(lat);
          setCurrentLng(lng);
          setDestinationLat(lat);
          setDestinationLng(lng);
          
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
          }
          
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error);
          toastError('Не удалось получить текущее местоположение');
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toastError('Геолокация не поддерживается вашим браузером');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toastError('Пожалуйста, укажите причину поездки');
      return;
    }

    if (!destinationLat || !destinationLng) {
      toastError('Пожалуйста, выберите точку назначения на карте');
      return;
    }

    setIsSubmitting(true);

    try {
      // Здесь можно отправить данные на сервер
      const formData = {
        telegram_id: tg_id ? parseInt(tg_id, 10) : null,
        reason: reason.trim(),
        transport: transport || null,
        time: time || null,
        destination_latitude: destinationLat,
        destination_longitude: destinationLng,
      };

      console.log('Отправка данных поездки:', formData);

      // TODO: Отправить на API
      // await axios.post('/api/v1/inforoad', formData);

      toastSuccess('Информация о поездке успешно отправлена!');
      
      // Очистка формы
      setReason('');
      setDestinationLat(null);
      setDestinationLng(null);
    } catch (error: any) {
      console.error('Ошибка отправки данных:', error);
      toastError('Не удалось отправить информацию о поездке');
    } finally {
      setIsSubmitting(false);
    }
  };

  const position: [number, number] = destinationLat && destinationLng 
    ? [destinationLat, destinationLng]
    : [currentLat, currentLng];

  return (
    <div className="page info-road-page">
      <div className="info-road-container">
        <h1 className="info-road-title">Информация о поездке</h1>
        
        <form onSubmit={handleSubmit} className="info-road-form">
          {/* Причина поездки */}
          <div className="form-group">
            <label htmlFor="reason" className="form-label">
              Причина поездки *
            </label>
            <textarea
              id="reason"
              className="form-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину поездки..."
              rows={4}
              required
            />
          </div>

          {/* Транспорт (только для отображения, если пришло от бота) */}
          {transport && (
            <div className="form-group">
              <label className="form-label">Транспорт</label>
              <div className="form-readonly">{transport}</div>
            </div>
          )}

          {/* Время (только для отображения, если пришло от бота) */}
          {time && (
            <div className="form-group">
              <label className="form-label">Время</label>
              <div className="form-readonly">{time}</div>
            </div>
          )}

          {/* Карта для выбора точки назначения */}
          <div className="form-group">
            <label className="form-label">
              Точка назначения на карте *
            </label>
            <div className="map-controls">
              <button
                type="button"
                className="btn-current-location"
                onClick={handleCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? '⏳ Получение...' : '📍 Моё местоположение'}
              </button>
              {destinationLat && destinationLng && (
                <div className="coordinates-display">
                  Координаты: {destinationLat.toFixed(6)}, {destinationLng.toFixed(6)}
                </div>
              )}
            </div>
            <div className="map-wrapper">
              <MapContainer
                center={position}
                zoom={destinationLat && destinationLng ? 15 : 13}
                style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                ref={mapRef}
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
            <p className="map-hint">
              Кликните на карте или перетащите маркер для выбора точки назначения
            </p>
          </div>

          {/* Кнопка отправки */}
          <button
            type="submit"
            className="btn-submit"
            disabled={isSubmitting || !reason.trim() || !destinationLat || !destinationLng}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InfoRoad;

