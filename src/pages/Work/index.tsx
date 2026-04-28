import { FC, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import WorkMain from './screens/WorkMain';
import TodoList from './screens/TodoList';
import WorkSummary from './screens/WorkSummary';
import WorkHistory from './screens/WorkHistory';
import { getFacilities, FacilityOut, WorkProcessEndOut } from '@/requests';

type WorkScreen = 'main' | 'completion' | 'todo' | 'summary' | 'history';

const Work: FC = () => {
  const user = useSelector((state: any) => state.data.user);
  const [currentScreen, setCurrentScreen] = useState<WorkScreen>('main');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [workSummaryData, setWorkSummaryData] = useState<WorkProcessEndOut | null>(null);

  // Приховуємо кнопку назад для головного екрану Work
  useEffect(() => {
    if (!window.Telegram?.WebApp?.BackButton) {
      return;
    }

    const webApp = window.Telegram.WebApp;
    const version = webApp.version || '6.0';
    const isVersion6 = version.startsWith('6.');

    // BackButton не поддерживается в версии 6.0
    if (isVersion6) {
      return;
    }

    try {
      webApp.BackButton.hide();
    } catch (error) {
      // Игнорируем ошибки
    }
  }, []);

  // Определяем, может ли работник выбирать объекты
  const allowedWorkerTypes = ['admin', 'coder', 'worker', 'master', 'foreman', 'engineer', 'assistant'];
  const canSelectObjectsAndVehicles = user?.worker_type && allowedWorkerTypes.includes(user.worker_type);

  // Завантаження об'єктів з API (только для работников, которые могут выбирать объекты)
  useEffect(() => {
    if (!canSelectObjectsAndVehicles) {
      return;
    }

    const fetchFacilities = async () => {
      try {
        // Объекты загружаются из bot-api со статическим токеном, не нужно ждать JWT токен
        console.log('[Work] Fetching facilities from bot-api...');
        const response = await getFacilities();

        if (response.error) {
          console.error('[Work] Failed to fetch facilities:', response);
          // Retry один раз через 2 секунды
          setTimeout(() => {
            getFacilities().then(retryResponse => {
              if (!retryResponse.error) {
                setFacilities(retryResponse.data);
              }
            });
          }, 2000);
          return;
        }

        console.log('[Work] Facilities loaded:', response.data?.length || 0);
        setFacilities(response.data || []);
      } catch (error) {
        console.error('[Work] Error fetching facilities:', error);
        // Retry через 2 секунды
        setTimeout(() => {
          getFacilities().then(retryResponse => {
            if (!retryResponse.error) {
              setFacilities(retryResponse.data || []);
            }
          });
        }, 2000);
      }
    };

    fetchFacilities();
  }, [canSelectObjectsAndVehicles]);

  const handleStartWork = (objectId: string) => {
    setSelectedObject(objectId);
    setCurrentScreen('main');
  };

  const handleObjectSelect = (objectId: string) => {
    setSelectedObject(objectId);
  };

  const handleStopWork = () => {
    // Теперь медиа загружается отдельно через Telegram после завершения работы
    // Пропускаем экран completion и сразу переходим к списку задач
    setCurrentScreen('todo');
  };

  const handleTodoListBack = () => {
    setCurrentScreen('main');
  };

  // const handleWorkComplete = () => {
  //   setCurrentScreen('main');
  //   setSelectedObject('');
  //   // Робота завершена через API в WorkCompletion
  // };

  const handleTodoListComplete = async (workData: WorkProcessEndOut) => {
    // Зберігаємо дані завершення роботи
    setWorkSummaryData(workData);
    setCurrentScreen('summary');
  };

  const handleSummaryComplete = () => {
    // Очищаємо дані після перегляду підсумків
    setWorkSummaryData(null);
    setCurrentScreen('main');
    setSelectedObject('');
  };


  const handleShowHistory = () => {
    setCurrentScreen('history');
  };

  const handleHistoryBack = () => {
    setCurrentScreen('main');
  };

  switch (currentScreen) {
    case 'todo': {
      return (
        <TodoList
          onComplete={handleTodoListComplete}
          onBack={handleTodoListBack}
          facilityId={selectedObject ? Number(selectedObject) : null}
          facilityTypeId={facilities.find(f => f.id.toString() === selectedObject)?.facility_type_id ?? null}
        />
      );
    }

    case 'summary':
      return workSummaryData ? (
        <WorkSummary
          workData={workSummaryData}
          onComplete={handleSummaryComplete}
        />
      ) : null;

    case 'history':
      return (
        <WorkHistory onBack={handleHistoryBack} />
      );

    default:
      return (
        <WorkMain
          onStartWork={handleStartWork}
          onStopWork={handleStopWork}
          selectedObject={selectedObject}
          onObjectSelect={handleObjectSelect}
          onShowHistory={handleShowHistory}
        />
      );
  }
};

export default Work;