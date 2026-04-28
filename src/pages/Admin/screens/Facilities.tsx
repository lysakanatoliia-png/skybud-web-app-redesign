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

import { getFacilities, createFacility, updateFacility, deleteFacility } from '@/requests/facility';
import { getFacilityTypes } from '@/requests/facility-type';
import { FacilityOut, FacilityCreate, FacilityUpdate } from '@/requests/facility/types';
// FacilityTypeOut is used in FacilityCard component
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import FacilityForm from './components/FacilityForm';
import FacilityCard from './components/FacilityCard';
import FacilityFilters from './components/FacilityFilters';
import { createFacilityBudget, updateFacilityBudget } from '@/requests/facility-budget';
import { FacilityBudgetCreate, FacilityBudgetUpdate } from '@/requests/facility-budget/types';

const Facilities: React.FC = () => {
  const { t } = useTranslation();
  useBackButton(routes.ADMIN);
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<FacilityOut | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<FacilityOut | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Queries
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await getFacilities();
      if (response.error) {
        toastError('Failed to load facilities');
        return [];
      }
      return response.data;
    },
  });

  const { data: facilityTypes = [] } = useQuery({
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
    mutationFn: async (data: FacilityCreate) => {
      const response = await createFacility(data);
      if (response.error) {
        throw new Error('Failed to create facility');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.facilities.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FacilityUpdate }) => {
      const response = await updateFacility(id, data);
      if (response.error) {
        throw new Error('Failed to update facility');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingFacility(null);
    },
    onError: () => {
      toastError(t('admin.facilities.updateError'));
    },
  });

  // Budget mutations
  const createBudgetMutation = useMutation({
    mutationFn: async (data: FacilityBudgetCreate) => {
      const response = await createFacilityBudget(data);
      if (response.error) {
        throw new Error('Failed to create facility budget');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.budget.createSuccess'));
    },
    onError: () => {
      toastError(t('admin.facilities.budget.createError'));
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FacilityBudgetUpdate }) => {
      const response = await updateFacilityBudget(id, data);
      if (response.error) {
        throw new Error('Failed to update facility budget');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.budget.updateSuccess'));
    },
    onError: () => {
      toastError(t('admin.facilities.budget.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteFacility(id);
      if (response.error) {
        throw new Error('Failed to delete facility');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingFacility(null);
    },
    onError: () => {
      toastError(t('admin.facilities.deleteError'));
    },
  });

  // Handlers
  const handleCreate = (data: any) => {
    const facilityData: FacilityCreate = {
      name: data.name,
      facility_type_id: parseInt(data.facility_type_id),
      status_active: data.status_active === 'true',
      group_id: data.group_id || null,
      invite_link: data.invite_link || null,
    };
    createMutation.mutate(facilityData);
  };

  const handleEdit = (data: any) => {
    if (!editingFacility) return;
    const facilityData: FacilityUpdate = {
      name: data.name,
      facility_type_id: parseInt(data.facility_type_id),
      status_active: data.status_active === 'true',
      group_id: data.group_id || null,
      invite_link: data.invite_link || null,
    };
    updateMutation.mutate({ id: editingFacility.id, data: facilityData });
  };

  const handleDelete = () => {
    if (deletingFacility) {
      deleteMutation.mutate(deletingFacility.id);
    }
  };

  const openEditDialog = (facility: FacilityOut) => {
    setEditingFacility(facility);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (facility: FacilityOut) => {
    setDeletingFacility(facility);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // Filter facilities
  const filteredFacilities = facilities.filter((facility) => {
    const matchesSearch = searchTerm === '' || (facility.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && facility.status_active === true) ||
      (statusFilter === 'inactive' && facility.status_active === false);
    
    const matchesType = typeFilter === 'all' || 
      facility.facility_type_id?.toString() === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (facilitiesLoading) {
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
          <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.facilities.title')}</h1>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('common.create')}
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FacilityFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            facilityTypes={facilityTypes}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Facilities List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFacilities.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-theme-text-muted text-lg">{t('admin.facilities.noFacilities')}</p>
            </div>
          ) : (
            filteredFacilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                facilityTypes={facilityTypes}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            ))
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('admin.facilities.createTitle')}</DialogTitle>
            </DialogHeader>
            <FacilityForm
              facilityTypes={facilityTypes}
              onSubmit={handleCreate}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('admin.facilities.edit')}</DialogTitle>
            </DialogHeader>
            <FacilityForm
              facilityTypes={facilityTypes}
              onSubmit={handleEdit}
              facilityId={editingFacility?.id}
              initialBudget={{
                total_budget: editingFacility?.budget?.total_budget ?? null,
                salary_budget: editingFacility?.budget?.salary_budget ?? null,
                vehicle_budget: editingFacility?.budget?.vehicle_budget ?? null,
                budget_id: editingFacility?.budget?.id ?? null,
              }}
              onBudgetSave={(payload) => {
                if (!editingFacility) return;
                if (payload.budget_id) {
                  updateBudgetMutation.mutate({ id: payload.budget_id, data: {
                    total_budget: payload.total_budget ?? undefined,
                    salary_budget: payload.salary_budget ?? undefined,
                    vehicle_budget: payload.vehicle_budget ?? undefined,
                  }});
                } else {
                  createBudgetMutation.mutate({
                    facility_id: editingFacility.id,
                    total_budget: payload.total_budget ?? null,
                    salary_budget: payload.salary_budget ?? null,
                    vehicle_budget: payload.vehicle_budget ?? null,
                  });
                }
              }}
              budgetLoading={createBudgetMutation.isPending || updateBudgetMutation.isPending}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingFacility(null);
              }}
              isLoading={updateMutation.isPending}
              submitLabel={t('common.update')}
              defaultValues={editingFacility ? {
                name: editingFacility.name || '',
                description: '',
                facility_type_id: editingFacility.facility_type_id?.toString() || '',
                status_active: editingFacility.status_active?.toString() || 'true',
                group_id: editingFacility.group_id?.toString() || '',
                invite_link: editingFacility.invite_link || '',
              } : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingFacility(null);
          }}
          onConfirm={handleDelete}
          title={t('admin.facilities.deleteTitle')}
          description={t('admin.facilities.deleteDescription')}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
};

export default Facilities;