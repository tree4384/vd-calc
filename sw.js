/* 電圧降下計算: オフライン対応
   - ページ本体: まずネットから最新を取りに行き、電波が悪ければ(4秒)保存済みのものを表示
   - 部品(アイコン・PDF作成ライブラリ・フォント): 一度読み込んだら保存したものを使う
   アプリを更新したときは CACHE の番号を1つ上げる */
const CACHE = "vd-calc-4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // ライブラリは取れなくてもインストールは止めない(ページを開いたときにも保存される)
    await Promise.all(LIBS.map((u) => c.add(new Request(u, { mode: "cors" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("vd-calc-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (err) => { clearTimeout(t); reject(err); });
  });
}

async function pageFromCache(req) {
  const c = await caches.open(CACHE);
  return (await c.match(req, { ignoreSearch: true })) || (await c.match("./index.html")) || (await c.match("./"));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isPage = req.mode === "navigate" || (sameOrigin && /(\/|\/index\.html)$/.test(url.pathname));

  if (isPage) {
    const net = fetch(req).then(async (res) => {
      if (res && res.ok) {
        const c = await caches.open(CACHE);
        await c.put("./index.html", res.clone());
      }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(withTimeout(net, 4000).catch(async () => (await pageFromCache(req)) || net));
    return;
  }

  const cacheable = sameOrigin || /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!cacheable) return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {});
    return res;
  })());
});
