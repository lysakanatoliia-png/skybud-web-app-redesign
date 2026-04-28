import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FacilityOut } from '@/requests/facility/types';
import { WorkerOut } from '@/requests/worker/types';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  facilityFilter: string;
  onFacilityChange: (value: string) => void;
  workerFilter: string;
  onWorkerChange: (value: string) => void;
  facilities: FacilityOut[];
  workers: WorkerOut[];
  onClearFilters: () => void;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  facilityFilter,
  onFacilityChange,
  workerFilter,
  onWorkerChange,
  facilities,
  workers,
  onClearFilters,
}) => {
  const { t } = useTranslation();

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || facilityFilter !== 'all' || workerFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-muted" />
        <Input
          placeholder={t('admin.tasks.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.tasks.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.tasks.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('admin.tasks.statusOptions.pending')}</SelectItem>
            <SelectItem value="finished">{t('admin.tasks.statusOptions.finished')}</SelectItem>
            <SelectItem value="overdue">{t('admin.tasks.statusOptions.overdue')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={facilityFilter} onValueChange={onFacilityChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.tasks.filterByFacility')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.tasks.allFacilities')}</SelectItem>
            {facilities.map((facility) => (
              <SelectItem key={facility.id} value={facility.id.toString()}>
                {facility.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={workerFilter} onValueChange={onWorkerChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.tasks.filterByWorker')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.tasks.allWorkers')}</SelectItem>
            <SelectItem value="unassigned">{t('admin.tasks.unassigned')}</SelectItem>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id.toString()}>
                {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-theme-text-muted hover:text-theme-text-primary"
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('admin.tasks.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
