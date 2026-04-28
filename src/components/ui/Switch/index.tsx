import {FC, useEffect, useState} from 'react';
import classNames from 'classnames';

type SwitchOption = {
  title: string;
  isActive: boolean;
}

type Props = {
  options: SwitchOption[];
  className?: string;
  disabled?: boolean;
  onChange?: (options: SwitchOption[]) => void;
}

const Switch: FC<Props> = ({ options, className, onChange }) => {
  const [tabs, setTabs] = useState(options);

  useEffect(() => {
    setTabs(options);
  }, [options]);

  const handleTabClick = (index: number) => {
    const updatedTabs = tabs.map((tab, i) => ({ ...tab, isActive: i === index }));
    setTabs(updatedTabs);
    onChange && onChange(updatedTabs);
  };

  return (
    <>
      <div className={classNames(`w-full h-8 grid grid-cols-${String(options.length)} bg-element rounded-md p-[2px]`, className)}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabClick(index)}
            className={classNames("flex-auto flex text-center items-center justify-center rounded-md", tab?.isActive ? "bg-secondary" : "")}
          >
            {tab.title}
          </button>
        ))}
      </div>
    </>
  );
};

export default Switch;
