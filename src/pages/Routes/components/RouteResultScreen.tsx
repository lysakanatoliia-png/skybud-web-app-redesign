import { FC, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type RoutePoint = {
  id: number;
  title: string;
  address?: string;
  description?: string;
};

type SortableItemProps = {
  point: RoutePoint;
  idx: number;
  onDelete: (id: number) => void;
  t: any;
};

const SortableItem: FC<SortableItemProps> = ({ point, idx, onDelete, t }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: point.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-theme-border-primary bg-theme-bg-secondary p-6 shadow-sm touch-none"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="text-theme-text-muted hover:text-theme-primary cursor-grab active:cursor-grabbing p-1"
          >
            <GripVertical className="h-6 w-6" />
          </button>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-theme-primary text-white font-semibold text-lg flex-shrink-0">
            {idx + 1}
          </div>
          <h3 className="text-xl font-semibold text-theme-text-primary">
            {point.title}
          </h3>
        </div>
        <button
          onClick={() => onDelete(point.id)}
          className="text-red-400 hover:text-red-500 transition-colors"
          aria-label={t('common.delete', 'Delete')}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      
      {point.address && (
        <div className="ml-11 mb-2">
          <div className="text-base text-theme-text-muted">
            <strong>{t('routes.addressLabel', 'Address')}:</strong> {point.address}
          </div>
        </div>
      )}
      
      {point.description && (
        <div className="ml-11">
          <div className="text-base text-theme-text-muted">
            {point.description}
          </div>
        </div>
      )}
    </div>
  );
};

const RouteResultScreen: FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();

  const initialPoints: RoutePoint[] = (location.state?.points as RoutePoint[]) ?? [];
  const [points, setPoints] = useState<RoutePoint[]>(initialPoints);
  const returnScreen = location.state?.returnScreen || 'main';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPoints((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAdd = () => {
    navigate('/routes', { state: { points } });
  };

  const handleSave = () => {
    console.log('Saving route:', points);
    navigate('/routes', { replace: true });
  };

  const handleDelete = (id: number) => {
    const updatedPoints = points.filter(p => p.id !== id);
    setPoints(updatedPoints);
    navigate('/routes/result', { 
      state: { 
        points: updatedPoints,
        returnScreen 
      } 
    });
  };


  return (
    <div className="page min-h-screen bg-theme-bg-primary pb-32 p-6">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h2 className="text-3xl font-semibold mb-6 text-theme-text-primary">
          {t('routes.routePoints', 'Route Points')}
        </h2>

        {points.length === 0 ? (
          <div className="text-theme-text-muted text-xl text-center py-12">
            {t('routes.emptyPoints', 'No route points yet')}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={points.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {points.map((point, idx) => (
                  <SortableItem
                    key={point.id}
                    point={point}
                    idx={idx}
                    onDelete={handleDelete}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-0 bg-theme-bg-primary/95 backdrop-blur p-4 border-t border-theme-border-primary">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-3">
          <button
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-theme-primary text-white text-lg font-medium"
            onClick={handleAdd}
          >
            <Plus className="h-6 w-6" /> {t('common.add', 'Add Point')}
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg border border-theme-border-primary text-theme-text-primary text-lg font-medium"
            onClick={handleSave}
            disabled={points.length === 0}
          >
            <Save className="h-6 w-6" /> {t('common.save', 'Save Route')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteResultScreen;

