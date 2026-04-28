import { FC, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmRoute from './components/ConfirmRoute';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const MaterialsFlow: FC = () => {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const points = (location.state?.points as any[]) ?? [];
  const [shop, setShop] = useState('');
  const [site, setSite] = useState('');

  // simple inline ask screen for two fields (shop + site) on one page
  if (!(location.state?.screen === 'confirm')) {
    return (
      <div className="page min-h-screen bg-theme-bg-primary p-6">
        <div className="max-w-xl mx-auto w-full">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-theme-text-primary">{t('routes.materialsAskTitle', 'Specify Materials Trip')}</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-theme-text-primary"
              placeholder={t('routes.inputs.shopName', 'Shop Name')}
              value={shop}
              onChange={(e) => setShop(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-theme-text-primary"
              placeholder={t('routes.inputs.siteName', 'Site Name')}
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded-md bg-theme-primary text-white"
              onClick={() => {
                if (!shop || !site) return;
                const appended = [
                  ...points,
                  { from: 'Work', to: 'Materials', details: `${shop} → ${site}` },
                  { from: 'Materials', to: 'Home' }
                ];
                navigate('/routes/materials', { state: { screen: 'confirm', points: appended } });
              }}
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const confirmedPoints = (location.state?.points as any[]) ?? points;
  return <ConfirmRoute title={t('routes.confirmTitle', 'Confirm Route')} initialPoints={confirmedPoints} />;
};

export default MaterialsFlow;


