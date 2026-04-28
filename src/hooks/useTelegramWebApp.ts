import { useEffect } from 'react';

export const useTelegramWebApp = () => {
  const isDesktop = (): boolean => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobile = /android|iphone|ipad|mobile|ipod|blackberry|opera mini|iemobile|wpdesktop|windows phone/i.test(userAgent);
    if (import.meta.env.VITE_DEBUG) {
      return false;
    }
    return !isMobile;
  };

  useEffect(() => {
    if (import.meta.env.VITE_DEBUG) {
      const html = document.querySelector("html");
      html!.classList.add("desktop");
    }

    if (window.Telegram?.WebApp && !isDesktop() && !import.meta.env.VITE_DEBUG) {
      const webApp = window.Telegram.WebApp;
      const version = webApp.version || '6.0';
      const isVersion6 = version.startsWith('6.');
      
      // expand() поддерживается во всех версиях
      if (typeof webApp.expand === 'function') {
        try {
          webApp.expand();
        } catch (error) {
          // Игнорируем ошибки для expand
        }
      }

      // Методы, которые не поддерживаются в версии 6.0
      if (!isVersion6) {
        if (typeof webApp.requestFullscreen === 'function') {
          try {
            webApp.requestFullscreen();
          } catch (error) {
            // Игнорируем ошибки
          }
        }

        if (typeof webApp.disableVerticalSwipes === 'function') {
          try {
            webApp.disableVerticalSwipes();
          } catch (error) {
            // Игнорируем ошибки
          }
        }

        if (typeof webApp.lockOrientation === 'function') {
          try {
            webApp.lockOrientation();
          } catch (error) {
            // Игнорируем ошибки
          }
        }
      }
    }
  }, []);

  return { isDesktop };
};
