import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { CheckCircle, Clock, DollarSign, Coffee, Zap, Calendar } from 'lucide-react';
import { WorkProcessEndOut } from '../../../requests/work/types';

interface WorkSummaryProps {
  workData: WorkProcessEndOut;
  onComplete: () => void;
}

const WorkSummary: FC<WorkSummaryProps> = ({ workData, onComplete }) => {
  const { t } = useTranslation();

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number | null): string => {
    if (!amount) return '0 €';
    return `${amount.toFixed(2)} €`;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    // Map i18n language codes to locale strings for date formatting
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const summaryCards = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: t('work.workTime'),
      value: formatTime(workData.work_time),
      color: 'text-blue-500'
    },
    {
      icon: <Coffee className="h-6 w-6" />,
      title: t('work.lunchTime'),
      value: formatTime(workData.lunch_time),
      color: 'text-green-500'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: t('work.overtimeTime'),
      value: formatTime(workData.overtime_time),
      color: 'text-orange-500'
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: t('work.summaryRate'),
      value: formatCurrency(workData.summary_rate),
      color: 'text-green-500'
    }
  ];

  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-theme-accent/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-theme-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
            {t('work.workDayCompleted')}
          </h1>
          <p className="text-theme-text-secondary text-lg">
            {t('work.congratulationsMessage')}
          </p>
        </div>

        {/* Work Period */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 text-theme-accent" />
            <h2 className="text-xl font-semibold text-theme-text-primary">
              {t('work.workPeriod')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-theme-bg-tertiary rounded-lg p-4">
              <div className="text-sm text-theme-text-muted mb-1">
                {t('work.startTime')}
              </div>
              <div className="text-theme-text-primary font-medium">
                {formatDateTime(workData.start_time)}
              </div>
            </div>
            <div className="bg-theme-bg-tertiary rounded-lg p-4">
              <div className="text-sm text-theme-text-muted mb-1">
                {t('work.endTime')}
              </div>
              <div className="text-theme-text-primary font-medium">
                {formatDateTime(workData.end_time)}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {summaryCards.map((card, index) => (
            <div key={index} className="bg-theme-bg-card border border-theme-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={card.color}>
                  {card.icon}
                </div>
                <div className="text-sm text-theme-text-muted">
                  {card.title}
                </div>
              </div>
              <div className="text-2xl font-bold text-theme-text-primary">
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-3">
            {t('work.workStatus')}
          </h3>
          <div className="flex items-center gap-3">
            {workData.facility_id === null ? (
              // Для офисных работников - всегда зеленый статус "Рабочий день окончен"
              <>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-theme-text-primary">
                  {t('work.workDayEnded')}
                </span>
              </>
            ) : (
              // Для работников с объектами - статус зависит от status_object_finished
              <>
                <div className={`w-3 h-3 rounded-full ${workData.status_object_finished ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-theme-text-primary">
                  {workData.status_object_finished ? t('work.objectCompleted') : t('work.objectNotCompleted')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Complete Button */}
        <div className="text-center">
          <button
            onClick={onComplete}
            className="px-8 py-4 bg-theme-accent text-white rounded-xl text-lg font-semibold hover:bg-theme-accent-hover transition-colors shadow-lg hover:shadow-xl"
          >
            {t('work.returnToMain')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkSummary;
