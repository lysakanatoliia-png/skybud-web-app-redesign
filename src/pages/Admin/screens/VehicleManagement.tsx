import { FC, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, User, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  getVehicles, 
  assignVehicle,
  unassignVehicle
} from '@/requests/vehicle';
import { getWorkers } from '@/requests/worker';
import { Vehicle } from '@/requests/vehicle/types';
import { WorkerOut } from '@/requests/worker/types';
import { toastError, toastSuccess } from '@/lib/toasts';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const VehicleManagement: FC = () => {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workers, setWorkers] = useState<WorkerOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'assigned'>('all');
  const [workerSearch, setWorkerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vehiclesResponse, workersResponse] = await Promise.all([
        getVehicles(),
        getWorkers()
      ]);

      if (vehiclesResponse.error) {
        console.error('Failed to load vehicles:', vehiclesResponse);
        toastError('Не удалось загрузить машины');
      } else {
        setVehicles(vehiclesResponse.data || []);
      }

      if (workersResponse.error) {
        console.error('Failed to load workers:', workersResponse);
        toastError('Не удалось загрузить работников');
      } else {
        setWorkers(workersResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toastError('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'available' && (vehicle.owner_id === null || vehicle.owner_id === 0)) ||
      (filter === 'assigned' && vehicle.owner_id !== null && vehicle.owner_id !== 0);
    
    const matchesSearch = !vehicleSearch || 
      vehicle.model?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      vehicle.license_plate?.toLowerCase().includes(vehicleSearch.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const filteredWorkers = workers.filter(worker => {
    if (!workerSearch) return true;
    const searchLower = workerSearch.toLowerCase();
    return (
      worker.first_name?.toLowerCase().includes(searchLower) ||
      worker.last_name?.toLowerCase().includes(searchLower) ||
      worker.email?.toLowerCase().includes(searchLower) ||
      worker.telegram_id?.toString().includes(searchLower)
    );
  });

  const getWorkerName = (workerId: number | null) => {
    if (!workerId) return 'Не назначен';
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return `ID: ${workerId}`;
    const firstName = worker.first_name || '';
    const lastName = worker.last_name || '';
    return `${firstName} ${lastName}`.trim() || worker.email || `ID: ${workerId}`;
  };

  const handleOpenAssignDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedWorkerId(null);
    setDateFrom('');
    setDateTo('');
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedVehicle || !selectedWorkerId) {
      toastError('Выберите работника');
      return;
    }

    setIsActionLoading(selectedVehicle.id);
    try {
      const formattedDateFrom = dateFrom ? formatDatePayload(dateFrom) : null;
      const formattedDateTo = dateTo ? formatDatePayload(dateTo) : null;

      const response = await assignVehicle(selectedVehicle.id, {
        owner_id: selectedWorkerId,
        date_from: formattedDateFrom,
        date_to: formattedDateTo,
      });

      if (response.error) {
        console.error('Failed to assign vehicle:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || 'Не удалось забронировать машину';
        toastError(errorMsg);
        return;
      }

      toastSuccess('Машина успешно забронирована');
      setIsAssignDialogOpen(false);
      setSelectedVehicle(null);
      setSelectedWorkerId(null);
      setDateFrom('');
      setDateTo('');
      await fetchData();
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toastError('Ошибка при бронировании машины');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleUnassign = async (vehicle: Vehicle) => {
    if (!vehicle.owner_id) {
      return;
    }

    setIsActionLoading(vehicle.id);
    try {
      const response = await unassignVehicle(vehicle.id);

      if (response.error) {
        console.error('Failed to unassign vehicle:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || 'Не удалось освободить машину';
        toastError(errorMsg);
        return;
      }

      toastSuccess('Машина успешно освобождена');
      await fetchData();
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      toastError('Ошибка при освобождении машины');
    } finally {
      setIsActionLoading(null);
    }
  };

  const formatDatePayload = (dateString: string) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return null;
    return `${day}.${month}.${year}`;
  };

  const availableVehicles = vehicles.filter(v => v.owner_id === null || v.owner_id === 0);
  const assignedVehicles = vehicles.filter(v => v.owner_id !== null && v.owner_id !== 0);

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme-text-primary mb-2">
            {t('admin.vehicleManagement.title', 'Управление машинами')}
          </h1>
          <p className="text-sm text-theme-text-secondary">
            {t('admin.vehicleManagement.subtitle', 'Прямое бронирование и освобождение машин')}
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-theme-text-secondary">Всего машин</p>
                <p className="text-2xl font-bold text-theme-text-primary">{vehicles.length}</p>
              </div>
              <Car className="h-8 w-8 text-theme-text-primary" />
            </div>
          </Card>
          <Card className="p-4 bg-emerald-50 border border-emerald-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-900">Доступно</p>
                <p className="text-2xl font-bold text-emerald-700">{availableVehicles.length}</p>
              </div>
              <Check className="h-8 w-8 text-emerald-700" />
            </div>
          </Card>
          <Card className="p-4 bg-amber-50 border border-amber-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-900">Забронировано</p>
                <p className="text-2xl font-bold text-amber-700">{assignedVehicles.length}</p>
              </div>
              <User className="h-8 w-8 text-amber-700" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'available' | 'assigned')}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Фильтр по статусу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.vehicleManagement.allVehicles', 'Все машины')}</SelectItem>
              <SelectItem value="available">{t('admin.vehicleManagement.available', 'Доступные')}</SelectItem>
              <SelectItem value="assigned">{t('admin.vehicleManagement.assigned', 'Забронированные')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-text-muted" />
            <Input
              placeholder={t('admin.vehicleManagement.searchVehicles', 'Поиск машин...')}
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-theme-text-secondary">
            {t('common.loading', 'Загрузка...')}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="h-12 w-12 mx-auto mb-4 text-theme-text-muted" />
            <p className="text-theme-text-secondary">
              {t('admin.vehicleManagement.noVehicles', 'Машины не найдены')}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredVehicles.map((vehicle) => {
              const isAssigned = vehicle.owner_id !== null && vehicle.owner_id !== 0;
              return (
                <Card key={vehicle.id} className="p-4 bg-theme-bg-card border border-theme-border/50 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Car className="h-5 w-5 text-theme-text-primary" />
                        <span className="font-semibold text-theme-text-primary text-lg">
                          {vehicle.model || t('admin.vehicleManagement.unknownModel', 'Неизвестная модель')}
                        </span>
                        {isAssigned ? (
                          <Badge className="bg-amber-200 text-amber-900 border border-amber-500 font-semibold">
                            {t('admin.vehicleManagement.assigned', 'Забронировано')}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-200 text-emerald-900 border border-emerald-500 font-semibold">
                            {t('admin.vehicleManagement.available', 'Доступно')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-theme-text-secondary space-y-1">
                        <div>
                          <span className="font-medium text-theme-text-primary">Номер:</span> <span className="text-theme-text-secondary">{vehicle.license_plate || 'N/A'}</span>
                        </div>
                        {isAssigned && (
                          <div>
                            <span className="font-medium text-theme-text-primary">Забронировано на:</span> <span className="text-theme-text-secondary">{getWorkerName(vehicle.owner_id)}</span>
                          </div>
                        )}
                        {vehicle.external_id && (
                          <div>
                            <span className="font-medium text-theme-text-primary">External ID:</span> <span className="text-theme-text-secondary">{vehicle.external_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {isAssigned ? (
                        <Button
                          size="sm"
                          className="bg-rose-500 text-white border border-rose-600 font-medium"
                          onClick={() => handleUnassign(vehicle)}
                          disabled={isActionLoading === vehicle.id}
                        >
                          {isActionLoading === vehicle.id ? (
                            <>
                              <X className="h-4 w-4 animate-spin mr-2" />
                              {t('common.processing', 'Обработка...')}
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              {t('admin.vehicleManagement.unassign', 'Освободить')}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-blue-500 text-white border border-blue-600 font-medium"
                          onClick={() => handleOpenAssignDialog(vehicle)}
                          disabled={isActionLoading === vehicle.id}
                        >
                          <User className="h-4 w-4 mr-2" />
                          {t('admin.vehicleManagement.assign', 'Забронировать')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {t('admin.vehicleManagement.assignVehicle', 'Забронировать машину')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedVehicle && (
                <div className="p-3 bg-theme-bg-tertiary rounded-lg">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-theme-accent" />
                    <div>
                      <p className="font-semibold">{selectedVehicle.model || 'Неизвестная модель'}</p>
                      <p className="text-sm text-theme-text-secondary">
                        {selectedVehicle.license_plate || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-theme-text-primary mb-2">
                  {t('admin.vehicleManagement.selectWorker', 'Выберите работника')}
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-text-muted" />
                  <Input
                    placeholder={t('admin.vehicleManagement.searchWorkers', 'Поиск работников...')}
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedWorkerId?.toString() || ''} onValueChange={(value) => setSelectedWorkerId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.vehicleManagement.selectWorker', 'Выберите работника')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWorkers.map((worker) => {
                      const firstName = worker.first_name || '';
                      const lastName = worker.last_name || '';
                      const name = `${firstName} ${lastName}`.trim() || worker.email || `ID: ${worker.id}`;
                      return (
                        <SelectItem key={worker.id} value={worker.id.toString()}>
                          {name} {worker.email && `(${worker.email})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text-primary mb-2">
                    {t('admin.vehicleManagement.dateFrom', 'С даты')}
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text-primary mb-2">
                    {t('admin.vehicleManagement.dateTo', 'По дату')}
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedWorkerId || isActionLoading !== null}
                className="bg-blue-500 text-white border border-blue-600 font-medium"
              >
                {isActionLoading !== null ? (
                  <>
                    <X className="h-4 w-4 animate-spin mr-2" />
                    {t('common.processing', 'Обработка...')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t('admin.vehicleManagement.assign', 'Забронировать')}
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

export default VehicleManagement;

