import { createRoot } from 'react-dom/client';
import './styles/globals.scss';
import './i18n/config';
import './lib/utils'; // Initialize Telegram override utilities
import './lib/logger'; // Initialize logger utilities
import './lib/webappLogger'; // Initialize WebApp logger for backend integration
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from "react-redux";
import store from "./store/config.ts";
import {ToastContainer} from 'react-toastify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover={false}
          theme="dark"
        />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </Provider>
);
