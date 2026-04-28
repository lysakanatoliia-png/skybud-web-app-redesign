import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { Edit, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { WorkTaskOut } from '@/requests/work-task/types';
import { FacilityOut } from '@/requests/facility/types';
import { WorkerOut } from '@/requests/worker/types';

interface TaskCardProps {
  task: WorkTaskOut;
  facilities: FacilityOut[];
  workers: WorkerOut[];
  onEdit: (task: WorkTaskOut) => void;
  onDelete: (task: WorkTaskOut) => void;
  onToggleFinished: (task: WorkTaskOut) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  facilities,
  workers,
  onEdit,
  onDelete,
  onToggleFinished,
}) => {
  const { t } = useTranslation();

  const getStatusBadge = (finished: boolean | null, expiresAt: string | null) => {
    if (finished === true) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('admin.tasks.statusOptions.finished')}
        </Badge>
      );
    }

    if (expiresAt) {
      const now = new Date();
      const expires = new Date(expiresAt);
      const isOverdue = now > expires;

      if (isOverdue) {
        return (
          <Badge className="bg-red-500 text-white">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('admin.tasks.statusOptions.overdue')}
          </Badge>
        );
      }

      return (
        <Badge className="bg-yellow-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          {t('admin.tasks.statusOptions.pending')}
        </Badge>
      );
    }

    return (
      <Badge className="bg-gray-500 text-white">
        <Clock className="h-3 w-3 mr-1" />
        {t('admin.tasks.statusOptions.pending')}
      </Badge>
    );
  };

  const getFacilityName = (facilityId: number | null) => {
    if (!facilityId) return t('admin.tasks.unassigned');
    const facility = facilities.find(f => f.id === facilityId);
    return facility?.name || t('admin.tasks.unknownFacility');
  };

  const getWorkerName = (workerId: number | null) => {
    if (!workerId) return t('admin.tasks.unassigned');
    const worker = workers.find(w => w.id === workerId);
    return worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker' : t('admin.tasks.unknownWorker');
  };

  const formatDate = (dateString: string) => {
    // Map i18n language codes to locale strings for date formatting
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-theme-bg-card border-theme-border hover:border-theme-accent transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-theme-text-primary text-sm leading-relaxed mb-2">
              {task.text}
            </p>
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(task.finished, task.expires_at)}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-theme-text-muted">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t('admin.tasks.facility')}:</span>
            <span>{getFacilityName(task.facility_id)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium">{t('admin.tasks.worker')}:</span>
            <span>{getWorkerName(task.worker_id)}</span>
          </div>

          {task.expires_at && (
            <div className="flex items-center gap-2">
              <span className="font-medium">{t('admin.tasks.expiresAt')}:</span>
              <span>{formatDate(task.expires_at)}</span>
            </div>
          )}

          {task.photo_url && (
            <div className="flex items-center gap-2">
              <span className="font-medium">{t('admin.tasks.photo')}:</span>
              <span className="text-theme-accent">✓ {t('admin.tasks.photoAttached')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-theme-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleFinished(task)}
            className={task.finished ? "text-gray-500" : "text-theme-accent hover:text-theme-accent-hover"}
          >
            {task.finished ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                {t('admin.tasks.markPending')}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('admin.tasks.markFinished')}
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(task)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
