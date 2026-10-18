import {
  defaults,
  normalizePricing,
  selectedMarkup,
  customerLabel,
  STORE_KEY,
  money,
  round,
  escape as e,
  uid,
  number,
  calculateItem,
  MAX_IMAGE_LENGTH,
  productImage,
  catalogQuoteItem,
  calculateQuote,
  parseBackup,
  writeStore,
  readStore,
} from "./core.js";
import {
  proposalBody,
  proposalCSS,
  proposalDocument,
  quoteText,
} from "./proposal.js";

const icons = {
  cube: '<path d="m12 3 9 5v9l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
  box: '<path d="m3 7 9-4 9 4v12l-9 3-9-3zM3 7l9 4 9-4M12 11v11M7 5l10 4"/>',
  settings:
    '<path d="m9 3-.6 2.1-2 .9-2-.5-2 3.5L4 10.5v3l-1.6 1.4 2 3.5 2-.5 2 .9L9 21h4l.6-2.2 2-.9 2 .5 2-3.5-1.6-1.4v-3L19.6 9l-2-3.5-2 .5-2-.9L13 3z"/><circle cx="11" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2zM7 3v6h10V3M7 21v-8h10v8"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  leaf: '<path d="M20 3C5 2 2 9 5 16s17 3 15-13ZM5 20l10-10"/>',
  wallet:
    '<path d="M20 8V4H4a2 2 0 0 0 0 4h17v12H4a2 2 0 0 1-2-2V6M16 12h5v4h-5z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.cube}</svg>`;
const brand = () =>
  `<span class="brand-cube">${icon("cube")}</span><span class="brand-name">barotto<span>3D</span><small>ESTÚDIO DE IMPRESSÃO</small></span>`;
const today = () => new Date().toLocaleDateString("en-CA");
const plusDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(days));
  return d.toLocaleDateString("en-CA");
};
const date = (v) =>
  v ? new Date(v + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const blankItem = () => ({
  id: uid(),
  name: "",
  image: "",
  material: "PLA",
  color: "",
  grams: 0,
  hours: 0,
  quantity: 1,
  productionQuantity: 1,
  inputBasis: "batch",
  costVersion: 2,
  filament: 90,
  extra: 0,
  minutes: 0,
  price: null,
  note: "",
  kind: "Peça funcional",
});
let store,
  storageBlocked = false;
try {
  store = readStore(localStorage);
} catch (error) {
  storageBlocked = true;
}
store ??= {
  version: 1,
  settings: { ...defaults, company: "Barotto 3D" },
  quotes: [],
  catalog: [],
  draft: null,
};
store.settings = normalizePricing(store.settings);
let view = "editor",
  quote = store.draft || newQuote(true),
  filter = "",
  statusFilter = "all",
  toastTimer,
  saveTimer;
const root = document.querySelector("#app"),
  modal = document.querySelector("#modal");
function newQuote(example = false) {
  const q = {
    id: uid(),
    number: "",
    client: "",
    email: "",
    phone: "",
    title: "Impressão 3D personalizada",
    date: today(),
    validUntil: plusDays(store?.settings.validity ?? 7),
    lead: store?.settings.lead ?? 5,
    payment: store?.settings.payment ?? defaults.payment,
    terms: store?.settings.terms ?? defaults.terms,
    notes: "",
    discount: 0,
    shipping: 0,
    status: "Rascunho",
    customerType: "retail",
    example,
    items: [],
    pricing: normalizePricing(store?.settings ?? defaults),
  };
  q.items = example
    ? [
        {
          ...blankItem(),
          name: "Vaso espiral",
          material: "PLA",
          color: "Verde sálvia",
          grams: 120,
          hours: 4.5,
          quantity: 2,
          kind: "Decoração",
        },
        {
          ...blankItem(),
          name: "Suporte para celular",
          material: "PETG",
          color: "Preto fosco",
          grams: 65,
          hours: 2.2,
          quantity: 1,
          filament: 105,
        },
      ]
    : [blankItem()];
  q.initialState = JSON.stringify(q);
  return q;
}
function pricing() {
  const snapshot = quote.pricing ?? store.settings;
  return normalizePricing({
    ...store.settings,
    ...snapshot,
    markupWholesale:
      snapshot.markupWholesale ??
      snapshot.markup ??
      store.settings.markupWholesale,
  });
}
function toast(text, error = false) {
  clearTimeout(toastTimer);
  const t = document.querySelector("#toast");
  t.textContent = text;
  t.className = `visible ${error ? "error" : ""}`;
  toastTimer = setTimeout(() => (t.className = ""), 4500);
}
function persist() {
  if (storageBlocked) {
    document.querySelector("#save-indicator")?.classList.add("unsaved");
    return false;
  }
  try {
    writeStore(localStorage, store);
    const badge = document.querySelector("#save-indicator");
    if (badge) {
      badge.innerHTML = `<span class="status-dot"></span> Rascunho salvo`;
      badge.classList.remove("unsaved");
    }
    return true;
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      toast("O espaço do navegador está cheio. Baixe um backup e remova fotos ou registros antes de salvar novamente.", true);
      return false;
    }
    storageBlocked = true;
    toast(
      "Não foi possível salvar no navegador. Baixe um backup em Configurações.",
      true,
    );
    renderStorageWarning();
    return false;
  }
}
function draft() {
  store.draft = structuredClone(quote);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 300);
}
function flush() {
  clearTimeout(saveTimer);
  store.draft = structuredClone(quote);
  return persist();
}
window.addEventListener("pagehide", () => {
  clearTimeout(saveTimer);
  if (!storageBlocked) {
    store.draft = quote;
    try {
      writeStore(localStorage, store);
    } catch {}
  }
});
function renderStorageWarning() {
  const old = document.querySelector("#storage-warning");
  if (old) return;
  root.insertAdjacentHTML(
    "afterbegin",
    `<div id="storage-warning" role="alert">O armazenamento local está indisponível ou precisa de recuperação. Seus dados não serão sobrescritos. Use Configurações → Backup para guardar seus dados.</div>`,
  );
}
function field(
  label,
  key,
  value,
  {
    type = "text",
    scope = "quote",
    unit = "",
    min = 0,
    max = 1e9,
    step = "0.01",
    required = false,
    placeholder = "",
    wide = false,
    hint = "",
  } = {},
) {
  const id = `${scope.replaceAll(".", "-")}-${key}`;
  const attrs =
    scope === "quote"
      ? `data-field="${key}"`
      : scope === "settings"
        ? `data-setting="${key}"`
        : `data-item="${scope}" data-key="${key}"`;
  return `<label class="field ${wide ? "wide" : ""}" for="${id}"><span>${label}${required ? "<em>*</em>" : ""}</span><div class="input-wrap"><input id="${id}" ${attrs} type="${type}" maxlength="1000" value="${e(value ?? "")}" ${required ? "required" : ""} ${type === "number" ? `min="${min}" ${max !== "" ? `max="${max}"` : ""} step="${step}"` : ""} placeholder="${e(placeholder)}" ${key === "email" ? 'autocomplete="email"' : ""} ${key === "client" ? 'autocomplete="name"' : ""}>${unit ? `<span class="unit">${unit}</span>` : ""}</div>${hint ? `<small>${hint}</small>` : ""}</label>`;
}
function select(label, key, value, options, scope = "quote") {
  const id = `${scope}-${key}`,
    attrs =
      scope === "quote"
        ? `data-field="${key}"`
        : `data-item="${scope}" data-key="${key}"`;
  return `<label class="field" for="${id}"><span>${label}</span><select id="${id}" ${attrs}>${options
    .map((option) => {
      const v = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : option.label;
      return `<option value="${e(v)}" ${v === value ? "selected" : ""}>${e(label)}</option>`;
    })
    .join("")}</select></label>`;
}
function textarea(label, key, value, scope = "quote", hint = "") {
  return `<label class="field wide"><span>${label}</span><textarea ${scope === "quote" ? `data-field="${key}"` : `data-setting="${key}"`} maxlength="10000" rows="3">${e(value)}</textarea>${hint ? `<small>${hint}</small>` : ""}</label>`;
}
const customerTypes = [
  { value: "retail", label: "Consumidor final" },
  { value: "wholesale", label: "Lojista" },
];
function customerTypeField() {
  return select(
    "Tipo de cliente",
    "customerType",
    quote.customerType ?? "retail",
    customerTypes,
  );
}
function customerTypeOptions(type) {
  return customerTypes
    .map(
      (option) =>
        `<option value="${option.value}" ${type === option.value ? "selected" : ""}>${option.label}</option>`,
    )
    .join("");
}
function exportPricingNote() {
  return `Preços unitários de ${customerLabel(quote.customerType ?? "retail").toLowerCase()}. Produtos do catálogo usam os preços copiados do cadastro.`;
}
function shell() {
  root.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" data-action="navigate" data-view="overview" aria-label="Barotto 3D, visão geral">${brand()}</a><div class="workspace-label">SEU ESPAÇO DE CRIAÇÃO</div><nav aria-label="Navegação principal">${[
    ["overview", "grid", "Visão geral"],
    ["editor", "file", "Orçamentos"],
    ["catalog", "box", "Meus produtos"],
  ]
    .map(
      ([v, i, t]) =>
        `<button class="nav-item ${v === view || (v === "editor" && view === "history") ? "active" : ""}" data-action="navigate" data-view="${v}" aria-label="${t}">${icon(i)}<span>${t}</span>${v === "editor" ? `<span class="nav-count">${store.quotes.length}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}<div class="nav-divider"></div><button class="nav-item ${view === "settings" ? "active" : ""}" data-action="navigate" data-view="settings" aria-label="Configurações">${icon("settings")}<span>Configurações</span></button></nav><div class="sidebar-bottom"><div class="local-note">${icon("shield")}<div><strong>Seu trabalho, com você.</strong><p>Dados salvos neste navegador.<br>Faça backups regularmente.</p></div></div><button class="profile" data-action="navigate" data-view="settings"><span class="avatar">B<span>3D</span></span><span><strong>${e(store.settings.company)}</strong><small>Meu estúdio</small></span>${icon("chevron")}</button></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb"><span>Meu estúdio</span>${icon("chevron")}<strong>${view === "overview" ? "Visão geral" : view === "catalog" ? "Meus produtos" : view === "settings" ? "Configurações" : "Orçamentos"}</strong></div><div class="topbar-right"><span class="local-pill"><span class="status-dot"></span> Armazenamento local</span><button class="icon-button" aria-label="Ajuda" data-action="help">${icon("help")}</button><span class="top-avatar">B</span></div></header><main id="main">${view === "editor" ? editor() : view === "history" ? history() : view === "catalog" ? catalog() : view === "settings" ? settings() : overview()}</main><footer class="app-footer"><span>Feito para quem transforma ideias em objetos.</span><span>Barotto 3D <span class="footer-dot">·</span> Orçamentos com mais forma.</span></footer></div></div>`;
  if (storageBlocked) renderStorageWarning();
  if (view === "editor") updateSummary();
}
function pageHead(eyebrow, title, description, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="page-actions">${actions}</div></div>`;
}
function editor() {
  return `${pageHead("DO PROJETO À PROPOSTA", `${quote.number ? "Editar orçamento" : "Novo orçamento"}<span class="heading-dot">.</span>`, "Você cuida da criação. A gente ajuda com as contas.", `<button class="button secondary" data-action="navigate" data-view="history">${icon("clock")} Meus orçamentos</button><span id="save-indicator" class="save-indicator"><span class="status-dot"></span> ${store.draft ? "Rascunho salvo" : "Salvamento automático"}</span>`)}<div class="workflow"><span class="current"><b>01</b> Dados do cliente</span><i></i><span><b>02</b> Produtos e valores</span><i></i><span><b>03</b> Proposta pronta</span><div class="workflow-end">${icon("shield")} Tudo em um só lugar</div></div>${quote.example ? `<div class="example-banner">${icon("spark")}<span><strong>Um exemplo para começar.</strong> Edite os produtos abaixo ou monte o seu orçamento do zero.</span><button data-action="clear-example">Começar do zero ${icon("arrow")}</button></div>` : ""}<div class="editor-layout"><form id="quote-form" class="editor-main"><section class="panel client-panel"><div class="panel-heading"><div><span class="section-icon">${icon("file")}</span><h2>Para quem vamos criar?</h2></div><span class="quiet">${quote.number ? e(quote.number) : "Novo rascunho"}</span></div><div class="form-grid client-grid">${field("Nome do cliente", "client", quote.client, { required: true, placeholder: "Nome ou empresa" })}${field("E-mail", "email", quote.email, { type: "email", placeholder: "cliente@email.com" })}${field("Telefone / WhatsApp", "phone", quote.phone, { type: "tel", placeholder: "(00) 00000-0000" })}${field("Nome do projeto", "title", quote.title, { placeholder: "Ex.: Peças para escritório" })}${customerTypeField()}<p class="customer-pricing-hint">O tipo de cliente seleciona o preço unitário de consumidor final ou lojista. Você também pode escolher na exportação.</p></div></section><section class="products-section"><div class="section-title"><div><h2>Produtos do orçamento <span id="item-count" class="count-badge">${quote.items.length}</span></h2><p>Escolha os produtos cadastrados e informe a quantidade solicitada pelo cliente.</p></div><button type="button" class="text-button" data-action="from-catalog">${icon("box")} Usar do catálogo</button></div><div id="products">${quote.items.map((item, index) => productCard(item, index)).join("")}</div><button type="button" class="add-product" data-action="add-product">${icon("plus")} Adicionar outro produto <span>Uma proposta, várias possibilidades.</span></button></section><section class="panel details-panel"><div class="panel-heading"><div><span class="section-icon">${icon("clock")}</span><h2>Os últimos detalhes</h2></div><span class="quiet">Aparecem na proposta</span></div><div class="form-grid">${field("Prazo de produção", "lead", quote.lead, { type: "number", step: 1, min: 1, max: 365, unit: "dias úteis", required: true })}${field("Válido até", "validUntil", quote.validUntil, { type: "date", required: true })}${field("Frete", "shipping", quote.shipping, { type: "number", unit: "R$", max: 100000 })}${field("Desconto no orçamento", "discount", quote.discount, { type: "number", unit: "R$", max: 100000 })}${textarea("Forma de pagamento", "payment", quote.payment)}${textarea("Observações para o cliente", "notes", quote.notes, "quote", "Inclua medidas, acabamento, referência do arquivo ou instruções de retirada.")}</div><details class="conditions-details"><summary>Condições de produção ${icon("down")}</summary>${textarea("Condições", "terms", quote.terms)}</details></section></form><aside class="summary-column"><div id="summary"></div><div class="tip-card"><span>${icon("leaf")}</span><div><strong>Mais tempo para criar.</strong><p>Salve seus produtos no catálogo e reutilize nos próximos orçamentos.</p><button class="text-button" data-action="navigate" data-view="catalog">Conhecer meu catálogo ${icon("arrow")}</button></div></div></aside></div>`;
}
function productArt(index = 0) {
  return index % 2 === 0
    ? `<svg viewBox="0 0 88 88" aria-hidden="true"><defs><linearGradient id="v${index}" x1="0" x2="1"><stop stop-color="#73957a"/><stop offset=".5" stop-color="#b4c9a2"/><stop offset="1" stop-color="#5e8068"/></linearGradient></defs><ellipse cx="44" cy="75" rx="27" ry="5" fill="#254433" opacity=".10"/><path d="M22 24c-2 13 6 18 7 27s-5 16 1 21q14 7 29 0c6-5 0-12 1-21s9-14 7-27Z" fill="url(#v${index})"/><ellipse cx="44.5" cy="24" rx="22.5" ry="7" fill="#607c61"/><ellipse cx="44.5" cy="24" rx="18" ry="4.5" fill="#344e39"/><g fill="none" stroke="#d8e5c7" stroke-width="1" opacity=".55"><path d="M25 33q20 13 39 0M28 40q17 13 32 0M30 47q14 12 29 0M30 54q14 11 29 0M29 61q15 11 31 0M29 68q15 10 31 0"/></g></svg>`
    : `<svg viewBox="0 0 88 88" aria-hidden="true"><ellipse cx="44" cy="73" rx="28" ry="5" fill="#1d3833" opacity=".1"/><path d="m19 62 33-8 21 11-35 10z" fill="#63716c"/><path d="m38 67 2-37 25-9-9 39-18 7z" fill="#75847a"/><path d="m40 30-8-5 25-8 8 4z" fill="#a6afa5"/><path d="m32 25-1 34 7 8 2-37z" fill="#42554b"/><path d="m19 62 19 9 35-6v4l-35 10-19-12z" fill="#354b40"/><path d="m41 37 17-6m-18 12 17-6m-18 12 16-6m-17 12 16-6" stroke="#a1aca1" opacity=".45"/></svg>`;
}
function productVisual(item, index = 0) {
  return item.image
    ? `<img class="product-photo" src="${e(item.image)}" alt="Foto de ${e(item.name || "produto")}" loading="lazy">`
    : productArt(index);
}
function photoEditor(item) {
  return `<section class="photo-editor"><div class="photo-preview">${item.image ? `<img src="${e(item.image)}" alt="Prévia da foto do produto">` : `<span>${icon("box")}<small>Produto sem foto</small></span>`}</div><div class="photo-editor-controls"><strong>Foto do produto</strong><p>Aparece no catálogo, no orçamento e na proposta para o cliente.</p><input type="hidden" data-key="image" value="${e(item.image || "")}"><input type="file" id="product-image-file" accept="image/jpeg,image/png,image/webp" hidden><div class="photo-editor-buttons"><button type="button" class="button secondary" data-action="image-choose">${icon("upload")} ${item.image ? "Trocar imagem" : "Escolher imagem"}</button><button type="button" class="text-button danger" data-action="image-remove" ${item.image ? "" : "hidden"}>Remover imagem</button></div><small class="photo-status" role="status">JPG, PNG ou WebP, até 10 MB. A imagem é reduzida automaticamente e salva neste navegador.</small></div></section>`;
}
async function prepareProductImage(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Escolha uma imagem de até 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    try {
      await photo.decode();
    } catch {
      throw new Error("Não foi possível abrir esta imagem. Escolha outro arquivo JPG, PNG ou WebP.");
    }
    if (!photo.naturalWidth || !photo.naturalHeight || photo.naturalWidth * photo.naturalHeight > 40e6)
      throw new Error("Use uma imagem com até 40 megapixels.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem neste navegador.");
    let edge = 800;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, edge / Math.max(photo.naturalWidth, photo.naturalHeight));
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      const encoded = canvas.toDataURL("image/webp", Math.max(0.5, 0.84 - attempt * 0.05));
      if (encoded.length <= MAX_IMAGE_LENGTH) return productImage(encoded);
      edge *= 0.8;
    }
    throw new Error("Não foi possível reduzir esta imagem. Escolha uma foto menor.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
function setEditorImage(form, value) {
  form.querySelector('[data-key="image"]').value = value;
  form.querySelector(".photo-preview").innerHTML = value
    ? `<img src="${e(value)}" alt="Prévia da foto do produto">`
    : `<span>${icon("box")}<small>Produto sem foto</small></span>`;
  form.querySelector('[data-action="image-choose"]').innerHTML = `${icon("upload")} ${value ? "Trocar imagem" : "Escolher imagem"}`;
  form.querySelector('[data-action="image-remove"]').hidden = !value;
}
function productionHint(item) {
  const count = item.productionQuantity ?? 1;
  return (item.inputBasis ?? "unit") === "batch"
    ? `Informe peso, tempo, acabamento e extras do lote inteiro de ${count} peça(s). Energia, desgaste, rateio fixo e embalagem entram uma vez no lote. O custo completo é dividido entre as peças; material continua em R$/kg.`
    : `Peso, tempo, acabamento e extras são de uma única peça. O custo do lote considera ${count} peça(s).`;
}
function itemProductionFields(item) {
  return `<div class="production-settings"><div class="form-grid">${field("Quantidade produzida no lote", "productionQuantity", item.productionQuantity ?? 1, { scope: item.id, type: "number", min: 1, max: 100000, step: 1, unit: "peças", required: true })}${select(
    "Dados de produção informados são",
    "inputBasis",
    item.inputBasis ?? "unit",
    [
      { value: "batch", label: "Do lote inteiro" },
      { value: "unit", label: "Por unidade" },
    ],
    item.id,
  )}</div><p class="production-hint" data-production-hint="${item.id}">${e(productionHint(item))}</p></div>`;
}
function energyCosts(cost) {
  const consumption = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(cost.unitKwh * cost.productionQuantity);
  return `<div class="energy-cost-note"><strong>Energia incluída no custo</strong><span>Lote: ${money(cost.energy * cost.productionQuantity)} (${consumption} kWh) · Por peça: ${money(cost.energy)}</span></div>`;
}
function costBreakdown(cost, open = false) {
  const rows = [["Filamento", cost.material], ["Energia elétrica", cost.energy], ["Desgaste da impressora", cost.machine], ["Embalagem", cost.packaging], ["Rateio fixo", cost.fixed], ["Acabamento", cost.labor], ["Extras", cost.extra], ["Reserva para falhas", cost.reserve]];
  return `<details class="cost-breakdown" ${open ? "open" : ""}><summary>Composição do custo do lote ${icon("down")}</summary><dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${money(value * cost.productionQuantity)}</dd></div>`).join("")}<div class="cost-breakdown-total"><dt>Total do lote</dt><dd>${money(cost.batchCost)}</dd></div></dl></details>`;
}
function productionCosts(item, cost, includeOrder = false, showDetails = false) {
  return `<div class="production-cost-grid"><div><span>Custo por unidade</span><strong>${money(cost.cost)}</strong><small>Custo do lote ÷ ${cost.productionQuantity} peça(s)</small></div><div><span>Custo total do lote</span><strong>${money(cost.batchCost)}</strong><small>${cost.productionQuantity} peça(s) produzida(s)</small></div></div>${energyCosts(cost)}${costBreakdown(cost, showDetails)}${includeOrder ? `<div class="order-production-cost"><span>Custo dos ${item.quantity} item(ns) no orçamento</span><b>${money(cost.orderCost)}</b></div>` : ""}<small class="cost-rounding-note">Os totais usam os valores antes do arredondamento por unidade.${cost.costVersion === 1 && cost.inputBasis === "batch" ? " Cálculo anterior preservado neste orçamento. Atualize pelo cadastro para aplicar o custo completo do lote." : ""}</small>`;
}
function catalogFormItem(form) {
  const item = { ...blankItem(), id: form.dataset.id };
  form.querySelectorAll("[data-key]").forEach((el) => {
    item[el.dataset.key] =
      el.type === "number"
        ? el.value === "" && el.dataset.key === "price"
          ? null
          : Number(el.value)
        : el.value;
  });
  return item;
}
function updateCatalogCosts(form) {
  const preview = form.querySelector("#catalog-cost-preview");
  try {
    if (
      [...form.querySelectorAll('input[type="number"]')].some(
        (el) => !el.checkValidity(),
      )
    )
      throw new Error(
        "Informe números válidos. A quantidade produzida deve ser um inteiro maior que zero.",
      );
    const item = catalogFormItem(form);
    preview.innerHTML = productionCosts(
      item,
      calculateItem(item, store.settings),
      false,
      true,
    );
    form.querySelector("[data-production-hint]").textContent =
      productionHint(item);
  } catch (error) {
    preview.innerHTML = `<p class="form-error">${e(error.message)}</p>`;
  }
}
function matchingCatalogProduct(item) {
  if (item.catalogId) return store.catalog.find((p) => p.id === item.catalogId);
  const matches = store.catalog.filter((p) =>
    ["name", "material", "color"].every((key) =>
      String(p[key] ?? "").trim() === String(item[key] ?? "").trim(),
    ),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
function catalogOrderCosts(item, cost) {
  return `<div class="production-cost-grid"><div><span>Custo por unidade</span><strong>${money(cost.cost)}</strong><small>Conforme o cadastro do produto</small></div><div><span>Custo dos ${item.quantity} itens no orçamento</span><strong>${money(cost.orderCost)}</strong><small>Quantidade solicitada pelo cliente</small></div></div><div class="energy-cost-note"><strong>Energia incluída no custo</strong><span>${money(cost.energy)} por peça · ${money(cost.energy * item.quantity)} nas peças solicitadas</span></div>`;
}
function catalogProductCard(item, index) {
  const cost = calculateItem(item, pricing(), quote.customerType ?? "retail");
  const source = matchingCatalogProduct(item);
  return `<details class="product-card" data-product="${item.id}" ${index === 0 ? "open" : ""}>
    <summary><span class="product-art art-${index % 2}">${productVisual(item, index)}</span><span class="product-identity"><span class="product-number">PRODUTO ${String(index + 1).padStart(2, "0")} · CATÁLOGO</span><strong data-product-title="${item.id}">${e(item.name)}</strong><span class="product-meta" data-product-meta="${item.id}">${e(item.material)} · ${e(item.color || "Cor a definir")}</span></span><span class="product-head-price" data-product-total="${item.id}"><strong>${money(cost.total)}</strong><small>${item.quantity} unidades</small></span><span class="expand-icon">${icon("down")}</span></summary>
    <div class="product-content"><p class="catalog-order-note">Preço unitário do produto cadastrado × quantidade solicitada. Os dados de produção são definidos em Meus produtos.</p>
    <div class="form-grid">${field("Quantidade no orçamento", "quantity", item.quantity, { scope: item.id, type: "number", min: 1, max: 100000, step: 1, unit: "un.", required: true })}<div class="catalog-order-price"><span>Preço unitário cadastrado</span><strong data-catalog-unit-price="${item.id}">${money(cost.unitPrice)}</strong><small data-catalog-price-type="${item.id}">${customerLabel(quote.customerType ?? "retail")}</small></div>${field("Descrição para a proposta", "note", item.note, { scope: item.id, wide: true })}</div>
    <div class="production-costs" data-costs="${item.id}">${catalogOrderCosts(item, cost)}</div>
    <div class="product-actions">${source ? `<button type="button" class="text-button" data-action="catalog-refresh" data-id="${item.id}">${icon("box")} Atualizar pelo cadastro</button>` : '<span class="quiet">Preços preservados neste orçamento.</span>'}<div><button type="button" class="icon-button" aria-label="Duplicar ${e(item.name)}" data-action="duplicate-item" data-id="${item.id}">${icon("copy")}</button><button type="button" class="icon-button danger" aria-label="Remover ${e(item.name)}" data-action="remove-item" data-id="${item.id}">${icon("trash")}</button></div></div></div></details>`;
}
function productCard(item, index) {
  if (item.catalogPricing) return catalogProductCard(item, index);
  const s = calculateItem(item, pricing(), quote.customerType ?? "retail");
  return `<details class="product-card" data-product="${item.id}" ${index === 0 ? "open" : ""}><summary><span class="product-art art-${index % 2}">${productVisual(item, index)}</span><span class="product-identity"><span class="product-number">PRODUTO ${String(index + 1).padStart(2, "0")}</span><strong data-product-title="${item.id}">${e(item.name || "Novo produto")}</strong><span class="product-meta" data-product-meta="${item.id}">${e(item.material)} <span>·</span> ${e(item.color || "Cor a definir")}</span></span><span class="product-head-price" data-product-total="${item.id}"><strong>${money(s.total)}</strong><small>${item.quantity} ${item.quantity > 1 ? "unidades" : "unidade"}</small></span><span class="expand-icon">${icon("down")}</span></summary><div class="product-content"><div class="form-grid three-cols">${field("Nome do produto", "name", item.name, { scope: item.id, required: true, wide: true, placeholder: "O que vamos imprimir?" })}${select("Material", "material", item.material, ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Resina", "Outro"], item.id)}${field("Cor / acabamento", "color", item.color, { scope: item.id, placeholder: "Ex.: Preto fosco" })}${field("Quantidade no orçamento", "quantity", item.quantity, { scope: item.id, type: "number", min: 1, max: 100000, step: 1, unit: "un.", required: true })}</div><details class="extra-costs"><summary>Dados de produção do produto avulso ${icon("down")}</summary>${itemProductionFields(item)}<div class="form-grid three-cols">${field("Peso de material informado", "grams", item.grams, { scope: item.id, type: "number", unit: "g", max: 1000000, required: true })}${field("Tempo de impressão informado", "hours", item.hours, { scope: item.id, type: "number", unit: "horas", max: 100000, required: true })}${field("Preço do material", "filament", item.filament, { scope: item.id, type: "number", unit: "R$/kg", required: true })}</div><details class="extra-costs"><summary>Acabamento e custos adicionais ${icon("plus")}</summary><div class="form-grid">${field("Tempo de acabamento informado", "minutes", item.minutes, { scope: item.id, type: "number", unit: "min", max: 100000 })}${field("Custos extras informados", "extra", item.extra, { scope: item.id, type: "number", unit: "R$", max: 100000 })}${field("Descrição para a proposta", "note", item.note, { scope: item.id, wide: true, placeholder: "Dimensões, personalização ou acabamento" })}</div></details></details><div class="production-costs" data-costs="${item.id}">${productionCosts(item, s, true)}</div><div class="product-price-row"><div><span class="label">Preço de venda por unidade</span><span class="price-help" data-price-help="${item.id}">Sugestão: ${money(s.suggested)} <span>· markup ${selectedMarkup(pricing(), quote.customerType ?? "retail")}× · ${customerLabel(quote.customerType ?? "retail")}</span></span></div><label class="price-input"><span>R$</span><input aria-label="Preço de venda de ${e(item.name || "novo produto")}" type="number" min="0" max="1000000000" step="0.01" data-item="${item.id}" data-key="price" value="${item.price ?? ""}" placeholder="${s.suggested.toFixed(2)}" title="Deixe em branco para usar o preço sugerido"></label></div><div class="product-actions">${matchingCatalogProduct(item) ? `<button type="button" class="text-button" data-action="catalog-refresh" data-id="${item.id}">${icon("box")} Usar preço do catálogo</button>` : `<button type="button" class="text-button" data-action="catalog-save" data-id="${item.id}">${icon("box")} Salvar no catálogo</button>`}<div><button type="button" class="icon-button" title="Duplicar produto" aria-label="Duplicar ${e(item.name || "produto")}" data-action="duplicate-item" data-id="${item.id}">${icon("copy")}</button><button type="button" class="icon-button danger" title="Remover produto" aria-label="Remover ${e(item.name || "produto")}" data-action="remove-item" data-id="${item.id}">${icon("trash")}</button></div></div></div></details>`;
}
function updateSummary() {
  if (view !== "editor") return;
  let c;
  try {
    c = calculateQuote(quote, pricing());
  } catch (error) {
    document.querySelector("#summary").innerHTML =
      `<section class="panel summary-card"><h2>Confira os dados</h2><p class="form-error">${e(error.message)}</p></section>`;
    return;
  }
  for (const [index, item] of quote.items.entries()) {
    const v = c.items[index],
      head = document.querySelector(`[data-product-total="${item.id}"]`);
    if (head)
      head.innerHTML = `<strong>${money(v.total)}</strong><small>${item.quantity} ${item.quantity > 1 ? "unidades" : "unidade"}</small>`;
    const title = document.querySelector(`[data-product-title="${item.id}"]`);
    if (title) title.textContent = item.name || "Novo produto";
    const meta = document.querySelector(`[data-product-meta="${item.id}"]`);
    if (meta)
      meta.textContent = `${item.material} · ${item.color || "Cor a definir"}`;
    const costPanel = document.querySelector(`[data-costs="${item.id}"]`);
    if (costPanel) costPanel.innerHTML = item.catalogPricing ? catalogOrderCosts(item, v) : productionCosts(item, v, true);
    const catalogPrice = document.querySelector(`[data-catalog-unit-price="${item.id}"]`);
    if (catalogPrice) catalogPrice.textContent = money(v.unitPrice);
    const catalogType = document.querySelector(`[data-catalog-price-type="${item.id}"]`);
    if (catalogType) catalogType.textContent = customerLabel(quote.customerType ?? "retail");
    const productionNote = document.querySelector(
      `[data-production-hint="${item.id}"]`,
    );
    if (productionNote) productionNote.textContent = productionHint(item);
    const help = document.querySelector(`[data-price-help="${item.id}"]`);
    if (help)
      help.innerHTML = `Sugestão: ${money(v.suggested)} <span>· markup ${selectedMarkup(pricing(), quote.customerType ?? "retail")}× · ${customerLabel(quote.customerType ?? "retail")}</span>`;
    const input = document.querySelector(
      `input[data-item="${item.id}"][data-key="price"]`,
    );
    if (input) {
      input.placeholder = v.suggested.toFixed(2);
      input.setAttribute(
        "aria-label",
        `Preço de venda de ${item.name || "novo produto"}`,
      );
    }
  }
  const summary = document.querySelector("#summary");
  summary.innerHTML = `<section class="panel summary-card"><div class="summary-heading"><h2>Resumo do orçamento</h2><span class="summary-icon">${icon("file")}</span></div><div class="summary-customer-type">${customerLabel(quote.customerType ?? "retail")} · preços por unidade</div><div class="summary-items">${quote.items.map((item, i) => `<div><span>${e(item.name || "Novo produto")} <small>×${item.quantity}</small></span><strong>${money(c.items[i].total)}</strong></div>`).join("") || '<p class="quiet">Adicione seu primeiro produto.</p>'}</div><div class="summary-breakdown"><div><span>Subtotal <small>(${c.quantity} peças)</small></span><b>${money(c.subtotal)}</b></div><div><span>Desconto</span><b>${c.discount ? "− " : ""}${money(c.discount)}</b></div><div><span>Frete</span><b>${c.shipping ? money(c.shipping) : "A combinar"}</b></div></div><div class="total-block"><span>VALOR TOTAL DA PROPOSTA</span><div>${money(c.total)}</div><small>${icon("clock")} Prazo de ${e(quote.lead)} dias úteis</small></div><div class="summary-buttons"><button class="button primary" data-action="preview">${icon("eye")} Visualizar proposta ${icon("arrow")}</button><button class="button secondary" data-action="save-quote">${icon("save")} Salvar orçamento</button></div><div class="privacy-note">${icon("shield")} O cliente vê apenas os valores da proposta.</div></section><details class="internal-costs"><summary><span>${icon("wallet")} Seu resultado estimado</span>${icon("down")}</summary><div><span>Custo de produção</span><b>${money(c.cost)}</b></div><div><span>Taxas sobre a venda</span><b>${money(c.fees)}</b></div><div class="${c.profit < 0 ? "negative" : "positive"}"><span>Lucro estimado</span><b>${money(c.profit)}</b></div><div><span>Margem sobre produtos</span><b>${c.margin.toFixed(1)}%</b></div><p>Estimativa interna. Frete é repassado sem margem. Taxas incidem após o desconto.</p><button class="text-button" data-action="quote-pricing">Ajustar custos deste orçamento ${icon("arrow")}</button></details>${c.profit < 0 ? '<div class="warning-note">Este orçamento está abaixo do custo estimado. Confira o preço e o desconto.</div>' : ""}`;
}
function statusClass(status) {
  return (
    {
      Rascunho: "draft",
      Enviado: "sent",
      Aprovado: "approved",
      Recusado: "declined",
    }[status] || "draft"
  );
}
function history() {
  const filtered = store.quotes.filter(
    (q) =>
      (statusFilter === "all" || q.status === statusFilter) &&
      `${q.client} ${q.title} ${q.number}`
        .toLocaleLowerCase()
        .includes(filter.toLocaleLowerCase()),
  );
  return `${pageHead("SEU HISTÓRICO CRIATIVO", 'Meus orçamentos<span class="heading-dot">.</span>', "Cada projeto tem uma história. Encontre a próxima aqui.", `<button class="button primary" data-action="new-quote">${icon("plus")} Novo orçamento</button>`)}<div class="list-toolbar"><label class="search-field">${icon("search")}<input id="quote-search" placeholder="Buscar por cliente, projeto ou número" value="${e(filter)}" aria-label="Buscar orçamentos"></label><select id="status-filter" aria-label="Filtrar por status"><option value="all">Todos os status</option>${["Rascunho", "Enviado", "Aprovado", "Recusado"].map((s) => `<option ${s === statusFilter ? "selected" : ""}>${s}</option>`).join("")}</select><span class="quiet">${filtered.length} orçamento(s)</span></div>${filtered.length ? `<div class="panel table-wrap"><table class="history-table"><thead><tr><th>Orçamento / projeto</th><th>Cliente</th><th>Data</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${filtered.map((q) => `<tr><td><button class="table-link" data-action="open-quote" data-id="${q.id}">${e(q.number)}</button><small>${e(q.title)}</small></td><td>${e(q.client)}</td><td>${date(q.date)}</td><td><span class="status-tag ${statusClass(q.status)}">${e(q.status)}</span></td><td><strong>${money(calculateQuote(q, q.pricing || store.settings).total)}</strong></td><td class="table-actions"><button class="icon-button" aria-label="Editar ${e(q.number)}" data-action="open-quote" data-id="${q.id}">${icon("edit")}</button><button class="icon-button" aria-label="Duplicar ${e(q.number)}" data-action="duplicate-quote" data-id="${q.id}">${icon("copy")}</button><button class="icon-button danger" aria-label="Excluir ${e(q.number)}" data-action="delete-quote" data-id="${q.id}">${icon("trash")}</button></td></tr>`).join("")}</tbody></table></div>` : empty("file", filter ? "Nenhum resultado por aqui." : "Sua próxima ideia começa aqui.", filter ? "Tente buscar outro nome ou alterar o filtro." : "Salve seu primeiro orçamento para acompanhar seus projetos.", "Criar orçamento", "new-quote")}`;
}
function empty(i, title, text, button, action) {
  return `<div class="empty-state panel"><span class="empty-icon">${icon(i)}</span><h2>${title}</h2><p>${text}</p>${button ? `<button class="button primary" data-action="${action}">${icon("plus")} ${button}</button>` : ""}</div>`;
}
function overview() {
  const total = store.quotes.reduce(
      (sum, q) => sum + calculateQuote(q, q.pricing || store.settings).total,
      0,
    ),
    approved = store.quotes.filter((q) => q.status === "Aprovado");
  return `${pageHead("SEU ESTÚDIO, EM PERSPECTIVA", 'Olá, vamos criar<span class="heading-dot">?</span>', "Uma visão do seu trabalho, da primeira ideia à aprovação.", `<button class="button primary" data-action="new-quote">${icon("plus")} Criar orçamento</button>`)}<div class="overview-banner"><div><span class="eyebrow">BAROTTO 3D</span><h2>Boas ideias merecem<br>uma proposta à altura.</h2><p>Organize seus custos. Valorize sua criação.</p><button class="button primary" data-action="navigate" data-view="editor">Continuar meu rascunho ${icon("arrow")}</button></div><div class="hero-object">${productArt(0)}</div></div><div class="metrics">${[
    [
      "file",
      "Orçamentos salvos",
      store.quotes.length,
      "Seu histórico neste navegador",
    ],
    [
      "check",
      "Projetos aprovados",
      approved.length,
      "Aprovações registradas por você",
    ],
    [
      "wallet",
      "Total em propostas",
      money(total),
      "Soma de todos os orçamentos",
    ],
  ]
    .map(
      ([i, t, v, d]) =>
        `<article class="panel metric"><span>${icon(i)} ${t}</span><strong>${v}</strong><small>${d}</small></article>`,
    )
    .join(
      "",
    )}</div><div class="section-title"><div><h2>Projetos recentes</h2><p>Cada proposta é uma nova possibilidade.</p></div><button class="text-button" data-action="navigate" data-view="history">Ver todos ${icon("arrow")}</button></div>${
    store.quotes.length
      ? `<div class="recent-grid">${store.quotes
          .slice()
          .reverse()
          .slice(0, 3)
          .map(
            (q) =>
              `<button class="panel recent-card" data-action="open-quote" data-id="${q.id}"><div><span class="status-tag ${statusClass(q.status)}">${e(q.status)}</span><small>${e(q.number)}</small></div><h3>${e(q.title)}</h3><p>${e(q.client)}</p><strong>${money(calculateQuote(q, q.pricing || store.settings).total)}</strong>${icon("arrow")}</button>`,
          )
          .join("")}</div>`
      : empty(
          "cube",
          "Um estúdio cheio de possibilidades.",
          "Seus projetos aparecerão aqui depois do primeiro orçamento.",
          "Criar meu primeiro orçamento",
          "new-quote",
        )
  }`;
}
function catalog() {
  return `${pageHead("CRIE UMA VEZ. REUTILIZE SEMPRE.", 'Meus produtos<span class="heading-dot">.</span>', "Suas peças favoritas, prontas para o próximo orçamento.", `<button class="button primary" data-action="catalog-new">${icon("plus")} Cadastrar produto</button>`)}<div class="info-strip">${icon("box")} O orçamento usa o preço unitário cadastrado para consumidor final ou lojista, multiplicado pela quantidade solicitada.</div>${store.catalog.length ? `<div class="catalog-grid">${store.catalog.map((p, i) => `<article class="panel catalog-card"><div class="catalog-art">${productVisual(p, i)}</div><div class="catalog-card-content"><span class="eyebrow">${e(p.material)} · ${e(p.color || "COR A DEFINIR")}</span><h2>${e(p.name)}</h2><div class="catalog-meta"><span>${p.grams} g · ${p.hours} h informados</span></div><div class="catalog-batch-label">${p.productionQuantity ?? 1} peça(s) no lote · ${(p.inputBasis ?? "unit") === "batch" ? "Dados do lote inteiro" : "Dados por unidade"}</div><div class="production-costs">${productionCosts(p, calculateItem(p, store.settings))}</div><div class="catalog-pricing-label">PREÇO DE VENDA POR UNIDADE</div><div class="catalog-prices"><div><span>Consumidor final</span><strong>${money(calculateItem(p, store.settings, "retail").unitPrice)} <small>/ un.</small></strong></div><div><span>Lojista</span><strong>${money(calculateItem(p, store.settings, "wholesale").unitPrice)} <small>/ un.</small></strong></div></div>${p.price != null ? '<small class="fixed-price-note">Preço fixo: igual para os dois tipos de cliente.</small>' : ""}<div class="catalog-actions"><button class="button secondary" data-action="catalog-add" data-id="${p.id}">${icon("plus")} Usar no orçamento</button><button class="icon-button" aria-label="Editar ${e(p.name)}" data-action="catalog-edit" data-id="${p.id}">${icon("edit")}</button><button class="icon-button danger" aria-label="Excluir ${e(p.name)}" data-action="catalog-delete" data-id="${p.id}">${icon("trash")}</button></div></div></article>`).join("")}</div>` : empty("box", "Seu catálogo está esperando suas criações.", "Cadastre uma peça ou use “Salvar no catálogo” nos produtos do orçamento.", "Cadastrar primeiro produto", "catalog-new")}`;
}
const productionFields = (s) =>
  `${field("Potência média da impressora", "power", s.power, { type: "number", scope: "settings", unit: "W" })}${field("Tarifa de energia", "kwh", s.kwh, { type: "number", scope: "settings", unit: "R$/kWh" })}${field("Valor da impressora", "printer", s.printer, { type: "number", scope: "settings", unit: "R$" })}${field("Vida útil da impressora", "life", s.life, { type: "number", scope: "settings", unit: "horas", min: 1, step: 1 })}${field("Custos fixos mensais", "fixed", s.fixed, { type: "number", scope: "settings", unit: "R$" })}${field("Produções mensais (lotes ou peças)", "monthly", s.monthly, { type: "number", scope: "settings", unit: "prod.", min: 1, step: 1 })}${field("Embalagem por produção (lote ou peça)", "packaging", s.packaging, { type: "number", scope: "settings", unit: "R$" })}${field("Hora de acabamento", "labor", s.labor, { type: "number", scope: "settings", unit: "R$/h" })}${field("Reserva para falhas", "failure", s.failure, { type: "number", scope: "settings", unit: "%", max: 100 })}${field("Markup — consumidor final", "markup", s.markup, { type: "number", scope: "settings", unit: "×", min: 1, max: 100, required: true })}${field("Markup — lojista", "markupWholesale", s.markupWholesale ?? s.markup, { type: "number", scope: "settings", unit: "×", min: 1, max: 100, required: true })}${field("Imposto sobre a venda", "tax", s.tax, { type: "number", scope: "settings", unit: "%", max: 99 })}${field("Taxa de pagamento", "card", s.card, { type: "number", scope: "settings", unit: "%", max: 99 })}${field("Anúncios sobre a venda", "ads", s.ads, { type: "number", scope: "settings", unit: "%", max: 99 })}`;
function settings() {
  const s = normalizePricing(store.settings);
  return `${pageHead("DO SEU JEITO", 'Configurações<span class="heading-dot">.</span>', "A identidade do seu estúdio e os números por trás das suas criações.")}<form id="settings-form" class="settings-layout"><div class="settings-main"><section class="panel settings-section"><div class="panel-heading"><div>${icon("cube")}<h2>Seu estúdio</h2></div><span class="quiet">Visível na proposta</span></div><div class="form-grid">${field("Nome da empresa", "company", s.company, { scope: "settings", required: true })}${field("Contato comercial", "contact", s.contact, { scope: "settings", placeholder: "Telefone, e-mail ou Instagram" })}${field("CPF / CNPJ (opcional)", "document", s.document, { scope: "settings" })}${field("Endereço (opcional)", "address", s.address, { scope: "settings" })}</div></section><section class="panel settings-section"><div class="panel-heading"><div>${icon("settings")}<h2>Custos e precificação</h2></div></div><p class="section-description">Valores padrão para novos orçamentos. Orçamentos existentes guardam os custos usados na criação.</p><div class="form-grid">${productionFields(s)}</div><div class="formula-note">Preço sugerido = custo com reserva de falhas × markup.<br>Lucro estimado = venda com desconto − custo − taxas. Exemplo: markup 3× significa vender por três vezes o custo.</div></section><section class="panel settings-section"><div class="panel-heading"><div>${icon("file")}<h2>Condições padrão</h2></div></div><div class="form-grid">${field("Validade do orçamento", "validity", s.validity, { type: "number", scope: "settings", unit: "dias", min: 1, max: 365, step: 1 })}${field("Prazo de produção", "lead", s.lead, { type: "number", scope: "settings", unit: "dias úteis", min: 1, max: 365, step: 1 })}${textarea("Pagamento", "payment", s.payment, "settings")}${textarea("Condições", "terms", s.terms, "settings")}</div></section><button class="button primary" type="submit">${icon("save")} Salvar configurações</button></div><aside><section class="panel backup-card"><span class="large-icon">${icon("shield")}</span><h2>Seu trabalho bem guardado.</h2><p>Os dados ficam apenas neste navegador. Para transferir de computador ou evitar perdas, baixe uma cópia regularmente.</p><button type="button" class="button primary" data-action="backup">${icon("download")} Baixar backup</button><button type="button" class="button secondary" data-action="restore">${icon("upload")} Restaurar backup</button><input id="backup-input" type="file" accept=".json,application/json" hidden><small>O backup inclui clientes, produtos, orçamentos, rascunho e configurações. Guarde-o em local seguro.</small>${storageBlocked ? `<button type="button" class="text-button" data-action="raw-backup">Baixar dados originais para recuperação</button>` : ""}</section><div class="tip-card">${icon("help")}<p>Não há sincronização entre navegadores. O endereço local e o futuro site GitHub terão armazenamentos separados. Use o backup para transferir.</p></div></aside></form>`;
}
function navigate(next) {
  if (view === "editor") flush();
  view = next;
  shell();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function validateQuote() {
  const form = document.querySelector("#quote-form");
  if (form && !form.reportValidity()) return false;
  if (!(quote.client || "").trim()) {
    toast("Informe o nome do cliente antes de preparar a proposta.", true);
    return false;
  }
  if (!quote.items.length || quote.items.some((i) => !(i.name || "").trim())) {
    toast("Adicione ao menos um produto e informe o nome de cada peça.", true);
    return false;
  }
  try {
    calculateQuote(quote, pricing());
    return true;
  } catch (error) {
    toast(error.message, true);
    return false;
  }
}
function saveQuote() {
  if (!validateQuote()) return false;
  const previous = structuredClone(store.quotes),
    previousNumber = quote.number;
  if (!quote.number) {
    const next =
      Math.max(
        0,
        ...store.quotes.map((q) => Number(q.number?.match(/(\d+)$/)?.[1]) || 0),
      ) + 1;
    quote.number = `ORC-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;
  }
  quote.example = false;
  quote.pricing = structuredClone(pricing());
  const index = store.quotes.findIndex((q) => q.id === quote.id);
  if (index >= 0) store.quotes[index] = structuredClone(quote);
  else store.quotes.push(structuredClone(quote));
  if (!flush()) {
    store.quotes = previous;
    quote.number = previousNumber;
    return false;
  }
  shell();
  toast(`Orçamento ${quote.number} salvo neste navegador.`);
  return true;
}
function showDialog(html, cls = "") {
  modal.className = cls;
  modal.innerHTML = html;
  modal.showModal();
}
function modalHeader(title, subtitle = "") {
  return `<div class="modal-heading"><div><h2 id="modal-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div><button class="icon-button" aria-label="Fechar" data-action="close-modal">${icon("close")}</button></div>`;
}
function preview() {
  if (!validateQuote()) return;
  if (!saveQuote()) return;
  showDialog(
    `${modalHeader("Sua proposta está pronta.", "Uma apresentação do seu trabalho, com os valores para o cliente.")}<div class="export-customer"><label for="proposal-customer-type">Exportar proposta para</label><select id="proposal-customer-type">${customerTypeOptions(quote.customerType ?? "retail")}</select><span id="export-pricing-note">${exportPricingNote()}</span></div><div class="proposal-toolbar"><label>Status <select id="quote-status">${["Rascunho", "Enviado", "Aprovado", "Recusado"].map((s) => `<option ${s === quote.status ? "selected" : ""}>${s}</option>`).join("")}</select></label><div><button class="button secondary" data-action="copy-proposal">${icon("copy")} Copiar texto</button><button class="button secondary" data-action="download-proposal">${icon("download")} Baixar proposta</button><button class="button primary" data-action="print-proposal">${icon("file")} Salvar PDF / Imprimir</button></div></div><div class="proposal-preview"><style>${proposalCSS.replaceAll("body{", ".proposal-preview{").replaceAll("@media print{", "@media print{")}</style>${proposalBody(quote, { ...pricing(), ...businessSettings() })}</div>`,
    "proposal-dialog",
  );
}
function businessSettings() {
  return Object.fromEntries(
    ["company", "contact", "address", "document"].map((k) => [
      k,
      store.settings[k],
    ]),
  );
}
function hasUnsavedQuote() {
  const saved = store.quotes.find((q) => q.id === quote.id);
  if (saved) return JSON.stringify(saved) !== JSON.stringify(quote);
  const { initialState, ...content } = quote;
  return !initialState || JSON.stringify(content) !== initialState;
}
function openQuote(id, duplicate = false) {
  if (view === "editor") flush();
  quote = structuredClone(store.quotes.find((q) => q.id === id));
  quote.example = false;
  if (duplicate)
    Object.assign(quote, {
      id: uid(),
      number: "",
      date: today(),
      validUntil: plusDays(store.settings.validity),
      status: "Rascunho",
    });
  view = "editor";
  draft();
  shell();
  window.scrollTo(0, 0);
  if (duplicate) toast("Cópia criada como rascunho.");
}
function customerSettings() {
  return { ...pricing(), ...businessSettings() };
}
function download(content, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function catalogEditor(id) {
  const p = id ? store.catalog.find((p) => p.id === id) : blankItem();
  showDialog(
    `${modalHeader(id ? "Editar produto" : "Um novo produto para o catálogo", "Informe o lote de produção para calcular o custo de cada peça.")}<form id="catalog-form" data-id="${p.id}">${photoEditor(p)}${itemProductionFields(p)}<div class="form-grid">${field("Nome do produto", "name", p.name, { scope: p.id, required: true, wide: true })}${select("Material", "material", p.material, ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Resina", "Outro"], p.id)}${field("Cor / acabamento", "color", p.color, { scope: p.id })}${field("Peso de material informado", "grams", p.grams, { scope: p.id, type: "number", unit: "g", required: true })}${field("Tempo de impressão informado", "hours", p.hours, { scope: p.id, type: "number", unit: "horas", required: true })}${field("Preço do material", "filament", p.filament, { scope: p.id, type: "number", unit: "R$/kg", required: true })}${field("Preço fixo (opcional)", "price", p.price, { scope: p.id, type: "number", unit: "R$", placeholder: "Automático" })}${field("Tempo de acabamento informado", "minutes", p.minutes, { scope: p.id, type: "number", unit: "min" })}${field("Custos extras informados", "extra", p.extra, { scope: p.id, type: "number", unit: "R$" })}${field("Descrição da peça", "note", p.note, { scope: p.id, wide: true })}</div><div id="catalog-cost-preview" class="production-costs">${productionCosts(p, calculateItem(p, store.settings), false, true)}</div><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">${icon("save")} Salvar produto</button></div></form>`,
  );
}
function confirmAction(title, description, action, id, label = "Confirmar") {
  showDialog(
    `${modalHeader(title)}<p class="confirm-description">${description}</p><div class="modal-actions"><button class="button secondary" data-action="close-modal">Cancelar</button><button class="button primary" data-action="${action}" data-id="${e(id || "")}">${label}</button></div>`,
  );
}
const handlers = {
  navigate: (el) => navigate(el.dataset.view),
  "close-modal": () => modal.close(),
  "image-choose": (el) => el.closest("form").querySelector('#product-image-file').click(),
  "image-remove": (el) => {
    const form = el.closest("form");
    setEditorImage(form, "");
    form.querySelector(".photo-status").textContent = "Imagem removida. Salve o produto para confirmar.";
  },
  help: () =>
    showDialog(
      `${modalHeader("Do fatiador à proposta, em poucos passos.")}<ol class="help-list"><li><strong>Configure seu estúdio.</strong> Informe a marca, os custos e a forma de pagamento.</li><li><strong>Monte o orçamento.</strong> Preencha o cliente, escolha os produtos do catálogo e informe a quantidade solicitada. Dados do lote são definidos em Meus produtos.</li><li><strong>Confira os valores.</strong> Confira o preço unitário do cadastro para o tipo de cliente, o frete e o desconto.</li><li><strong>Compartilhe sua criação.</strong> Baixe a proposta HTML, copie o texto ou salve em PDF.</li></ol><p class="help-foot">O salvamento é local. Faça backup em Configurações. Nenhuma mensagem é enviada automaticamente.</p>`,
    ),
  "add-product": () => {
    if (store.catalog.length) return handlers["from-catalog"]();
    quote.items.push(blankItem());
    draft();
    shell();
    const cards = document.querySelectorAll(".product-card");
    cards[cards.length - 1].open = true;
    cards[cards.length - 1].scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  },
  "clear-example": () => {
    quote = newQuote(false);
    draft();
    shell();
  },
  "new-quote": () =>
    confirmAction(
      "Começar um novo orçamento?",
      "O rascunho atual será substituído. Orçamentos salvos continuam no histórico.",
      "confirm-new",
      "",
      "Criar novo orçamento",
    ),
  "confirm-new": () => {
    modal.close();
    quote = newQuote();
    view = "editor";
    draft();
    shell();
    window.scrollTo(0, 0);
  },
  "duplicate-item": (el) => {
    const p = quote.items.find((p) => p.id === el.dataset.id);
    quote.items.push({ ...structuredClone(p), id: uid() });
    draft();
    shell();
  },
  "remove-item": (el) => {
    if (quote.items.length === 1) {
      toast("Mantenha ao menos um produto no orçamento.", true);
      return;
    }
    quote.items = quote.items.filter((p) => p.id !== el.dataset.id);
    draft();
    shell();
  },
  "save-quote": saveQuote,
  preview: preview,
  "open-quote": (el) => {
    if (hasUnsavedQuote())
      confirmAction(
        "Substituir o rascunho atual?",
        "Há alterações que ainda não foram salvas no histórico. Volte ao orçamento e salve antes de continuar, ou substitua o rascunho.",
        "confirm-open",
        el.dataset.id,
        "Substituir rascunho",
      );
    else openQuote(el.dataset.id);
  },
  "confirm-open": (el) => {
    modal.close();
    openQuote(el.dataset.id);
  },
  "duplicate-quote": (el) => {
    if (hasUnsavedQuote())
      confirmAction(
        "Substituir o rascunho por uma cópia?",
        "Há alterações que ainda não foram salvas no histórico. Cancele para voltar e salvar, ou substitua pelo orçamento duplicado.",
        "confirm-duplicate",
        el.dataset.id,
        "Criar cópia",
      );
    else openQuote(el.dataset.id, true);
  },
  "confirm-duplicate": (el) => {
    modal.close();
    openQuote(el.dataset.id, true);
  },
  "delete-quote": (el) =>
    confirmAction(
      "Excluir este orçamento?",
      "Esta ação remove o orçamento do histórico local. Baixe um backup se quiser guardar uma cópia.",
      "confirm-delete",
      el.dataset.id,
      "Excluir orçamento",
    ),
  "confirm-delete": (el) => {
    const original = store.quotes;
    store.quotes = store.quotes.filter((q) => q.id !== el.dataset.id);
    if (persist()) {
      modal.close();
      shell();
      toast("Orçamento excluído.");
    } else store.quotes = original;
  },
  "catalog-save": (el) => {
    const p = quote.items.find((p) => p.id === el.dataset.id);
    if (!(p.name || "").trim()) {
      toast("Informe o nome do produto.", true);
      return;
    }
    calculateItem(p, pricing());
    const product = { ...structuredClone(p), quantity: 1, id: uid(), costVersion: 2 };
    delete product.catalogId;
    delete product.catalogPricing;
    store.catalog.push(product);
    if (persist()) {
      quote.items[quote.items.indexOf(p)] = catalogQuoteItem(product, store.settings, p.quantity, p.id);
      draft();
      shell();
      toast("Produto adicionado ao catálogo.");
    } else store.catalog.pop();
  },
  "catalog-new": () => catalogEditor(),
  "catalog-edit": (el) => catalogEditor(el.dataset.id),
  "catalog-delete": (el) =>
    confirmAction(
      "Excluir este produto?",
      "Orçamentos já criados mantêm seus próprios produtos.",
      "confirm-catalog-delete",
      el.dataset.id,
      "Excluir produto",
    ),
  "confirm-catalog-delete": (el) => {
    const original = store.catalog;
    store.catalog = store.catalog.filter((p) => p.id !== el.dataset.id);
    if (persist()) {
      modal.close();
      shell();
      toast("Produto excluído do catálogo.");
    } else store.catalog = original;
  },
  "catalog-add": (el) => {
    const p = store.catalog.find((p) => p.id === el.dataset.id);
    if (quote.items.length === 1 && !(quote.items[0].name || "").trim())
      quote.items = [];
    quote.items.push(catalogQuoteItem(p, store.settings));
    quote.example = false;
    view = "editor";
    draft();
    modal.close();
    shell();
    toast("Produto adicionado ao orçamento.");
  },
  "catalog-refresh": (el) => {
    const index = quote.items.findIndex((p) => p.id === el.dataset.id);
    const item = quote.items[index];
    const source = matchingCatalogProduct(item);
    if (!source) return;
    quote.items[index] = { ...catalogQuoteItem(source, store.settings, item.quantity, item.id), note: item.note };
    quote.example = false;
    draft();
    shell();
    toast("Preço unitário atualizado pelo cadastro. Quantidade mantida.");
  },
  "from-catalog": () =>
    showDialog(
      `${modalHeader("Escolha uma criação do catálogo", "Os produtos serão adicionados ao orçamento atual.")}<div class="catalog-picker">${store.catalog.length ? store.catalog.map((p) => `<button data-action="catalog-add" data-id="${p.id}"><span class="catalog-picker-image">${p.image ? `<img src="${e(p.image)}" alt="Foto de ${e(p.name)}" class="product-photo">` : icon("cube")}</span><div><strong>${e(p.name)}</strong><small>${e(p.material)} · ${money(calculateItem(p, store.settings, quote.customerType ?? "retail").unitPrice)} por unidade</small></div>${icon("plus")}</button>`).join("") : `<p>Seu catálogo ainda está vazio. Use “Salvar no catálogo” em um produto do orçamento ou cadastre uma peça.</p><button class="button primary" data-action="catalog-new">${icon("plus")} Cadastrar produto</button>`}</div>`,
    ),
  "download-proposal": () => {
    download(
      proposalDocument(quote, customerSettings()),
      `${quote.number || "proposta"}-${quote.customerType === "wholesale" ? "lojista" : "consumidor-final"}-Barotto3D.html`,
      "text/html;charset=utf-8",
    );
    toast("Proposta baixada. O arquivo abre em qualquer navegador.");
  },
  "copy-proposal": async () => {
    try {
      await navigator.clipboard.writeText(quoteText(quote, customerSettings()));
      toast("Texto copiado. Cole na conversa com o cliente.");
    } catch {
      showDialog(
        `${modalHeader("Copie a proposta abaixo")}<textarea class="copy-fallback" readonly>${e(quoteText(quote, customerSettings()))}</textarea>`,
      );
    }
  },
  "print-proposal": () => {
    const frame = document.createElement("iframe");
    frame.className = "print-frame";
    frame.title = "Proposta para impressão";
    frame.srcdoc = proposalDocument(quote, customerSettings());
    frame.onload = () => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
    document.querySelectorAll(".print-frame").forEach((f) => f.remove());
    document.body.append(frame);
  },
  backup: () => {
    flush();
    download(
      JSON.stringify(store, null, 2),
      `barotto3d-backup-${today()}.json`,
    );
    toast("Backup baixado. Guarde uma cópia em local seguro.");
  },
  restore: () => document.querySelector("#backup-input").click(),
  "raw-backup": () => {
    let raw;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch {}
    download(
      raw || JSON.stringify(store, null, 2),
      `barotto3d-recuperacao-${today()}.json`,
    );
  },
  "confirm-restore": () => {
    const original = store;
    store = pendingBackup;
    store.settings = normalizePricing(store.settings);
    storageBlocked = false;
    if (persist()) {
      quote = store.draft || newQuote();
      modal.close();
      shell();
      toast("Backup restaurado.");
    } else {
      store = original;
    }
    pendingBackup = null;
  },
  "quote-pricing": () =>
    showDialog(
      `${modalHeader("Custos deste orçamento", "Ajustes de produção afetam os produtos avulsos. Produtos do catálogo mantêm os preços copiados do cadastro. Taxas afetam o resultado estimado.")}<form id="pricing-form"><div class="form-grid">${productionFields(pricing())}</div><div class="modal-actions"><button class="button secondary" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">Aplicar e recalcular</button></div></form>`,
    ),
};
let pendingBackup = null;
document.addEventListener("click", async (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  event.preventDefault();
  try {
    await handlers[el.dataset.action]?.(el);
  } catch (error) {
    toast(error.message || "Não foi possível concluir a ação.", true);
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  const catalogForm = el.closest("#catalog-form");
  if (catalogForm) {
    updateCatalogCosts(catalogForm);
    return;
  }
  if (el.closest("#settings-form") || el.closest("#pricing-form")) return;
  if (el.type === "number" && !el.checkValidity()) return;
  if (el.dataset.field) {
    quote[el.dataset.field] =
      el.type === "number"
        ? el.value === ""
          ? ""
          : Number(el.value)
        : el.value;
    quote.example = false;
    draft();
    updateSummary();
  }
  if (el.dataset.item) {
    const item = quote.items.find((i) => i.id === el.dataset.item);
    if (!item) return;
    if (["grams", "hours", "filament", "minutes", "extra", "productionQuantity", "inputBasis"].includes(el.dataset.key))
      item.costVersion = 2;
    item[el.dataset.key] =
      el.type === "number"
        ? el.value === ""
          ? el.dataset.key === "price"
            ? null
            : ""
          : Number(el.value)
        : el.value;
    draft();
    updateSummary();
  }
  if (el.id === "quote-search") {
    filter = el.value;
    const pos = el.selectionStart;
    shell();
    const input = document.querySelector("#quote-search");
    input.focus();
    input.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  if (el.id === "product-image-file") {
    const form = el.closest("form");
    const file = el.files[0];
    if (!file) return;
    const buttons = [...form.querySelectorAll('.photo-editor button, button[type="submit"]')];
    buttons.forEach((button) => button.disabled = true);
    el.disabled = true;
    form.querySelector(".photo-status").textContent = "Preparando imagem…";
    try {
      const encoded = await prepareProductImage(file);
      if (form.isConnected) {
        setEditorImage(form, encoded);
        form.querySelector(".photo-status").textContent = "Imagem pronta. Salve o produto para guardar a foto.";
      }
    } catch (error) {
      if (form.isConnected) {
        form.querySelector(".photo-status").textContent = error.message;
        toast(error.message, true);
      }
    } finally {
      buttons.forEach((button) => button.disabled = false);
      el.disabled = false;
      el.value = "";
    }
    return;
  }
  if (el.id === "proposal-customer-type") {
    const previous = quote.customerType;
    quote.customerType = el.value;
    if (saveQuote()) {
      document.querySelector(".proposal-preview").innerHTML =
        `<style>${proposalCSS.replaceAll("body{", ".proposal-preview{")}</style>${proposalBody(quote, customerSettings())}`;
      document.querySelector("#export-pricing-note").textContent =
        exportPricingNote();
      toast(
        `Proposta atualizada para ${customerLabel(quote.customerType).toLowerCase()}.`,
      );
    } else {
      quote.customerType = previous;
      el.value = previous ?? "retail";
    }
  }
  if (el.id === "status-filter") {
    statusFilter = el.value;
    shell();
  }
  if (el.id === "quote-status") {
    const previous = quote.status;
    quote.status = el.value;
    const q = store.quotes.find((q) => q.id === quote.id);
    if (q) q.status = quote.status;
    if (flush()) toast(`Status atualizado: ${quote.status}.`);
    else {
      quote.status = previous;
      if (q) q.status = previous;
      el.value = previous;
    }
  }
  if (el.id === "backup-input" && el.files[0]) {
    try {
      if (el.files[0].size > 15e6)
        throw new Error("Use um backup de até 15 MB.");
      pendingBackup = parseBackup(await el.files[0].text());
      confirmAction(
        "Restaurar este backup?",
        `O arquivo contém ${pendingBackup.quotes.length} orçamento(s) e ${pendingBackup.catalog.length} produto(s). Ele substituirá os dados atuais deste navegador. Baixe o backup atual antes de continuar.`,
        "confirm-restore",
        "",
        "Restaurar dados",
      );
    } catch (error) {
      toast(`Backup não restaurado: ${error.message}`, true);
    }
    el.value = "";
  }
});
function settingsFromForm(form, base) {
  const next = normalizePricing(base);
  form.querySelectorAll("[data-setting]").forEach((el) => {
    next[el.dataset.setting] =
      el.type === "number"
        ? number(
            el.value,
            el.previousElementSibling?.textContent || el.dataset.setting,
          )
        : el.value;
  });
  calculateQuote({ items: [], discount: 0, shipping: 0 }, next);
  calculateItem(blankItem(), next);
  if (next.validity > 365 || next.lead > 365)
    throw new Error("Prazo e validade devem ser de até 365 dias.");
  return next;
}
document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  try {
    if (form.id === "quote-form") {
      saveQuote();
    }
    if (form.id === "settings-form") {
      const original = store.settings;
      store.settings = settingsFromForm(form, store.settings);
      if (persist()) {
        shell();
        toast(
          "Configurações salvas. Custos padrão serão usados nos novos orçamentos.",
        );
      } else store.settings = original;
    }
    if (form.id === "pricing-form") {
      quote.pricing = settingsFromForm(form, pricing());
      for (const item of quote.items) if (!item.catalogPricing) item.costVersion = 2;
      draft();
      modal.close();
      shell();
      toast("Custos do orçamento atualizados.");
    }
    if (form.id === "catalog-form") {
      const p = { ...blankItem(), id: form.dataset.id };
      form
        .querySelectorAll("[data-key]")
        .forEach(
          (el) =>
            (p[el.dataset.key] =
              el.type === "number"
                ? el.value === "" && el.dataset.key === "price"
                  ? null
                  : Number(el.value)
                : el.value),
        );
      calculateItem(p, store.settings);
      const original = structuredClone(store.catalog);
      const index = store.catalog.findIndex((i) => i.id === p.id);
      if (index >= 0) store.catalog[index] = p;
      else store.catalog.push(p);
      if (persist()) {
        modal.close();
        if (view === "catalog") shell();
        toast("Produto salvo no catálogo.");
      } else store.catalog = original;
    }
  } catch (error) {
    toast(error.message, true);
  }
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      modal.close();
  }
});
shell();
