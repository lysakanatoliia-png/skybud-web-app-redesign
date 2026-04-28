import {useEffect} from "react";
import {useNavigate} from "react-router-dom";

const useBackButton = (backRoute: string | (() => void)) => {
  const navigate = useNavigate();

  useEffect(() => {
    // BackButton не поддерживается в версии 6.0
    if (!window.Telegram?.WebApp?.BackButton) {
      return;
    }

    const webApp = window.Telegram.WebApp;
    const version = webApp.version || '6.0';
    const isVersion6 = version.startsWith('6.');

    // Пропускаем для версии 6.0
    if (isVersion6) {
      return;
    }

    if (backRoute) {
      try {
        webApp.BackButton.show();
        if (typeof backRoute === 'string') {
          webApp.BackButton.onClick(() => navigate(backRoute));
        } else {
          webApp.BackButton.onClick(backRoute);
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    }

    return () => {
      try {
        if (webApp.BackButton) {
          webApp.BackButton.hide();
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };
  }, [navigate, backRoute]);
}

export default useBackButton;