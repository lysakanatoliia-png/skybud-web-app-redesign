import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import i18n from '@/i18n/config';
import { Plus, Minus } from 'lucide-react';
import { getWorkerPayroll } from '../../requests/worker';
import { WorkerPayrollOut } from '../../requests/worker/types';
import { toastError } from '../../lib/toasts';
import useBackButton from '@/hooks/useBackButton';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import { DateInput } from '@/components/ui/date-input';

const Salary: FC = () => {
  const { t } = useTranslation();
  useBackButton('/');
  const user = useSelector((state: any) => state.data.user);
  const [salaryData, setSalaryData] = useState<WorkerPayrollOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [dateModalOpen, setDateModalOpen] = useState(false);
  // Краще зчитувати актуальні query-params для value (щоб навіть якщо salaryData ще не оновився — інпути показували обране)
  const searchParams = new URLSearchParams(location.search);
  const queryFrom = searchParams.get('from') || searchParams.get('date_from');
  const queryTo = searchParams.get('to') || searchParams.get('date_to');
  const isValidDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const shownPeriodFrom = isValidDate(queryFrom) ? queryFrom : (salaryData?.period?.date_from || '');
  const shownPeriodTo = isValidDate(queryTo) ? queryTo : (salaryData?.period?.date_to || '');

  const [periodFrom, setPeriodFrom] = useState(shownPeriodFrom);
  const [periodTo, setPeriodTo] = useState(shownPeriodTo);

  useEffect(() => {
    setPeriodFrom(shownPeriodFrom);
    setPeriodTo(shownPeriodTo);
  }, [shownPeriodFrom, shownPeriodTo]);

  useEffect(() => {
    const fetchSalaryData = async () => {
      if (!user?.id) return;

      const search = new URLSearchParams(location.search);
      const rawFrom = search.get('from') || search.get('date_from');
      const rawTo = search.get('to') || search.get('date_to');

      const isValidDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

      const date_from = isValidDate(rawFrom) ? rawFrom : undefined;
      const date_to = isValidDate(rawTo) ? rawTo : undefined;

      const response = await getWorkerPayroll(user.id, { date_from, date_to });
      
      if (response.error) {
        console.error('Failed to fetch salary data:', response);
        toastError(t('salary.loadError'));
        setIsLoading(false);
        return;
      }
      
      setSalaryData(response.data);
      setIsLoading(false);
    };

    fetchSalaryData();
  }, [user?.id, t, location.search]);

  const handlePeriodCardClick = () => {
    setDateModalOpen(true);
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDateModalOpen(false);
    const params = new URLSearchParams(location.search);
    if (periodFrom) params.set('from', periodFrom);
    if (periodTo) params.set('to', periodTo);
    navigate({ search: params.toString() });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen page bg-theme-bg-primary p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-theme-text-primary mb-8">{t('salary.title')}</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-theme-text-secondary text-lg">{t('common.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!salaryData) {
    return (
      <div className="min-h-screen page bg-theme-bg-primary p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-theme-text-primary mb-8">{t('salary.title')}</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-theme-text-secondary text-lg">{t('salary.noData')}</div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };

  const salaryCards = [
    {
      value: salaryData.base_calculation.work_processes_count,
      label: t('salary.workProcesses'),
      textSize: 'text-4xl'
    },
    {
      value: `${formatDate(salaryData.period.date_from)} — ${formatDate(salaryData.period.date_to)}`,
      label: t('salary.period'),
      textSize: 'text-3xl'
    },
    {
      value: formatTime(salaryData.base_calculation.total_hours),
      label: t('salary.totalHours'),
      textSize: 'text-3xl'
    },
    {
      value: formatCurrency(salaryData.base_calculation.base_salary),
      label: t('salary.baseSalary'),
      textSize: 'text-4xl'
    },
    {
      value: salaryData.adjustments.penalties.count + salaryData.adjustments.prepayments.count + salaryData.adjustments.awards.count,
      label: t('salary.adjustments'),
      textSize: 'text-4xl'
    },
    {
      value: formatCurrency(salaryData.final_salary),
      label: t('salary.finalSalary'),
      textSize: 'text-4xl',
      isAccent: true
    }
  ];

  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <Modal isVisible={dateModalOpen} setIsVisible={setDateModalOpen}>
        <form onSubmit={handleDateSubmit}>
          <div className="text-xl font-bold mb-4">{t('salary.pickPeriod')}</div>
          <div className="flex flex-col gap-4 mb-6">
            <label className="flex flex-col gap-2 items-start w-full">
              <span className="text-sm">{t('salary.periodFrom')}</span>
              <DateInput
                type="date"
                value={periodFrom || ''}
                onChange={e => setPeriodFrom(e.target.value)}
                placeholder="YYYY-MM-DD"
                required
              />
            </label>
            <label className="flex flex-col gap-2 items-start w-full">
              <span className="text-sm">{t('salary.periodTo')}</span>
              <DateInput
                type="date"
                value={periodTo || ''}
                onChange={e => setPeriodTo(e.target.value)}
                placeholder="YYYY-MM-DD"
                required
              />
            </label>
          </div>
          <div className="flex gap-3 mt-4 justify-center">
            <button type="button" onClick={() => setDateModalOpen(false)} className="px-6 py-2 rounded-xl border border-theme-border bg-theme-bg-tertiary text-theme-text-secondary hover:bg-theme-bg-primary transition-all">{t('common.cancel')}</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-theme-accent text-white hover:bg-theme-accent-hover transition-all">{t('salary.show')}</button>
          </div>
        </form>
      </Modal>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-theme-text-primary mb-8">{t('salary.title')}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-2 gap-6">
            {salaryCards.map((card, index) => (
              <div
                key={index}
                className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors"
                onClick={card.label === t('salary.period') ? handlePeriodCardClick : undefined}
                style={card.label === t('salary.period') ? { cursor: 'pointer' } : {}}
              >
                <div className="text-center">
                  <div className={`${card.textSize} font-bold ${card.isAccent ? 'text-theme-accent' : 'text-theme-text-primary'} mb-3`}>
                    {card.value}
                  </div>
                  <div className="text-lg text-theme-text-secondary font-medium">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-theme-bg-card border border-theme-border rounded-xl">
            <div className="p-6 pb-4">
              <h3 className="text-theme-text-primary text-2xl font-bold">{t('salary.totalToPay')}</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Plus className="h-6 w-6 text-theme-success" />
                  <span className="text-theme-text-secondary text-lg font-medium">{t('salary.baseSalary')}</span>
                </div>
                <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.base_calculation.base_salary)}</span>
              </div>
              
              {salaryData.adjustments.prepayments.total > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Plus className="h-6 w-6 text-theme-success" />
                    <span className="text-theme-text-secondary text-lg font-medium">{t('salary.advances')}</span>
                  </div>
                  <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.adjustments.prepayments.total)}</span>
                </div>
              )}
              
              {salaryData.adjustments.awards.total > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Plus className="h-6 w-6 text-theme-success" />
                    <span className="text-theme-text-secondary text-lg font-medium">{t('salary.bonuses')}</span>
                  </div>
                  <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.adjustments.awards.total)}</span>
                </div>
              )}
              
              {salaryData.adjustments.penalties.total > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Minus className="h-6 w-6 text-theme-error" />
                    <span className="text-theme-text-secondary text-lg font-medium">{t('salary.penalties')}</span>
                  </div>
                  <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.adjustments.penalties.total)}</span>
                </div>
              )}

              <div className="border-t-2 border-theme-border pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-theme-text-primary font-bold text-xl">{t('salary.finalSalary')}</span>
                  <span className="text-4xl font-bold text-theme-accent">{formatCurrency(salaryData.final_salary)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Salary;
