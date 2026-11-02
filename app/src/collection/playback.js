// Video playback rules for the detail page. Pure: no React, no React Native, so
// the rules are unit-tested in test/playback.test.mjs.
//
// 1. At most one video plays at a time, anywhere in the app. Each player claims
//    playback when it starts playing (from its own ▶ or the native controls) and
//    the player that held it is paused. expo-video does not do this for us: on
//    Android all players of the app share one audio focus, so a second player
//    starting does not stop the first.
// 2. In a carousel only the page on screen may have a player. Swiping (or tapping
//    a page mark) to another page returns the playing page to its poster + ▶.

// A "player" is anything with pause(): expo-video's VideoPlayer in the app,
// a plain object in the tests.
export function createPlaybackFocus() {
  let current = null;
  return {
    // `player` started playing: pause whichever player was playing before.
    claim(player) {
      const previous = current;
      current = player;
      if (previous && previous !== player) {
        try {
          previous.pause();
        } catch {
          // Already released (its page closed): nothing left to pause.
        }
      }
    },
    // `player` paused or is going away: stop tracking it, so a later claim never
    // touches a released player.
    drop(player) {
      if (current === player) current = null;
    },
    current: () => current,
  };
}

// The app-wide instance used by the detail page.
export const playbackFocus = createPlaybackFocus();

// Which carousel page keeps its player after the pager settles on `page`
// (-1 = none). Leaving the playing page sends it back to its poster.
export function playingAfterPageChange(playingIndex, page) {
  return playingIndex === page ? playingIndex : -1;
}
