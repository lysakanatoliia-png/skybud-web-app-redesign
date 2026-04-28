import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Building, Users, Link as LinkIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { FacilityOut } from '@/requests/facility/types';
import { FacilityTypeOut } from '@/requests/facility-type/types';

interface FacilityCardProps {
  facility: FacilityOut;
  facilityTypes: FacilityTypeOut[];
  onEdit: (facility: FacilityOut) => void;
  onDelete: (facility: FacilityOut) => void;
}

const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  facilityTypes,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  const getStatusBadge = (statusActive: boolean | null) => {
    if (statusActive === true) {
      return (
        <Badge className="bg-green-500 text-white">
          {t('admin.facilities.statusOptions.active')}
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500 text-white">
        {t('admin.facilities.statusOptions.inactive')}
      </Badge>
    );
  };

  const getFacilityTypeName = (facilityTypeId: number | null) => {
    if (!facilityTypeId) return t('admin.facilities.unknownType');
    const facilityType = facilityTypes.find(ft => ft.id === facilityTypeId);
    return facilityType?.name || t('admin.facilities.unknownType');
  };

  return (
    <Card className="bg-theme-bg-card border-theme-border hover:border-theme-accent transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-theme-text-primary">
                {facility.name}
              </h3>
              {getStatusBadge(facility.status_active)}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-theme-text-muted">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="font-medium">{t('admin.facilities.facilityType')}:</span>
            <span>{getFacilityTypeName(facility.facility_type_id)}</span>
          </div>

          {facility.group_id && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">{t('admin.facilities.groupId')}:</span>
              <span>{facility.group_id}</span>
            </div>
          )}

          {facility.invite_link && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span className="font-medium">{t('admin.facilities.inviteLink')}:</span>
              <a 
                href={facility.invite_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-theme-accent hover:text-theme-accent-hover truncate"
              >
                {facility.invite_link}
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-theme-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(facility)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(facility)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FacilityCard;
