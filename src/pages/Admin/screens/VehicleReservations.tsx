import { FC, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { Car, Check, X, Clock, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  getVehicleReservationRequests, 
  approveVehicleReservationRequest,
  rejectVehicleReservationRequest,
  assignVehicle,
  getVehicles
} from '@/requests/vehicle';
import { 
  VehicleReservationRequestOut, 
  VehicleReservationStatusEnum,
  Vehicle
} from '@/requests/vehicle/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VehicleReservations: FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<VehicleReservationRequestOut[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VehicleReservationStatusEnum | 'all'>('pending');
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<VehicleReservationRequestOut | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100, offset: 0 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await getVehicleReservationRequests(params);
      if (response.error) {
        console.error('Failed to load requests:', response);
        toastError('Не удалось загрузить запросы');
        return;
      }
      
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toastError('Ошибка загрузки запросов');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await getVehicles();
      if (response.error) {
        console.error('Failed to load vehicles:', response);
        return;
      }
      setVehicles(response.data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchVehicles();
  }, [fetchRequests, fetchVehicles]);

  const handleApprove = async (request: VehicleReservationRequestOut) => {
    setIsActionLoading(request.id);
    try {
      // Parallel requests: approve reservation request and assign vehicle
      const [approveResponse, assignResponse] = await Promise.all([
        approveVehicleReservationRequest(request.id, {
          vehicle_id: request.vehicle_id,
        }),
        assignVehicle(request.vehicle_id, {
          owner_id: request.worker_id,
          date_from: request.date_from || null,
          date_to: request.date_to || null,
        }),
      ]);

      if (approveResponse.error) {
        console.error('Failed to approve request:', approveResponse);
        const errorMsg = (approveResponse.error as any)?.response?.data?.detail || 'Не удалось одобрить запрос';
        toastError(errorMsg);
        return;
      }

      if (assignResponse.error) {
        console.error('Failed to assign vehicle:', assignResponse);
        // Don't fail the whole operation if assign fails, but log it
        console.warn('Vehicle assignment failed, but request was approved');
      }

      toastSuccess('Запрос одобрен и машина забронирована');
      await fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toastError('Ошибка при одобрении запроса');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleOpenRejectDialog = (request: VehicleReservationRequestOut) => {
    setSelectedRequestForReject(request);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequestForReject || !rejectionReason.trim()) {
      toastError('Пожалуйста, укажите причину отклонения');
      return;
    }

    setIsActionLoading(selectedRequestForReject.id);
    try {
      const response = await rejectVehicleReservationRequest(selectedRequestForReject.id, {
        rejection_reason: rejectionReason.trim(),
      });

      if (response.error) {
        console.error('Failed to reject request:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || 'Не удалось отклонить запрос';
        toastError(errorMsg);
        return;
      }

      toastSuccess('Запрос отклонен');
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedRequestForReject(null);
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toastError('Ошибка при отклонении запроса');
    } finally {
      setIsActionLoading(null);
    }
  };

  const getStatusBadge = (status: VehicleReservationStatusEnum) => {
    const statusConfig = {
      pending: { color: 'bg-amber-200 text-amber-900 border border-amber-500', icon: Clock, text: 'На рассмотрении' },
      approved: { color: 'bg-emerald-200 text-emerald-900 border border-emerald-500', icon: Check, text: 'Одобрено' },
      rejected: { color: 'bg-rose-200 text-rose-900 border border-rose-500', icon: X, text: 'Отклонено' },
      cancelled: { color: 'bg-slate-200 text-slate-900 border border-slate-500', icon: AlertCircle, text: 'Отменено' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1 font-semibold`}>
        <Icon className={`h-3 w-3 ${
          status === 'pending' ? 'text-amber-900' :
          status === 'approved' ? 'text-emerald-900' :
          status === 'rejected' ? 'text-rose-900' :
          'text-slate-900'
        }`} />
        {config.text}
      </Badge>
    );
  };

  const getVehicleInfo = (vehicleId: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model || 'Неизвестно'} (${vehicle.license_plate || 'Без номера'})` : `ID: ${vehicleId}`;
  };

  const getWorkerName = (request: VehicleReservationRequestOut) => {
    if (request.worker) {
      const firstName = request.worker.first_name || '';
      const lastName = request.worker.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'Без имени';
    }
    return `Worker ID: ${request.worker_id}`;
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme-text-primary mb-2">
            {t('admin.vehicleReservations.title', 'Запросы на бронирование авто')}
          </h1>
          <p className="text-sm text-theme-text-secondary">
            {t('admin.vehicleReservations.subtitle', 'Управление запросами на бронирование транспортных средств')}
          </p>
        </div>

        <div className="mb-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as VehicleReservationStatusEnum | 'all')}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t('admin.vehicleReservations.filterByStatus', 'Фильтр по статусу')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.vehicleReservations.allStatuses', 'Все статусы')}</SelectItem>
              <SelectItem value="pending">{t('admin.vehicleReservations.pending', 'На рассмотрении')}</SelectItem>
              <SelectItem value="approved">{t('admin.vehicleReservations.approved', 'Одобрено')}</SelectItem>
              <SelectItem value="rejected">{t('admin.vehicleReservations.rejected', 'Отклонено')}</SelectItem>
              <SelectItem value="cancelled">{t('admin.vehicleReservations.cancelled', 'Отменено')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-theme-text-secondary">
            {t('common.loading', 'Загрузка...')}
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="h-12 w-12 mx-auto mb-4 text-theme-text-muted" />
            <p className="text-theme-text-secondary">
              {t('admin.vehicleReservations.noRequests', 'Запросы не найдены')}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="p-4 bg-theme-bg-card border border-theme-border/50 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Car className="h-5 w-5 text-theme-text-primary" />
                      <span className="font-semibold text-theme-text-primary">
                        {getVehicleInfo(request.vehicle_id)}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-theme-text-secondary space-y-1">
                      <div>
                        <span className="font-medium text-theme-text-primary">Работник:</span> <span className="text-theme-text-secondary">{getWorkerName(request)}</span>
                      </div>
                      {(request.date_from || request.date_to) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {request.date_from && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-theme-text-muted" />
                              <span className="font-medium text-theme-text-primary">С:</span>{' '}
                              <span className="text-theme-text-secondary">{new Date(request.date_from).toLocaleDateString(
                                { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                              )}</span>
                            </div>
                          )}
                          {request.date_to && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-theme-text-muted" />
                              <span className="font-medium text-theme-text-primary">По:</span>{' '}
                              <span className="text-theme-text-secondary">{new Date(request.date_to).toLocaleDateString(
                                { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                              )}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-theme-text-primary">Создан:</span>{' '}
                        <span className="text-theme-text-secondary">{new Date(request.created_at).toLocaleString(
                          { 'ru': 'ru-RU', 'en': 'en-US', 'de': 'de-DE', 'uk': 'uk-UA' }[i18n.language] || 'en-US'
                        )}</span>
                      </div>
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2">
                          <div className="text-xs font-semibold text-rose-900 mb-1">
                            Причина отклонения:
                          </div>
                          <div className="text-sm text-rose-800">
                            {request.rejection_reason}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-500 text-white border border-emerald-600 font-medium"
                        onClick={() => handleApprove(request)}
                        disabled={isActionLoading === request.id}
                      >
                        {isActionLoading === request.id ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin mr-2" />
                            {t('common.processing', 'Обработка...')}
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {t('admin.vehicleReservations.approve', 'Одобрить')}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-rose-500 text-white border border-rose-600 font-medium"
                        onClick={() => handleOpenRejectDialog(request)}
                        disabled={isActionLoading === request.id}
                      >
                        {isActionLoading === request.id ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin mr-2" />
                            {t('common.processing', 'Обработка...')}
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            {t('admin.vehicleReservations.reject', 'Отклонить')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-theme-bg-card border border-theme-border shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-theme-text-primary">
                {t('admin.vehicleReservations.rejectRequest', 'Отклонить запрос')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-theme-text-secondary">
                {t('admin.vehicleReservations.rejectRequestMessage', 'Укажите причину отклонения запроса на бронирование')}
              </p>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-theme-text-primary">
                  {t('admin.vehicleReservations.rejectionReason', 'Причина отклонения')}:
                </span>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 border border-theme-border rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:ring-2 focus:ring-theme-accent focus:border-transparent resize-y min-h-[100px]"
                  placeholder={t('admin.vehicleReservations.rejectionReasonPlaceholder', 'Введите причину отклонения...')}
                  required
                />
              </label>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectionReason('');
                  setSelectedRequestForReject(null);
                }}
                className="bg-theme-bg-secondary text-theme-text-primary border-theme-border/50 font-medium"
              >
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button 
                className="bg-rose-500 text-white border border-rose-600 font-medium"
                onClick={handleReject} 
                disabled={!rejectionReason.trim() || isActionLoading !== null}
              >
                {isActionLoading !== null ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin mr-2" />
                    {t('common.processing', 'Обработка...')}
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    {t('admin.vehicleReservations.rejectConfirm', 'Отклонить')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VehicleReservations;

