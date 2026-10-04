---
title: Family Europe trip
date: '2026-09-18'
created: 2026-10-04T00:00:00.000Z
description: >-
  Hallein, Salzburg lakes, Munich, Ulm, and Berlin, 16–29 Oct 2026, with
  one-click Google Maps itineraries.
slug: family-europe-2026
raw: true
gate: true
tags:
  - travel
---

<div class="planner">
  <p>家庭旅行行程单. Singapore to Hallein, Salzburg, Munich, Ulm, and Berlin. Each button opens a Google Maps itinerary. Google Maps allows 9 stops between start and end, so a long selection opens as sequential legs.</p>
  <div class="cta-row">
    <button class="btn-secondary" type="button" data-plan="alps">Open Alps driving plan</button>
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
        stops: [
          { name: "Changi Airport", query: "Singapore Changi Airport SIN" },
          { name: "Munich Airport (MUC)", query: "Munich Airport MUC" }
        ]
      },
      {
        date: "17 Oct",
        dow: "Sat",
        title: "MUC → Chiemsee → Hallein",
        transit: "Rental car · about 2 hours, plus scenic stops",
        hotel: "Bauernbräugut Appartements, Hallein (night 1)",
        defaultMode: "driving",
        stops: [
          { name: "Munich Airport (MUC)", query: "Munich Airport MUC", group: "alps" },
          { name: "Hilton Munich Airport (rest)", query: "Hilton Munich Airport", group: "alps" },
          { name: "Irschenberg / Wilparting church", query: "Wallfahrtskirche Wilparting Irschenberg", group: "alps" },
          { name: "Chiemsee lakeside + Madl am Chiemsee", query: "Madl am Chiemsee Cafe Bistro", group: "alps" },
          { name: "Bauernbräugut Appartements", query: "Bauernbräugut Hofladen Appartements Hallein", hotel: true, group: "alps" },
          { name: "Hellbrunn Palace gardens", query: "Schloss Hellbrunn Salzburg", group: "alps" },
          { name: "Interspar Hallein", query: "Interspar Hallein", group: "alps" }
        ]
      },
      {
        date: "18 Oct",
        dow: "Sun",
        title: "Salzburg old town",
        transit: "Local drive + walk · Altstadt Garage",
        hotel: "Same hotel, Hallein · rain: toy museum",
        defaultMode: "walking",
        stops: [
          { name: "Altstadt Garage", query: "Altstadt Garage Salzburg", group: "alps" },
          { name: "Mirabell Gardens", query: "Mirabell Gardens Salzburg", group: "alps" },
          { name: "Café Tomaselli", query: "Café Tomaselli Salzburg", group: "alps" },
          { name: "Residenzplatz", query: "Residenzplatz Salzburg", group: "alps" },
          { name: "Festungsbahn / Hohensalzburg", query: "Festungsbahn Salzburg", group: "alps" },
          { name: "Getreidegasse", query: "Getreidegasse Salzburg", group: "alps" }
        ]
      },
      {
        date: "19 Oct",
        dow: "Mon",
        title: "Hallstatt + St. Gilgen",
        transit: "Round trip · about 1h 15m out, 45m back",
        hotel: "Same hotel, Hallein · rain: salt mine / St. Gilgen Mozart house",
        defaultMode: "driving",
        stops: [
          { name: "Hallstatt postcard viewpoint", query: "Classical Viewpoint of Hallstatt", group: "alps" },
          { name: "Seehotel Grüner Baum", query: "Seehotel Grüner Baum Hallstatt", group: "alps" },
          { name: "St. Gilgen lakeside playground", query: "Strandbad St. Gilgen Playground Wolfgangsee", group: "alps" }
        ]
      },
      {
        date: "20 Oct",
        dow: "Tue",
        title: "Königssee",
        transit: "Round trip · about 40 minutes each way",
        hotel: "Same hotel, Hallein · rain: Berchtesgaden salt mine",
        defaultMode: "driving",
        stops: [
          { name: "Königssee car park", query: "Königssee Parkplatz Schönau", group: "alps" },
          { name: "Königssee boat dock", query: "Königssee Schiffahrt Schönau am Königssee", group: "alps" },
          { name: "St. Bartholomä + Fischerstüberl", query: "Fischerstüberl St. Bartholomä Königssee", group: "alps" }
        ]
      },
      {
        date: "21 Oct",
        dow: "Wed",
        title: "Hallein → Munich · return car",
        transit: "Drive ~2 hours, then bus · Gruppe M day ticket",
        hotel: "Residence Inn Munich City East (night 1)",
        defaultMode: "driving",
        stops: [
          { name: "Bauernbräugut Appartements", query: "Bauernbräugut Hofladen Appartements Hallein", hotel: true, group: "munich" },
          { name: "Residence Inn Munich City East", query: "Residence Inn by Marriott Munich City East", hotel: true, group: "munich" },
          { name: "English Garden drop-off", query: "Lerchenfeldstraße 1a Munich", group: "munich" },
          { name: "Fräulein Grüneis", query: "Fräulein Grüneis Englischer Garten Munich", group: "munich" },
          { name: "OMV then Sixt return", query: "SIXT Car Rental Hirtenstraße 14 Munich", group: "munich" },
          { name: "Eisbachwelle / Chinese Tower", query: "Eisbachwelle Englischer Garten Munich", group: "munich" }
        ]
      },
      {
        date: "22 Oct",
        dow: "Thu",
        title: "Ulm day trip",
        transit: "ICE 1094 09:41–11:01 · ICE 919 16:28–17:42 · Gruppe M",
        hotel: "Residence Inn Munich City East",
        defaultMode: "transit",
        stops: [
          { name: "München Ost", query: "München Ostbahnhof", group: "munich" },
          { name: "München Hauptbahnhof", query: "München Hauptbahnhof", group: "munich" },
          { name: "Ulm Minster", query: "Ulmer Münster Münsterplatz", group: "munich" },
          { name: "Fischerviertel / Allgäuer Hof", query: "Allgäuer Hof Fischerviertel Ulm", group: "munich" },
          { name: "Einstein fountain", query: "Einstein-Brunnen Ulm", group: "munich" }
        ]
      },
      {
        date: "23 Oct",
        dow: "Fri",
        title: "BMW Welt + Hirschgarten + Nymphenburg",
        transit: "U5 / U3, then tram 17 · Gruppe M",
        hotel: "Residence Inn Munich City East · rain: Deutsches Museum",
        defaultMode: "transit",
        stops: [
          { name: "BMW Welt", query: "BMW Welt Munich", group: "munich" },
          { name: "Königlicher Hirschgarten", query: "Königlicher Hirschgarten Munich", group: "munich" },
          { name: "Nymphenburg Palace canal", query: "Nymphenburger Kanal Schloss Nymphenburg", group: "munich" }
        ]
      },
      {
        date: "24 Oct",
        dow: "Sat",
        title: "Munich Hbf → Berlin",
        transit: "Augustiner lunch · ICE 1006 13:17–17:48 · Kleinkindabteil",
        hotel: "Adina Apartment Hotel Berlin Mitte",
        defaultMode: "transit",
        stops: [
          { name: "Augustiner-Keller", query: "Augustiner-Keller Munich", group: "munich" },
          { name: "München Hauptbahnhof", query: "München Hauptbahnhof", group: "munich" },
          { name: "Adina Apartment Hotel Berlin Mitte", query: "Adina Apartment Hotel Berlin Mitte", hotel: true, group: "berlin" },
          { name: "Invalidenpark tram (M5/M8/M10)", query: "Invalidenpark Berlin", group: "berlin" },
          { name: "dm / REWE before Sunday close", query: "dm-drogerie Markt Chausseestraße Berlin", group: "berlin" }
        ]
      },
      {
        date: "25 Oct",
        dow: "Sun",
        title: "Berlin Wall + Spree",
        transit: "Tram M10 + S1 · AB Kleingruppe 24h",
        hotel: "Adina Berlin Mitte · rain: LEGO / ANOHA / Futurium",
        defaultMode: "transit",
        stops: [
          { name: "Berlin Wall Memorial", query: "Gedenkstätte Berliner Mauer Bernauer Straße", group: "berlin" },
          { name: "Friedrichstraße landing stage", query: "Anlegestelle Friedrichstraße Berlin", group: "berlin" },
          { name: "Spree glass-top cruise", query: "Spree river cruise Friedrichstraße Berlin", group: "berlin" }
        ]
      },
      {
        date: "26 Oct",
        dow: "Mon",
        title: "Tiergarten + Brandenburg Gate",
        transit: "M10 / M41 / bus 100–200 · AB Kleingruppe 24h",
        hotel: "Adina Berlin Mitte · pool and jacuzzi after 15:00",
        defaultMode: "transit",
        stops: [
          { name: "Luisendenkmal, Tiergarten", query: "Königin-Luise-Denkmal Tiergarten Berlin", group: "berlin" },
          { name: "Café am Neuen See", query: "Café am Neuen See Berlin", group: "berlin" },
          { name: "Brandenburg Gate", query: "Brandenburger Tor Berlin", group: "berlin" }
        ]
      },
      {
        date: "27 Oct",
        dow: "Tue",
        title: "Berlin Zoo",
        transit: "Tram M10 + U9 · Lion Gate · AB Kleingruppe 24h",
        hotel: "Adina Berlin Mitte",
        defaultMode: "transit",
        stops: [
          { name: "Berlin Zoo, Lion Gate", query: "Zoo Berlin Löwentor", group: "berlin" },
          { name: "Zoo Restaurant", query: "Zoo Restaurant Berlin Zoologischer Garten", group: "berlin" }
        ]
      },
      {
        date: "28 Oct",
        dow: "Wed",
        title: "Schlachtensee + pack",
        transit: "Tram M5 + S1 · about 40 minutes · AB Kleingruppe 24h",
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
        transit: "Tram M8 + FEX · ABC 24h ticket · LH 179 / SQ 329",
        hotel: "Flight home",
        defaultMode: "transit",
        stops: [
          { name: "Adina Apartment Hotel Berlin Mitte", query: "Adina Apartment Hotel Berlin Mitte", hotel: true, group: "berlin" },
          { name: "Berlin Hauptbahnhof", query: "Berlin Hauptbahnhof", group: "berlin" },
          { name: "Berlin Brandenburg Airport (BER)", query: "Berlin Brandenburg Airport BER", group: "berlin" }
        ]
      }
    ];

    const plans = {
      alps: [
        "Munich Airport MUC",
        "Wallfahrtskirche Wilparting Irschenberg",
        "Madl am Chiemsee Cafe Bistro",
        "Bauernbräugut Hofladen Appartements Hallein",
        "Schloss Hellbrunn Salzburg",
        "Mirabell Gardens Salzburg",
        "Festungsbahn Salzburg",
        "Classical Viewpoint of Hallstatt",
        "Strandbad St. Gilgen Playground Wolfgangsee",
        "Königssee Schiffahrt Schönau am Königssee",
        "Fischerstüberl St. Bartholomä Königssee",
        "Bauernbräugut Hofladen Appartements Hallein"
      ],
      munich: [
        "Residence Inn by Marriott Munich City East",
        "Lerchenfeldstraße 1a Munich",
        "Eisbachwelle Englischer Garten Munich",
        "SIXT Car Rental Hirtenstraße 14 Munich",
        "Ulmer Münster Münsterplatz",
        "Einstein-Brunnen Ulm",
        "BMW Welt Munich",
        "Königlicher Hirschgarten Munich",
        "Nymphenburger Kanal Schloss Nymphenburg",
        "Augustiner-Keller Munich",
        "München Hauptbahnhof"
      ],
      berlin: [
        "Adina Apartment Hotel Berlin Mitte",
        "Gedenkstätte Berliner Mauer Bernauer Straße",
        "Anlegestelle Friedrichstraße Berlin",
        "Königin-Luise-Denkmal Tiergarten Berlin",
        "Café am Neuen See Berlin",
        "Brandenburger Tor Berlin",
        "Zoo Berlin Löwentor",
        "S-Bahn Schlachtensee Berlin",
        "Fischerhütte am Schlachtensee",
        "Mall of Berlin Leipziger Platz",
        "Berlin Hauptbahnhof",
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
          li.innerHTML =
            "<label>" +
              "<input type=\"checkbox\" data-query=\"" + stop.query.replace(/"/g, "") + "\"" +
                (stop.hotel ? " data-hotel=\"1\"" : "") +
                (stop.group ? " data-group=\"" + stop.group + "\"" : "") +
                ">" +
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
        const mode = button.getAttribute("data-plan") === "alps" ? "driving" : "transit";
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
