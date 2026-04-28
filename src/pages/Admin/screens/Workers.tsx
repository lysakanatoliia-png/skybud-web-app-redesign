import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import routes from '@/consts/pageRoutes';
import useBackButton from '@/hooks/useBackButton';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { getWorkers, createWorker, updateWorker, deleteWorker } from '@/requests/worker';
import { WorkerOut, WorkerCreate, WorkerUpdate } from '@/requests/worker/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import WorkerForm from './components/WorkerForm';
import WorkerCard from './components/WorkerCard';
import WorkerAdjustmentDialog from './components/WorkerAdjustmentDialog.tsx';

const Workers: React.FC = () => {
  const { t } = useTranslation();
  useBackButton(routes.ADMIN);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerOut | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<WorkerOut | null>(null);
  const [adjustmentWorker, setAdjustmentWorker] = useState<WorkerOut | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [shouldApprove, setShouldApprove] = useState(false);

  // Query
  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await getWorkers();
      if (response.error) {
        toastError('Failed to load workers');
        return [];
      }
      return response.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: WorkerCreate) => {
      const response = await createWorker(data);
      if (response.error) {
        throw new Error('Failed to create worker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toastSuccess(t('admin.workers.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.workers.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, approve }: { id: number; data: WorkerUpdate; approve?: boolean }) => {
      const response = await updateWorker(id, data, approve);
      if (response.error) {
        throw new Error('Failed to update worker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toastSuccess(t('admin.workers.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingWorker(null);
      setShouldApprove(false);
    },
    onError: () => {
      toastError(t('admin.workers.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteWorker(id);
      if (response.error) {
        throw new Error('Failed to delete worker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toastSuccess(t('admin.workers.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingWorker(null);
    },
    onError: () => {
      toastError(t('admin.workers.deleteError'));
    },
  });

  // Handlers
  const handleCreate = (data: any) => {
    const workerData = {
      ...data,
      username: data.username ? data.username.replace(/^@/, '') : data.username,
      rate: parseFloat(data.rate),
      telegram_id: data.telegram_id ? parseInt(data.telegram_id) : null,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : null,
    };
    createMutation.mutate(workerData);
  };

  const handleEdit = (data: any) => {
    if (!editingWorker) return;
    const workerData = {
      ...data,
      username: data.username ? data.username.replace(/^@/, '') : data.username,
      rate: parseFloat(data.rate),
      telegram_id: data.telegram_id ? parseInt(data.telegram_id) : undefined,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : undefined,
    };
    updateMutation.mutate({ id: editingWorker.id, data: workerData, approve: shouldApprove });
  };

  const handleDelete = () => {
    if (deletingWorker) {
      deleteMutation.mutate(deletingWorker.id);
    }
  };

  const openEditDialog = (worker: WorkerOut) => {
    setEditingWorker(worker);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (worker: WorkerOut) => {
    setDeletingWorker(worker);
    setIsDeleteDialogOpen(true);
  };

  const openAdjustmentDialog = (worker: WorkerOut) => {
    setAdjustmentWorker(worker);
    setIsAdjustmentOpen(true);
  };

  // open edit dialog if query param id is present
  useEffect(() => {
    if (isLoading) return;
    const searchParams = new URLSearchParams(location.search);
    const idParam = searchParams.get('id');
    const approveParam = searchParams.get('approve');
    if (!idParam) return;
    const workerId = Number(idParam);
    if (!Number.isFinite(workerId)) return;
    // avoid re-opening if already open for same worker
    if (isEditDialogOpen && editingWorker?.id === workerId) return;
    const workerToEdit = workers.find(w => w.id === workerId);
    if (workerToEdit) {
      setShouldApprove(approveParam === 'true');
      openEditDialog(workerToEdit);
      // remove id and approve from query to allow closing modal normally and avoid loops
      const nextSearch = new URLSearchParams(location.search);
      nextSearch.delete('id');
      nextSearch.delete('approve');
      navigate({ pathname: location.pathname, search: nextSearch.toString() ? `?${nextSearch.toString()}` : '' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, isLoading, workers, isEditDialogOpen, editingWorker]);

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
          <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.workers.title')}</h1>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('common.create')}
          </Button>
        </div>

        {/* Workers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-theme-text-muted text-lg">{t('admin.workers.noWorkers')}</p>
            </div>
          ) : (
            workers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onAdjust={openAdjustmentDialog}
              />
            ))
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('admin.workers.createTitle')}</DialogTitle>
            </DialogHeader>
            <WorkerForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingWorker(null);
            setShouldApprove(false);
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('admin.workers.edit')}</DialogTitle>
            </DialogHeader>
            <WorkerForm
              onSubmit={handleEdit}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingWorker(null);
                setShouldApprove(false);
              }}
              isLoading={updateMutation.isPending}
              submitLabel={t('common.update')}
              defaultValues={editingWorker ? {
                first_name: editingWorker.first_name || '',
                last_name: editingWorker.last_name || '',
                email: editingWorker.email || '',
                username: editingWorker.username || '',
                telegram_id: editingWorker.telegram_id?.toString() || '',
                worker_type: editingWorker.worker_type || 'worker',
                rate: editingWorker.rate?.toString() || '',
                birthday: editingWorker.birthday ? editingWorker.birthday.split('T')[0] : '',
              } : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingWorker(null);
          }}
          onConfirm={handleDelete}
          title={t('admin.workers.deleteTitle')}
          description={deletingWorker ? t('admin.workers.deleteConfirmText', {
            name: `${deletingWorker.first_name || ''} ${deletingWorker.last_name || ''}`.trim() || (deletingWorker.username ? `@${deletingWorker.username}` : String(deletingWorker.id))
          }) : ''}
          isLoading={deleteMutation.isPending}
        />

        {/* Adjustments Dialog */}
        <WorkerAdjustmentDialog
          open={isAdjustmentOpen}
          onOpenChange={(o: boolean) => {
            setIsAdjustmentOpen(o);
            if (!o) setAdjustmentWorker(null);
          }}
          worker={adjustmentWorker}
        />
      </div>
    </div>
  );
};

export default Workers;