import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitStopReason } from '@/requests/stop-reason';
import { toastSuccess, toastError } from '@/lib/toasts';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const stopReasonSchema = z.object({
  reason: z.enum(['REST', 'PERSONAL', 'BREAKDOWN'], {
    message: 'Выберите причину остановки',
  }),
});

type StopReasonFormData = z.infer<typeof stopReasonSchema>;

const StopReasonPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const tripId = searchParams.get('trip_id');
  const stopStateId = searchParams.get('stop_state_id');

  const form = useForm<StopReasonFormData>({
    resolver: zodResolver(stopReasonSchema) as any,
    defaultValues: {
      reason: 'REST' as 'REST' | 'PERSONAL' | 'BREAKDOWN',
    },
  });

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  useEffect(() => {
    if (!tripId || !stopStateId) {
      toastError(t('stopReason.errorMissingParams'));
    }
  }, [tripId, stopStateId, t]);

  const onSubmit = async (data: StopReasonFormData) => {
    if (!tripId || !stopStateId) {
      toastError(t('stopReason.errorMissingParams'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitStopReason({
        reason: data.reason as 'REST' | 'PERSONAL' | 'BREAKDOWN',
        trip_id: parseInt(tripId),
        stop_state_id: parseInt(stopStateId),
      });
      toastSuccess(t('stopReason.success'));
      
      // Закрываем WebApp после успешной отправки
      if (window.Telegram && window.Telegram.WebApp) {
        setTimeout(() => {
          window.Telegram.WebApp.close();
        }, 1500);
      }
    } catch (error: any) {
      toastError(error.message || t('stopReason.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tripId || !stopStateId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="text-xl md:text-2xl font-bold mb-3">{t('common.error', 'Ошибка')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('stopReason.errorMissingParams')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Safe area для Telegram кнопок сверху */}
      <div className="pb-4 px-4 md:px-6" style={{ paddingTop: '16rem', marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold mb-2">{t('stopReason.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('stopReason.subtitle')}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Причина остановки */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('stopReason.reason')} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="h-14 text-base">
                        <SelectValue placeholder={t('stopReason.reasonPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="REST" className="text-base py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">😴</span>
                          <div>
                            <div className="font-semibold">{t('stopReason.rest')}</div>
                            <div className="text-xs text-muted-foreground">{t('stopReason.restDescription')}</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="PERSONAL" className="text-base py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">👤</span>
                          <div>
                            <div className="font-semibold">{t('stopReason.personal')}</div>
                            <div className="text-xs text-muted-foreground">{t('stopReason.personalDescription')}</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="BREAKDOWN" className="text-base py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🔧</span>
                          <div>
                            <div className="font-semibold">{t('stopReason.breakdown')}</div>
                            <div className="text-xs text-muted-foreground">{t('stopReason.breakdownDescription')}</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
                )}
              />

              {/* Кнопка отправки */}
              <div className="pt-4 pb-safe" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-base font-semibold shadow-lg"
                  size="lg"
                >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('stopReason.submitting')}
                  </span>
                ) : (
                  `✓ ${t('stopReason.submit')}`
                )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default StopReasonPage;

