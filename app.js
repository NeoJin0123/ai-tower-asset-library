const library = window.AI_TOWER_LIBRARY;

if (!library) {
  throw new Error("素材库数据未加载");
}

const categoryLabels = {
  portrait: "立绘",
  sprite: "局内小人",
  cg: "CG",
  background: "背景图",
};

const grid = document.querySelector("#assetGrid");
const searchInput = document.querySelector("#searchInput");
const searchCount = document.querySelector("#searchCount");
const emptyState = document.querySelector("#emptyState");
const filterTabs = document.querySelector("#filterTabs");
const dialog = document.querySelector("#assetDialog");
const dialogImage = document.querySelector("#dialogImage");
const dialogCategory = document.querySelector("#dialogCategory");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogDescription = document.querySelector("#dialogDescription");
const dialogId = document.querySelector("#dialogId");
const dialogCharacter = document.querySelector("#dialogCharacter");
const dialogState = document.querySelector("#dialogState");
const dialogSize = document.querySelector("#dialogSize");
const dialogTags = document.querySelector("#dialogTags");
const downloadButton = document.querySelector("#downloadButton");
const originalButton = document.querySelector("#originalButton");
const copyIdButton = document.querySelector("#copyIdButton");
const copyPromptButton = document.querySelector("#copyPromptButton");
const dialogClose = document.querySelector("#dialogClose");
const toast = document.querySelector("#toast");

let activeCategory = "all";
let activeAsset = null;
let toastTimer = null;

document.querySelector("#assetStat").textContent = library.asset_count;
document.querySelector("#characterStat").textContent = library.characters.length;
document.querySelector("#footerCount").textContent = `${library.asset_count} assets ready`;

function normalize(value) {
  return String(value || "").toLocaleLowerCase("zh-CN");
}

function matches(asset, query) {
  if (!query) return true;
  const haystack = normalize(
    [
      asset.id,
      asset.title,
      asset.character_title,
      asset.state_label,
      asset.tags.join(" "),
      asset.description,
    ].join(" "),
  );
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

function cardMarkup(asset) {
  return `
    <button
      class="asset-card"
      type="button"
      data-asset-id="${asset.id}"
      style="--accent: ${asset.accent}"
      aria-label="查看 ${asset.title}"
    >
      <span class="asset-media">
        <img
          src="${asset.thumb_path}"
          alt="${asset.title}"
          loading="lazy"
          width="520"
          height="520"
        />
        <span class="asset-category">${categoryLabels[asset.category]}</span>
      </span>
      <span class="asset-copy">
        <h2>${asset.title}</h2>
        <code class="asset-id">${asset.id}</code>
      </span>
    </button>
  `;
}

function render() {
  const query = normalize(searchInput.value.trim());
  const filtered = library.assets.filter((asset) => {
    const categoryMatch = activeCategory === "all" || asset.category === activeCategory;
    return categoryMatch && matches(asset, query);
  });

  grid.innerHTML = filtered.map(cardMarkup).join("");
  emptyState.hidden = filtered.length !== 0;
  searchCount.textContent = `${filtered.length} / ${library.asset_count}`;

  grid.querySelectorAll(".asset-card").forEach((card) => {
    card.addEventListener("click", () => openAsset(card.dataset.assetId));
  });
}

function openAsset(id) {
  const asset = library.assets.find((item) => item.id === id);
  if (!asset) return;
  activeAsset = asset;

  dialogImage.src = asset.web_path;
  dialogImage.alt = asset.title;
  dialogCategory.textContent = `${categoryLabels[asset.category]} / ASSET`;
  dialogTitle.textContent = asset.title;
  dialogDescription.textContent = asset.description;
  dialogId.textContent = asset.id;
  dialogCharacter.textContent = asset.character_title || "场景";
  dialogState.textContent = asset.state_label;
  dialogSize.textContent = `${asset.width} × ${asset.height} / WebP ${asset.web_width} × ${asset.web_height}`;
  dialogTags.innerHTML = asset.tags
    .slice(0, 9)
    .map((tag) => `<span class="dialog-tag">${tag}</span>`)
    .join("");
  downloadButton.href = asset.web_path;
  downloadButton.download = `${asset.id}.webp`;
  originalButton.href = `../${asset.original_path}`;
  originalButton.download = asset.source_name;
  originalButton.hidden = location.protocol === "file:" ? false : true;
  dialog.showModal();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  showToast(successMessage);
}

function geminiPrompt() {
  const ids = library.assets.map((asset) => asset.id).join(", ");
  return [
    "你正在制作《AI 尖塔》网页游戏，请把上传的素材总览图作为唯一角色与场景视觉参考。",
    "优先读取 manifest.json；如果只上传了图片，请使用素材总览图下方的素材 ID。",
    "资源根目录为网页素材库，立绘在 assets/portraits，局内小人在 assets/sprites，CG 在 assets/cg，背景在 assets/backgrounds。",
    "不要改变角色发型、服装主色、标志物和画风。不要编造素材 ID。缺少某个动作时回退到同角色 idle。",
    "立绘用于角色卡与对话，局内小人用于战斗动作，CG 用于剧情和结局，背景图用于战斗场景。所有角色图保持比例，不拉伸。",
    `可用素材 ID：${ids}`,
  ].join("\n");
}

filterTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeCategory = button.dataset.filter;
  filterTabs.querySelectorAll(".filter-tab").forEach((tab) => {
    const selected = tab === button;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  render();
});

searchInput.addEventListener("input", render);

dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  const inDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inDialog) dialog.close();
});

copyIdButton.addEventListener("click", () => {
  if (activeAsset) copyText(activeAsset.id, "素材 ID 已复制");
});

copyPromptButton.addEventListener("click", () => {
  copyText(geminiPrompt(), "Gemini 指令已复制");
});

render();
