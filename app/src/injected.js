// Script injected into the WebView that shows the Threads post. It runs inside the
// user's own logged-in Threads session and reports back what the page already
// contains: the JSON data blobs mentioning the post, and any <video> sources.
// Parsing happens on the React Native side (see threads.js) so it stays testable.
// `code` is null for /share/ links: the script then waits until Threads has
// redirected to /@user/post/CODE and reads the shortcode from the address.
//
// The post's JSON is in the page's HTML, so the script reads it as soon as the
// document is parsed instead of waiting for every image and script to load. To
// get there early it is injected several times while the page loads (the
// WebView's load progress), which is safe:
// - `nonce` names the request: a document already collecting for it ignores
//   the repeat, and the message carries it so a late reply is dropped.
// - `since` (epoch ms) is when the request started: a document whose navigation
//   began earlier is the previous page, still on screen when the injection lands,
//   and is left alone (it would report the previous post for a /share/ link).
// Without them (the downloader) the script runs once per call, as before.
const POLL_MS = 250;
const GIVE_UP_MS = 15000;

export function collectScript(id, code, nonce = null, since = 0) {
  return `
(function () {
  var id = ${JSON.stringify(id)};
  var code = ${JSON.stringify(code)};
  var nonce = ${JSON.stringify(nonce)};
  var since = ${Number(since) || 0};
  if (since && window.performance && performance.timeOrigin && performance.timeOrigin < since - 5) return;
  if (nonce !== null) {
    if (window.__tdNonce === nonce) return;
    window.__tdNonce = nonce;
  }
  var started = Date.now();
  var tries = 0;
  function collect() {
    if (document.readyState === 'loading') {
      setTimeout(collect, ${POLL_MS / 2});
      return;
    }
    tries++;
    var loggedOut = /\\/login/.test(location.pathname);
    if (!code) {
      var m = location.pathname.match(/\\/post\\/([A-Za-z0-9_-]+)/);
      if (m && tries > 1) {
        // Arrived via in-page navigation, so the post's data isn't embedded in this
        // document. Reload once; the fresh page load gets injected again.
        var key = 'td-reloaded-' + id + '-' + nonce;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          location.replace(location.href);
          return;
        }
      }
      if (m) code = m[1];
    }
    var json = [];
    if (code) {
      document.querySelectorAll('script[type="application/json"]').forEach(function (s) {
        var t = s.textContent || '';
        if (t.indexOf(code) !== -1 && (t.indexOf('video_versions') !== -1 || t.indexOf('image_versions2') !== -1)) {
          json.push(t);
        }
      });
    }
    var videos = [];
    document.querySelectorAll('video').forEach(function (v) {
      if (v.currentSrc) videos.push(v.currentSrc);
      if (v.src) videos.push(v.src);
    });
    if (json.length || loggedOut || Date.now() - started >= ${GIVE_UP_MS}) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        id: id, nonce: nonce, code: code, json: json, videos: code ? videos : [], loggedOut: loggedOut
      }));
    } else {
      setTimeout(collect, ${POLL_MS});
    }
  }
  collect();
})();
true;
`;
}
