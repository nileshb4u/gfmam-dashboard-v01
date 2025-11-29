/* =========================================================
   GFMAM Dashboard (7-KPI Version)
   Author: Aryam
   ========================================================= */

// ====== CONFIGURATION ======
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vShUL9swlQuiTVz1LQvJhL_lfhB3eriJkIV7vsAN-nKINaowMfFl7We8gezVGFpy8QcPnR4xjBSuN23/pub?gid=1423207942&single=true&output=csv";

// Global variables for charts and the selector
let charts = [];
let globalChoicesSelector = null;

// ====== KPI METADATA (Single Source of Truth) ======
const kpiMetadata = {
  "Total Members": {
    title: "Total Members",
    unit: "Members",
    tooltip: "Total active members across all GFMAM societies.",
    column: "Total Members",
  },
  "Financial Health": {
    title: "Financial Health (USD per Member)",
    unit: "USD per Member",
    tooltip: "Average financial health per member. Derived from annualized revenue divided by total members.",
    column: "Financial Health",
  },
  "Active Projects (IN/IO)": {
    title: "Active Projects (IN/IO)",
    unit: "Number of Projects",
    tooltip: "Count of active international and inter-organizational projects.",
    column: "Active Projects",
  },
  "Collaboration Agreements (GFMAM)": {
    title: "Collaboration Agreements (GFMAM)",
    unit: "Number of Agreements",
    tooltip: "Total collaboration agreements between member societies within the GFMAM network.",
    column: "Collaboration Agreements",
  },
  "GFMAM Calendar Events": {
    title: "GFMAM Calendar Events",
    unit: "Number of Events",
    tooltip: "Count of GFMAM-branded events on the official calendar per year.",
    column: "Calendar Events",
  },
  "Face-to-Face Meeting Hosting": {
    title: "Face-to-Face Meeting Hosting",
    unit: "Hosted F2F Meetings",
    tooltip: "Number of face-to-face GFMAM meetings hosted by each society.",
    column: "Member Meeting Hosting",
  },
  "Triplet (3-Year Rolling)": {
    title: "Triplet (3-Year Rolling)",
    unit: "Rolling 3-Year Value",
    tooltip: "3-year rolling KPI (for demo: current-year value multiplied by 3 or pre-calculated in the sheet).",
    column: "Triplet",
  },
  "Spider Chart": {
    title: "Organization Radar",
    unit: "1-10 Scale",
    tooltip:
      "This radar chart visualizes the organization's performance across all 7 KPIs, scaled from 1 (lowest) to 10 (highest) relative to all other member societies.",
    column: null,
  },
};

// Ordered KPI keys (excluding the spider chart)
const kpiKeys = Object.keys(kpiMetadata).filter((key) => key !== "Spider Chart");


// ====== Fetch & Parse CSV Using PapaParse (Best & Safe Method for CSP) ======
async function fetchCSVData() {
  try {
    const response = await fetch(sheetURL);
    if (!response.ok) {
      console.error("❌ Failed to fetch CSV:", response.status, response.statusText);
      return [];
    }

    const csvText = await response.text();

    // Parse CSV safely
    const parsed = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,

      // Fix header names (removes hidden spaces, UTF BOM, trims)
      transformHeader: (header) =>
        header.replace(/[\u200B-\u200D\uFEFF]/g, "").trim(),

      // Fix cell values (cleans spaces, currency, BOM chars)
      transform: (value) => {
        if (typeof value === "string") {
          value = value.replace(/[\u200B-\u200D\uFEFF$,]/g, "").trim();
        }
        return value === "" ? null : value;
      },
    });

    console.log("✅ Parsed CSV:", parsed.data);
    return parsed.data;
  } catch (error) {
    console.error("❌ Error parsing CSV:", error);
    return [];
  }
}



// ====== CALCULATE KPIs (7 NEW KPIs) ======
function calculateKPIs(data) {
  let totalMembers = 0;

  let totalFinancial = 0;
  let financialCount = 0;

  let totalActiveProjects = 0;
  let totalCollab = 0;
  let totalEvents = 0;
  let totalHosting = 0;
  let totalTriplet = 0;

  data.forEach((item) => {
    const tm = parseFloat(item["Total Members"]);
    if (!isNaN(tm)) totalMembers += tm;

    const fh = parseFloat(item["Financial Health"]);
    if (!isNaN(fh)) {
      totalFinancial += fh;
      financialCount++;
    }

    const ap = parseFloat(item["Active Projects"]);
    if (!isNaN(ap)) totalActiveProjects += ap;

    const ca = parseFloat(item["Collaboration Agreements"]);
    if (!isNaN(ca)) totalCollab += ca;

    const ev = parseFloat(item["Calendar Events"]);
    if (!isNaN(ev)) totalEvents += ev;

    const mh = parseFloat(item["Member Meeting Hosting"]);
    if (!isNaN(mh)) totalHosting += mh;

    const tr = parseFloat(item["Triplet"]);
    if (!isNaN(tr)) totalTriplet += tr;
  });

  const avgFinancial = financialCount > 0 ? totalFinancial / financialCount : 0;

  return {
    totalMembers,
    avgFinancial,
    totalActiveProjects,
    totalCollab,
    totalEvents,
    totalHosting,
    totalTriplet,
  };
}

// ====== UPDATE KPI CARDS (USING NEW IDS) ======
function updateKPIs(kpis) {
  const formatInt = (v) => (v ? v.toLocaleString() : "--");
  const formatFloat = (v) => (v ? v.toFixed(2) : "--");

  const totalMembersEl = document.getElementById("kpi-total-members");
  const financialEl = document.getElementById("kpi-financial-health");
  const activeProjectsEl = document.getElementById("kpi-active-projects");
  const collaborationEl = document.getElementById("kpi-collaboration");
  const calendarEl = document.getElementById("kpi-calendar-events");
  const hostingEl = document.getElementById("kpi-meeting-hosting");
  const tripletEl = document.getElementById("kpi-triplet");

  if (totalMembersEl)
    totalMembersEl.textContent = formatInt(kpis.totalMembers);

  if (financialEl)
    financialEl.textContent = kpis.avgFinancial
      ? `$ ${kpis.avgFinancial.toFixed(2)}`
      : "--";

  if (activeProjectsEl)
    activeProjectsEl.textContent = formatInt(kpis.totalActiveProjects);

  if (collaborationEl)
    collaborationEl.textContent = formatInt(kpis.totalCollab);

  if (calendarEl)
    calendarEl.textContent = formatInt(kpis.totalEvents);

  if (hostingEl)
    hostingEl.textContent = formatInt(kpis.totalHosting);

  if (tripletEl)
    tripletEl.textContent = formatFloat(kpis.totalTriplet);
}

// ====== TOOLTIP INITIALIZATION ======
function initializeTooltips() {
  const tooltipIcons = document.querySelectorAll(".tooltip-icon");
  tooltipIcons.forEach((icon) => {
    const kpiKey = icon.getAttribute("data-kpi");
    const metadata = kpiMetadata[kpiKey];
    if (!metadata) return;

    const tooltipTextSpan = icon
      .closest(".tooltip-container")
      .querySelector(".tooltip-text");

    const content = `Unit: ${metadata.unit}<br><br>${metadata.tooltip}`;
    tooltipTextSpan.innerHTML = content;
  });
}

function renderCharts(data) {
  const val = (x) => parseFloat(String(x).replace(/[^\d.-]/g, "")) || 0;

  const chartConfig = [
    ["chart1", "Total Members"],
    ["chart2", "Financial Health"],
    ["chart3", "Active Projects (IN/IO)"],
    ["chart4", "Collaboration Agreements (GFMAM)"],
    ["chart5", "GFMAM Calendar Events"],
    ["chart6", "Face-to-Face Meeting Hosting"],
    ["chart7", "Triplet (3-Year Rolling)"],
  ];

  const orgNames = data.map((d) => d["Organization Name"]);

  // ====== GLOBAL MULTI-SELECT DROPDOWN ======
  const globalSelectorElement = document.getElementById("globalOrgSelector");

  if (typeof Choices === "undefined") {
    console.error("❌ Choices.js library is not loaded!");
    return;
  }

  if (globalChoicesSelector) {
    globalChoicesSelector.destroy();
  }

  globalChoicesSelector = new Choices(globalSelectorElement, {
    removeItemButton: true,
    placeholder: true,
    placeholderValue: "Select societies to compare...",
    allowHTML: false,
  });

  const choicesData = orgNames.map((name) => ({ value: name, label: name }));
  globalChoicesSelector.setChoices(choicesData, "value", "label", false);

  // Destroy old charts
  charts.forEach(({ chart }) => chart.destroy());
  charts = [];

  // ====== CREATE CHARTS WITHOUT AVERAGE ======
  chartConfig.forEach(([canvasId, kpiKey]) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const metadata = kpiMetadata[kpiKey];
    const column = metadata.column;

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: metadata.title,
            data: [],
            backgroundColor: "#84bd00",
            borderColor: "#84bd00",
            borderWidth: 1,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: "#002b5c",
            },
          },
          title: {
            display: true,
            text: metadata.title,
            color: "#000000",
            font: { size: 16, weight: "bold" },
            padding: { top: 10, bottom: 10 },
          },
          subtitle: {
            display: true,
            text: metadata.unit,
            color: "#0073c6",
            font: { size: 11, style: "italic" },
            padding: { top: -4 },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "#000000",
              callback: function (value) {
                if (kpiKey === "Financial Health") {
                  return "$" + value.toFixed(0);
                }
                return value;
              },
            },
            grid: { color: "rgba(0,0,0,0.1)" },
          },
          x: {
            ticks: { color: "#000000", font: { size: 11 } },
            grid: { color: "rgba(0,0,0,0.1)" },
          },
        },
      },
    });

    charts.push({ chart, column });
  });

  // ====== UPDATE CHARTS WITH FILTER ======
  function updateAllCharts() {
    const selectedOrgs = globalChoicesSelector.getValue(true);
    const isAll = selectedOrgs.length === 0;

    const dataToShow = isAll
      ? data
      : data.filter((d) => selectedOrgs.includes(d["Organization Name"]));

    const labels = dataToShow.map((d) => d["Organization Name"]);

    charts.forEach(({ chart, column }) => {
      const values = dataToShow.map((d) => val(d[column]));

      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.update();
    });
  }

  // Clear All button
  const clearAllButton = document.getElementById("clearAllBtn");
  globalSelectorElement.addEventListener("change", updateAllCharts);

  clearAllButton.addEventListener("click", () => {
    globalChoicesSelector.removeActiveItems();
    updateAllCharts();
  });

  updateAllCharts();
}

// ====== RENDER SPIDER CHART ======
function renderSpiderChart(data) {
  const orgSelector = document.getElementById("orgSelector");
  const spiderCtx = document.getElementById("spiderChart");

  if (!spiderCtx || !orgSelector) return;

  const organizations = data.map((d) => d["Organization Name"]);
  orgSelector.innerHTML = organizations
    .map((org) => `<option value="${org}">${org}</option>`)
    .join("");

  const val = (x) => parseFloat(String(x).replace(/[^\d.-]/g, "")) || 0;

  const getAllKpiValues = (column) => data.map((d) => val(d[column]));

  const kpiScales = kpiKeys.map((key) => {
    const column = kpiMetadata[key].column;
    const values = getAllKpiValues(column);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { key, min, max };
  });

  function scaleValue(value, min, max) {
    if (max === min) return 5;
    return ((value - min) * 9) / (max - min) + 1;
  }

  function getOrgData(orgName) {
    const org = data.find((d) => d["Organization Name"] === orgName);
    if (!org) return Array(kpiKeys.length).fill(0);

    return kpiKeys.map((key, index) => {
      const column = kpiMetadata[key].column;
      const rawValue = val(org[column]);
      const scale = kpiScales[index];
      return scaleValue(rawValue, scale.min, scale.max);
    });
  }

  const firstOrg = organizations[0];
  const spiderChart = new Chart(spiderCtx, {
    type: "radar",
    data: {
      labels: kpiKeys.map((key) => kpiMetadata[key].title),
      datasets: [
        {
          label: firstOrg,
          data: getOrgData(firstOrg),
          backgroundColor: "rgba(0, 163, 224, 0.2)",
          borderColor: "#00a3e0",
          borderWidth: 2,
          pointBackgroundColor: "#84bd00",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          angleLines: { color: "#ddd" },
          grid: { color: "#ccc" },
          pointLabels: { color: "#002b5c", font: { size: 12 } },
          min: 0,
          max: 10,
          ticks: {
            stepSize: 1,
            backdropColor: "rgba(255, 255, 255, 0.8)",
          },
        },
      },
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
    },
  });

  orgSelector.addEventListener("change", (e) => {
    const orgName = e.target.value;
    spiderChart.data.datasets[0].label = orgName;
    spiderChart.data.datasets[0].data = getOrgData(orgName);
    spiderChart.update();
  });
}

// ====== INITIALIZE DASHBOARD ======
async function initializeDashboard() {
  try {
    const data = await fetchCSVData();
    if (data.length > 0) {
      const kpis = calculateKPIs(data);
      updateKPIs(kpis);
      initializeTooltips();
      renderCharts(data);
      renderSpiderChart(data);
      console.log("✅ Dashboard Initialized Successfully");
    } else {
      console.error("❌ No data fetched to initialize dashboard.");
    }
  } catch (error) {
    console.error("❌ Error initializing dashboard:", error);
  }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
