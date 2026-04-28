import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { Edit, Trash2, Mail, Phone, DollarSign, Calendar, Euro } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { WorkerOut } from '@/requests/worker/types';

interface WorkerCardProps {
  worker: WorkerOut;
  onEdit: (worker: WorkerOut) => void;
  onDelete: (worker: WorkerOut) => void;
  onAdjust?: (worker: WorkerOut) => void;
}

const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  onEdit,
  onDelete,
  onAdjust,
}) => {
  const { t } = useTranslation();

  const getTypeBadge = (type: string | null) => {
    if (!type) return null;
    
    const colors: Record<string, string> = {
      admin: 'bg-red-500',
      coder: 'bg-orange-500',
      manager: 'bg-blue-500',
      smm: 'bg-pink-500',
      worker: 'bg-gray-500',
      master: 'bg-green-500',
      head_of_sales: 'bg-purple-500',
      marketolog: 'bg-yellow-500',
      foreman: 'bg-indigo-500',
      engineer: 'bg-teal-500',
      assistant: 'bg-cyan-500',
    };
    return (
      <Badge className={`${colors[type as keyof typeof colors]} text-white`}>
        {t(`admin.workers.types.${type}`)}
      </Badge>
    );
  };

  const formatRate = (rate: number | null) => {
    if (!rate) return 'N/A';
    return `${rate.toFixed(2)} €`;
  };

  const formatDate = (dateString: string) => {
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
      year: 'numeric'
    });
  };

  return (
    <Card className="bg-theme-bg-card border-theme-border hover:border-theme-accent transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-theme-text-primary">
                {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
              </h3>
              {getTypeBadge(worker.worker_type)}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-theme-text-muted">
          {worker.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{worker.email}</span>
            </div>
          )}
          
          {worker.username && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>@{worker.username}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>{formatRate(worker.rate)}</span>
          </div>

          {worker.birthday && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(worker.birthday)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-theme-border">
          {onAdjust && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdjust(worker)}
              title={t('admin.adjustments.openDialog')}
            >
              <Euro className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(worker)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(worker)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerCard;
