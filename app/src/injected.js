// Script injected into the WebView that shows the Threads post. It runs inside the
// user's own logged-in Threads session and reports back what the page already
// contains: the JSON data blobs mentioning the post, and any <video> sources.
// Parsing happens on the React Native side (see threads.js) so it stays testable.
// `code` is null for /share/ links: the script then waits until Threads has
// redirected to /@user/post/CODE and reads the shortcode from the address.
export function collectScript(id, code) {
  return `
(function () {
  var id = ${JSON.stringify(id)};
  var code = ${JSON.stringify(code)};
  var tries = 0;
  function collect() {
    tries++;
    var loggedOut = /\\/login/.test(location.pathname);
    if (!code) {
      var m = location.pathname.match(/\\/post\\/([A-Za-z0-9_-]+)/);
      if (m && tries > 1) {
        // Arrived via in-page navigation, so the post's data isn't embedded in this
        // document. Reload once; the fresh page load gets injected again.
        var key = 'td-reloaded-' + id;
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
    if (json.length || tries >= 15 || loggedOut) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        id: id, code: code, json: json, videos: code ? videos : [], loggedOut: loggedOut
      }));
    } else {
      setTimeout(collect, 1000);
    }
  }
  collect();
})();
true;
`;
}
