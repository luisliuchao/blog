import { escapeHtml } from './obsidian.mjs';

const fencePattern = /```planner[ \t]*\n([\s\S]*?)```/g;
const groups = new Set(['alps', 'munich', 'berlin']);
const modes = new Set(['driving', 'walking', 'transit']);
const requiredKeys = ['date', 'dow', 'title', 'transit', 'hotel', 'mode'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseStop(value, defaultGroup, label) {
  const parts = value.split('|').map((part) => part.trim());
  const name = parts[0] ?? '';
  const query = parts[1] ?? '';
  if (!name || !query) {
    throw new Error(`${label}: stop needs a name and a query`);
  }
  let hotel = false;
  let group = defaultGroup;
  for (const flag of parts.slice(2)) {
    if (!flag) {
      continue;
    }
    if (flag === 'hotel') {
      hotel = true;
      continue;
    }
    if (groups.has(flag)) {
      if (group && group !== defaultGroup && group !== flag) {
        throw new Error(`${label}: stop has two groups`);
      }
      group = flag;
      continue;
    }
    throw new Error(`${label}: unknown stop flag ${flag}`);
  }
  return {
    name,
    query,
    hotel,
    group
  };
}

function parseBlock(body, label) {
  const fields = {};
  const stops = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const splitAt = line.indexOf(':');
    if (splitAt <= 0) {
      throw new Error(`${label}: bad line ${line}`);
    }
    const key = line.slice(0, splitAt).trim();
    const value = line.slice(splitAt + 1).trim();
    if (key === 'stop') {
      stops.push(value);
      continue;
    }
    if (!requiredKeys.includes(key) && key !== 'group') {
      throw new Error(`${label}: unknown key ${key}`);
    }
    if (Object.hasOwn(fields, key)) {
      throw new Error(`${label}: repeated key ${key}`);
    }
    fields[key] = value;
  }
  for (const key of requiredKeys) {
    if (!fields[key]) {
      throw new Error(`${label}: missing ${key}`);
    }
  }
  if (!modes.has(fields.mode)) {
    throw new Error(`${label}: mode must be driving, walking, or transit`);
  }
  const group = fields.group ?? '';
  if (group && !groups.has(group)) {
    throw new Error(`${label}: group must be alps, munich, or berlin`);
  }
  if (!stops.length) {
    throw new Error(`${label}: needs at least one stop`);
  }
  return {
    date: fields.date,
    dow: fields.dow,
    title: fields.title,
    transit: fields.transit,
    hotel: fields.hotel,
    mode: fields.mode,
    stops: stops.map((stop) => parseStop(stop, group, label))
  };
}

export function parsePlannerDays(markdown) {
  const days = [];
  for (const match of String(markdown).matchAll(new RegExp(fencePattern.source, 'g'))) {
    days.push(parseBlock(match[1], `planner block ${days.length + 1}`));
  }
  return days;
}

export function stripPlannerFences(markdown) {
  return String(markdown)
    .replace(/```planner[ \t]*\n[\s\S]*?```\n?/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

export function plansFromDays(days) {
  const plans = {};
  for (const day of days) {
    for (const stop of day.stops) {
      if (!stop.group) {
        continue;
      }
      const list = plans[stop.group] ?? [];
      plans[stop.group] = list;
      if (list[list.length - 1] !== stop.query) {
        list.push(stop.query);
      }
    }
  }
  return plans;
}

export function regionalMode(days, group) {
  const used = [];
  for (const day of days) {
    if (day.stops.some((stop) => stop.group === group)) {
      used.push(day.mode);
    }
  }
  if (used.includes('transit')) {
    return 'transit';
  }
  if (used.includes('driving')) {
    return 'driving';
  }
  return 'walking';
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function daysForClient(days) {
  return days.map((day) => {
    return {
      date: day.date,
      dow: day.dow,
      title: day.title,
      transit: day.transit,
      hotel: day.hotel,
      defaultMode: day.mode,
      stops: day.stops.map((stop) => {
        const clientStop = {
          name: stop.name,
          query: stop.query
        };
        if (stop.hotel) {
          clientStop.hotel = true;
        }
        if (stop.group) {
          clientStop.group = stop.group;
        }
        return clientStop;
      })
    };
  });
}

function planLabel(group, mode) {
  const name = titleCase(group);
  return mode === 'driving' ? `Open ${name} driving plan` : `Open ${name} plan`;
}

export function renderPlanner({ days, itineraryPath }) {
  const plans = plansFromDays(days);
  const planModes = {};
  for (const group of Object.keys(plans)) {
    planModes[group] = regionalMode(days, group);
  }
  const buttons = Object.keys(plans)
    .map((group) => {
      return `    <button class="btn-secondary" type="button" data-plan="${escapeHtml(group)}">${escapeHtml(planLabel(group, planModes[group]))}</button>`;
    })
    .join('\n');
  const buttonRow = buttons ? `  <div class="cta-row">\n${buttons}\n  </div>\n` : '';
  const payload = jsonForScript({
    days: daysForClient(days),
    plans,
    planModes
  });
  return `<div class="planner">
  <p>家庭旅行行程单. Singapore to Hallein, Salzburg, Munich, Ulm, and Berlin. Each button opens a Google Maps itinerary. Google Maps allows 9 stops between start and end, so a long selection opens as sequential legs. The written day-by-day plan is <a href="${escapeHtml(itineraryPath)}">the itinerary</a>.</p>
${buttonRow}  <div id="days"></div>
  <div class="planner-bar">
    <span id="selected-count">0 stops selected</span>
    <div class="cta-row">
      <button class="btn-ghost" type="button" id="select-none">Clear</button>
      <button class="btn-ghost" type="button" id="plan-drive">Open selected in Maps</button>
    </div>
  </div>
</div>
<script>
  const MAX_WAYPOINTS = 9;
  const payload = ${payload};
  const days = payload.days;
  const plans = payload.plans;
  const planModes = payload.planModes;

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mapsSearch(query) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  function mapsDir(stops, mode) {
    if (stops.length === 1) return mapsSearch(stops[0]);
    const origin = encodeURIComponent(stops[0]);
    const destination = encodeURIComponent(stops[stops.length - 1]);
    const mid = stops.slice(1, -1);
    let url = "https://www.google.com/maps/dir/?api=1&origin=" + origin +
      "&destination=" + destination + "&travelmode=" + encodeURIComponent(mode);
    if (mid.length) url += "&waypoints=" + mid.map(encodeURIComponent).join("%7C");
    return url;
  }

  function openItinerary(stops, mode) {
    const unique = [];
    stops.forEach(function (stop) {
      if (stop && unique[unique.length - 1] !== stop) unique.push(stop);
    });
    if (!unique.length) return;
    const chunks = [];
    if (unique.length <= MAX_WAYPOINTS + 2) {
      chunks.push(unique);
    } else {
      let i = 0;
      while (i < unique.length) {
        const end = Math.min(i + MAX_WAYPOINTS + 2, unique.length);
        chunks.push(unique.slice(i, end));
        i = end - 1;
      }
    }
    chunks.forEach(function (chunk) {
      window.open(mapsDir(chunk, mode), "_blank", "noopener");
    });
  }

  function selectedStops() {
    return Array.from(document.querySelectorAll('input[type="checkbox"][data-query]:checked'))
      .map(function (box) { return box.getAttribute("data-query"); });
  }

  function updateCount() {
    const n = selectedStops().length;
    document.getElementById("selected-count").textContent =
      n + (n === 1 ? " stop selected" : " stops selected");
  }

  function render() {
    const root = document.getElementById("days");
    days.forEach(function (day, dayIndex) {
      const article = document.createElement("article");
      article.className = "day";
      const dayStops = day.stops.map(function (stop) { return stop.query; });
      article.innerHTML =
        "<header>" +
          "<div>" +
            "<p class=\\"when\\">" + esc(day.date) + " · " + esc(day.dow) + "</p>" +
            "<h3>" + esc(day.title) + "</h3>" +
          "</div>" +
          "<button class=\\"btn-secondary\\" type=\\"button\\" data-day=\\"" + dayIndex + "\\">Open day</button>" +
        "</header>" +
        "<p class=\\"meta\\">" + esc(day.transit) + "</p>" +
        "<ul class=\\"stops\\"></ul>" +
        "<p class=\\"hotel\\">Stay: " + esc(day.hotel) + "</p>";
      const list = article.querySelector("ul");
      day.stops.forEach(function (stop, stopIndex) {
        const li = document.createElement("li");
        li.innerHTML =
          "<label>" +
            "<input type=\\"checkbox\\" data-query=\\"" + esc(stop.query) + "\\"" +
              (stop.hotel ? " data-hotel=\\"1\\"" : "") +
              (stop.group ? " data-group=\\"" + esc(stop.group) + "\\"" : "") +
              ">" +
            "<span>" + (stopIndex + 1) + ". " + esc(stop.name) + "</span>" +
          "</label>" +
          "<a href=\\"" + esc(mapsSearch(stop.query)) + "\\" target=\\"_blank\\" rel=\\"noopener\\">Pin</a>";
        list.appendChild(li);
      });
      article.querySelector("button").addEventListener("click", function () {
        openItinerary(dayStops, day.defaultMode);
      });
      root.appendChild(article);
    });
    updateCount();
  }

  document.addEventListener("change", updateCount);

  document.querySelectorAll("[data-plan]").forEach(function (button) {
    button.addEventListener("click", function () {
      const plan = button.getAttribute("data-plan");
      openItinerary(plans[plan], planModes[plan]);
    });
  });

  document.getElementById("select-none").addEventListener("click", function () {
    document.querySelectorAll("input[data-query]").forEach(function (box) { box.checked = false; });
    updateCount();
  });

  document.getElementById("plan-drive").addEventListener("click", function () {
    openItinerary(selectedStops(), "driving");
  });

  render();
</script>
`;
}

function plannerMeta(post) {
  return {
    slug: String(post.planner ?? ''),
    title: String(post.plannerTitle ?? '').trim(),
    description: String(post.plannerDescription ?? '').trim()
  };
}

export function preparePlannerPosts(posts) {
  const prepared = [];
  const generated = [];
  const taken = new Set();
  for (const post of posts) {
    const days = parsePlannerDays(post.content);
    const meta = plannerMeta(post);
    if (!days.length) {
      if (meta.slug) {
        throw new Error(`${post.slug}: planner is set but the body has no planner blocks`);
      }
      prepared.push(post);
      continue;
    }
    if (!meta.slug) {
      throw new Error(`${post.slug}: planner blocks need a planner slug in front matter`);
    }
    if (!slugPattern.test(meta.slug)) {
      throw new Error(`${post.slug}: planner slug must be kebab-case`);
    }
    if (!meta.title) {
      throw new Error(`${post.slug}: plannerTitle is required`);
    }
    if (taken.has(meta.slug)) {
      throw new Error(`${post.slug}: duplicate planner slug ${meta.slug}`);
    }
    taken.add(meta.slug);
    prepared.push({
      ...post,
      content: stripPlannerFences(post.content)
    });
    generated.push({
      slug: meta.slug,
      title: meta.title,
      date: post.date,
      description: meta.description || post.description,
      content: renderPlanner({ days, itineraryPath: post.path }),
      raw: true,
      gate: post.gate,
      path: `/posts/${meta.slug}/`,
      planner: '',
      plannerTitle: '',
      plannerDescription: ''
    });
  }
  return [...prepared.filter((post) => !taken.has(post.slug)), ...generated];
}
