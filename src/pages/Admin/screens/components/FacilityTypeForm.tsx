import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const facilityTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type FacilityTypeFormData = z.infer<typeof facilityTypeSchema>;

interface FacilityTypeFormProps {
  onSubmit: (data: FacilityTypeFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<FacilityTypeFormData>;
  submitLabel?: string;
}

const FacilityTypeForm: React.FC<FacilityTypeFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
  submitLabel = 'Create',
}) => {
  const { t } = useTranslation();

  const form = useForm<FacilityTypeFormData>({
    resolver: zodResolver(facilityTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.facilityTypes.name')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('admin.facilityTypes.namePlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.facilityTypes.description')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('admin.facilityTypes.descriptionPlaceholder')}
                  className="min-h-[100px]"
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

export default FacilityTypeForm;
