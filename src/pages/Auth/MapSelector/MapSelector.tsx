// src/components/MapSelector/MapSelector.tsx
import React, { useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapSelector.css';

// Фикс для иконок маркеров в Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapSelectorProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

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
  const markerRef = useRef<L.Marker>(null);
  
  const eventHandlers = useMemo(
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
    />
  );
};

const MapSelector: React.FC<MapSelectorProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  onClose,
}) => {
  const [currentLat, setCurrentLat] = useState(latitude || 50.4501);
  const [currentLng, setCurrentLng] = useState(longitude || 30.5234);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef<L.Map>(null);

  const position: [number, number] = [currentLat, currentLng];

  const handleLocationChange = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
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
          
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
          }
          
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error);
          alert('Не удалось получить текущее местоположение');
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Геолокация не поддерживается вашим браузером');
    }
  };

  const handleSave = () => {
    onLocationSelect(currentLat, currentLng);
    onClose();
  };

  const handleInputChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (field === 'lat') {
      setCurrentLat(numValue);
      if (mapRef.current) {
        mapRef.current.setView([numValue, currentLng], mapRef.current.getZoom());
      }
    } else {
      setCurrentLng(numValue);
      if (mapRef.current) {
        mapRef.current.setView([currentLat, numValue], mapRef.current.getZoom());
      }
    }
  };

  return (
    <div className="map-selector-overlay">
      <div className="map-selector-modal">
        <div className="map-selector-header">
          <h3>Выберите местоположение на карте</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="map-selector-content">
          <div className="coordinates-input">
            <div className="coord-group">
              <label>Широта:</label>
              <input
                type="number"
                step="any"
                value={currentLat.toFixed(6)}
                onChange={(e) => handleInputChange('lat', e.target.value)}
                placeholder="0.000000"
              />
            </div>
            <div className="coord-group">
              <label>Долгота:</label>
              <input
                type="number"
                step="any"
                value={currentLng.toFixed(6)}
                onChange={(e) => handleInputChange('lng', e.target.value)}
                placeholder="0.000000"
              />
            </div>
            <button 
              className="current-location-btn" 
              onClick={handleCurrentLocation} 
              disabled={isGettingLocation}
            >
              {isGettingLocation ? '⏳ Получение...' : '📍 Моё местоположение'}
            </button>
          </div>

          <div className="map-container">
            <MapContainer
              center={position}
              zoom={13}
              style={{ height: '100%', width: '100%', borderRadius: '8px' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler onLocationChange={handleLocationChange} />
              
              <DraggableMarker 
                position={position} 
                onDragEnd={handleLocationChange}
              />
            </MapContainer>
          </div>

          <div className="map-instructions">
            <p>• Кликните на карте для выбора местоположения</p>
            <p>• Перетащите маркер для точной настройки</p>
            <p>• Введите координаты вручную для точного позиционирования</p>
            <p>• Используйте кнопку геолокации для автоопределения</p>
          </div>
        </div>

        <div className="map-selector-actions">
          <button className="cancel-btn" onClick={onClose}>
            Отмена
          </button>
          <button className="save-btn" onClick={handleSave}>
            Сохранить местоположение
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSelector;
