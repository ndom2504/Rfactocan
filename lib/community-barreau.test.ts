import assert from "node:assert/strict";
import test from "node:test";
import { barreauBody } from "./community-barreau";
import { sourceUrlFromBody } from "./community-trends";

test("a Barreau card names the category, the territory and the official link", () => {
  const body = barreauBody({
    category: "Préparation au Barreau",
    summary: "Les étapes pour devenir avocat au Québec.",
    sourceName: "Barreau du Québec",
    sourceUrl: "https://www.barreau.qc.ca/fr/futurs-membres/",
    region: "Québec",
  });
  assert.match(body, /^Préparation au Barreau/);
  assert.match(body, /Territoire : Québec/);
  assert.match(body, /Source : Barreau du Québec/);
  assert.equal(
    sourceUrlFromBody(body),
    "https://www.barreau.qc.ca/fr/futurs-membres/"
  );
});
