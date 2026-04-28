import { useEffect, useRef } from 'react';
import { ToastContentProps } from 'react-toastify';

interface SwipeableToastProps extends ToastContentProps {
  message: string;
}

export const SwipeableToast = ({ closeToast, message }: SwipeableToastProps) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    const element = toastRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      isDragging.current = true;
      element.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      currentX.current = e.touches[0].clientX - startX.current;
      
      // Only allow swiping left (negative values)
      if (currentX.current < 0) {
        element.style.transform = `translateX(${currentX.current}px)`;
        element.style.opacity = `${1 + currentX.current / 200}`;
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

      // If swiped more than 100px to the left, close the toast
      if (currentX.current < -100) {
        element.style.transform = 'translateX(-100%)';
        element.style.opacity = '0';
        setTimeout(() => {
          closeToast();
        }, 300);
      } else {
        // Snap back
        element.style.transform = 'translateX(0)';
        element.style.opacity = '1';
      }
      
      currentX.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [closeToast]);

  return (
    <div ref={toastRef} style={{ touchAction: 'pan-y' }}>
      {message}
    </div>
  );
};

