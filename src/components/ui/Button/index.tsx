import React, {FC} from 'react';
import classNames from "classnames";

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  variant?: "small";
}

const Button: FC<Props> = ({ children, style,  className, onClick, variant }) => {
  return (
    <button onClick={onClick} style={style} className={classNames(
      "py-2 px-6 rounded-[10px] bg-secondary font-medium text-[15px1]",
      variant === "small" ? "py-[6px] px-[12px] text-[15px] rounded-[10px]" : "",
      className,
    )}>
      {children}
    </button>
  );
};

export default Button;