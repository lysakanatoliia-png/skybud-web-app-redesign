import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import i18n from '@/i18n/config';
import { CalendarClock, MapPin, PlayCircle, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ImageViewer from '@/components/ui/ImageViewer';
import { getWorkProcesses } from '@/requests/work';
import { WorkProcessEndOut, WorkProcessStartOut } from '@/requests/work/types';
import { toastError } from '@/lib/toasts';
import useBackButton from '@/hooks/useBackButton';

type Process = WorkProcessStartOut | WorkProcessEndOut;

const PAGE_SIZE = 10;

const isEndedProcess = (process: Process): process is WorkProcessEndOut => {
  return 'end_time' in process;
};

interface WorkHistoryProps {
  onBack: () => void;
}

const WorkHistory: FC<WorkHistoryProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [page, setPage] = useState(1);

  useBackButton(onBack);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      const response = await getWorkProcesses({
        worker_id: user.id,
        limit: 100,
        offset: 0,
      });

      if (!isMounted) {
        return;
      }

      if (response.error) {
        setHasError(true);
        toastError(t('admin.workProcesses.loadError'));
        setProcesses([]);
      } else {
        setProcesses(response.data || []);
        setPage(1);
      }

      setIsLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user?.id, t]);

  const activeProcesses = useMemo(() => {
    return processes
      .filter((process): process is WorkProcessStartOut => !isEndedProcess(process))
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [processes]);

  const endedProcesses = useMemo(() => {
    return processes
      .filter(isEndedProcess)
      .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
  }, [processes]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(endedProcesses.length / PAGE_SIZE));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, endedProcesses.length]);

  const pagination = useMemo(() => {
    const total = endedProcesses.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const to = total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);
    const items = endedProcesses.slice((currentPage - 1) * PAGE_SIZE, (currentPage - 1) * PAGE_SIZE + PAGE_SIZE);
    return { items, currentPage, totalPages, from, to, total };
  }, [endedProcesses, page]);

  const handlePrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(pagination.totalPages, prev + 1));
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }

    // Map i18n language codes to locale strings for date formatting
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';

    return date.toLocaleString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDuration = (process: WorkProcessEndOut) => {
    const start = new Date(process.start_time).getTime();
    const end = new Date(process.end_time).getTime();
    const fallbackSeconds = process.work_time ?? null;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      if (!fallbackSeconds) {
        return null;
      }

      return buildDurationFromSeconds(fallbackSeconds);
    }

    const diffSeconds = Math.max(0, Math.round((end - start) / 1000));
    return buildDurationFromSeconds(diffSeconds || fallbackSeconds || 0);
  };

  const buildDurationFromSeconds = (seconds: number | null) => {
    if (!seconds || seconds <= 0) {
      return null;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return { hours, minutes };
  };

  const renderActiveProcess = (process: WorkProcessStartOut) => {
    const facilityName = process.facility?.name || t('work.unnamedObject');

    return (
      <Card key={process.id} className="p-6 bg-theme-bg-card border-theme-border">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <span className="text-base text-theme-text-muted font-medium">#{process.id}</span>
          <span className="text-2xl font-semibold text-theme-text-primary">{facilityName}</span>
        </div>
        <div className="space-y-3 text-lg text-theme-text-secondary">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5" />
            <span>
              {t('work.history.start')}: {formatDateTime(process.start_time)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5" />
            <span>
              {process.start_latitude.toFixed(5)}, {process.start_longitude.toFixed(5)}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  const renderEndedProcess = (process: WorkProcessEndOut) => {
    const isOfficeWorker = process.facility_id === null;
    const facilityName = isOfficeWorker 
      ? `${t('work.workPlace')}: ${t('work.office')}`
      : (process.facility?.name || t('work.unnamedObject'));
    const duration = getDuration(process);

    return (
      <Card key={process.id} className="p-6 bg-theme-bg-card border-theme-border space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-base text-theme-text-muted font-medium">#{process.id}</span>
          <span className="text-2xl font-semibold text-theme-text-primary">{facilityName}</span>
          <span
            className={`text-sm font-semibold px-3 py-1.5 rounded ${
              isOfficeWorker
                ? 'bg-green-500/10 text-green-400'
                : (process.status_object_finished
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-yellow-500/10 text-yellow-400')
            }`}
          >
            {isOfficeWorker
              ? t('work.workDayEnded')
              : (process.status_object_finished
                  ? t('admin.workProcesses.badges.finished')
                  : t('admin.workProcesses.badges.notFinished'))}
          </span>
          {process.summary_rate !== null && (
            <span className="ml-auto text-base font-semibold px-3 py-1.5 rounded bg-theme-bg-tertiary text-theme-text-secondary border border-theme-border">
              {t('admin.workProcesses.fields.salary')}: {Number(process.summary_rate).toFixed(2)}€
            </span>
          )}
        </div>

        <div className="space-y-3 text-lg text-theme-text-secondary">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5" />
            <span>
              {t('work.history.period')}: {formatDateTime(process.start_time)} → {formatDateTime(process.end_time)}
            </span>
          </div>
          {duration && (
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" />
              <span>
                {t('work.history.duration')}: {t('work.history.durationValue', {
                  hours: duration.hours,
                  minutes: duration.minutes,
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5" />
            <span>
              {process.end_latitude.toFixed(5)}, {process.end_longitude.toFixed(5)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Фото - только для работников с объектами */}
          {!isOfficeWorker && (
            <div>
              <div className="text-lg font-semibold text-theme-text-primary mb-3">{t('work.history.photos')}</div>
              {process.done_work_photos_url?.length || process.instrument_photos_url?.length ? (
                <ImageViewer
                  images={[...(process.done_work_photos_url || []), ...(process.instrument_photos_url || [])]}
                />
              ) : (
                <div className="text-base text-theme-text-muted">{t('work.history.noPhotos')}</div>
              )}
            </div>
          )}

          {/* Видео - только для работников с объектами */}
          {!isOfficeWorker && process.report_video_url && (
            <Button
              asChild
              variant="default"
              size="lg"
              className="w-full sm:w-auto text-lg font-semibold gap-3"
            >
              <a href={process.report_video_url} target="_blank" rel="noreferrer">
                <PlayCircle className="h-6 w-6" />
                {t('work.history.reportVideo')}
              </a>
            </Button>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-theme-border bg-theme-bg-secondary p-5">
              <div className="text-lg font-semibold text-theme-text-primary mb-3">{t('work.history.tasks')}</div>
              {process.tasks && process.tasks.length > 0 ? (
                <ul className="space-y-3 text-base text-theme-text-secondary">
                  {process.tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2">
                      <span className={`mt-1 h-3 w-3 rounded-full ${task.finished ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      <span>{task.text || '-'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-base text-theme-text-muted">{t('work.history.noTasks')}</div>
              )}
            </div>

            <div className="rounded-xl border border-theme-border bg-theme-bg-secondary p-5">
              <div className="text-lg font-semibold text-theme-text-primary mb-3">{t('work.history.comments')}</div>
              {process.comments && process.comments.length > 0 ? (
                <ul className="space-y-3 text-base text-theme-text-secondary">
                  {process.comments.map((comment) => (
                    <li key={comment.id}>{comment.text || '-'}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-base text-theme-text-muted">{t('work.history.noComments')}</div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="space-y-2 md:text-right">
            <h1 className="text-4xl font-bold text-theme-text-primary">{t('work.history.title')}</h1>
          </div>
        </div>

        {isLoading && (
          <div className="text-theme-text-muted text-lg">{t('common.loading')}</div>
        )}

        {!isLoading && hasError && (
          <div className="text-theme-error text-lg mb-6">{t('admin.workProcesses.loadError')}</div>
        )}

        {!isLoading && !hasError && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-theme-text-primary mb-3">{t('work.history.activeSection')}</h2>
              {activeProcesses.length > 0 ? (
                <div className="space-y-4">
                  {activeProcesses.map(renderActiveProcess)}
                </div>
              ) : (
                <div className="text-theme-text-muted text-base">{t('work.history.noActive')}</div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-theme-text-primary mb-3">{t('work.history.completedSection')}</h2>
              {pagination.total > 0 ? (
                <div className="space-y-4">
                  {pagination.items.map(renderEndedProcess)}
                  {pagination.total > PAGE_SIZE && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-theme-border bg-theme-bg-card/60 rounded-xl p-4">
                      <span className="text-base text-theme-text-secondary">
                        {t('work.history.paginationRange', {
                          from: pagination.from,
                          to: pagination.to,
                          total: pagination.total,
                        })}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="outline"
                          size="lg"
                          className="text-base font-semibold px-5"
                          onClick={handlePrevPage}
                          disabled={pagination.currentPage === 1}
                        >
                          {t('work.history.paginationPrev')}
                        </Button>
                        <span className="text-base font-semibold text-theme-text-primary">
                          {t('work.history.paginationPage', {
                            page: pagination.currentPage,
                            pages: pagination.totalPages,
                          })}
                        </span>
                        <Button
                          variant="outline"
                          size="lg"
                          className="text-base font-semibold px-5"
                          onClick={handleNextPage}
                          disabled={pagination.currentPage === pagination.totalPages}
                        >
                          {t('work.history.paginationNext')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-theme-text-muted text-base">{t('work.history.noCompleted')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkHistory;

