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

import { getWorkTasks, createWorkTask, updateWorkTask, deleteWorkTask } from '@/requests/work-task';
import { getFacilities } from '@/requests/facility';
import { getWorkers } from '@/requests/worker';
import { WorkTaskOut, WorkTaskCreate, WorkTaskUpdate } from '@/requests/work-task/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import TaskFilters from './components/TaskFilters';
import { getFacilityTypes } from '@/requests/facility-type';

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  useBackButton(routes.ADMIN);
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTaskOut | null>(null);
  const [deletingTask, setDeletingTask] = useState<WorkTaskOut | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['work-tasks'],
    queryFn: async () => {
      const response = await getWorkTasks();
      if (response.error) {
        toastError('Failed to load tasks');
        return [];
      }
      return response.data;
    },
  });

  const { data: facilities = [] } = useQuery({
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

  const { data: workers = [] } = useQuery({
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
    mutationFn: async (data: WorkTaskCreate) => {
      const response = await createWorkTask(data);
      if (response.error) {
        throw new Error('Failed to create task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.tasks.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WorkTaskUpdate }) => {
      const response = await updateWorkTask(id, data);
      if (response.error) {
        throw new Error('Failed to update task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingTask(null);
    },
    onError: () => {
      toastError(t('admin.tasks.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteWorkTask(id);
      if (response.error) {
        throw new Error('Failed to delete task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingTask(null);
    },
    onError: () => {
      toastError(t('admin.tasks.deleteError'));
    },
  });

  const toggleFinishedMutation = useMutation({
    mutationFn: async (task: WorkTaskOut) => {
      const response = await updateWorkTask(task.id, { finished: !task.finished });
      if (response.error) {
        throw new Error('Failed to update task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.updateSuccess'));
    },
    onError: () => {
      toastError(t('admin.tasks.updateError'));
    },
  });

  // Handlers
  const handleCreate = (data: any) => {
    const taskData: WorkTaskCreate = {
      text: data.text,
      facility_id: data.facility_id ? parseInt(data.facility_id) : null,
      worker_id: data.worker_id && data.worker_id !== 'unassigned' ? parseInt(data.worker_id) : null,
      facility_type_id: data.facility_type_id ? parseInt(data.facility_type_id) : null,
      expires_at: data.expires_at || null,
      photo: data.photo || null,
    };
    createMutation.mutate(taskData);
  };

  const handleEdit = (data: any) => {
    if (!editingTask) return;
    const taskData: WorkTaskUpdate = {
      text: data.text,
      facility_id: data.facility_id ? parseInt(data.facility_id) : null,
      worker_id: data.worker_id && data.worker_id !== 'unassigned' ? parseInt(data.worker_id) : null,
      expires_at: data.expires_at || null,
      photo: data.photo || null,
    };
    updateMutation.mutate({ id: editingTask.id, data: taskData });
  };

  const handleDelete = () => {
    if (deletingTask) {
      deleteMutation.mutate(deletingTask.id);
    }
  };

  const handleToggleFinished = (task: WorkTaskOut) => {
    toggleFinishedMutation.mutate(task);
  };

  const openEditDialog = (task: WorkTaskOut) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (task: WorkTaskOut) => {
    setDeletingTask(task);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFacilityFilter('all');
    setWorkerFilter('all');
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = searchTerm === '' || (task.text || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && !task.finished) ||
      (statusFilter === 'finished' && task.finished) ||
      (statusFilter === 'overdue' && !task.finished && task.expires_at && new Date(task.expires_at) < new Date());
    
    const matchesFacility = facilityFilter === 'all' || 
      (facilityFilter === 'unassigned' && !task.facility_id) ||
      task.facility_id?.toString() === facilityFilter;
    
    const matchesWorker = workerFilter === 'all' || 
      (workerFilter === 'unassigned' && !task.worker_id) ||
      task.worker_id?.toString() === workerFilter;

    return matchesSearch && matchesStatus && matchesFacility && matchesWorker;
  });

  if (tasksLoading) {
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
          <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.tasks.title')}</h1>
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
          <TaskFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            facilityFilter={facilityFilter}
            onFacilityChange={setFacilityFilter}
            workerFilter={workerFilter}
            onWorkerChange={setWorkerFilter}
            facilities={facilities}
            workers={workers}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-theme-text-muted text-lg">{t('admin.tasks.noTasks')}</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                facilities={facilities}
                workers={workers}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onToggleFinished={handleToggleFinished}
              />
            ))
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('admin.tasks.createTitle')}</DialogTitle>
            </DialogHeader>
            <TaskForm
              facilities={facilities}
              workers={workers}
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
              <DialogTitle>{t('admin.tasks.edit')}</DialogTitle>
            </DialogHeader>
            <TaskForm
              facilities={facilities}
              workers={workers}
              facilityTypes={facilityTypes}
              onSubmit={handleEdit}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingTask(null);
              }}
              isLoading={updateMutation.isPending}
              submitLabel={t('common.update')}
              defaultValues={editingTask ? {
                text: editingTask.text || '',
                facility_id: editingTask.facility_id?.toString() || '',
                worker_id: editingTask.worker_id?.toString() || 'unassigned',
                facility_type_id: editingTask.facility_type_id?.toString() || '',
                expires_at: editingTask.expires_at ? new Date(editingTask.expires_at).toISOString().slice(0, 16) : '',
                photo: undefined,
              } : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingTask(null);
          }}
          onConfirm={handleDelete}
          title={t('admin.tasks.deleteTitle')}
          description={t('admin.tasks.deleteDescription')}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
};

export default Tasks;