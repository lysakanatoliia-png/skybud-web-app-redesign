import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Upload, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { WorkerOut } from '@/requests/worker/types';
import { getWorkers } from '@/requests/worker';
import { createWorkTask } from '@/requests/work-task';
import { toastError, toastSuccess } from '@/lib/toasts';

const delegateTaskSchema = z.object({
  worker_id: z.string().min(1, 'Worker is required'),
  text: z.string().min(1, 'Description is required'),
  photo: z.any().optional(),
});

type DelegateTaskFormData = z.infer<typeof delegateTaskSchema>;

interface DelegateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWorkerId?: number;
}

const DelegateTaskDialog: React.FC<DelegateTaskDialogProps> = ({
  open,
  onOpenChange,
  currentWorkerId,
}) => {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<WorkerOut[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DelegateTaskFormData>({
    resolver: zodResolver(delegateTaskSchema),
    defaultValues: {
      worker_id: '',
      text: '',
      photo: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      loadWorkers();
      form.reset();
    }
  }, [open]);

  const loadWorkers = async () => {
    setIsLoadingWorkers(true);
    try {
      const response = await getWorkers({ limit: 1000 });
      if (!response.error && response.data) {
        // Исключаем текущего работника из списка
        const filteredWorkers = response.data.filter(
          (worker) => worker.id !== currentWorkerId
        );
        setWorkers(filteredWorkers);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('photo', file);
    }
  };

  const removeFile = () => {
    form.setValue('photo', undefined);
  };

  const selectedFile = form.watch('photo');

  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(
      0,
      maxLength - (extension ? extension.length + 4 : 3)
    );
    return extension
      ? `${truncatedName}...${extension}`
      : `${truncatedName}...`;
  };

  const onSubmit = async (data: DelegateTaskFormData) => {
    setIsSubmitting(true);
    try {
      const taskData = {
        text: data.text,
        worker_id: parseInt(data.worker_id),
        photo: data.photo,
      };

      const response = await createWorkTask(taskData);

      if (response.error) {
        console.error('Failed to create task:', response);
        toastError(t('work.delegateTask.error', 'Ошибка при создании задачи'));
        return;
      }

      toastSuccess(t('work.delegateTask.success', 'Задача успешно делегирована'));
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error creating task:', error);
      toastError(t('work.delegateTask.error', 'Ошибка при создании задачи'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('work.delegateTask.title', 'Делегирование задачи')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="worker_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('work.delegateTask.selectWorker', 'Выберите работника')} *
                  </FormLabel>
                  <FormControl>
                    {isLoadingWorkers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-theme-accent" />
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('work.delegateTask.selectWorkerPlaceholder', 'Выберите работника')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {workers.map((worker) => (
                            <SelectItem
                              key={worker.id}
                              value={worker.id.toString()}
                            >
                              {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() ||
                                'Unknown Worker'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('work.delegateTask.description', 'Описание задачи')} *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('work.delegateTask.descriptionPlaceholder', 'Введите описание задачи')}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photo"
              render={() => (
                <FormItem>
                  <FormLabel>
                    {t('work.delegateTask.photo', 'Фото')} ({t('common.optional')})
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-theme-bg-tertiary file:text-theme-text-primary hover:file:bg-theme-bg-secondary"
                        />
                        <Upload className="h-4 w-4 text-theme-text-muted" />
                      </div>
                      {selectedFile && (
                        <div className="flex items-center gap-2 p-2 bg-theme-bg-tertiary rounded-md">
                          <span
                            className="text-sm text-theme-text-primary truncate"
                            title={selectedFile.name}
                          >
                            {truncateFileName(selectedFile.name, 20)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeFile}
                            className="h-6 w-6 p-0 text-theme-text-muted hover:text-theme-text-primary"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingWorkers}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('common.creating')}
                  </>
                ) : (
                  t('work.delegateTask.submit', 'Создать задачу')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DelegateTaskDialog;

