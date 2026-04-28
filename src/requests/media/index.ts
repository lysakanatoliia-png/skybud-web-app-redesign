// MOCK режим: медіа — Unsplash-зображення з in-memory лайками.

export type MediaItem = {
  id: number;
  s3_path: string;
  url: string;
  filename: string;
  content_type: string;
  created_at: string;
  object_id: number | string;
  liked: boolean;
  is_liked: boolean;
  likes_count: number;
};

type MediaResponse = { items: MediaItem[]; status?: number };
type LikeResponse = { is_liked: boolean; liked: boolean; media_id: number };

const MOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
];

const likedSet = new Set<number>();
let mediaIdCounter = 1000;

// Пул усіх mock-медіа для getLikedMedia
const allMediaPool: MediaItem[] = MOCK_PHOTOS.map((url, i) => ({
  id: mediaIdCounter++,
  s3_path: url,
  url,
  filename: `photo_${i + 1}.jpg`,
  content_type: "image/jpeg",
  created_at: new Date(Date.now() - i * 86400_000).toISOString(),
  object_id: i + 1,
  liked: false,
  is_liked: false,
  likes_count: 0,
}));

// No-op у mock-режимі
export const convertS3Url = (url: string): string => url;

export const fetchMediaByObjectId = async (
  object_id: number | string,
  _limit?: number,
  _offset?: number
): Promise<MediaResponse> => {
  await new Promise((r) => setTimeout(r, 150));
  const seed = typeof object_id === "number" ? object_id : parseInt(String(object_id), 10) || 1;
  const count = (seed % 4) + 2;
  const items = MOCK_PHOTOS.slice(0, count).map((url, i) => {
    const id = seed * 100 + i;
    return {
      id,
      s3_path: url,
      url,
      filename: `object_${object_id}_${i + 1}.jpg`,
      content_type: "image/jpeg",
      created_at: new Date(Date.now() - i * 3600_000).toISOString(),
      object_id,
      liked: likedSet.has(id),
      is_liked: likedSet.has(id),
      likes_count: likedSet.has(id) ? 1 : 0,
    } as MediaItem;
  });
  return { items, status: 200 };
};

export const toggleMediaLike = async (
  media_id: number,
  _user_id?: number
): Promise<LikeResponse> => {
  await new Promise((r) => setTimeout(r, 50));
  const liked = !likedSet.has(media_id);
  if (liked) likedSet.add(media_id);
  else likedSet.delete(media_id);
  return { is_liked: liked, liked, media_id };
};

export const getLikedMedia = async (
  _user_id?: number,
  _limit?: number,
  _offset?: number
): Promise<MediaResponse> => {
  await new Promise((r) => setTimeout(r, 50));
  const items = allMediaPool
    .filter((m) => likedSet.has(m.id))
    .map((m) => ({ ...m, liked: true, is_liked: true }));
  return { items, status: 200 };
};
