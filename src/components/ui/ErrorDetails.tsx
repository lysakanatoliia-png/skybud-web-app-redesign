import { FC, useState } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';

interface ErrorDetailsProps {
  title: string;
  message: string;
  details?: {
    status?: number;
    statusText?: string;
    code?: string;
    responseData?: any;
    requestData?: any;
    environment?: any;
  };
  onClose?: () => void;
}

export const ErrorDetails: FC<ErrorDetailsProps> = ({ 
  title, 
  message, 
  details,
  onClose 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const formatDetails = () => {
    if (!details) return null;

    const parts: string[] = [];

    if (details.status) {
      parts.push(`Статус: ${details.status} ${details.statusText || ''}`);
    }

    if (details.code) {
      parts.push(`Код ошибки: ${details.code}`);
    }

    if (details.responseData) {
      const responseStr = typeof details.responseData === 'string' 
        ? details.responseData 
        : JSON.stringify(details.responseData, null, 2);
      parts.push(`Ответ сервера: ${responseStr}`);
    }

    if (details.environment) {
      const envStr = JSON.stringify(details.environment, null, 2);
      parts.push(`Окружение: ${envStr}`);
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  };

  const formattedDetails = formatDetails();
  const handleCopyError = async () => {
    const parts = [
      `Ошибка: ${title}`,
      `Сообщение: ${message}`,
    ];
    if (details?.status) {
      parts.push(`HTTP: ${details.status} ${details.statusText || ''}`.trim());
    }
    if (details?.code) {
      parts.push(`Код: ${details.code}`);
    }
    if (details?.responseData) {
      const responseStr = typeof details.responseData === 'string'
        ? details.responseData
        : JSON.stringify(details.responseData, null, 2);
      parts.push(`Ответ: ${responseStr}`);
    }
    const text = parts.join('\n');
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // игнорируем ошибки буфера обмена
    }
  };

  return (
    <>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              {title}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              {message}
            </p>
            {formattedDetails && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Скрыть детали
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Показать детали ошибки
                    </>
                  )}
                </button>
                {showDetails && (
                  <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                    {formattedDetails}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2">
              <button
                onClick={handleCopyError}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Скопировать ошибку
              </button>
            </div>
            {details?.requestData && (
              <div className="mt-2">
                <button
                  onClick={() => setIsOpen(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                >
                  Показать данные запроса
                </button>
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали ошибки</DialogTitle>
            <DialogDescription>
              Подробная информация об ошибке для диагностики
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Сообщение об ошибке:</h4>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            {details?.status && (
              <div>
                <h4 className="font-semibold mb-2">HTTP статус:</h4>
                <p className="text-sm text-muted-foreground">
                  {details.status} {details.statusText || ''}
                </p>
              </div>
            )}
            {details?.code && (
              <div>
                <h4 className="font-semibold mb-2">Код ошибки:</h4>
                <p className="text-sm text-muted-foreground font-mono">
                  {details.code}
                </p>
              </div>
            )}
            {details?.responseData && (
              <div>
                <h4 className="font-semibold mb-2">Ответ сервера:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {typeof details.responseData === 'string'
                    ? details.responseData
                    : JSON.stringify(details.responseData, null, 2)}
                </pre>
              </div>
            )}
            {details?.requestData && (
              <div>
                <h4 className="font-semibold mb-2">Данные запроса:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(details.requestData, null, 2)}
                </pre>
              </div>
            )}
            {details?.environment && (
              <div>
                <h4 className="font-semibold mb-2">Окружение:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(details.environment, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

