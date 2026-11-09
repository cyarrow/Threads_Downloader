// What a finished download saved, for its toast: 「1 部影片、3 張圖片」.
// Entries look like { code, url, author, caption, videos, images, savedAt }.
export function summary({ videos = 0, images = 0 }) {
  return [videos > 0 && `${videos} 部影片`, images > 0 && `${images} 張圖片`]
    .filter(Boolean)
    .join('、');
}
