import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  label,
  icon = <Plus className="h-5 w-5" />
}) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary shadow-lg hover:bg-primary/90 z-50"
      size="icon"
      aria-label={label}
    >
      {icon}
    </Button>
  );
};

export default FloatingActionButton;
