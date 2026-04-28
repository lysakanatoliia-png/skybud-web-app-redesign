import { FC } from 'react';
// link not used directly, shared card handles it
import { useTranslation } from 'react-i18next';
import { Building, Building2, Users, CheckSquare, ArrowRight, Clock, Car, Settings } from 'lucide-react';
import useBackButton from '@/hooks/useBackButton';
import FeatureLinkCard from '@/components/ui/FeatureLinkCard';

const Admin: FC = () => {
  const { t } = useTranslation();
  useBackButton('/');

  const adminCards = [
    {
      title: t('admin.facilities.title'),
      description: t('admin.facilities.subtitle'),
      icon: <Building className="h-6 w-6" />,
      color: "blue",
      link: "/admin/facilities"
    },
    {
      title: t('admin.facilityTypes.title'),
      description: t('admin.facilityTypes.subtitle'),
      icon: <Building2 className="h-6 w-6" />,
      color: "green",
      link: "/admin/facility-types"
    },
    {
      title: t('admin.workers.title'),
      description: t('admin.workers.subtitle'),
      icon: <Users className="h-6 w-6" />,
      color: "orange",
      link: "/admin/workers"
    },
    {
      title: t('admin.tasks.title'),
      description: t('admin.tasks.subtitle'),
      icon: <CheckSquare className="h-6 w-6" />,
      color: "purple",
      link: "/admin/tasks"
    },
    {
      title: t('admin.workProcesses.title'),
      description: t('admin.workProcesses.subtitle'),
      icon: <Clock className="h-6 w-6" />,
      color: "blue",
      link: "/admin/work-processes"
    },
    {
      title: t('admin.vehicleReservations.title', 'Запросы на бронирование'),
      description: t('admin.vehicleReservations.subtitle', 'Управление запросами на бронирование авто'),
      icon: <Car className="h-6 w-6" />,
      color: "orange",
      link: "/admin/vehicle-reservations"
    },
    {
      title: t('admin.vehicleManagement.title', 'Управление машинами'),
      description: t('admin.vehicleManagement.subtitle', 'Прямое бронирование и освобождение машин'),
      icon: <Settings className="h-6 w-6" />,
      color: "blue",
      link: "/admin/vehicle-management"
    }
  ];

  // styles moved into FeatureLinkCard

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-theme-text-primary mb-4 bg-gradient-to-r from-theme-accent to-theme-accent-hover bg-clip-text text-transparent">
            {t('admin.title')}
          </h1>
          <p className="text-lg text-theme-text-secondary">
            {t('admin.subtitle')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {adminCards.map((card, index) => (
            <FeatureLinkCard
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon}
              color={card.color as any}
              to={card.link}
              rightIcon={<ArrowRight className="h-5 w-5" />}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
