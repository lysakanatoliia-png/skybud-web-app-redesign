import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const workerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  username: z.string().optional(),
  telegram_id: z.string().optional(),
  worker_type: z.enum(['admin', 'coder', 'manager', 'smm', 'worker', 'master', 'head_of_sales', 'marketolog', 'foreman', 'engineer', 'assistant']),
  rate: z.string().min(1, 'Rate is required'),
  birthday: z.string().optional(),
});

type WorkerFormData = z.infer<typeof workerSchema>;

interface WorkerFormProps {
  onSubmit: (data: WorkerFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<WorkerFormData>;
  submitLabel?: string;
}

const WorkerForm: React.FC<WorkerFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
  submitLabel = 'Create',
}) => {
  const { t } = useTranslation();

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      telegram_id: '',
      worker_type: 'worker',
      rate: '',
      birthday: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.workers.firstName')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('admin.workers.firstNamePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.workers.lastName')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('admin.workers.lastNamePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.workers.email')}</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder={t('admin.workers.emailPlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.workers.telegramUsername')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('admin.workers.telegramUsernamePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telegram_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.workers.telegramId')}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder={t('admin.workers.telegramIdPlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="worker_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.workers.type')}</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.workers.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('admin.workers.types.admin')}</SelectItem>
                      <SelectItem value="coder">{t('admin.workers.types.coder')}</SelectItem>
                      <SelectItem value="manager">{t('admin.workers.types.manager')}</SelectItem>
                      <SelectItem value="smm">{t('admin.workers.types.smm')}</SelectItem>
                      <SelectItem value="worker">{t('admin.workers.types.worker')}</SelectItem>
                      <SelectItem value="master">{t('admin.workers.types.master')}</SelectItem>
                      <SelectItem value="head_of_sales">{t('admin.workers.types.head_of_sales')}</SelectItem>
                      <SelectItem value="marketolog">{t('admin.workers.types.marketolog')}</SelectItem>
                      <SelectItem value="foreman">{t('admin.workers.types.foreman')}</SelectItem>
                      <SelectItem value="engineer">{t('admin.workers.types.engineer')}</SelectItem>
                      <SelectItem value="assistant">{t('admin.workers.types.assistant')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.workers.rate')}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder={t('admin.workers.ratePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="birthday"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.workers.birthday')}</FormLabel>
              <FormControl>
                <DateInput
                  type="date"
                  {...field}
                  placeholder={t('admin.workers.birthdayPlaceholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.creating') : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkerForm;
