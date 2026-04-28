import { FC, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type AskAddressProps = {
  title?: string;
  nextPath: string;
  placeholder?: string;
  nextScreen?: string;
};

const AskAddress: FC<AskAddressProps> = ({ title, nextPath, placeholder, nextScreen }) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const points = (location.state?.points as any[]) ?? [];

  const proceed = () => {
    if (!address) return;
    const nextState = { points, address, screen: nextScreen };
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
            placeholder={placeholder || t('routes.inputs.address', 'Address')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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

export default AskAddress;


