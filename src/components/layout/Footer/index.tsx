import { FC } from 'react';
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import pageRoutes from "../../../consts/pageRoutes.ts";
import { Hammer, DollarSign, Receipt, HelpCircle, Car, Settings, Image } from "lucide-react";
import LanguageSwitcher from "../LanguageSwitcher/index.tsx";

const Footer: FC = () => {
  const location = useLocation();
  const user = useSelector((state: any) => state.data.user);
  const { t } = useTranslation();

  const mainTabs = [
    { name: t('footer.work', 'Робота'), route: pageRoutes.WORK, icon: Hammer },
    { name: t('footer.salary', 'Зарплата'), route: pageRoutes.SALARY, icon: DollarSign },
    { name: t('footer.expenses', 'Витрата'), route: pageRoutes.EXPENSES, icon: Receipt },
    { name: t('footer.help', 'Допомога'), route: pageRoutes.HELP, icon: HelpCircle },
    { name: t('footer.vehicleTransfer', 'Авто'), route: pageRoutes.VEHICLE_TRANSFER, icon: Car },
  ];

  const extraTabs: typeof mainTabs = [];
  if (user?.worker_type === "admin") {
    extraTabs.push({ name: t('footer.admin', 'Адмін'), route: pageRoutes.ADMIN, icon: Settings });
  }
  if (user?.worker_type === "smm") {
    extraTabs.push({ name: t('footer.smm', 'SMM'), route: pageRoutes.SMM_CONTENT, icon: Image });
  }

  const tabs = [...mainTabs, ...extraTabs];

  return (
    <footer style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      zIndex: 50,
      padding: `8px 16px calc(env(safe-area-inset-bottom, 0px) + 8px)`,
      pointerEvents: "none",
    }}>
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        gap: 8,
        pointerEvents: "auto",
      }}>
        {/* Floating pill nav */}
        <div style={{
          flex: 1,
          background: "rgba(18,18,22,0.88)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 4px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.route;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.route}
                to={tab.route}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  flex: 1,
                  padding: "6px 2px",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <span style={{
                  width: 38,
                  height: 28,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isActive ? "var(--color-orange-bg)" : "transparent",
                  boxShadow: isActive ? "0 0 14px rgba(249,115,22,0.25)" : "none",
                  transition: "all 0.2s ease",
                }}>
                  <Icon
                    size={18}
                    color={isActive ? "var(--color-orange)" : "rgba(255,255,255,0.4)"}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "var(--color-orange)" : "rgba(255,255,255,0.35)",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  transition: "color 0.2s ease",
                  whiteSpace: "nowrap",
                }}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Language switcher pill */}
        <div style={{
          background: "rgba(18,18,22,0.88)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
          flexShrink: 0,
        }}>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
