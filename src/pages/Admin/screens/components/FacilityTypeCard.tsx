import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { FacilityTypeOut } from '@/requests/facility-type/types';

interface FacilityTypeCardProps {
  facilityType: FacilityTypeOut;
  onEdit: (facilityType: FacilityTypeOut) => void;
  onDelete: (facilityType: FacilityTypeOut) => void;
}

const FacilityTypeCard: React.FC<FacilityTypeCardProps> = ({
  facilityType,
  onEdit,
  onDelete,
}) => {

  return (
    <Card className="bg-theme-bg-card border-theme-border hover:border-theme-accent transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-2">
              {facilityType.name}
            </h3>
            {facilityType.description && (
              <p className="text-sm text-theme-text-muted leading-relaxed">
                {facilityType.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-theme-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(facilityType)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(facilityType)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FacilityTypeCard;
