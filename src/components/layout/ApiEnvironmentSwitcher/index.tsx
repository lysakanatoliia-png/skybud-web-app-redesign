import { useState, useEffect } from 'react';
import { getApiEnvironment, toggleApiEnvironment, type ApiEnvironment } from '../../../lib/apiConfig';
import { updateApiBaseUrl } from '../../../requests/config';
import { CRM_API_URL } from '../../../lib/env';
import './ApiEnvironmentSwitcher.scss';

const ApiEnvironmentSwitcher = () => {
  const [environment, setEnvironment] = useState<ApiEnvironment>(getApiEnvironment());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show in development mode or if explicitly enabled via localStorage
    const isDev = import.meta.env.DEV || import.meta.env.VITE_DEBUG;
    const isExplicitlyEnabled = localStorage.getItem('show_api_switcher') === 'true';
    setIsVisible(isDev || isExplicitlyEnabled);
  }, []);

  const handleToggle = () => {
    const newEnv = toggleApiEnvironment();
    setEnvironment(newEnv);
    updateApiBaseUrl();
    // Reload page to apply changes
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <div className="api-environment-switcher">
      <button
        type="button"
        onClick={handleToggle}
        className={`env-toggle ${environment}`}
        title={`Current: ${environment === 'local' ? 'Local (localhost:89)' : `Production (${CRM_API_URL})`}`}
      >
        <span className="env-indicator"></span>
        <span className="env-label">
          {environment === 'local' ? 'Local' : 'Prod'}
        </span>
      </button>
    </div>
  );
};

export default ApiEnvironmentSwitcher;

