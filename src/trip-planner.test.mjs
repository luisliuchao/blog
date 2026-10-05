import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import matter from 'gray-matter';
import {
  parsePlannerDays,
  plansFromDays,
  preparePlannerPosts,
  regionalMode,
  renderPlanner,
  stripPlannerFences
} from './trip-planner.mjs';

const sample = `## Day

\`\`\`planner
date: 17 Oct
dow: Sat
title: MUC → Hallein
transit: Rental car
hotel: Bauernbräugut
mode: driving
group: alps
stop: Munich Airport (MUC) | Munich Airport MUC
stop: Hotel | Bauernbräugut Hallein | hotel
\`\`\`

- 交通：自驾

\`\`\`js
const keep = true;
\`\`\`
`;

test('parses a planner block into a day', () => {
  const days = parsePlannerDays(sample);
  assert.equal(days.length, 1);
  assert.equal(days[0].mode, 'driving');
  assert.equal(days[0].stops[1].hotel, true);
  assert.equal(days[0].stops[1].group, 'alps');
  assert.equal(days[0].stops[0].query, 'Munich Airport MUC');
});

test('rejects a planner block that omits a required field', () => {
  assert.throws(
    () =>
      parsePlannerDays(`\`\`\`planner
date: 17 Oct
dow: Sat
title: Out
transit: Car
hotel: Inn
stop: A | A query
\`\`\``),
    /missing mode/
  );
});

test('rejects an unknown planner key', () => {
  assert.throws(
    () =>
      parsePlannerDays(`\`\`\`planner
date: 17 Oct
dow: Sat
title: Out
transit: Car
hotel: Inn
mode: driving
note: no
stop: A | A query
\`\`\``),
    /unknown key note/
  );
});

test('lets one day belong to two regions', () => {
  const days = parsePlannerDays(`\`\`\`planner
date: 24 Oct
dow: Sat
title: Munich → Berlin
transit: ICE
hotel: Adina
mode: transit
stop: Augustiner-Keller | Augustiner-Keller Munich | munich
stop: Adina | Adina Berlin | hotel | berlin
\`\`\``);
  assert.equal(days[0].stops[0].group, 'munich');
  assert.equal(days[0].stops[1].group, 'berlin');
  assert.equal(days[0].stops[1].hotel, true);
});

test('strips planner fences and leaves other code alone', () => {
  const stripped = stripPlannerFences(sample);
  assert.doesNotMatch(stripped, /```planner/);
  assert.match(stripped, /const keep = true/);
  assert.match(stripped, /## Day\n\n- 交通：自驾/);
});

test('builds regional routes in day order and drops only consecutive repeats', () => {
  const days = parsePlannerDays(`\`\`\`planner
date: 21 Oct
dow: Wed
title: Return
transit: Drive
hotel: Inn
mode: driving
group: munich
stop: Hotel | Hotel Q
stop: Hotel again | Hotel Q | hotel
stop: Garden | Garden Q
\`\`\`

\`\`\`planner
date: 22 Oct
dow: Thu
title: Ulm
transit: ICE
hotel: Inn
mode: transit
group: munich
stop: Station | Station Q
stop: Garden later | Garden Q
\`\`\``);
  assert.deepEqual(plansFromDays(days).munich, ['Hotel Q', 'Garden Q', 'Station Q', 'Garden Q']);
  assert.equal(regionalMode(days, 'munich'), 'transit');
});

test('keeps a driving regional plan when a day in that region is walked', () => {
  const days = [
    {
      mode: 'driving',
      stops: [{ group: 'alps', query: 'A' }]
    },
    {
      mode: 'walking',
      stops: [{ group: 'alps', query: 'B' }]
    }
  ];
  assert.equal(regionalMode(days, 'alps'), 'driving');
});

test('renders the map page from the parsed days', () => {
  const days = parsePlannerDays(sample.replace('Munich Airport (MUC)', 'Munich <script>'));
  const html = renderPlanner({ days, itineraryPath: '/posts/family-europe-itinerary/' });
  assert.match(html, /Open Alps driving plan/);
  assert.match(html, /"planModes":\{"alps":"driving"\}/);
  assert.match(html, /href="\/posts\/family-europe-itinerary\/"/);
  assert.match(html, /Munich \\u003cscript/);
  assert.equal(html.match(/<\/script>/g).length, 1);
  const script = html.slice(html.indexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));
  new Function(script);
});

test('publishes a raw map page and hides the fences on the itinerary', () => {
  const posts = preparePlannerPosts([
    {
      slug: 'family-europe-itinerary',
      title: 'Family Europe itinerary',
      date: '2026-09-18',
      description: 'Days',
      content: sample,
      raw: false,
      gate: true,
      path: '/posts/family-europe-itinerary/',
      planner: 'family-europe-2026',
      plannerTitle: 'Family Europe trip',
      plannerDescription: 'Maps'
    },
    {
      slug: 'family-europe-2026',
      title: 'Old hand copy',
      date: '2026-09-18',
      description: 'Stale',
      content: '<p>hand edited</p>',
      raw: true,
      gate: true,
      path: '/posts/family-europe-2026/',
      planner: '',
      plannerTitle: '',
      plannerDescription: ''
    }
  ]);
  assert.deepEqual(
    posts.map((post) => post.slug),
    ['family-europe-2026']
  );
  const planner = posts[0];
  assert.equal(planner.redirectFrom, '/posts/family-europe-itinerary/');
  assert.doesNotMatch(planner.itineraryMarkdown, /```planner/);
  assert.match(planner.itineraryMarkdown, /const keep = true/);
  assert.equal(planner.raw, true);
  assert.equal(planner.gate, true);
  assert.equal(planner.title, 'Family Europe trip');
  assert.match(planner.content, /Open Alps driving plan/);
  assert.doesNotMatch(planner.content, /hand edited/);
});

test('the published itinerary is the map source', async () => {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'posts', 'family-europe-itinerary.md');
  const parsed = matter(await readFile(path, 'utf8'));
  const posts = preparePlannerPosts([
    {
      slug: 'family-europe-itinerary',
      title: parsed.data.title,
      date: '2026-09-18',
      description: 'Days',
      content: parsed.content,
      raw: false,
      gate: parsed.data.gate === true,
      path: '/posts/family-europe-itinerary/',
      planner: parsed.data.planner,
      plannerTitle: parsed.data.plannerTitle,
      plannerDescription: parsed.data.plannerDescription
    }
  ]);
  assert.equal(posts.length, 1);
  const planner = posts[0];
  assert.equal(planner.slug, 'family-europe-2026');
  assert.match(planner.content, /Open Alps driving plan/);
  assert.match(planner.content, /Open Munich plan/);
  assert.match(planner.content, /Open Berlin plan/);
  assert.match(planner.content, /Bauernbräugut Hofladen Appartements Hallein/);
  assert.match(planner.content, /Berlin Brandenburg Airport BER/);
  assert.equal(planner.gate, true);
  assert.doesNotMatch(planner.itineraryMarkdown, /```planner/);
  assert.match(planner.itineraryMarkdown, /计划活动/);
  assert.match(planner.itineraryMarkdown, /Bauernbräugut，哈莱因/);
  assert.doesNotMatch(planner.itineraryMarkdown, /Essigmanngut/);
  assert.equal(parsed.content.match(/```planner/g).length, 14);
});
