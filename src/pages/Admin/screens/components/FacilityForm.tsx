import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { FacilityTypeOut } from '@/requests/facility-type/types';

const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  facility_type_id: z.string().min(1, 'Facility type is required'),
  status_active: z.string().min(1, 'Status is required'),
  group_id: z.string().optional(),
  invite_link: z.string().optional(),
});

type FacilityFormData = z.infer<typeof facilitySchema>;

interface FacilityFormProps {
  facilityTypes: FacilityTypeOut[];
  onSubmit: (data: FacilityFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<FacilityFormData>;
  submitLabel?: string;
  // budget controls (only for edit)
  facilityId?: number;
  initialBudget?: { total_budget: number | null; salary_budget: number | null; vehicle_budget: number | null; budget_id?: number | null };
  onBudgetSave?: (payload: { total_budget: number | null; salary_budget: number | null; vehicle_budget: number | null; budget_id?: number | null }) => void;
  budgetLoading?: boolean;
}

const FacilityForm: React.FC<FacilityFormProps> = ({
  facilityTypes,
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
  submitLabel = 'Create',
  facilityId,
  initialBudget,
  onBudgetSave,
  budgetLoading,
}) => {
  const { t } = useTranslation();

  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      description: '',
      facility_type_id: '',
      status_active: 'true',
      group_id: '',
      invite_link: '',
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
              <FormLabel>{t('admin.facilities.name')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('admin.facilities.namePlaceholder')} />
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
              <FormLabel>{t('admin.facilities.description')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('admin.facilities.descriptionPlaceholder')}
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="facility_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.facilities.facilityType')}</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.facilities.selectFacilityType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityTypes.map((facilityType) => (
                        <SelectItem key={facilityType.id} value={facilityType.id.toString()}>
                          {facilityType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status_active"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.facilities.status')}</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.facilities.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('admin.facilities.statusOptions.active')}</SelectItem>
                      <SelectItem value="false">{t('admin.facilities.statusOptions.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Budget section */}
        {facilityId && (
          <div className="border-t border-theme-border pt-4">
            <div className="text-theme-text-primary text-lg font-semibold mb-3">{t('admin.facilities.budget.title')}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-theme-text-primary">{t('admin.facilities.budget.total')}</label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={initialBudget?.total_budget ?? ''}
                  onChange={(e) => (initialBudget && (initialBudget.total_budget = e.target.value === '' ? null : Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-theme-text-primary">{t('admin.facilities.budget.salary')}</label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={initialBudget?.salary_budget ?? ''}
                  onChange={(e) => (initialBudget && (initialBudget.salary_budget = e.target.value === '' ? null : Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-theme-text-primary">{t('admin.facilities.budget.vehicle')}</label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={initialBudget?.vehicle_budget ?? ''}
                  onChange={(e) => (initialBudget && (initialBudget.vehicle_budget = e.target.value === '' ? null : Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button
                type="button"
                onClick={() => onBudgetSave && onBudgetSave({
                  total_budget: initialBudget?.total_budget ?? null,
                  salary_budget: initialBudget?.salary_budget ?? null,
                  vehicle_budget: initialBudget?.vehicle_budget ?? null,
                  budget_id: initialBudget?.budget_id ?? null,
                })}
                disabled={!!budgetLoading}
              >
                {initialBudget?.budget_id ? t('admin.facilities.budget.update') : t('admin.facilities.budget.create')}
              </Button>
            </div>
          </div>
        )}

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="group_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.facilities.groupId')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('admin.facilities.groupIdPlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invite_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.facilities.inviteLink')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('admin.facilities.inviteLinkPlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div> */}

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

export default FacilityForm;
