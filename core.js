export const STORE_KEY = "3dorca.v1";
export const defaults = Object.freeze({
  company: "Barotto 3D",
  contact: "",
  document: "",
  address: "",
  power: 250,
  kwh: 0.95,
  printer: 3500,
  life: 10000,
  fixed: 200,
  monthly: 100,
  packaging: 2,
  failure: 10,
  markup: 3,
  tax: 6,
  card: 0,
  ads: 0,
  labor: 30,
  payment: "50% na aprovação e 50% na entrega.",
  terms:
    "Produção iniciada após aprovação do orçamento e confirmação do sinal. Cores podem apresentar pequenas variações.",
  validity: 7,
  lead: 5,
});
export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value) || 0,
  );
export const round = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const uid = () => crypto.randomUUID();
export function number(value, label = "Valor", min = 0, max = 1e9) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max)
    throw new Error(`${label}: informe um valor entre ${min} e ${max}.`);
  return result;
}
export function normalizePricing(settings = defaults) {
  return {
    ...defaults,
    ...settings,
    markupWholesale:
      settings.markupWholesale ?? settings.markup ?? defaults.markup,
  };
}
export function customerLabel(type = "retail") {
  if (!["retail", "wholesale"].includes(type))
    throw new Error("Tipo de cliente inválido.");
  return type === "wholesale" ? "Lojista" : "Consumidor final";
}
export function selectedMarkup(settings = defaults, type = "retail") {
  customerLabel(type);
  const normalized = normalizePricing(settings);
  return number(
    type === "wholesale" ? normalized.markupWholesale : normalized.markup,
    "Markup",
    1,
    100,
  );
}
export function calculateItem(
  item,
  settings = defaults,
  customerType = "retail",
) {
  const s = normalizePricing(item.catalogPricing ?? settings);
  const quantity = number(item.quantity, "Quantidade", 1, 100000);
  if (!Number.isInteger(quantity))
    throw new Error("Quantidade deve ser um número inteiro.");
  const productionQuantity = number(
    item.productionQuantity ?? 1,
    "Quantidade produzida",
    1,
    100000,
  );
  if (!Number.isInteger(productionQuantity))
    throw new Error("Quantidade produzida deve ser um número inteiro.");
  const inputBasis = item.inputBasis ?? "unit";
  if (!["unit", "batch"].includes(inputBasis))
    throw new Error("Escolha se os dados são do lote inteiro ou por unidade.");
  const divisor = inputBasis === "batch" ? productionQuantity : 1;
  const grams = number(item.grams, "Peso", 0, 1e6) / divisor,
    hours = number(item.hours, "Tempo", 0, 100000) / divisor;
  const material = (grams / 1000) * number(item.filament, "Filamento");
  const energy =
    ((hours * number(s.power, "Potência")) / 1000) * number(s.kwh, "Energia");
  const machine =
    (hours * number(s.printer, "Impressora")) / number(s.life, "Vida útil", 1);
  const fixed =
    number(s.fixed, "Custo fixo") / number(s.monthly, "Unidades mensais", 1);
  const packaging = number(s.packaging, "Embalagem");
  const labor =
    (number(item.minutes ?? 0, "Acabamento") / divisor / 60) *
    number(s.labor, "Hora de trabalho");
  const base =
    material +
    energy +
    machine +
    fixed +
    packaging +
    labor +
    number(item.extra ?? 0, "Custo extra") / divisor;
  const reserve = (base * number(s.failure, "Falhas", 0, 100)) / 100;
  const cost = round(base + reserve);
  const preciseCost = inputBasis === "batch" ? base + reserve : cost;
  const markup = selectedMarkup(s, customerType);
  const suggested = round(cost * markup);
  const unitPrice =
    item.price === null || item.price === undefined || item.price === ""
      ? suggested
      : round(number(item.price, "Preço de venda"));
  return {
    material,
    energy,
    machine,
    fixed,
    packaging,
    labor,
    reserve,
    cost,
    batchCost: round(preciseCost * productionQuantity),
    orderCost: round(preciseCost * quantity),
    productionQuantity,
    inputBasis,
    unitHours: hours,
    unitGrams: grams,
    suggested,
    unitPrice,
    total: round(unitPrice * quantity),
    quantity,
    markup,
  };
}
export function catalogQuoteItem(product, settings = defaults, quantity = 1, id = uid()) {
  const result = {
    ...structuredClone(product),
    id,
    quantity,
    catalogId: product.id,
    catalogPricing: normalizePricing(settings),
  };
  calculateItem(result, settings, "retail");
  calculateItem(result, settings, "wholesale");
  return result;
}
export function calculateQuote(quote, settings = defaults) {
  const customerType = quote.customerType ?? "retail";
  customerLabel(customerType);
  const items = quote.items.map((item) =>
    calculateItem(item, settings, customerType),
  );
  const subtotal = round(items.reduce((v, i) => v + i.total, 0));
  const discount = Math.min(
    round(number(quote.discount ?? 0, "Desconto")),
    subtotal,
  );
  const shipping = round(number(quote.shipping ?? 0, "Frete"));
  const net = round(subtotal - discount);
  const cost = round(items.reduce((v, i) => v + i.orderCost, 0));
  const rate = ["tax", "card", "ads"].reduce(
    (v, k) => v + number(settings[k] ?? defaults[k], k, 0, 100),
    0,
  );
  if (rate >= 100) throw new Error("A soma das taxas deve ser menor que 100%.");
  const fees = round((net * rate) / 100),
    profit = round(net - cost - fees);
  return {
    items,
    subtotal,
    discount,
    shipping,
    total: round(net + shipping),
    cost,
    fees,
    profit,
    margin: net ? (profit / net) * 100 : 0,
    quantity: items.reduce((v, i) => v + i.quantity, 0),
    hours: items.reduce((v, i) => v + i.unitHours * i.quantity, 0),
  };
}
export function publicQuote(quote, settings = defaults) {
  const calc = calculateQuote(quote, settings);
  return {
    number: quote.number,
    client: quote.client,
    email: quote.email,
    phone: quote.phone,
    title: quote.title,
    date: quote.date,
    validUntil: quote.validUntil,
    lead: quote.lead,
    payment: quote.payment,
    notes: quote.notes,
    terms: quote.terms,
    company: settings.company,
    contact: settings.contact,
    document: settings.document,
    address: settings.address,
    items: quote.items.map((i, index) => ({
      name: i.name,
      material: i.material,
      color: i.color,
      note: i.note,
      quantity: i.quantity,
      unitPrice: calc.items[index].unitPrice,
      total: calc.items[index].total,
    })),
    subtotal: calc.subtotal,
    discount: calc.discount,
    shipping: calc.shipping,
    total: calc.total,
  };
}
function validateText(value, label, max = 10000) {
  if (value !== undefined && (typeof value !== "string" || value.length > max))
    throw new Error(`${label} inválido no backup.`);
}
function validateId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    throw new Error("Identificador inválido no backup.");
}
function uniqueIds(items) {
  const ids = new Set();
  for (const item of items) {
    validateId(item.id);
    if (ids.has(item.id)) throw new Error("Identificador duplicado no backup.");
    ids.add(item.id);
  }
}
function validateItem(item, settings) {
  if (!item || typeof item !== "object")
    throw new Error("Produto inválido no backup.");
  validateId(item.id);
  for (const key of ["id", "name", "material", "color", "note", "kind"])
    validateText(item[key], key);
  if (item.catalogPricing !== undefined) {
    if (!item.catalogPricing || typeof item.catalogPricing !== "object" || Array.isArray(item.catalogPricing))
      throw new Error("Preços do produto cadastrado inválidos no backup.");
    validateId(item.catalogId);
    validateProduction(item.catalogPricing);
  }
  calculateItem(item, settings);
}
function validateProduction(settings) {
  selectedMarkup(settings, "retail");
  selectedMarkup(settings, "wholesale");
  calculateItem(
    {
      quantity: 1,
      grams: 0,
      hours: 0,
      filament: 0,
      extra: 0,
      minutes: 0,
      price: null,
    },
    settings,
  );
  calculateQuote({ items: [], discount: 0, shipping: 0 }, settings);
}
export function parseBackup(text) {
  const data = JSON.parse(text);
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.quotes) ||
    !Array.isArray(data.catalog) ||
    !data.settings ||
    typeof data.settings !== "object" ||
    Array.isArray(data.settings)
  )
    throw new Error("Este arquivo não é um backup válido do 3DOrça.");
  if (data.quotes.length > 10000 || data.catalog.length > 10000)
    throw new Error("Backup excede o limite de registros.");
  const settings = normalizePricing(data.settings);
  validateProduction(settings);
  number(settings.validity, "Validade", 1, 365);
  number(settings.lead, "Prazo", 1, 365);
  for (const key of Object.keys(defaults))
    if (typeof defaults[key] === "number")
      number(
        settings[key],
        key,
        key === "life" || key === "monthly" || key === "markup" ? 1 : 0,
      );
    else validateText(settings[key], key);
  const validateQuote = (q) => {
    if (
      !q ||
      typeof q.id !== "string" ||
      !q.id ||
      !Array.isArray(q.items) ||
      q.items.length > 1000
    )
      throw new Error("Orçamento inválido no backup.");
    validateId(q.id);
    uniqueIds(q.items);
    for (const k of [
      "number",
      "client",
      "email",
      "phone",
      "title",
      "date",
      "validUntil",
      "payment",
      "notes",
      "terms",
      "status",
    ])
      validateText(q[k], k);
    if (
      q.pricing &&
      (typeof q.pricing !== "object" || Array.isArray(q.pricing))
    )
      throw new Error("Configuração inválida no orçamento.");
    validateProduction(q.pricing ?? settings);
    for (const i of q.items) validateItem(i, q.pricing ?? settings);
    calculateQuote(q, q.pricing ?? settings);
  };
  for (const q of data.quotes) validateQuote(q);
  for (const p of data.catalog) validateItem(p, settings);
  uniqueIds(data.quotes);
  uniqueIds(data.catalog);
  if (data.draft != null) validateQuote(data.draft);
  calculateQuote({ items: [], discount: 0, shipping: 0 }, settings);
  return data;
}
export function writeStore(storage, data) {
  const encoded = JSON.stringify(data);
  parseBackup(encoded);
  storage.setItem(STORE_KEY, encoded);
}
export function readStore(storage) {
  const raw = storage.getItem(STORE_KEY);
  return raw ? parseBackup(raw) : null;
}
