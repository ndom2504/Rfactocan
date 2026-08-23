import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalDmReaction, summarizeReactions, toggleReactionSummaries } from "./dm-reactions";

describe("summarizeReactions", () => {
  it("groups counts and marks mine", () => {
    const out = summarizeReactions(
      [
        { messageId: "m1", userId: "me", emoji: "❤️" },
        { messageId: "m1", userId: "you", emoji: "❤️" },
        { messageId: "m1", userId: "other", emoji: "👍" },
        { messageId: "m2", userId: "you", emoji: "😂" },
      ],
      "me"
    );
    assert.equal(out.m1?.[0]?.emoji, "❤️");
    assert.equal(out.m1?.[0]?.count, 2);
    assert.equal(out.m1?.[0]?.mine, true);
    assert.equal(out.m1?.[1]?.emoji, "👍");
    assert.equal(out.m1?.[1]?.mine, false);
    assert.equal(out.m2?.[0]?.emoji, "😂");
    assert.equal(out.m2?.[0]?.mine, false);
  });

  it("accepts heart with or without variation selector", () => {
    assert.equal(canonicalDmReaction("❤"), "❤️");
    assert.equal(canonicalDmReaction("❤️"), "❤️");
    assert.equal(canonicalDmReaction("nope"), null);
  });

  it("toggles one reaction per user", () => {
    const added = toggleReactionSummaries([], "👍");
    assert.deepEqual(added, [{ emoji: "👍", count: 1, mine: true }]);
    const removed = toggleReactionSummaries(added, "👍");
    assert.deepEqual(removed, []);
    const switched = toggleReactionSummaries(added, "😂");
    assert.deepEqual(switched, [{ emoji: "😂", count: 1, mine: true }]);
  });
});
