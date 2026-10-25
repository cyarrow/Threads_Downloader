// Script injected into the WebView that shows the Threads post. It runs inside the
// user's own logged-in Threads session and reports back what the page already
// contains: the JSON data blobs mentioning the post, and any <video> sources.
// Parsing happens on the React Native side (see threads.js) so it stays testable.
export function collectScript(code) {
  return `
(function () {
  var code = ${JSON.stringify(code)};
  var tries = 0;
  function collect() {
    tries++;
    var json = [];
    document.querySelectorAll('script[type="application/json"]').forEach(function (s) {
      var t = s.textContent || '';
      if (t.indexOf(code) !== -1 && (t.indexOf('video_versions') !== -1 || t.indexOf('image_versions2') !== -1)) {
        json.push(t);
      }
    });
    var videos = [];
    document.querySelectorAll('video').forEach(function (v) {
      if (v.currentSrc) videos.push(v.currentSrc);
      if (v.src) videos.push(v.src);
    });
    var loggedOut = /\\/login/.test(location.pathname);
    if (json.length || tries >= 10 || loggedOut) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ code: code, json: json, videos: videos, loggedOut: loggedOut }));
    } else {
      setTimeout(collect, 1000);
    }
  }
  collect();
})();
true;
`;
}
