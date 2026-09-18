---
title: Family Europe trip
date: "2026-09-18"
description: Salzburg, Munich, and Berlin, 16–29 Oct 2026, with one-click Google Maps itineraries.
raw: true
---

<div class="planner">
  <p>家庭旅行行程单. Singapore to Salzburg, Munich, and Berlin. Each button opens a Google Maps itinerary. Google Maps allows 9 stops between start and end, so a long selection opens as sequential legs.</p>
  <div class="cta-row">
    <button class="btn-primary" type="button" data-plan="alps">Open Alps driving plan</button>
    <button class="btn-secondary" type="button" data-plan="munich">Open Munich plan</button>
    <button class="btn-secondary" type="button" data-plan="berlin">Open Berlin plan</button>
  </div>
  <div id="days"></div>
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

    const days = [
      {
        date: "16 Oct",
        dow: "Fri",
        title: "Singapore → Munich",
        transit: "Flight SQ 2203",
        hotel: "Overnight on the plane",
        defaultMode: "transit",
        selectable: false,
        stops: [
          { name: "Changi Airport", query: "Singapore Changi Airport SIN" },
          { name: "Munich Airport (MUC)", query: "Munich Airport MUC" }
        ]
      },
      {
        date: "17 Oct",
        dow: "Sat",
        title: "MUC → Salzburg / Anif",
        transit: "Rental car · about 2 hours",
        hotel: "Hotel Das Essigmanngut, Anif (night 1)",
        defaultMode: "driving",
        stops: [
          { name: "Munich Airport (MUC)", query: "Munich Airport MUC", group: "alps" },
          { name: "Hotel Das Essigmanngut", query: "Hotel Das Essigmanngut Anif Salzburg", hotel: true, group: "alps" },
          { name: "Hellbrunn Palace gardens", query: "Schloss Hellbrunn Salzburg", group: "alps" }
        ]
      },
      {
        date: "18 Oct",
        dow: "Sun",
        title: "Salzburg old town",
        transit: "Local drive + walk",
        hotel: "Same hotel, Anif",
        defaultMode: "walking",
        stops: [
          { name: "Altstadt Garage", query: "Altstadt Garage Salzburg", group: "alps" },
          { name: "Mirabell Gardens", query: "Mirabell Gardens Salzburg", group: "alps" },
          { name: "Mozart Square", query: "Mozartplatz Salzburg", group: "alps" },
          { name: "Hohensalzburg Fortress", query: "Hohensalzburg Fortress", group: "alps" }
        ]
      },
      {
        date: "19 Oct",
        dow: "Mon",
        title: "Hallstatt + St. Gilgen",
        transit: "Round trip · about 1 hour each way",
        hotel: "Same hotel, Anif",
        defaultMode: "driving",
        stops: [
          { name: "Hallstatt village", query: "Hallstatt Austria", group: "alps" },
          { name: "Hallstatt lake shore", query: "Hallstätter See promenade", group: "alps" },
          { name: "St. Gilgen lakeside playground", query: "Seespielplatz St. Gilgen Wolfgangsee", group: "alps" }
        ]
      },
      {
        date: "20 Oct",
        dow: "Tue",
        title: "Königssee",
        transit: "Round trip · about 30 minutes each way",
        hotel: "Same hotel, Anif",
        defaultMode: "driving",
        stops: [
          { name: "Königssee boat dock", query: "Königssee Schiffahrt Schönau am Königssee", group: "alps" },
          { name: "St. Bartholomä (red dome)", query: "St. Bartholomä Königssee", group: "alps" }
        ]
      },
      {
        date: "21 Oct",
        dow: "Wed",
        title: "Anif → Munich",
        transit: "Drive 1.5–2 hours",
        hotel: "Residence Inn Munich City East (night 1)",
        defaultMode: "driving",
        stops: [
          { name: "Hotel Das Essigmanngut", query: "Hotel Das Essigmanngut Anif Salzburg", hotel: true, group: "munich" },
          { name: "Residence Inn Munich City East", query: "Residence Inn by Marriott Munich City East", hotel: true, group: "munich" },
          { name: "English Garden / river surfers", query: "Eisbachwelle Englischer Garten Munich", group: "munich" }
        ]
      },
      {
        date: "22 Oct",
        dow: "Thu",
        title: "Ulm day trip",
        transit: "Round trip · about 1h 15m each way",
        hotel: "Residence Inn Munich City East",
        defaultMode: "driving",
        stops: [
          { name: "Fischerviertel, Ulm", query: "Fischerviertel Ulm", group: "munich" },
          { name: "Ulm city wall / Danube", query: "Stadtmauer Ulm Donau", group: "munich" }
        ]
      },
      {
        date: "23 Oct",
        dow: "Fri",
        title: "BMW Welt + Nymphenburg",
        transit: "Local drive",
        hotel: "Residence Inn Munich City East",
        defaultMode: "driving",
        stops: [
          { name: "BMW Welt", query: "BMW Welt Munich", group: "munich" },
          { name: "Augustiner-Keller", query: "Augustiner-Keller Munich", group: "munich" },
          { name: "Nymphenburg Palace canal", query: "Schloss Nymphenburg Munich", group: "munich" }
        ]
      },
      {
        date: "24 Oct",
        dow: "Sat",
        title: "Munich Hbf → Berlin",
        transit: "ICE · about 4 hours · Kleinkindabteil",
        hotel: "Adina Apartment Hotel Berlin Mitte",
        defaultMode: "transit",
        stops: [
          { name: "München Hauptbahnhof (return car)", query: "München Hauptbahnhof", group: "munich" },
          { name: "Adina Apartment Hotel Berlin Mitte", query: "Adina Apartment Hotel Berlin Mitte", hotel: true, group: "berlin" },
          { name: "dm drugstore near hotel", query: "dm-drogerie Markt Chausseestraße Berlin", group: "berlin" }
        ]
      },
      {
        date: "25 Oct",
        dow: "Sun",
        title: "Berlin Wall + Spree",
        transit: "Taxi · about 3 minutes",
        hotel: "Adina Berlin Mitte",
        defaultMode: "transit",
        stops: [
          { name: "Berlin Wall Memorial, Bernauer Strasse", query: "Gedenkstätte Berliner Mauer Bernauer Straße", group: "berlin" },
          { name: "Spree river cruise / Cathedral", query: "Berlin Cathedral Spree river cruise pier", group: "berlin" }
        ]
      },
      {
        date: "26 Oct",
        dow: "Mon",
        title: "Tiergarten foliage",
        transit: "Taxi · about 5 minutes",
        hotel: "Adina Berlin Mitte · early rest / pool",
        defaultMode: "walking",
        stops: [
          { name: "Luisendenkmal, Tiergarten", query: "Königin-Luise-Denkmal Tiergarten Berlin", group: "berlin" },
          { name: "Café am Neuen See", query: "Café am Neuen See Berlin", group: "berlin" }
        ]
      },
      {
        date: "27 Oct",
        dow: "Tue",
        title: "Berlin Zoo",
        transit: "Taxi · about 5 minutes",
        hotel: "Adina Berlin Mitte",
        defaultMode: "transit",
        stops: [
          { name: "Berlin Zoo, Elephant Gate", query: "Zoo Berlin Elefantentor", group: "berlin" }
        ]
      },
      {
        date: "28 Oct",
        dow: "Wed",
        title: "Schlachtensee + pack",
        transit: "S1 · about 30 minutes",
        hotel: "Adina Berlin Mitte · laundry and Mall of Berlin",
        defaultMode: "transit",
        stops: [
          { name: "Schlachtensee S-Bahn", query: "S-Bahn Schlachtensee Berlin", group: "berlin" },
          { name: "Fischerhütte", query: "Fischerhütte am Schlachtensee", group: "berlin" },
          { name: "Mall of Berlin", query: "Mall of Berlin Leipziger Platz", group: "berlin" }
        ]
      },
      {
        date: "29 Oct",
        dow: "Thu",
        title: "BER → Singapore",
        transit: "Van to BER · LH 179 / SQ 329",
        hotel: "Flight home",
        defaultMode: "driving",
        stops: [
          { name: "Adina Apartment Hotel Berlin Mitte", query: "Adina Apartment Hotel Berlin Mitte", hotel: true, group: "berlin" },
          { name: "Berlin Brandenburg Airport (BER)", query: "Berlin Brandenburg Airport BER", group: "berlin" }
        ]
      }
    ];

    const plans = {
      alps: [
        "Munich Airport MUC",
        "Hotel Das Essigmanngut Anif Salzburg",
        "Schloss Hellbrunn Salzburg",
        "Mirabell Gardens Salzburg",
        "Hohensalzburg Fortress",
        "Hallstatt Austria",
        "Seespielplatz St. Gilgen Wolfgangsee",
        "Königssee Schiffahrt Schönau am Königssee",
        "St. Bartholomä Königssee",
        "Hotel Das Essigmanngut Anif Salzburg"
      ],
      munich: [
        "Residence Inn by Marriott Munich City East",
        "Eisbachwelle Englischer Garten Munich",
        "Fischerviertel Ulm",
        "Stadtmauer Ulm Donau",
        "BMW Welt Munich",
        "Augustiner-Keller Munich",
        "Schloss Nymphenburg Munich",
        "München Hauptbahnhof"
      ],
      berlin: [
        "Adina Apartment Hotel Berlin Mitte",
        "Gedenkstätte Berliner Mauer Bernauer Straße",
        "Berlin Cathedral Spree river cruise pier",
        "Königin-Luise-Denkmal Tiergarten Berlin",
        "Café am Neuen See Berlin",
        "Zoo Berlin Elefantentor",
        "S-Bahn Schlachtensee Berlin",
        "Fischerhütte am Schlachtensee",
        "Mall of Berlin Leipziger Platz",
        "Berlin Brandenburg Airport BER"
      ]
    };

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
      chunks.forEach(function (chunk, index) {
        window.open(mapsDir(chunk, mode), "_blank", "noopener");
        if (index < chunks.length - 1) {
          /* A second tab continues the same route from the last shared stop. */
        }
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
              "<p class=\"when\">" + day.date + " · " + day.dow + "</p>" +
              "<h3>" + day.title + "</h3>" +
            "</div>" +
            "<button class=\"btn-secondary\" type=\"button\" data-day=\"" + dayIndex + "\">Open day</button>" +
          "</header>" +
          "<p class=\"meta\">" + day.transit + "</p>" +
          "<ul class=\"stops\"></ul>" +
          "<p class=\"hotel\">Stay: " + day.hotel + "</p>";
        const list = article.querySelector("ul");
        day.stops.forEach(function (stop, stopIndex) {
          const li = document.createElement("li");
          const canSelect = day.selectable !== false;
          const checked = canSelect && !stop.hotel ? " checked" : "";
          const disabled = canSelect ? "" : " disabled";
          li.innerHTML =
            "<label>" +
              "<input type=\"checkbox\" data-query=\"" + stop.query.replace(/"/g, "") + "\"" +
                (stop.hotel ? " data-hotel=\"1\"" : "") +
                (stop.group ? " data-group=\"" + stop.group + "\"" : "") +
                checked + disabled + ">" +
              "<span>" + (stopIndex + 1) + ". " + stop.name + "</span>" +
            "</label>" +
            "<a href=\"" + mapsSearch(stop.query) + "\" target=\"_blank\" rel=\"noopener\">Pin</a>";
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
        const mode = button.getAttribute("data-plan") === "berlin" ? "transit" : "driving";
        openItinerary(plans[button.getAttribute("data-plan")], mode);
      });
    });

    document.getElementById("select-none").addEventListener("click", function () {
      document.querySelectorAll('input[data-query]').forEach(function (box) { box.checked = false; });
      updateCount();
    });

    document.getElementById("plan-drive").addEventListener("click", function () {
      openItinerary(selectedStops(), "driving");
    });

    render();
  
</script>
