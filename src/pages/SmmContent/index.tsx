import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Heart, ExternalLink, Star } from 'lucide-react';
import { getFacilities, FacilityOut } from '@/requests/facility';
import { fetchMediaByObjectId, convertS3Url, MediaItem, toggleMediaLike, getLikedMedia } from '@/requests/media';
import { toastError } from '@/lib/toasts';
import useBackButton from '@/hooks/useBackButton';
import i18n from '@/i18n/config';
import type { RootState } from '@/store/config';

type MediaGroup = {
  date: string;
  dateLabel: string;
  photos: MediaItem[];
  videos: MediaItem[];
};

const SmmContent: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.data.user);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [likedMediaIds, setLikedMediaIds] = useState<Set<number>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState<boolean>(false);
  const [likedMedia, setLikedMedia] = useState<MediaItem[]>([]);
  const [loadingLikedMedia, setLoadingLikedMedia] = useState<boolean>(false);

  useBackButton('/');

  // Загружаем список лайкнутых медиа при загрузке
  useEffect(() => {
    const loadLikedMedia = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getLikedMedia(user.id, 100, 0);
        const likedIds = new Set(result.items.map(m => m.id));
        setLikedMediaIds(likedIds);
        setLikedMedia(result.items);
      } catch (error) {
        console.error('Failed to load liked media:', error);
      }
    };
    
    loadLikedMedia();
  }, [user?.id]);

  // Загружаем лайкнутые медиа при переключении режима
  useEffect(() => {
    const loadLikedMediaList = async () => {
      if (!showLikedOnly || !user?.id) {
        setLikedMedia([]);
        return;
      }
      
      setLoadingLikedMedia(true);
      try {
        const result = await getLikedMedia(user.id, 100, 0);
        setLikedMedia(result.items || []);
      } catch (error) {
        console.error('Failed to load liked media list:', error);
        toastError(t('smm.errorLoadingMedia', 'Ошибка загрузки медиа'));
        setLikedMedia([]);
      } finally {
        setLoadingLikedMedia(false);
      }
    };
    
    loadLikedMediaList();
  }, [showLikedOnly, user?.id, t]);

  useEffect(() => {
    const loadFacilities = async () => {
      setLoadingFacilities(true);
      setError(null);
      try {
        // Объекты загружаются из bot-api со статическим токеном, не нужно ждать JWT токен
        console.log('[SmmContent] Fetching facilities from bot-api...');
        const response = await getFacilities();
        if (response.error) {
          throw new Error(t('smm.errorLoadingFacilities', 'Не удалось загрузить объекты'));
        }
        const data = response.data || [];
        console.log('[SmmContent] Facilities loaded:', data.length);
        setFacilities(Array.isArray(data) ? data : []);
        if (!selectedId && Array.isArray(data) && data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (e: any) {
        console.error('[SmmContent] Error loading facilities:', e);
        setError(e?.message ?? t('smm.error', 'Ошибка загрузки'));
        toastError(e?.message ?? t('smm.error', 'Ошибка загрузки'));
        // Retry через 2 секунды
        setTimeout(() => {
          getFacilities().then(retryResponse => {
            if (!retryResponse.error) {
              const data = retryResponse.data || [];
              setFacilities(Array.isArray(data) ? data : []);
              if (!selectedId && Array.isArray(data) && data.length > 0) {
                setSelectedId(data[0].id);
              }
            }
          }).finally(() => {
            setLoadingFacilities(false);
          });
        }, 2000);
        return;
      } finally {
        setLoadingFacilities(false);
      }
    };
    loadFacilities();
  }, [t, selectedId]);

  useEffect(() => {
    const loadMedia = async () => {
      if (!selectedId) {
        setMedia([]);
        return;
      }
      setLoadingMedia(true);
      setMediaError(null);
      try {
        const data = await fetchMediaByObjectId(selectedId, 100, 0);
        const items = Array.isArray(data?.items) ? data.items : [];
        setMedia(items);
      } catch (e: any) {
        setMediaError(e?.message ?? t('smm.errorLoadingMedia', 'Ошибка загрузки медиа'));
        toastError(e?.message ?? t('smm.errorLoadingMedia', 'Ошибка загрузки медиа'));
      } finally {
        setLoadingMedia(false);
      }
    };
    loadMedia();
  }, [selectedId, t]);

  const selected = useMemo(
    () => facilities.find(f => f.id === selectedId) ?? null,
    [facilities, selectedId]
  );

  // Группируем медиа по дням
  const mediaGroups = useMemo(() => {
    const groups: Record<string, MediaGroup> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mediaToGroup = showLikedOnly ? likedMedia : media;
    
    mediaToGroup.forEach(m => {
      const date = new Date(m.created_at);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!groups[dateKey]) {
        let dateLabel = date.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'uk' ? 'uk-UA' : i18n.language === 'de' ? 'de-DE' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        if (date.getTime() === today.getTime()) {
          dateLabel = t('smm.today', 'Сегодня');
        } else if (date.getTime() === yesterday.getTime()) {
          dateLabel = t('smm.yesterday', 'Вчера');
        }
        
        groups[dateKey] = {
          date: dateKey,
          dateLabel,
          photos: [],
          videos: []
        };
      }
      
      const contentType = m.content_type?.toLowerCase() || '';
      if (contentType.startsWith('image/')) {
        groups[dateKey].photos.push(m);
      } else if (contentType.startsWith('video/')) {
        groups[dateKey].videos.push(m);
      }
    });

    // Сортируем группы по дате (новые сверху)
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [media, likedMedia, showLikedOnly, t]);

  // Обработка лайка
  const handleLike = async (mediaId: number) => {
    if (!user?.id) {
      toastError('Необходимо войти в систему');
      return;
    }

    const wasLiked = likedMediaIds.has(mediaId);

    // Оптимистичное обновление
    const newLikedIds = new Set(likedMediaIds);
    if (wasLiked) {
      newLikedIds.delete(mediaId);
    } else {
      newLikedIds.add(mediaId);
    }
    setLikedMediaIds(newLikedIds);

    try {
      const result = await toggleMediaLike(mediaId, user.id);
      setLikedMediaIds(prev => {
        const newSet = new Set(prev);
        if (result.is_liked) {
          newSet.add(mediaId);
        } else {
          newSet.delete(mediaId);
        }
        return newSet;
      });
    } catch (error: any) {
      // Откат при ошибке
      setLikedMediaIds(likedMediaIds);
      toastError(error?.message || 'Ошибка при лайке');
    }
  };

  // Открытие просмотра медиа
  const openMediaViewer = (mediaItems: MediaItem[], startIndex: number = 0) => {
    const imageUrls = mediaItems.map(m => convertS3Url(m.s3_path));
    setSelectedImages(imageUrls);
    setSelectedImageIndex(startIndex);
  };
  
  // Навигация по изображениям
  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImages.length === 0) return;
    if (direction === 'prev') {
      setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : selectedImages.length - 1));
    } else {
      setSelectedImageIndex(prev => (prev < selectedImages.length - 1 ? prev + 1 : 0));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen page bg-theme-bg-primary" style={{ paddingTop: '16rem', marginTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex flex-col md:flex-row h-[calc(100vh-16rem)]">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-theme-bg-card md:border-r border-b md:border-b-0 border-theme-border overflow-y-auto">
          <div className="p-3 md:p-4 border-b border-theme-border sticky top-0 bg-theme-bg-card z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-theme-bg-tertiary rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-theme-text-primary" />
              </button>
              <h1 className="text-lg md:text-xl font-bold text-theme-text-primary">{t('smm.groups', 'Группы')}</h1>
            </div>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg m-4">
              {t('smm.error', 'Ошибка')}: {error}
            </div>
          )}

          {loadingFacilities && (
            <div className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-16 bg-theme-bg-tertiary rounded"></div>
                <div className="h-16 bg-theme-bg-tertiary rounded"></div>
              </div>
            </div>
          )}

          <ul className="p-2 space-y-2">
            {facilities.map(item => (
              <li
                key={item.id}
                className={`p-2 md:p-3 rounded-lg cursor-pointer transition-all ${
                  selectedId === item.id
                    ? 'bg-theme-accent/10 border-2 border-theme-accent'
                    : 'bg-theme-bg-tertiary border-2 border-transparent hover:border-theme-accent/50'
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="font-semibold text-sm md:text-base text-theme-text-primary mb-1 truncate">
                  {item.name || `${t('smm.object', 'Объект')} #${item.id}`}
                </div>
                {item.invite_link && (
                  <div className="text-xs text-theme-text-muted">
                    {t('smm.hasInviteLink', 'Есть ссылка')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Content - Instagram Feed Style */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-4 md:py-6">
            {/* Header */}
            <div className="mb-6 px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-theme-text-primary">
                  {showLikedOnly 
                    ? t('smm.likedOnly', 'Только лайкнутые')
                    : (selected?.name ?? t('smm.contentByGroup', 'Контент по группам'))
                  }
                </h2>
                <div className="flex items-center gap-3">
                  {!showLikedOnly && selected?.invite_link && (
                    <a
                      href={selected.invite_link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent/90 transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('smm.goToGroup', 'Перейти в группу')}
                    </a>
                  )}
                  <button
                    onClick={() => setShowLikedOnly(!showLikedOnly)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                      showLikedOnly
                        ? 'bg-theme-accent text-white hover:bg-theme-accent/90'
                        : 'bg-theme-bg-tertiary text-theme-text-primary hover:bg-theme-bg-secondary border border-theme-border'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${showLikedOnly ? 'fill-white' : ''}`} />
                    {showLikedOnly ? t('smm.showAll', 'Показать все') : t('smm.showLiked', 'Показать лайкнутые')}
                  </button>
                </div>
              </div>
            </div>

            {mediaError && (
              <div className="p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg mb-4 mx-4">
                {t('smm.error', 'Ошибка')}: {mediaError}
              </div>
            )}

            {(loadingMedia || loadingLikedMedia) && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-accent"></div>
              </div>
            )}

            {!loadingMedia && !loadingLikedMedia && mediaGroups.length === 0 && (
              <div className="text-center py-12 text-theme-text-secondary">
                {showLikedOnly 
                  ? t('smm.noLikedMedia', 'Нет лайкнутых медиа')
                  : t('smm.noMediaFound', 'Медиа не найдено')
                }
              </div>
            )}

            {/* Feed - Groups by Date */}
            {!loadingMedia && mediaGroups.map((group) => (
              <div key={group.date} className="mb-8">
                {/* Date Header */}
                <div className="px-4 mb-4">
                  <h3 className="text-lg font-semibold text-theme-text-primary border-b border-theme-border pb-2">
                    {group.dateLabel}
                  </h3>
                </div>

                {/* Photos Section */}
                {group.photos.length > 0 && (
                  <div className="mb-6">
                    <div className="grid grid-cols-3 gap-1 md:gap-2 px-4">
                      {group.photos.map((photo, index) => {
                        const photoUrl = convertS3Url(photo.s3_path);
                        const isLiked = likedMediaIds.has(photo.id);
                        
                        return (
                          <div
                            key={photo.id}
                            className="relative group aspect-square bg-theme-bg-card rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => {
                              openMediaViewer(group.photos, index);
                            }}
                          >
                            <img
                              src={photoUrl}
                              alt={photo.filename}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLike(photo.id);
                                }}
                                className="px-3 py-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                              >
                                <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                              </button>
                            </div>
                            {isLiked && (
                              <div className="absolute top-2 right-2">
                                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Videos Section */}
                {group.videos.length > 0 && (
                  <div className="px-4">
                    <div className="space-y-4">
                      {group.videos.map((video) => {
                        const videoUrl = convertS3Url(video.s3_path);
                        const isLiked = likedMediaIds.has(video.id);
                        
                        return (
                          <div
                            key={video.id}
                            className="bg-theme-bg-card rounded-lg overflow-hidden border border-theme-border"
                          >
                            <div className="relative">
                              <video
                                controls
                                preload="metadata"
                                className="w-full"
                                title={video.filename}
                              >
                                <source src={videoUrl} type={video.content_type || 'video/mp4'} />
                                <source src={videoUrl} type="video/mp4" />
                                {t('smm.videoNotSupported', 'Ваш браузер не поддерживает видео.')}
                              </video>
                              <div className="absolute top-2 right-2">
                                <button
                                  onClick={() => handleLike(video.id)}
                                  className="px-3 py-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                                >
                                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                </button>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-theme-text-secondary">
                                  {formatTime(video.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Viewer - Fullscreen */}
      {selectedImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setSelectedImages([])}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImages([]);
            }}
            className="absolute top-4 right-4 z-10 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            ✕ {t('common.close', 'Закрыть')}
          </button>
          
          {selectedImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('prev');
                }}
                className="absolute left-4 z-10 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                ←
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('next');
                }}
                className="absolute right-4 z-10 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                →
              </button>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                {selectedImageIndex + 1} / {selectedImages.length}
              </div>
            </>
          )}
          
          <img
            src={selectedImages[selectedImageIndex]}
            alt="View"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default SmmContent;
