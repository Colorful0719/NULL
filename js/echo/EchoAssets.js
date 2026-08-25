export const ECHO_PHOTO_ASSETS = Object.freeze({
  'CH2-MIO-PHOTO-01': null,
  'CH2-MIO-PHOTO-02': null,
  'CH2-GROUP-PHOTO-01': null
});

export const resolveEchoPhoto = (photo) => {
  if (!photo) return null;
  if (typeof photo === 'string') return { id: photo, src: ECHO_PHOTO_ASSETS[photo] ?? null, alt: 'ECHO 照片預覽' };
  return { id: photo.id, src: photo.src ?? ECHO_PHOTO_ASSETS[photo.id] ?? null, alt: photo.alt ?? 'ECHO 照片預覽' };
};
