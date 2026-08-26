import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchDirectoryUsers, sanitizeMatchPhones } from "./in-network";

describe("sanitizeMatchPhones", () => {
  it("ignore les numéros trop courts et trop longs sans tout rejeter", () => {
    assert.deepEqual(
      sanitizeMatchPhones(["07 47 00 12", "12", 12, " 077 47 00 12 "]),
      ["07 47 00 12", "077 47 00 12"]
    );
  });
});

describe("matchDirectoryUsers", () => {
  const alice = { id: "a", phone: "+24177470012" };
  const bob = { id: "b", phone: "+15145550123" };

  it("relie un membre In Gabon aux formats 07 et 077 du carnet", () => {
    const hits = matchDirectoryUsers(
      ["07 47 00 12", "une ligne trop bizarre pour Zod autrefois"],
      [alice, bob]
    );
    assert.equal(hits.length, 1);
    assert.equal(hits[0].user.id, "a");
    assert.equal(hits[0].phone, "07 47 00 12");
  });

  it("relie les numéros admin In (Gabon 076 et Canada 819/438)", () => {
    const christina = { id: "c", phone: "+24176455397" };
    const divine = { id: "d", phone: "+18199191846" };
    const goudegnon = { id: "g", phone: "+14385272566" };
    const hits = matchDirectoryUsers(
      ["076 45 53 97", "819 919 1846", "438-527-2566"],
      [christina, divine, goudegnon]
    );
    assert.deepEqual(
      hits.map((hit) => hit.user.id).sort(),
      ["c", "d", "g"]
    );
  });

  it("relie aussi le 077 national et un numéro canadien", () => {
    const hits = matchDirectoryUsers(
      ["077 47 00 12", "514-555-0123"],
      [alice, bob]
    );
    assert.deepEqual(
      hits.map((hit) => [hit.user.id, hit.phone]).sort(),
      [
        ["a", "077 47 00 12"],
        ["b", "514-555-0123"],
      ]
    );
  });
});
