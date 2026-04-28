import { FC } from 'react';
import styles from "./Preloader.module.scss";
import classNames from "classnames";

const Preloader: FC = () => {
  return (
    <div className={classNames("w-screen h-screen fixed z-[999]", styles.preloader)}>
    </div>
  );
};

export default Preloader;
