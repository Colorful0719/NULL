export const ECHO_PHOTO_ASSETS = Object.freeze({
  'CH2-MIO-PHOTO-01': './assets/images/ch2/echo/ch2_mio_photo_01.png',
  'CH2-MIO-PHOTO-02': './assets/images/ch2/echo/ch2_mio_photo_02.png',
  'CH2-GROUP-PHOTO-01': './assets/images/ch2/echo/ch2_group_photo_01.png'
});

export const resolveEchoPhoto = (photo) => {
  if (!photo) return null;
  if (typeof photo === 'string') return { id: photo, src: ECHO_PHOTO_ASSETS[photo] ?? null, alt: 'ECHO 照片預覽' };
  return { id: photo.id, src: photo.src ?? ECHO_PHOTO_ASSETS[photo.id] ?? null, alt: photo.alt ?? 'ECHO 照片預覽' };
};
