import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import routes from '@/consts/pageRoutes';
import useBackButton from '@/hooks/useBackButton';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { getFacilityTypes, createFacilityType, updateFacilityType, deleteFacilityType } from '@/requests/facility-type';
import { FacilityTypeOut, FacilityTypeCreate, FacilityTypeUpdate } from '@/requests/facility-type/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import FacilityTypeForm from './components/FacilityTypeForm';
import FacilityTypeCard from './components/FacilityTypeCard';

const FacilityTypes: React.FC = () => {
  const { t } = useTranslation();
  useBackButton(routes.ADMIN);
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFacilityType, setEditingFacilityType] = useState<FacilityTypeOut | null>(null);
  const [deletingFacilityType, setDeletingFacilityType] = useState<FacilityTypeOut | null>(null);

  // Query
  const { data: facilityTypes = [], isLoading } = useQuery({
    queryKey: ['facility-types'],
    queryFn: async () => {
      const response = await getFacilityTypes();
      if (response.error) {
        toastError('Failed to load facility types');
        return [];
      }
      return response.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: FacilityTypeCreate) => {
      const response = await createFacilityType(data);
      if (response.error) {
        throw new Error('Failed to create facility type');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      toastSuccess(t('admin.facilityTypes.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.facilityTypes.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FacilityTypeUpdate }) => {
      const response = await updateFacilityType(id, data);
      if (response.error) {
        throw new Error('Failed to update facility type');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      toastSuccess(t('admin.facilityTypes.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingFacilityType(null);
    },
    onError: () => {
      toastError(t('admin.facilityTypes.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteFacilityType(id);
      if (response.error) {
        throw new Error('Failed to delete facility type');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      toastSuccess(t('admin.facilityTypes.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingFacilityType(null);
    },
    onError: () => {
      toastError(t('admin.facilityTypes.deleteError'));
    },
  });

  // Handlers
  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: any) => {
    if (!editingFacilityType) return;
    updateMutation.mutate({ id: editingFacilityType.id, data });
  };

  const handleDelete = () => {
    if (deletingFacilityType) {
      deleteMutation.mutate(deletingFacilityType.id);
    }
  };

  const openEditDialog = (facilityType: FacilityTypeOut) => {
    setEditingFacilityType(facilityType);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (facilityType: FacilityTypeOut) => {
    setDeletingFacilityType(facilityType);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="page min-h-screen bg-theme-bg-primary p-4">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-center h-64">
            <div className="text-theme-text-secondary text-lg">{t('common.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-4">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.facilityTypes.title')}</h1>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('common.create')}
          </Button>
        </div>

        {/* Facility Types List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilityTypes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-theme-text-muted text-lg">{t('admin.facilityTypes.noFacilityTypes')}</p>
            </div>
          ) : (
            facilityTypes.map((facilityType) => (
              <FacilityTypeCard
                key={facilityType.id}
                facilityType={facilityType}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            ))
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('admin.facilityTypes.createTitle')}</DialogTitle>
            </DialogHeader>
            <FacilityTypeForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('admin.facilityTypes.edit')}</DialogTitle>
            </DialogHeader>
            <FacilityTypeForm
              onSubmit={handleEdit}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingFacilityType(null);
              }}
              isLoading={updateMutation.isPending}
              submitLabel={t('common.update')}
              defaultValues={editingFacilityType ? {
                name: editingFacilityType.name || '',
                description: editingFacilityType.description || '',
              } : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingFacilityType(null);
          }}
          onConfirm={handleDelete}
          title={t('admin.facilityTypes.deleteTitle')}
          description={t('admin.facilityTypes.deleteDescription')}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
};

export default FacilityTypes;