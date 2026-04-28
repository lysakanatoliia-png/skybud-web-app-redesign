import { FC } from 'react';

const ContentPreloader: FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-700 border-opacity-75"></div>
    </div>
  );
};

export default ContentPreloader;
