import assert from "node:assert/strict";
import test from "node:test";
import {
  handleMatchesName,
  memberHandle,
  publicDisplayName,
  stripMemberCode,
} from "./member-code";

test("the handle follows the name shown in the app", () => {
  assert.equal(memberHandle("Maya Chen"), "MayaChen");
  assert.equal(memberHandle("Stéphane Nguema"), "StephaneNguema");
  assert.equal(memberHandle("n'dong"), "Ndong");
});

test("a numbered handle still belongs to the same name", () => {
  assert.equal(handleMatchesName("MayaChen", "Maya Chen"), true);
  assert.equal(handleMatchesName("MayaChen2", "Maya Chen"), true);
  assert.equal(handleMatchesName("RF7K2M", "Maya Chen"), false);
});

test("public name shows the handle once", () => {
  assert.equal(publicDisplayName("Maya Chen", "MayaChen"), "Maya Chen · MayaChen");
  assert.equal(
    publicDisplayName("Maya Chen · MayaChen", "MayaChen"),
    "Maya Chen · MayaChen"
  );
  assert.equal(stripMemberCode("Maya Chen · MayaChen", "MayaChen"), "Maya Chen");
});
