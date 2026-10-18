import test from "node:test";
import assert from "node:assert/strict";
import { proposalDocument, quoteText } from "../proposal.js";
import {
  calculateItem,
  calculateQuote,
  defaults,
  publicQuote,
  parseBackup,
  writeStore,
  readStore,
  normalizePricing,
  catalogQuoteItem,
} from "../core.js";

test("produto cadastrado usa seu preço unitário mesmo com custos diferentes no orçamento", () => {
  const product = { ...item, productionQuantity: 10, inputBasis: "batch", quantity: 60,
    catalogId: "catalog-1", catalogPricing: { ...config, markupWholesale: 2 } };
  const quoteCosts = { ...config, fixed: 10000, markup: 10, markupWholesale: 8 };
  const retail = calculateItem(product, quoteCosts, "retail");
  const wholesale = calculateItem(product, quoteCosts, "wholesale");
  assert.equal(retail.unitPrice, 4.95);
  assert.equal(retail.total, 297);
  assert.equal(wholesale.unitPrice, 3.3);
  assert.equal(wholesale.total, 198);
  assert.equal(retail.cost, 1.65);
});

test("exportação usa o preço cadastrado para o tipo selecionado sem expor a origem interna", () => {
  const q = { items: [{ ...item, quantity: 60, catalogId: "catalog-1",
    catalogPricing: { ...config, markupWholesale: 2 } }], customerType: "wholesale" };
  const output = publicQuote(q, { ...config, markupWholesale: 9 });
  assert.equal(output.items[0].unitPrice, 33);
  assert.equal(output.total, 1980);
  assert.doesNotMatch(JSON.stringify(output), /catalogPricing|catalogId|productionQuantity/);
});

const config = {
  ...defaults,
  power: 200,
  kwh: 1,
  printer: 2000,
  life: 10000,
  fixed: 100,
  monthly: 100,
  packaging: 2,
  failure: 10,
  markup: 3,
  tax: 6,
  card: 4,
  ads: 0,
  labor: 30,
};
const item = {
  id: "p1",
  name: "Suporte",
  material: "PLA",
  color: "Verde",
  grams: 100,
  hours: 5,
  quantity: 2,
  filament: 100,
  extra: 0,
  minutes: 0,
  price: null,
};

const sampleImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhZkAAAAASUVORK5CYII=";

test("foto cadastrada acompanha produto, backup e proposta HTML sem arquivo externo", () => {
  const product = { ...item, image: sampleImage };
  const copied = catalogQuoteItem(product, config);
  const data = { version: 1, settings: config, catalog: [product],
    quotes: [{ id: "q1", items: [copied] }], draft: null };
  const restored = parseBackup(JSON.stringify(data));
  assert.equal(restored.catalog[0].image, sampleImage);
  assert.equal(restored.quotes[0].items[0].image, sampleImage);
  const exported = publicQuote(restored.quotes[0], config);
  assert.equal(exported.items[0].image, sampleImage);
  const html = proposalDocument(restored.quotes[0], config);
  assert.ok(html.includes(`<img src="${sampleImage}"`));
  assert.doesNotMatch(JSON.stringify(exported), /catalogPricing|catalogId/);
});

test("backup recusa fotos externas, SVG, dados inválidos e imagens grandes", () => {
  for (const image of ["https://example.com/photo.jpg", "javascript:alert(1)",
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/png;base64,not an image',
    'data:image/png;base64,' + 'A'.repeat(140000), { src: sampleImage }]) {
    const data = { version: 1, settings: config, catalog: [{ ...item, image }], quotes: [], draft: null };
    assert.throws(() => parseBackup(JSON.stringify(data)));
  }
});

test("lote do PDF inclui energia uma vez e divide o custo completo entre cinco peças", () => {
  const product = { ...item, grams: 16, hours: 0.5, filament: 120,
    productionQuantity: 5, inputBasis: "batch", quantity: 5 };
  const settings = { ...config, power: 360, kwh: 0.84, printer: 4500,
    life: 20000, fixed: 0, packaging: 2.5, failure: 15 };
  const result = calculateItem(product, settings);
  assert.equal(result.batchCost, 5.39);
  assert.equal(result.cost, 1.08);
  assert.ok(Math.abs(result.energy * 5 - 0.1512) < 1e-10);
  assert.equal(result.packaging * 5, 2.5);
  assert.equal(result.orderCost, 5.39);
  const withoutPower = calculateItem(product, { ...settings, power: 0 });
  assert.equal(withoutPower.batchCost, 5.21);
});

test("rateio fixo do lote entra uma vez antes da divisão", () => {
  const product = { ...item, grams: 0, hours: 0, productionQuantity: 5,
    inputBasis: "batch", quantity: 5 };
  const result = calculateItem(product, { ...config, fixed: 200, monthly: 100, packaging: 0, failure: 0 });
  assert.equal(result.batchCost, 2);
  assert.equal(result.fixed, 0.4);
  assert.equal(result.cost, 0.4);
});

test("usar cadastro copia os dois preços e inicia com uma unidade solicitada, independente do lote", () => {
  const source = { ...item, productionQuantity: 10, inputBasis: "batch" };
  const settings = { ...config, markupWholesale: 2 };
  const copied = catalogQuoteItem(source, settings);
  assert.equal(copied.quantity, 1);
  assert.equal(copied.catalogId, "p1");
  assert.notEqual(copied.id, source.id);
  source.grams = 99999;
  settings.markup = 20;
  copied.quantity = 60;
  assert.equal(calculateItem(copied, settings).total, 297);
  assert.equal(calculateItem(copied, settings, "wholesale").total, 198);
});

test("preço fixo cadastrado é multiplicado pelas unidades solicitadas para ambos os clientes", () => {
  const copied = catalogQuoteItem({ ...item, price: 5.58 }, config, 60);
  for (const type of ["retail", "wholesale"]) {
    const result = calculateItem(copied, { ...config, markup: 9 }, type);
    assert.equal(result.unitPrice, 5.58);
    assert.equal(result.total, 334.8);
  }
});

test("backup preserva preços cadastrados e rejeita parâmetros inválidos da cópia", () => {
  const copied = catalogQuoteItem(item, { ...config, markupWholesale: 2 }, 60);
  const data = { version: 1, settings: { ...config, markup: 10 }, catalog: [item], quotes: [],
    draft: { id: "q1", items: [copied], customerType: "wholesale" } };
  const restored = parseBackup(JSON.stringify(data));
  assert.equal(calculateQuote(restored.draft, restored.settings).total, 1980);
  data.draft.items[0].catalogPricing.life = 0;
  assert.throws(() => parseBackup(JSON.stringify(data)));
});

test("custo inclui material, energia, desgaste, fixos, embalagem e reserva", () => {
  const result = calculateItem(item, config);
  assert.equal(result.material, 10);
  assert.equal(result.energy, 1);
  assert.equal(result.machine, 1);
  assert.equal(result.cost, 16.5);
  assert.equal(result.unitPrice, 49.5);
  assert.equal(result.total, 99);
});
test("vários produtos, desconto e frete mantêm o total conferível", () => {
  const result = calculateQuote(
    {
      items: [item, { ...item, id: "p2", quantity: 1, price: 25 }],
      discount: 10,
      shipping: 15,
    },
    config,
  );
  assert.equal(result.subtotal, 124);
  assert.equal(result.total, 129);
  assert.equal(result.cost, 49.5);
  assert.equal(result.fees, 11.4);
  assert.equal(result.profit, 53.1);
  assert.equal(result.quantity, 3);
});
test("preço manual zero é respeitado, sem recuperar o preço sugerido", () => {
  assert.equal(calculateItem({ ...item, price: 0 }, config).unitPrice, 0);
});
test("desconto não torna o orçamento negativo e frete não aumenta o lucro", () => {
  const result = calculateQuote(
    { items: [item], discount: 500, shipping: 15 },
    config,
  );
  assert.equal(result.total, 15);
  assert.equal(result.profit, -33);
});
test("centavos são arredondados no preço unitário antes de multiplicar", () => {
  const result = calculateItem({ ...item, quantity: 3, price: 10.005 }, config);
  assert.equal(result.unitPrice, 10.01);
  assert.equal(result.total, 30.03);
});
test("valores negativos, quantidades fracionadas e divisores zero são rejeitados", () => {
  assert.throws(() => calculateItem({ ...item, grams: -1 }, config));
  assert.throws(() => calculateItem({ ...item, quantity: 1.5 }, config));
  assert.throws(() => calculateItem(item, { ...config, life: 0 }));
});
test("proposta pública não contém custos, margens ou parâmetros internos", () => {
  const result = publicQuote(
    {
      number: "ORC-0001",
      client: "Cliente",
      items: [item],
      discount: 0,
      shipping: 0,
    },
    config,
  );
  const encoded = JSON.stringify(result);
  for (const key of [
    "filament",
    "markup",
    "profit",
    "cost",
    "grams",
    "tax",
    "printer",
  ])
    assert.ok(!encoded.includes('"' + key + '"'));
  assert.equal(result.items[0].total, 99);
});
test("backup inválido não entra no armazenamento", () => {
  assert.throws(() => parseBackup("{oops"));
  assert.throws(() =>
    parseBackup(JSON.stringify({ version: 1, quotes: "inválido" })),
  );
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        version: 1,
        settings: config,
        quotes: [],
        catalog: [{ ...item, quantity: -2 }],
      }),
    ),
  );
});
test("backup válido é restaurável e mantém os produtos de cada orçamento", () => {
  const data = {
    version: 1,
    settings: config,
    quotes: [{ id: "q1", items: [item], discount: 0, shipping: 0 }],
    catalog: [item],
    draft: null,
  };
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
});
test("armazenamento confirma escrita e informa indisponibilidade sem falso sucesso", () => {
  const memory = new Map();
  const store = {
    setItem: (k, v) => memory.set(k, v),
    getItem: (k) => memory.get(k) ?? null,
  };
  const data = {
    version: 1,
    settings: config,
    quotes: [],
    catalog: [],
    draft: null,
  };
  writeStore(store, data);
  assert.deepEqual(readStore(store), data);
  assert.throws(() =>
    writeStore(
      {
        setItem() {
          throw Error("QuotaExceededError");
        },
      },
      data,
    ),
  );
});
test("backup recusa identificadores que poderiam injetar HTML na interface", () => {
  const data = {
    version: 1,
    settings: config,
    quotes: [],
    catalog: [{ ...item, id: '"><img src=x onerror=alert(1)>' }],
    draft: null,
  };
  assert.throws(() => parseBackup(JSON.stringify(data)));
});
test("uma escrita inválida preserva o armazenamento anterior", () => {
  const data = {
    version: 1,
    settings: config,
    quotes: [],
    catalog: [],
    draft: null,
  };
  const memory = new Map();
  const storage = {
    setItem: (k, v) => memory.set(k, v),
    getItem: (k) => memory.get(k) ?? null,
  };
  writeStore(storage, data);
  assert.throws(() =>
    writeStore(storage, {
      ...data,
      settings: { ...config, terms: "a".repeat(10001) },
    }),
  );
  assert.deepEqual(readStore(storage), data);
});
test("desconto monetário fracionado é arredondado antes do cálculo", () => {
  const result = calculateQuote(
    {
      items: [{ ...item, quantity: 1, price: 100 }],
      discount: 0.005,
      shipping: 0,
    },
    config,
  );
  assert.equal(result.discount, 0.01);
  assert.equal(result.total, 99.99);
});
test("backup vazio também valida limites de configuração da produção", () => {
  for (const settings of [
    { ...config, failure: 101 },
    { ...config, markup: 101 },
    { ...config, life: 0 },
  ]) {
    assert.throws(() =>
      parseBackup(
        JSON.stringify({
          version: 1,
          settings,
          quotes: [],
          catalog: [],
          draft: null,
        }),
      ),
    );
  }
});

test("consumidor final e lojista usam markups independentes sobre o mesmo custo", () => {
  const settings = { ...config, markup: 3, markupWholesale: 2 };
  const retail = calculateQuote(
    { items: [item], customerType: "retail" },
    settings,
  );
  const wholesale = calculateQuote(
    { items: [item], customerType: "wholesale" },
    settings,
  );
  assert.equal(retail.cost, 33);
  assert.equal(wholesale.cost, 33);
  assert.equal(retail.total, 99);
  assert.equal(wholesale.total, 66);
});
test("preço manual é mantido ao trocar o tipo de cliente", () => {
  const quote = { items: [{ ...item, price: 20 }], customerType: "wholesale" };
  assert.equal(
    calculateQuote(quote, { ...config, markupWholesale: 2 }).total,
    40,
  );
});
test("orçamentos antigos preservam preço e usam o markup anterior como fallback", () => {
  const legacy = { ...config, markup: 4 };
  delete legacy.markupWholesale;
  assert.equal(calculateQuote({ items: [item] }, legacy).total, 132);
  assert.equal(
    calculateQuote({ items: [item], customerType: "wholesale" }, legacy).total,
    132,
  );
});
test("proposta lojista usa o preço correto sem revelar markups", () => {
  const result = publicQuote(
    { items: [item], customerType: "wholesale" },
    { ...config, markupWholesale: 2 },
  );
  assert.equal(result.total, 66);
  assert.ok(!JSON.stringify(result).includes("markup"));
});
test("backup valida o markup de lojista mesmo quando não há produtos", () => {
  for (const markupWholesale of [0, -2, 101, "inválido"]) {
    assert.throws(() =>
      parseBackup(
        JSON.stringify({
          version: 1,
          settings: { ...config, markupWholesale },
          quotes: [],
          catalog: [],
          draft: null,
        }),
      ),
    );
  }
});
test("tipos de cliente desconhecidos são rejeitados", () => {
  assert.throws(() =>
    calculateQuote({ items: [item], customerType: "outro" }, config),
  );
});
test("HTML e texto exportados usam o tipo de cliente escolhido", () => {
  const quote = { items: [item], customerType: "wholesale" };
  const settings = { ...config, markupWholesale: 2 };
  const html = proposalDocument(quote, settings),
    text = quoteText(quote, settings);
  for (const result of [html, text]) {
    assert.match(result, /66,00/);
    assert.doesNotMatch(result, /markup|Lucro estimado|Custo de produção/);
  }
});
test("migração inicia os dois tipos com o markup anterior e restaura snapshots independentes", () => {
  const legacy = normalizePricing({ markup: 4 });
  assert.equal(legacy.markup, 4);
  assert.equal(legacy.markupWholesale, 4);
  const data = {
    version: 1,
    settings: { ...config, markupWholesale: 5 },
    quotes: [
      {
        id: "q1",
        items: [item],
        customerType: "wholesale",
        pricing: { ...config, markupWholesale: 2 },
      },
    ],
    catalog: [],
    draft: null,
  };
  const restored = parseBackup(JSON.stringify(data));
  assert.equal(
    calculateQuote(restored.quotes[0], restored.quotes[0].pricing).total,
    66,
  );
});

test("lote divide material, tempo, acabamento e extras pela quantidade produzida", () => {
  const settings = { ...config, fixed: 0, packaging: 0, failure: 0 };
  const result = calculateItem(
    {
      ...item,
      grams: 100,
      hours: 5,
      minutes: 60,
      extra: 8,
      productionQuantity: 10,
      inputBasis: "batch",
      quantity: 4,
    },
    settings,
  );
  assert.equal(result.cost, 5);
  assert.equal(result.batchCost, 50);
  assert.equal(result.orderCost, 20);
  assert.equal(result.unitPrice, 15);
  assert.equal(result.total, 60);
  assert.equal(result.unitHours, 0.5);
});
test("cálculo anterior de embalagem e rateio por unidade pode ser preservado", () => {
  const result = calculateItem(
    {
      ...item,
      grams: 100,
      hours: 5,
      productionQuantity: 10,
      inputBasis: "batch",
      costVersion: 1,
      quantity: 3,
    },
    config,
  );
  assert.equal(result.cost, 4.62);
  assert.equal(result.batchCost, 46.2);
  assert.equal(result.orderCost, 13.86);
});
test("dados por unidade não são divididos pela quantidade do lote", () => {
  const result = calculateItem(
    { ...item, productionQuantity: 10, inputBasis: "unit" },
    config,
  );
  assert.equal(result.cost, 16.5);
  assert.equal(result.batchCost, 165);
  assert.equal(result.orderCost, 33);
});
test("quantidade produzida é inteira positiva e a base de entrada deve ser conhecida", () => {
  for (const productionQuantity of [0, -1, 1.5])
    assert.throws(() => calculateItem({ ...item, productionQuantity }, config));
  assert.throws(() => calculateItem({ ...item, inputBasis: "outro" }, config));
});
test("totais de custo do lote mantêm centavos reais sem multiplicar o custo unitário arredondado", () => {
  const settings = {
    ...config,
    power: 0,
    printer: 0,
    fixed: 0,
    packaging: 0,
    failure: 0,
  };
  const quote = {
    items: [
      {
        ...item,
        grams: 1000,
        filament: 100,
        productionQuantity: 3,
        inputBasis: "batch",
        quantity: 3,
      },
    ],
    discount: 0,
    shipping: 0,
  };
  const result = calculateQuote(quote, settings);
  assert.equal(result.items[0].cost, 33.33);
  assert.equal(result.items[0].batchCost, 100);
  assert.equal(result.cost, 100);
  assert.equal(result.hours, 5);
});
test("proposta de lote mostra quantidade vendida e preços sem dados internos de produção", () => {
  const result = publicQuote(
    {
      items: [
        { ...item, productionQuantity: 10, inputBasis: "batch", quantity: 4 },
      ],
    },
    config,
  );
  assert.equal(result.items[0].quantity, 4);
  assert.equal(result.items[0].unitPrice, 4.95);
  assert.equal(result.total, 19.8);
  assert.doesNotMatch(
    JSON.stringify(result),
    /batchCost|orderCost|productionQuantity|inputBasis/,
  );
});
test("backup preserva quantidade produzida, base dos dados e quantidade vendida", () => {
  const product = {
    ...item,
    productionQuantity: 10,
    inputBasis: "batch",
    quantity: 4,
  };
  const data = {
    version: 1,
    settings: config,
    quotes: [{ id: "q1", items: [product] }],
    catalog: [product],
    draft: null,
  };
  const restored = parseBackup(JSON.stringify(data));
  assert.deepEqual(restored.catalog, data.catalog);
  assert.deepEqual(restored.quotes[0].items[0], { ...product, costVersion: 1 });
  assert.equal(
    calculateQuote(restored.quotes[0], restored.settings).items[0].orderCost,
    18.48,
  );
});

test("orçamento antigo mantém preço e só aplica o custo completo do lote ao atualizar pelo cadastro", () => {
  const product = { ...item, productionQuantity: 10, inputBasis: "batch", quantity: 60 };
  const data = { version: 1, settings: config, catalog: [product],
    quotes: [{ id: "q1", items: [{ ...product, catalogId: "p1", catalogPricing: config }] }], draft: null };
  const restored = parseBackup(JSON.stringify(data));
  assert.equal(calculateQuote(restored.quotes[0], config).total, 831.6);
  const updated = catalogQuoteItem(restored.catalog[0], config, 60);
  assert.equal(calculateItem(updated, config).total, 297);
  restored.quotes[0].items = [updated];
  const again = parseBackup(JSON.stringify(restored));
  assert.equal(calculateQuote(again.quotes[0], config).total, 297);
  again.quotes[0].items[0].costVersion = 3;
  assert.throws(() => parseBackup(JSON.stringify(again)));
});
