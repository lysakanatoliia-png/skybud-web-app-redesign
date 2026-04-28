// MOCK режим: пропускає Telegram-автентифікацію, відразу встановлює mock-користувача.
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { setUser } from "../store/slice";
import { getCurrentUser, mockStore } from "../mocks/store";
import { sleep } from "../mocks/delay";

const useInitialFetching = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const bootstrap = async () => {
      await sleep(150);

      const saved = localStorage.getItem("mock_user_id");
      if (saved) {
        const id = parseInt(saved, 10);
        if (!isNaN(id) && mockStore.workers.some((w) => w.id === id)) {
          mockStore.currentUserId = id;
        }
      }

      const user = getCurrentUser();
      if (user) {
        localStorage.setItem("botApiWorkerId", String(user.id));
        dispatch(setUser(user));
      }

      setIsLoaded(true);
    };

    bootstrap();
  }, [dispatch]);

  return isLoaded;
};

export default useInitialFetching;
