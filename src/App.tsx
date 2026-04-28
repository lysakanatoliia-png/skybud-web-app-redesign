import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import routes from "./consts/pageRoutes";
import Footer from "./components/layout/Footer";
import ApiEnvironmentSwitcher from "./components/layout/ApiEnvironmentSwitcher";
import MockModeSwitcher from "./components/layout/MockModeSwitcher";
import {useEffect, useState} from "react";
import useInitialFetching from "./hooks/useInitialFetching.ts";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import Work from "./pages/Work";
import Salary from "./pages/Salary";
import Admin from "./pages/Admin";
import LoginForm from "./pages/Auth/LoginForm";
import RegisterForm from "./pages/Auth/RegisterForm";
import Facilities from "./pages/Admin/screens/Facilities";
import FacilityTypes from "./pages/Admin/screens/FacilityTypes";
import Workers from "./pages/Admin/screens/Workers";
import Tasks from "./pages/Admin/screens/Tasks";
import WorkProcesses from "./pages/Admin/screens/WorkProcesses";
import VehicleReservations from "./pages/Admin/screens/VehicleReservations";
import VehicleManagement from "./pages/Admin/screens/VehicleManagement";
import RoutesPage from "./pages/Routes";
import RouteResultScreen from "@/pages/Routes/components/RouteResultScreen";
import InfoRoad from "./pages/InfoRoad";
import QuestionnairePage from "./pages/Questionnaire";
import StopReasonPage from "./pages/StopReason";
import SmmContent from "./pages/SmmContent";

function App() {
  const [, setIsLoading] = useState(true);
  const isDataLoaded = useInitialFetching();
  const location = useLocation();
  const isAuthenticated = useSelector((state: any) => state.data.isAuthenticated);
  const user = useSelector((state: any) => state.data.user);
  
  useTelegramWebApp();

  useEffect(() => {
    if (isDataLoaded) {
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    }
  }, [isDataLoaded]);

  const isAuthPage = location.pathname === '/register' || location.pathname === '/login';
  const isRoutesPage = location.pathname.startsWith('/routes');
  const isInfoRoadPage = location.pathname.startsWith('/inforoad');
  const isQuestionnairePage = location.pathname.startsWith('/questionnaire');
  const isStopReasonPage = location.pathname.startsWith('/stop-reason');

  const loadingFallback = (
    <div className="p-6 text-theme-text-muted text-center">loading…</div>
  );

  const renderProtected = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (isAuthenticated ? element : <Navigate to="/login" replace />)
  );

  const renderAdminOnly = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (isAuthenticated && user?.worker_type === "admin" ? element : <Navigate to="/" replace />)
  );

  const renderPublicOnly = (element: JSX.Element) => (
    !isDataLoaded ? loadingFallback : (!isAuthenticated ? element : <Navigate to="/" replace />)
  );

  return (
    <div className={"App"}>
      {/*{isLoading && <Preloader />}*/}
      <main>
        <Routes>
          <Route 
            path={routes.WORK} 
            element={renderProtected(<Work />)} 
          />
          <Route 
            path={routes.ROUTES} 
            element={renderProtected(<RoutesPage />)} 
          />
          <Route 
            path={"/routes/result"}
            element={renderProtected(<RouteResultScreen />)}
          />
          <Route 
            path={routes.SALARY} 
            element={renderProtected(<Salary />)} 
          />
          <Route 
            path={routes.ADMIN} 
            element={renderAdminOnly(<Admin />)} 
          />
          <Route 
            path={routes.ADMIN_FACILITIES} 
            element={renderAdminOnly(<Facilities />)} 
          />
          <Route 
            path={routes.ADMIN_FACILITY_TYPES} 
            element={renderAdminOnly(<FacilityTypes />)} 
          />
          <Route 
            path={routes.ADMIN_WORKERS} 
            element={renderAdminOnly(<Workers />)} 
          />
          <Route 
            path={routes.ADMIN_TASKS} 
            element={renderAdminOnly(<Tasks />)} 
          />
          <Route 
            path={routes.ADMIN_WORK_PROCESSES} 
            element={renderAdminOnly(<WorkProcesses />)} 
          />
          <Route 
            path={routes.ADMIN_VEHICLE_RESERVATIONS} 
            element={renderAdminOnly(<VehicleReservations />)} 
          />
          <Route 
            path={routes.ADMIN_VEHICLE_MANAGEMENT} 
            element={renderAdminOnly(<VehicleManagement />)} 
          />
          <Route 
            path="/login" 
            element={renderPublicOnly(<LoginForm />)} 
          />
          <Route 
            path={routes.REGISTER} 
            element={renderPublicOnly(<RegisterForm />)} 
          />
          <Route 
            path={routes.INFO_ROAD} 
            element={<InfoRoad />} 
          />
          <Route 
            path={routes.QUESTIONNAIRE} 
            element={<QuestionnairePage />} 
          />
          <Route 
            path={routes.STOP_REASON} 
            element={<StopReasonPage />} 
          />
          <Route 
            path={routes.SMM_CONTENT} 
            element={renderProtected(<SmmContent />)} 
          />
        </Routes>
      </main>

      {!isAuthPage && !isRoutesPage && !isInfoRoadPage && !isQuestionnairePage && !isStopReasonPage && <Footer />}
      <ApiEnvironmentSwitcher />
      <MockModeSwitcher />
    </div>
  )
}

export default App
