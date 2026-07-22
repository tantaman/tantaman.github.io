import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_PATTERN,
  extractAlbums,
  extractEvents,
  extractThoughtEnrichments,
  extractTasks,
} from "./thought-enrichments.ts";

const REFERENCE_SECONDS = Date.UTC(2026, 1, 20, 12) / 1_000;

test("extracts every structured hashtag lane without swallowing the next lane", () => {
  const body = [
    "#p Launch Rindle thoughts",
    "A draft project",
    "#t Ship capture projections",
    "Keep them replay-safe",
    "#q Does view-after-write equal a fresh query?",
    "Verify all eight lanes",
    "#e tomorrow 14:30 Launch review",
    "Bring the query plan",
    "#l Philadelphia, PA",
    "Near the river",
    "#b Designing Data-Intensive Applications",
    "Revisit IVM notes",
    "#m The Matrix",
    "Still excellent",
    "#a Kid A",
    "Radiohead",
  ].join("\n");

  const rows = extractThoughtEnrichments(body, REFERENCE_SECONDS * 1_000);
  assert.equal(rows.projects[0]?.title, "Launch Rindle thoughts");
  assert.equal(rows.tasks[0]?.description, "Keep them replay-safe");
  assert.equal(rows.questions[0]?.description, "Verify all eight lanes");
  assert.equal(rows.events[0]?.dateEpoch, Date.UTC(2026, 1, 21, 14, 30) / 1_000);
  assert.equal(rows.locations[0]?.description, "Near the river");
  assert.equal(rows.books[0]?.title, "Designing Data-Intensive Applications");
  assert.equal(rows.movies[0]?.description, "Still excellent");
  assert.equal(rows.albums[0]?.description, "Radiohead");
  for (const lane of Object.values(rows)) assert.equal(lane.length, 1);
});

test("events retain legacy date grammar and UTC resolution", () => {
  assert.match("#E 02/26/27 13:00 eye", EVENT_PATTERN);
  const [event] = extractEvents("#e 02/26/27 13:00 eye", REFERENCE_SECONDS);
  assert.equal(event?.dateText, "02/26/27 13:00");
  assert.equal(event?.dateEpoch, Date.UTC(2027, 1, 26, 13) / 1_000);
});

test("legacy task case sensitivity and album case insensitivity remain compatible", () => {
  assert.deepEqual(extractTasks("#T not captured"), []);
  assert.equal(extractAlbums("#A Kid A")[0]?.title, "Kid A");
});
