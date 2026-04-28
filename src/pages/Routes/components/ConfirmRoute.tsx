import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type RoutePoint = {
  from: string;
  to: string;
  details?: string;
};

type ConfirmRouteProps = {
  title: string;
  initialPoints?: RoutePoint[];
};

const ConfirmRoute: FC<ConfirmRouteProps> = ({ title, initialPoints = [] }) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();

  const points: RoutePoint[] = (location.state?.points as RoutePoint[] | undefined) ?? initialPoints;

  const handleAdd = () => {
    navigate('/routes', { state: { points } });
  };

  const handleSave = () => {
    // here will be api integration later
    navigate('/routes', { replace: true });
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary pb-28 p-6">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-theme-text-primary">{title}</h2>

        <div className="space-y-3">
          {points.length === 0 && (
            <div className="text-theme-text-muted">{t('routes.emptyPoints', 'No route points yet')}</div>
          )}
          {points.map((p, idx) => (
            <div key={idx} className="rounded-xl border border-theme-border-primary bg-theme-bg-secondary p-4 shadow-sm">
              <div className="text-theme-text-primary font-medium">{p.from} → {p.to}</div>
              {p.details && <div className="text-sm text-theme-text-muted mt-1">{p.details}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 bg-theme-bg-primary/95 backdrop-blur p-4 border-t border-theme-border-primary">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-3">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-theme-primary text-white text-base"
            onClick={handleAdd}
          >
            <Plus className="h-5 w-5" /> {t('common.add', 'Add')}
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-theme-border-primary text-theme-text-primary text-base"
            onClick={handleSave}
          >
            <Save className="h-5 w-5" /> {t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRoute;


