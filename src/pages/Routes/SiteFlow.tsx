import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import AskSite from './components/AskSite';
import ConfirmRoute from './components/ConfirmRoute';
import { useTranslation } from 'react-i18next';

type Screen = 'askSite' | 'confirm';

const SiteFlow: FC = () => {
  const location = useLocation() as any;
  const { t } = useTranslation();
  const screen: Screen = (location.state?.screen as Screen) ?? 'askSite';

  if (screen === 'confirm') {
    const points = (location.state?.points as any[]) ?? [];
    const site = (location.state?.from as string) ?? '';
    const appended = [...points];
    if (site) appended.push({ from: 'Work', to: 'Site', details: site });
    return <ConfirmRoute title={t('routes.confirmTitle', 'Confirm Route')} initialPoints={appended} />;
  }

  return (
    <AskSite
      title={t('routes.siteAskTitle', 'Specify Site')}
      nextPath={'/routes/site'}
      nextScreen={'confirm'}
    />
  );
};

export default SiteFlow;


