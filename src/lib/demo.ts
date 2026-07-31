/**
 * One code, embedded, so the page has something to draw before it has asked
 * anyone for anything.
 *
 * The first paint of a tool like this is usually an empty box with a hint in
 * it. Here it is the object itself, built from the same functions a pasted
 * link would use, which also means the hero renders with no network call and
 * the site still works when Spotify's endpoint does not.
 *
 * The heights are the ones the endpoint returned for the track named below.
 * They are not redrawn or rounded: they are what a parse of that code gives.
 */

import { SOURCE_HEIGHT, type Scannable } from "./scannable";

export const DEMO_TRACK = {
  title: "Sweater Weather",
  artist: "The Neighbourhood",
  uri: "spotify:track:2QjOHCTQ1Jl3zawyYOpxh6",
  link: "https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6",
};

const HEIGHTS = [
  11, 25, 25, 25, 11, 39, 32, 39, 46, 32, 53, 60, 46, 60, 11, 39, 60, 60, 39, 32, 39, 18, 11,
];

const FIRST_X = 100;
const PITCH = 12.42;
const BAR_WIDTH = 6.71;

export const DEMO_SCANNABLE: Scannable = (() => {
  const bars = HEIGHTS.map((height, i) => ({
    x: FIRST_X + i * PITCH,
    y: SOURCE_HEIGHT / 2 - height / 2,
    width: BAR_WIDTH,
    height,
  }));

  const last = bars[bars.length - 1];
  return {
    bars,
    barsBox: {
      x: bars[0].x,
      y: Math.min(...bars.map((b) => b.y)),
      width: last.x + last.width - bars[0].x,
      height: Math.max(...HEIGHTS),
    },
    // The mark is not embedded. It is off by default, and a page that shipped
    // Spotify's logo in its own bundle would be the wrong thing to ship.
    mark: null,
    source: "svg",
  };
})();
