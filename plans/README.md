# Animation audit and plans

Audit made with the `improve-animations` skill (Emil Kowalski's motion rules) on commit f8bbc6a. Changes were built with `animate-expo`. Motion stack after the work: Reanimated 4.7 + react-native-worklets 0.13 + Gesture Handler 3.3. Shared tokens live in `app/src/ui/motion.js` and `app/src/ui/physics.js`.

## Recon

- **Before:** core `Animated` + `PanResponder`, one spring helper (`spring(response, damping)`), a reduced-motion hook, and no easing tokens.
- **Motion surfaces and how often they're seen:**

  | Surface | Frequency |
  | --- | --- |
  | Press feedback on cards and buttons | tens/day |
  | 翻翻 swipe deck | tens/day while sorting |
  | Bottom sheets (save, menu, settings, picker) | occasional |
  | Toast | occasional |
  | Tab switches | 100+/day — no animation, correct, kept |
  | Post detail | tens/day — appears instantly, kept |

- **Personality:** calm editorial / film-print app. Crisp, with bounce only where a gesture carried momentum.

## Findings (vetted)

| # | Severity | Category | Location | Finding | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Interruptibility / performance | `app/src/collection/ui/DeckScreen.js` SwipeCard | Drag ran through `PanResponder` and JS-driven `Animated` (`useNativeDriver: false`). Release was decided by distance only (90pt), so a quick short flick sprang back. The fly-out used fixed 220ms default easing and ignored the finger's velocity. | Gesture Handler pan + shared values on the UI thread. `releaseDirection` judges where the flick was heading (`project(velocity)`). Fly-out is 200ms `bezier(0.23, 1, 0.32, 1)`. Spring-back is `{ duration: 400, dampingRatio: 0.8, velocity }`. Grabbing mid-spring continues from where the card is. | DONE |
| 2 | MEDIUM | Missed opportunity / physicality | DeckScreen under card | The card underneath sat at a static `translateY 10, scale 0.96`, then snapped to full size when it became the top card. | It grows into place as the top card is dragged away, driven by the same shared value, so the hand-over never jumps. | DONE |
| 3 | MEDIUM | Interruptibility / missed opportunity | `app/src/collection/ui/base.js` Sheet | The sheet showed a drag handle that could not be dragged, and the panel only had an entrance. | Handle and title row drag. Down follows the finger, up rubber-bands, and release closes past 40% of the panel *projected by velocity*, or springs home with `{ duration: 300, dampingRatio: 0.8, velocity }`. The scrim fades with the panel. | DONE |
| 4 | MEDIUM | Physicality / exit | `app/src/collection/ui/Overlays.js` Toast | Pure fade-in (no transform) in 180ms default easing, no exit (it vanished), and a new message re-faded the same view in place. | `FadeInDown` 250ms / `FadeOutDown` 200ms on the strong ease-out, keyed per message. Reduced motion: opacity only. | DONE |
| 5 | LOW | Easing / cohesion | `app/src/collection/ui/base.js` PressScale | Spring press (response 0.25) with an *instant* opacity change, so two different timings on one press. | One Reanimated CSS transition on transform + opacity, 120ms `cubic-bezier(0.23, 1, 0.32, 1)`. Reduced motion keeps only the dim. | DONE |
| 6 | LOW | Cohesion / tokens | `app/src/ui/motion.js` | No shared easing; durations and springs typed per call site. | `EASE_OUT`, `EASE_OUT_CSS`, `SPRING_SETTLE`, `SPRING_SHEET`, `project`, `rubberband`. | DONE |

## Deliberately not animated

- **Tab switches:** they're peers and are hit constantly.
- **Opening a post:** opened tens of times a day, so it appears instantly. A transition here would cost more than it explains.
- **Card wall entrances:** the wall is a virtualised list, and entrances there are an anti-pattern.

## Feel-check on a device (release build, slowest phone available)

- **翻翻:** flick a card a short distance quickly (it should commit). Drag it far and pull back slowly (it should return). Grab a card while it springs back (no jump). Watch the next card rise as you drag.
- **Sheets:** drag the handle down slowly, then flick it. Try pulling it up (it should resist). Drag halfway and let go (it should return).
- **Toast:** trigger two actions in a row. The first should leave as the second arrives.
- **Reduced motion:** turn on Android "Remove animations". Cards should switch with no fly-out, sheets fade, and toasts fade.
