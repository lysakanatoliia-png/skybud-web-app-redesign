import { FC } from 'react';
import ConfirmRoute from './components/ConfirmRoute';
import { useTranslation } from 'react-i18next';

const HomeFlow: FC = () => {
  const { t } = useTranslation();
  return (
    <ConfirmRoute
      title={t('routes.confirmTitle', 'Confirm Route')}
      initialPoints={[{ from: 'Work', to: 'Home' }]}
    />
  );
};

export default HomeFlow;


