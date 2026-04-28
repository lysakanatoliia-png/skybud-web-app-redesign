import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Euro, Trash2 } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { WorkerOut, WorkerPayrollOut } from '@/requests/worker/types';
import { getWorkerPayroll } from '@/requests/worker';
import { getAdjustments, createAdjustment, deleteAdjustment } from '@/requests/adjustment';
import { AdjustmentOut, AdjustmentTypeEnum } from '@/requests/adjustment/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import { DateInput } from '@/components/ui/date-input';
import ImageViewer from '@/components/ui/ImageViewer';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: WorkerOut | null;
};

const WorkerAdjustmentDialog: React.FC<Props> = ({ open, onOpenChange, worker }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [type, setType] = useState<AdjustmentTypeEnum>('penalty');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [sendNotification, setSendNotification] = useState(false);

  // payroll filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const workerId = worker?.id ?? 0;

  const listKey = useMemo(() => ['adjustments', workerId, type], [workerId, type]);

  const { data, isFetching } = useQuery({
    queryKey: listKey,
    enabled: open && !!workerId,
    queryFn: async () => {
      const res = await getAdjustments({ worker_id: workerId, adjustment_type: type });
      if (res.error) {
        toastError(t('admin.adjustments.loadError'));
        return { data: [], total_amount: 0 } as { data: AdjustmentOut[]; total_amount: number };
      }
      return res.data;
    }
  });

  // worker payroll
  const { data: payrollData, isFetching: isPayrollLoading, refetch: refetchPayroll } = useQuery({
    queryKey: ['workerPayroll', workerId, dateFrom, dateTo],
    enabled: open && !!workerId,
    queryFn: async (): Promise<WorkerPayrollOut | null> => {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await getWorkerPayroll(workerId, params);
      if (res.error) {
        toastError(t('salary.loadError'));
        return null;
      }
      return res.data;
    }
  });

  useEffect(() => {
    if (open && workerId) {
      refetchPayroll();
    }
  }, [dateFrom, dateTo, open, workerId, refetchPayroll]);

  const formatCurrency = (amount: number) => `${amount.toFixed(2).replace('.', ',')} €`;

  const createMut = useMutation({
    mutationFn: async () => {
      if (!workerId) throw new Error('no worker');
      const res = await createAdjustment({
        worker_id: workerId,
        adjustment_type: type,
        amount: parseFloat(amount),
        reason: reason.trim(),
        photo: photo ?? undefined,
        send_notification: sendNotification,
      });
      if (res.error) throw new Error('create failed');
      return res.data;
    },
    onSuccess: () => {
      toastSuccess(t('admin.adjustments.createSuccess'));
      setAmount('');
      setReason('');
      setPhoto(null);
      setSendNotification(false);
      queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: () => toastError(t('admin.adjustments.createError')),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await deleteAdjustment(id);
      if (res.error) throw new Error('delete failed');
      return res.data;
    },
    onSuccess: () => {
      toastSuccess(t('admin.adjustments.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: () => toastError(t('admin.adjustments.deleteError')),
  });

  const canSubmit = amount.trim().length > 0 && !isNaN(parseFloat(amount)) && reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            {t('admin.adjustments.title')} {worker ? `— ${worker.first_name || ''} ${worker.last_name || ''}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* payroll summary */}
        <div className="mb-4 border border-theme-border rounded-lg p-4 bg-theme-bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-theme-text-secondary">{t('salary.periodFrom')}</span>
              <DateInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-theme-text-secondary">{t('salary.periodTo')}</span>
              <DateInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
          </div>
          {payrollData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-theme-bg-tertiary rounded p-3 text-center md:col-span-1">
                <div className="text-sm text-theme-text-secondary">{t('salary.salary')}</div>
                <div className="text-2xl font-bold text-theme-accent">{formatCurrency(payrollData.base_calculation.base_salary)}</div>
              </div>
            </div>
          )}
          {!payrollData && isPayrollLoading && (
            <div className="text-sm text-theme-text-muted">{t('common.loading')}</div>
          )}
        </div>

        {/* Create form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('admin.adjustments.type')}</Label>
              <Select value={type} onValueChange={(v) => setType(v as AdjustmentTypeEnum)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('admin.adjustments.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="penalty">{t('admin.adjustments.types.penalty')}</SelectItem>
                  <SelectItem value="prepayment">{t('admin.adjustments.types.prepayment')}</SelectItem>
                  <SelectItem value="award">{t('admin.adjustments.types.award')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('admin.adjustments.amount')}</Label>
              <Input className="mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>{t('admin.adjustments.reason')}</Label>
            <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.adjustments.reasonPlaceholder') as string} />
          </div>
          <div>
            <Label>{t('admin.adjustments.photo')}</Label>
            <Input className="mt-1" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="send-notif"
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="w-4 h-4 text-theme-accent bg-theme-bg-primary border-theme-border rounded"
            />
            <Label htmlFor="send-notif">{t('admin.adjustments.sendNotification')}</Label>
          </div>
          <div className="flex justify-end">
            <Button disabled={!canSubmit || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? t('common.creating') : t('common.create')}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-theme-text-secondary text-sm">
              {t('admin.adjustments.currentTypeTotal')}: <span className="font-semibold text-theme-text-primary">{data?.total_amount?.toFixed?.(2) ?? '0.00'} €</span>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-auto">
            {(data?.data ?? []).map((adj) => (
              <div key={adj.id} className="flex items-center justify-between p-3 border border-theme-border rounded">
                <div className="text-sm">
                  <div className="font-medium text-theme-text-primary">{adj.amount.toFixed(2)} € — {t(`admin.adjustments.types.${adj.adjustment_type}`)}</div>
                  <div className="text-theme-text-secondary">{adj.reason}</div>
                  <div className="text-xs text-theme-text-muted">{new Date(adj.created_at).toLocaleString(
                    { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                  )}</div>
                </div>
                <div className="flex items-center gap-2">
                  {adj.photo_url && (
                    <div className="flex items-center gap-2">
                      <ImageViewer
                        images={[adj.photo_url]}
                        containerClassName="grid grid-cols-1"
                        thumbnailClassName="w-12 h-12 object-cover rounded border border-theme-border"
                      />
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteMut.mutate(adj.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {isFetching && <div className="text-sm text-theme-text-muted">{t('common.loading')}</div>}
            {(data?.data?.length ?? 0) === 0 && !isFetching && (
              <div className="text-sm text-theme-text-muted">{t('admin.adjustments.empty')}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerAdjustmentDialog;


