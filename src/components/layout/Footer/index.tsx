import { FC } from 'react';
import {Link, useLocation} from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import pageRoutes from "../../../consts/pageRoutes.ts";
import styles from "./Footer.module.scss";
import classNames from "classnames";
import {Hammer, DollarSign, Settings, Image } from "lucide-react";
import LanguageSwitcher from "../LanguageSwitcher";

const Footer: FC = () => {
  const location = useLocation();
  const user = useSelector((state: any) => state.data.user);
  const { t } = useTranslation();

  const footerLinks = [
    {
      name: t('footer.work', 'Work'),
      route: pageRoutes.WORK,
      icon: <Hammer />
    },
    {
      name: t('footer.salary', 'Salary'),
      route: pageRoutes.SALARY,
      icon: <DollarSign />
    },
  ];

  if (user?.worker_type === "admin") {
    footerLinks.push({
      name: t('footer.admin', 'Admin'),
      route: pageRoutes.ADMIN,
      icon: <Settings />
    });
  }

  if (user?.worker_type === "smm") {
    footerLinks.push({
      name: t('footer.smm', 'SMM'),
      route: pageRoutes.SMM_CONTENT,
      icon: <Image />
    });
  }

  return (
    <footer className={classNames(styles.footer, "bg-bg")}>
      <div className={styles.footerContent}>
        <nav className={styles.pageLinks}>
          {footerLinks.map((link, index) => (
            <Link
              key={index}
              className={classNames(styles.pageLink, location.pathname === link.route ? styles.active : "")}
              to={link.route}
            >
              { link.icon }
              <p>{link.name}</p>
            </Link>
          ))}
        </nav>
        <div className={styles.languageSwitcher}>
          <LanguageSwitcher/>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
