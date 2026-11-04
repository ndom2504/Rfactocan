import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NEWS_DESKS, formatScoreStory, parseFeedEntries } from "./community-news";

describe("community news", () => {
  it("lit un titre RSS et sa source", () => {
    const entries = parseFeedEntries(`
      <rss><channel>
        <item>
          <title><![CDATA[Une remontée dont les Jets avaient besoin]]></title>
          <link>https://www.nhl.com/fr/news/jets</link>
          <description>MONTRÉAL – Tyrel Bauer devant les médias.</description>
          <enclosure url="https://cdn.example.com/jets.jpg" type="image/jpeg" />
        </item>
      </channel></rss>
    `);
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.title, "Une remontée dont les Jets avaient besoin");
    assert.equal(entries[0]?.link, "https://www.nhl.com/fr/news/jets");
    assert.match(entries[0]?.summary ?? "", /Tyrel Bauer/);
    assert.equal(entries[0]?.imageUrl, "https://cdn.example.com/jets.jpg");
  });

  it("rédige un résultat avec la source et le hashtag", () => {
    const nhl = NEWS_DESKS.find((desk) => desk.id === "nhl");
    assert.ok(nhl);
    const story = formatScoreStory({
      desk: nhl,
      sourceName: "NHL.com",
      url: "https://www.nhl.com/scores",
      state: "final",
      key: "nhl:1",
      away: { name: "Mammoth", score: "3" },
      home: { name: "Maple Leafs", score: "2" },
    });
    assert.equal(story?.title, "Mammoth 3 – Maple Leafs 2");
    assert.match(story?.body ?? "", /Mammoth l'emporte 3-2/);
    assert.match(story?.body ?? "", /Source : NHL.com/);
    assert.match(story?.body ?? "", /#NHL/);
  });
});
