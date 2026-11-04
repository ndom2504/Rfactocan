import assert from "node:assert/strict";
import test from "node:test";
import {
  deliveryLabel,
  opportunityBody,
  toOpportunity,
} from "./market-opportunities";

const market = {
  code: "CA" as const,
  country: "CA" as const,
  currency: "CAD" as const,
  label: "Canada",
  destination: "",
};

test("delivery window is written in French", () => {
  assert.equal(deliveryLabel(7, 15), "7 à 15 jours");
  assert.equal(deliveryLabel(undefined, 15), "");
});

test("opportunity card states the trend, the price and the source", () => {
  const body = opportunityBody({
    soldCount: 12400,
    priceLabel: "18,40 CAD",
    delivery: "7 à 15 jours",
    marketLabel: "Canada",
    destination: "",
    productUrl: "https://www.aliexpress.com/item/1.html",
    rating: 4.6,
  });
  assert.match(body, /12[\s\u00a0\u202f]?400 ventes/);
  assert.match(body, /18,40 CAD/);
  assert.match(body, /Demandé au Canada/);
  assert.match(body, /Source : AliExpress · Canada/);
});

test("a product without a photo is dropped", () => {
  assert.equal(
    toOpportunity(
      {
        productId: "1",
        title: "Lampe LED chambre",
        image: "",
        url: "https://www.aliexpress.com/item/1.html",
        priceFormatted: "12 CAD",
      },
      market
    ),
    null
  );
});

test("a ranked product becomes a Canada opportunity", () => {
  const draft = toOpportunity(
    {
      productId: "99",
      title: "Écouteurs bluetooth sport",
      image: "https://ae-pic.aliexpress-media.com/kf/demo.jpg",
      url: "https://www.aliexpress.com/item/99.html",
      priceFormatted: "15,20 CAD",
      soldCount: 800,
      deliveryDaysMin: 8,
      deliveryDaysMax: 14,
    },
    market
  );
  assert.equal(draft?.sourceKey, "opportunity:ca:99");
  assert.match(draft?.body || "", /8 à 14 jours/);
});
