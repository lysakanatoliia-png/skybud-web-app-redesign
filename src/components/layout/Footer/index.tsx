import { FC } from 'react';
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import pageRoutes from "../../../consts/pageRoutes.ts";
import { Hammer, DollarSign, Settings, Image } from "lucide-react";

const Footer: FC = () => {
  const location = useLocation();
  const user = useSelector((state: any) => state.data.user);
  const { t } = useTranslation();

  const footerLinks = [
    { name: t('footer.work', 'Work'), route: pageRoutes.WORK, icon: Hammer },
    { name: t('footer.salary', 'Salary'), route: pageRoutes.SALARY, icon: DollarSign },
  ];

  if (user?.worker_type === "admin") {
    footerLinks.push({ name: t('footer.admin', 'Admin'), route: pageRoutes.ADMIN, icon: Settings });
  }
  if (user?.worker_type === "smm") {
    footerLinks.push({ name: t('footer.smm', 'SMM'), route: pageRoutes.SMM_CONTENT, icon: Image });
  }

  return (
    <footer style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      zIndex: 50,
      padding: "0 0 env(safe-area-inset-bottom, 0)",
    }}>
      {/* Glass background */}
      <div style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid var(--color-border)",
        height: "var(--footer-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 8px",
        maxWidth: "480px",
        margin: "0 auto",
      }}>
        {footerLinks.map((link) => {
          const isActive = location.pathname === link.route;
          const Icon = link.icon;
          return (
            <Link
              key={link.route}
              to={link.route}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                flex: 1,
                padding: "8px 4px",
                textDecoration: "none",
                position: "relative",
                transition: "opacity var(--transition-fast)",
              }}
            >
              {/* Active pill indicator */}
              {isActive && (
                <span style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 32,
                  height: 3,
                  borderRadius: "0 0 3px 3px",
                  background: "var(--color-orange)",
                }} />
              )}

              {/* Icon container */}
              <span style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? "var(--color-orange-bg)" : "transparent",
                transition: "background var(--transition-fast)",
              }}>
                <Icon
                  size={20}
                  color={isActive ? "var(--color-orange)" : "var(--color-text-muted)"}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
              </span>

              {/* Label */}
              <span style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--color-orange)" : "var(--color-text-muted)",
                letterSpacing: "0.01em",
                lineHeight: 1,
                transition: "color var(--transition-fast)",
              }}>
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>
    </footer>
  );
};

export default Footer;
