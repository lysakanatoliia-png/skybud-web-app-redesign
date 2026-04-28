import { FC, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type RoutePoint = {
  id: number;
  title: string;
  address?: string;
  description?: string;
};

type RouteDetailsScreenProps = {
  pointTitle: string;
  placeholder?: string;
  showDescription?: boolean;
  showMaterialsSite?: boolean;
  descriptionLabel?: string;
};

const RouteDetailsScreen: FC<RouteDetailsScreenProps> = ({ 
  pointTitle, 
  placeholder,
  showDescription = false,
  showMaterialsSite = false,
  descriptionLabel
}) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();
  
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [materialsSite, setMaterialsSite] = useState('');
  const points = (location.state?.points as RoutePoint[]) ?? [];
  const returnScreen = location.state?.returnScreen || 'result';

  const handleNext = () => {
    if (!address.trim()) {
      return;
    }

    const newPoint: RoutePoint = {
      id: Date.now(),
      title: pointTitle,
      address: address.trim(),
      description: (showDescription && description.trim()) 
        ? description.trim() 
        : (showMaterialsSite && materialsSite.trim())
          ? materialsSite.trim()
          : undefined
    };

    const updatedPoints = [...points, newPoint];
    navigate('/routes/result', { 
      state: { 
        points: updatedPoints,
        returnScreen: 'main'
      } 
    });
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h2 className="text-3xl font-semibold mb-6 text-theme-text-primary">{pointTitle}</h2>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-lg font-medium text-theme-text-primary mb-2">
              {t('routes.inputs.address', 'Address')}
            </label>
            <input
              className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-4 py-3 text-lg text-theme-text-primary"
              placeholder={placeholder || t('routes.inputs.address', 'Address')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoFocus
            />
          </div>

          {showDescription && (
            <div>
              <label className="block text-lg font-medium text-theme-text-primary mb-2">
                {descriptionLabel || t('routes.description', 'Description')}
              </label>
              <textarea
                className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-4 py-3 text-lg text-theme-text-primary"
                placeholder={t('routes.descriptionPlaceholder', 'Additional details (optional)')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {showMaterialsSite && (
            <div>
              <label className="block text-lg font-medium text-theme-text-primary mb-2">
                {t('routes.inputs.siteName', 'Site Name')}
              </label>
              <input
                className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-4 py-3 text-lg text-theme-text-primary"
                placeholder={t('routes.inputs.siteName', 'Site Name')}
                value={materialsSite}
                onChange={(e) => setMaterialsSite(e.target.value)}
              />
            </div>
          )}
        </div>

        <button
          className="w-full px-6 py-4 rounded-lg bg-theme-primary text-white text-lg font-medium flex items-center justify-center gap-2 border border-theme-primary hover:bg-opacity-90 transition-colors shadow-md"
          onClick={handleNext}
          disabled={!address.trim()}
        >
          <Plus className="h-5 w-5" /> {t('common.add', 'Add')}
        </button>

        {points.length > 0 && (
          <button
            className="w-full mt-4 px-6 py-4 rounded-md border border-theme-border-primary text-theme-text-primary text-lg font-medium"
            onClick={() => navigate('/routes/result', { state: { points, returnScreen } })}
          >
            {t('routes.skipToResult', 'Skip to Result')}
          </button>
        )}
      </div>
    </div>
  );
};

export default RouteDetailsScreen;

