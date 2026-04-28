import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import AskAddress from './components/AskAddress';
import ConfirmRoute from './components/ConfirmRoute';
import { useTranslation } from 'react-i18next';

type Screen = 'askAddress' | 'confirm';

const WashFuelFlow: FC = () => {
  const location = useLocation() as any;
  const { t } = useTranslation();
  const screen: Screen = (location.state?.screen as Screen) ?? 'askAddress';

  if (screen === 'confirm') {
    const points = (location.state?.points as any[]) ?? [];
    const address = (location.state?.address as string) ?? '';
    const appended = [...points];
    if (address) appended.push({ from: 'Work', to: address });
    return <ConfirmRoute title={t('routes.confirmTitle', 'Confirm Route')} initialPoints={appended} />;
  }

  return (
    <AskAddress
      title={t('routes.washFuelAskTitle', 'Specify Wash or Fuel Address')}
      placeholder={t('routes.inputs.address', 'Address')}
      nextPath={'/routes/wash-fuel'}
      nextScreen={'confirm'}
    />
  );
};

export default WashFuelFlow;


