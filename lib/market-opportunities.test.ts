import assert from "node:assert/strict";
import test from "node:test";
import {
  deliveryLabel,
  opportunityBody,
  rankOpportunityPosts,
  toOpportunity,
} from "./market-opportunities";

const market = {
  code: "CA",
  country: "CA",
  currency: "CAD",
  label: "Canada",
  destination: "le Canada",
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
    destination: "le Canada",
    productUrl: "https://www.aliexpress.com/item/1.html",
    rating: 4.6,
    origin: "Chine",
  });
  assert.match(body, /12[\s\u00a0\u202f]?400 ventes/);
  assert.match(body, /18,40 CAD/);
  assert.match(body, /vers le Canada/);
  assert.match(body, /Expédié de Chine/);
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

test("the feed leads with the United States, France and Hong Kong", () => {
  const ranked = rankOpportunityPosts([
    { sourceKey: "opportunity:de:1" },
    { sourceKey: "opportunity:de:2" },
    { sourceKey: "opportunity:us:1" },
    { sourceKey: "opportunity:fr:1" },
    { sourceKey: "opportunity:hk:1" },
  ]);
  assert.deepEqual(
    ranked.map((post) => post.sourceKey),
    [
      "opportunity:us:1",
      "opportunity:fr:1",
      "opportunity:hk:1",
      "opportunity:de:1",
    ]
  );
});
