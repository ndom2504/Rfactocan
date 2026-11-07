import assert from "node:assert/strict";
import test from "node:test";
import {
  sourceUrlFromBody,
  trendBody,
  trendTitle,
  youtubeThumb,
} from "./community-trends";

test("a job reference code is removed from the title", () => {
  assert.equal(
    trendTitle("2026-90991 - Conseiller relation entreprise"),
    "Conseiller relation entreprise"
  );
});

test("the card names the official source and its link", () => {
  const body = trendBody({
    label: "Emploi",
    summary: "Accueil des usagers et relation avec les entreprises.",
    sourceName: "France Travail",
    sourceUrl: "https://recrute.francetravail.org/offre",
    tag: "Emploi",
  });
  assert.match(body, /^Emploi/);
  assert.match(body, /Source : France Travail/);
  assert.match(body, /https:\/\/recrute\.francetravail\.org\/offre/);
  assert.equal(
    sourceUrlFromBody(body),
    "https://recrute.francetravail.org/offre"
  );
});

test("a France Travail video becomes a photo", () => {
  assert.equal(
    youtubeThumb("Voir https://youtu.be/Fbi14JWDTdg?si=abc"),
    "https://i.ytimg.com/vi/Fbi14JWDTdg/hqdefault.jpg"
  );
});
