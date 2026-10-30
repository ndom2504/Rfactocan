import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VIRTUAL_POST_TEMPLATES } from "./virtual-community-posts";

describe("virtual community catalog", () => {
  it("a des templates uniques avec photo et localisation", () => {
    const ids = new Set(VIRTUAL_POST_TEMPLATES.map((t) => t.id));
    assert.equal(ids.size, VIRTUAL_POST_TEMPLATES.length);
    for (const t of VIRTUAL_POST_TEMPLATES) {
      assert.ok(t.city.length > 1);
      assert.ok(t.country.length === 2);
      assert.ok(t.photoUrl.startsWith("https://"));
      assert.ok(t.body.length > 40);
      assert.ok(t.title.length > 8);
    }
  });

  it("couvre Gabon et Canada pour la diaspora", () => {
    const countries = new Set(VIRTUAL_POST_TEMPLATES.map((t) => t.country));
    assert.ok(countries.has("GA"));
    assert.ok(countries.has("CA"));
  });
});
