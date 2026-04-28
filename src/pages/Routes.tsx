import { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Package, MapPinHouse, Home, ShowerHead, Fuel, User2 } from 'lucide-react';
import useBackButton from '@/hooks/useBackButton';
import { useTranslation } from 'react-i18next';
import RouteDetailsScreen from './Routes/components/RouteDetailsScreen';
import RouteResultScreen from './Routes/components/RouteResultScreen';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type RoutePoint = {
  id: number;
  title: string;
  address?: string;
  description?: string;
};

type Screen = 'main' | 'details' | 'result';

const RoutesPage: FC = () => {
  useBackButton('/');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation() as any;
  
  const points: RoutePoint[] = (location.state?.points as RoutePoint[]) ?? [];
  const screen: Screen = location.state?.screen || 'main';
  const selectedPointType = location.state?.selectedPointType;

  const cards = [
    { 
      type: 'site', 
      title: t('routes.object'), 
      icon: <MapPinHouse className="h-8 w-8" />, 
      color: 'green',
      detailsConfig: { showDescription: false }
    },
    { 
      type: 'materials', 
      title: t('routes.materials'), 
      icon: <Package className="h-8 w-8" />, 
      color: 'blue',
      detailsConfig: { showMaterialsSite: true }
    },
    { 
      type: 'home', 
      title: t('routes.home'), 
      icon: <Home className="h-8 w-8" />, 
      color: 'orange',
      detailsConfig: { showDescription: false }
    },
    { 
      type: 'washFuel', 
      title: t('routes.washFuel'), 
      icon: (
        <div className="flex items-center gap-1 text-theme-text-primary">
          <ShowerHead className="h-7 w-7" />
          <Fuel className="h-7 w-7" />
        </div>
      ), 
      color: 'purple',
      detailsConfig: { showDescription: false }
    },
    { 
      type: 'personal', 
      title: t('routes.personal'), 
      icon: <User2 className="h-8 w-8" />, 
      color: 'blue',
      detailsConfig: { showDescription: false }
    },
  ] as const;

  const handleCardClick = (cardType: string, cardTitle: string) => {
    if (cardType === 'home' || cardType === 'personal') {
      const point: RoutePoint = {
        id: Date.now(),
        title: cardTitle,
      };
      navigate('/routes/result', { 
        state: { 
          points: [...points, point],
          returnScreen: 'main'
        } 
      });
    } else {
      navigate('/routes', {
        state: {
          screen: 'details',
          points,
          selectedPointType: cardType,
          selectedPointTitle: cardTitle,
          returnScreen: 'main'
        }
      });
    }
  };

  const colorClasses = {
    green: 'border-green-400 bg-green-400/5 hover:bg-green-400/10 hover:border-green-500',
    blue: 'border-blue-400 bg-blue-400/5 hover:bg-blue-400/10 hover:border-blue-500',
    orange: 'border-orange-400 bg-orange-400/5 hover:bg-orange-400/10 hover:border-orange-500',
    purple: 'border-purple-400 bg-purple-400/5 hover:bg-purple-400/10 hover:border-purple-500',
  };

  if (screen === 'result') {
    return <RouteResultScreen />;
  }

  if (screen === 'details') {
    const card = cards.find(c => c.type === selectedPointType);
    if (!card) return null;
    
    const detailsConfig = card.detailsConfig as { showDescription?: boolean; showMaterialsSite?: boolean; descriptionLabel?: string };
    
    return (
      <RouteDetailsScreen 
        pointTitle={location.state?.selectedPointTitle || card.title}
        placeholder={card.type === 'site' ? t('routes.inputs.siteName', 'Site Name') : t('routes.inputs.address', 'Address')}
        showDescription={detailsConfig.showDescription || false}
        showMaterialsSite={detailsConfig.showMaterialsSite || false}
        descriptionLabel={detailsConfig.descriptionLabel}
      />
    );
  }

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-theme-text-primary mb-2">{t('routes.title')}</h1>
          <p className="text-theme-text-muted text-lg">{t('routes.subtitle', 'Add route points to your trip')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {cards.map((card) => (
            <button
              key={card.type}
              onClick={() => handleCardClick(card.type, card.title)}
              className={`group flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 ${colorClasses[card.color]}`}
            >
              <div className="flex-shrink-0">
                {card.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-semibold text-theme-text-primary">{card.title}</h3>
              </div>
              <ArrowRight className="h-6 w-6 text-theme-text-muted group-hover:text-theme-primary group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        {points.length > 0 && (
          <button
            onClick={() => navigate('/routes/result', { state: { points, returnScreen: 'main' } })}
            className="w-full px-6 py-4 rounded-xl bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary text-lg font-medium hover:bg-theme-bg-tertiary transition-colors"
          >
            {t('routes.viewRoute', 'View Route')} ({points.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default RoutesPage;


