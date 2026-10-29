// Image source for expo-image from a stored value: a bundled asset (number, used
// by the prototype/E2E fake data), or a file:// / https:// URI string.
export function imageSource(value) {
  if (typeof value === 'number') return value;
  return value ? { uri: value } : null;
}

// What a card shows: the saved full-resolution cover if we have it, otherwise the
// post's remote still while the cover is still downloading.
export function cardStill(post) {
  return imageSource(post.cover) || imageSource(post.media[0]?.poster || post.media[0]?.image);
}
