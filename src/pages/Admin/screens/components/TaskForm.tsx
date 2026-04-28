import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
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

import { FacilityOut } from '@/requests/facility/types';
import { WorkerOut } from '@/requests/worker/types';
import { FacilityTypeOut } from '@/requests/facility-type/types';

const taskSchema = z.object({
  text: z.string().min(1, 'Description is required'),
  facility_id: z.string().optional(),
  worker_id: z.string().optional(),
  facility_type_id: z.string().optional(),
  expires_at: z.string().optional(),
  photo: z.any().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  facilities: FacilityOut[];
  workers: WorkerOut[];
  facilityTypes: FacilityTypeOut[];
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<TaskFormData>;
  submitLabel?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  facilities,
  workers,
  facilityTypes,
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
  submitLabel = 'Create',
}) => {
  const { t } = useTranslation();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      text: '',
      facility_id: '',
      worker_id: 'unassigned',
      facility_type_id: '',
      expires_at: '',
      photo: undefined,
      ...defaultValues,
    },
  });

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
  const facilityId = form.watch('facility_id');
  const workerId = form.watch('worker_id');
  const facilityTypeId = form.watch('facility_type_id');

  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - (extension ? extension.length + 4 : 3));
    return extension ? `${truncatedName}...${extension}` : `${truncatedName}...`;
  };

  // check if any field is selected
  const hasFacility = facilityId && facilityId !== '';
  const hasWorker = workerId && workerId !== 'unassigned' && workerId !== '';
  const hasFacilityType = facilityTypeId && facilityTypeId !== '';

  // determine which fields are optional (only show for unselected fields)
  const isFacilityOptional = !hasFacility && (hasWorker || hasFacilityType);
  const isWorkerOptional = !hasWorker && (hasFacility || hasFacilityType);
  const isFacilityTypeOptional = !hasFacilityType && (hasFacility || hasWorker);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.tasks.description')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('admin.tasks.descriptionPlaceholder')}
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Facility */}
           <FormField
             control={form.control}
             name="facility_id"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>
                   {t('admin.tasks.facility')}
                   {isFacilityOptional && (
                     <span className="text-theme-text-muted font-normal"> ({t('common.optional')})</span>
                   )}
                 </FormLabel>
                 <FormControl>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <SelectTrigger>
                       <SelectValue placeholder={t('admin.tasks.selectFacility')} />
                     </SelectTrigger>
                     <SelectContent>
                       {facilities.map((facility) => (
                         <SelectItem key={facility.id} value={facility.id.toString()}>
                           {facility.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           {/* Facility type */}
           <FormField
             control={form.control}
             name="facility_type_id"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>
                   {t('admin.facilities.facilityType')}
                   {isFacilityTypeOptional && (
                     <span className="text-theme-text-muted font-normal"> ({t('common.optional')})</span>
                   )}
                 </FormLabel>
                 <FormControl>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <SelectTrigger>
                       <SelectValue placeholder={t('admin.facilities.selectFacilityType')} />
                     </SelectTrigger>
                     <SelectContent>
                       {facilityTypes.map((type) => (
                         <SelectItem key={type.id} value={type.id.toString()}>
                           {type.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           {/* Worker */}
           <FormField
             control={form.control}
             name="worker_id"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>
                   {t('admin.tasks.worker')}
                   {isWorkerOptional && (
                     <span className="text-theme-text-muted font-normal"> ({t('common.optional')})</span>
                   )}
                 </FormLabel>
                 <FormControl>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <SelectTrigger>
                       <SelectValue placeholder={t('admin.tasks.selectWorker')} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="unassigned">{t('admin.tasks.unassigned')}</SelectItem>
                       {workers.map((worker) => (
                         <SelectItem key={worker.id} value={worker.id.toString()}>
                           {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
        </div>

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.tasks.expiresAt')}</FormLabel>
              <FormControl>
                <DateInput
                  type="datetime-local"
                  {...field}
                  placeholder={t('admin.tasks.expiresAtPlaceholder')}
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
              <FormLabel>{t('admin.tasks.photo')}</FormLabel>
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
                      <span className="text-sm text-theme-text-primary truncate" title={selectedFile.name}>
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

export default TaskForm;
