/**
 * Fetches TMDB poster URLs for each fiction and updates data/fictions.json.
 * Requires: TMDB_API_KEY environment variable (get a free key at https://www.themoviedb.org/settings/api).
 *
 * Run: TMDB_API_KEY=your_key node scripts/fetch-fiction-covers-tmdb.js
 *
 * TMDB attribution: This product uses the TMDB API but is not endorsed or certified by TMDB.
 * @see https://developer.themoviedb.org/docs
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FICTIONS_PATH = path.join(DATA_DIR, "fictions.json");
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const apiKey = process.env.TMDB_API_KEY;
if (!apiKey) {
  console.error("Set TMDB_API_KEY. Get a free key at https://www.themoviedb.org/settings/api");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchMovie(title, year) {
  const q = encodeURIComponent(title);
  const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${q}&year=${year}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const first = data.results?.[0];
  return first?.poster_path ? `${TMDB_IMAGE_BASE}${first.poster_path}` : null;
}

async function searchTv(title, year) {
  const q = encodeURIComponent(title);
  const url = `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${q}&first_air_date_year=${year}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const first = data.results?.[0];
  return first?.poster_path ? `${TMDB_IMAGE_BASE}${first.poster_path}` : null;
}

async function main() {
  const raw = fs.readFileSync(FICTIONS_PATH, "utf8");
  const fictions = JSON.parse(raw);
  let updated = 0;

  for (let i = 0; i < fictions.length; i++) {
    const f = fictions[i];
    const isTv = f.type === "tv-series";
    try {
      const url = isTv ? await searchTv(f.title, f.year) : await searchMovie(f.title, f.year);
      if (url) {
        f.coverImage = url;
        updated++;
        console.log(`[${i + 1}/${fictions.length}] ${f.title} -> TMDB poster`);
      } else {
        console.log(`[${i + 1}/${fictions.length}] ${f.title} -> no match, keeping current`);
      }
    } catch (err) {
      console.warn(`[${i + 1}/${fictions.length}] ${f.title} error:`, err.message);
    }
    await sleep(250);
  }

  fs.writeFileSync(FICTIONS_PATH, JSON.stringify(fictions, null, 2), "utf8");
  console.log(`\nDone. Updated ${updated}/${fictions.length} cover images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
