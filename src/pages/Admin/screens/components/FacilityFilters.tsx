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

import { FacilityTypeOut } from '@/requests/facility-type/types';

interface FacilityFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  facilityTypes: FacilityTypeOut[];
  onClearFilters: () => void;
}

const FacilityFilters: React.FC<FacilityFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  facilityTypes,
  onClearFilters,
}) => {
  const { t } = useTranslation();

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-muted" />
        <Input
          placeholder={t('admin.facilities.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.facilities.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.facilities.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('admin.facilities.statusOptions.active')}</SelectItem>
            <SelectItem value="inactive">{t('admin.facilities.statusOptions.inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.facilities.filterByFacilityType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.facilities.allTypes')}</SelectItem>
            {facilityTypes.map((facilityType) => (
              <SelectItem key={facilityType.id} value={facilityType.id.toString()}>
                {facilityType.name}
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
            {t('admin.facilities.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default FacilityFilters;
