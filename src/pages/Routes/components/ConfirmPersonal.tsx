import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const ConfirmPersonal: FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSave = () => {
    navigate('/routes', { replace: true });
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary pb-24 p-6">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-theme-text-primary">{t('routes.personalConfirmTitle', 'Confirm Personal Trip')}</h2>
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-secondary p-4 mb-6">
          {t('routes.personalNoRoute', 'No route or arbitrary point')}
        </div>
      </div>
      <div className="fixed left-0 right-0 bottom-0 bg-theme-bg-primary/95 backdrop-blur p-4 border-t border-theme-border-primary">
        <div className="max-w-2xl mx-auto w-full">
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

export default ConfirmPersonal;


