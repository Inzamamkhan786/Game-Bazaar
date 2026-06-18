const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';

export const getImageUrl = (image) => {
  if (!image) return '';
  if (/^(https?:|blob:|data:)/i.test(image)) return image;
  return `${API_BASE}/${image.replace(/^\/+/, '')}`;
};