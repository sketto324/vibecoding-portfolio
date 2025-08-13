const DATA_URL = "./works.json";

function loadInlineWorks() {
  try {
    const el = document.getElementById("works-data");
    if (!el) return null;
    const text = el.textContent?.trim();
    if (!text) return null;
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : null;
  } catch {
    return null;
  }
}

async function loadWorks() {
  // file:// で開いた場合はまず埋め込みJSONを使う
  if (location.protocol === "file:") {
    const inline = loadInlineWorks();
    if (inline && inline.length) return inline;
  }

  // 通常は works.json を取得
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error("Invalid works.json format");
    return list;
  } catch (e) {
    // フェッチに失敗したら埋め込みJSONを試す
    const inline = loadInlineWorks();
    if (inline && inline.length) return inline;
    console.warn("作品データの読み込みに失敗しました。サンプルを表示します。", e);
    return [
      {
        title: "手描き風タイポの生成器",
        desc: "SVGで手書きっぽいタイトルを合成",
        url: "https://example.com/work/handwriting-typo",
      }
    ];
  }
}

function createExternalIcon() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "icon-external");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute(
    "d",
    "M14 3h7v7h-2V7.41l-9.29 9.3-1.42-1.42 9.3-9.3H14V3z M5 5h7v2H7v10h10v-5h2v7H5V5z"
  );
  svg.appendChild(path);
  return svg;
}

function renderWorks(list) {
  const grid = document.getElementById("works-grid");
  grid.innerHTML = "";
  if (!list || list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "work-desc";
    empty.textContent = "作品がまだありません。works.json に追加してください。";
    grid.appendChild(empty);
    return;
  }
  list.forEach((w) => {
    const card = document.createElement("article");
    card.className = "work-card reveal";
    card.setAttribute("role", "listitem");

    const frame = document.createElement("div");
    frame.className = "thumb-frame";
    const img = document.createElement("img");
    // レイアウト安定のための寸法（3:2）
    img.width = 600;
    img.height = 400;
    // サムネイルの推測: 明示指定 > 代表的なOG画像候補群 > プレースホルダ
    const url = (w.url || "").trim();
    const candidates = [];
    if (w.thumb && w.thumb.trim()) candidates.push(w.thumb.trim());
    if (url) {
      try {
        const names = [
          "og.png", "og.jpg", "og-image.png", "og-image.jpg",
          "thumbnail.png", "thumbnail.jpg", "thumb.png", "thumb.jpg",
          "social.png", "social.jpg", "cover.png", "cover.jpg",
          // Next.js App Router のOG画像エンドポイント例
          "api/og", "api/og.png", "api/og.jpg"
        ];
        const dirs = ["", "images/", "assets/"];
        dirs.forEach((d) => names.forEach((n) => candidates.push(new URL(d + n, url).toString())));
      } catch {}
    }
    candidates.push("assets/placeholder.svg");

    let idx = 0;
    const tryNext = () => {
      img.src = candidates[idx] || "assets/placeholder.svg";
    };
    img.onerror = () => {
      if (idx < candidates.length - 1) {
        idx += 1;
        tryNext();
      }
    };
    img.loading = "lazy";
    img.decoding = "async";
    tryNext();
    img.alt = `${w.title} のサムネイル`;
    frame.appendChild(img);

    const h3 = document.createElement("h3");
    h3.className = "work-title";
    const a = document.createElement("a");
    a.href = w.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = w.title;
    a.appendChild(createExternalIcon());
    h3.appendChild(a);

    const p = document.createElement("p");
    p.className = "work-desc";
    p.textContent = w.desc || "";

    card.appendChild(frame);
    card.appendChild(h3);
    card.appendChild(p);
    grid.appendChild(card);
  });
}

// タイトルのホバーはCSSで制御。ここでは今後拡張用のフックだけ用意。
// スクロール表示セットアップ
function setupReveal() {
  const items = Array.from(document.querySelectorAll('.work-card.reveal'));
  if (items.length === 0) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  items.forEach(el => io.observe(el));
}

document.addEventListener("DOMContentLoaded", async () => {
  const list = await loadWorks();
  renderWorks(list);
  setupReveal();
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
});
