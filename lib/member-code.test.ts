import assert from "node:assert/strict";
import test from "node:test";
import {
  publicDisplayName,
  randomMemberCode,
  stripMemberCode,
} from "./member-code";

test("member codes are short and unambiguous", () => {
  const code = randomMemberCode();
  assert.match(code, /^RF[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});

test("public name shows the code once", () => {
  assert.equal(publicDisplayName("Maya Chen", "RF7K2M"), "Maya Chen · RF7K2M");
  assert.equal(
    publicDisplayName("Maya Chen · RF7K2M", "RF7K2M"),
    "Maya Chen · RF7K2M"
  );
  assert.equal(stripMemberCode("Maya Chen · RF7K2M", "RF7K2M"), "Maya Chen");
});
