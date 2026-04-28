import { FC, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type AskShopProps = {
  title?: string;
  nextPath: string;
  nextScreen?: string;
};

const AskShop: FC<AskShopProps> = ({ title, nextPath, nextScreen }) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();
  const [shop, setShop] = useState('');
  const points = (location.state?.points as any[]) ?? [];

  const proceed = () => {
    if (!shop) return;
    const nextState = { points, shop, screen: nextScreen };
    navigate(nextPath, { state: nextState });
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-theme-text-primary">{title}</h2>
        <div className="space-y-3">
          <input
            className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-theme-text-primary"
            placeholder={t('routes.inputs.shopName', 'Shop Name')}
            value={shop}
            onChange={(e) => setShop(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded-md bg-theme-primary text-white"
            onClick={proceed}
          >
            {t('common.next', 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AskShop;


