import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateItem,
  calculateQuote,
  defaults,
  publicQuote,
  parseBackup,
  writeStore,
  readStore,
} from "../core.js";

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
