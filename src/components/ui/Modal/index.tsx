import { FC, ReactNode } from "react";

interface ModalProps {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isVisible, setIsVisible, children }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setIsVisible(false)}
    >
      <div
        className="bg-element rounded-lg shadow-[12px] px-5 py-9 w-full max-w-md relative text-[20px] font-medium text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
