const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateKey(value, name = "date") {
  if (!DAY_RE.test(value || "")) throw new Error(`${name} must be YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${name} is not a valid calendar date`);
  }
  return value;
}

export function shanghaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(day, amount) {
  assertDateKey(day);
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function isExcludedDevice(deviceId) {
  const normalized = String(deviceId || "").replace(/^guest_/, "");
  return /^(smoke|test)-/i.test(normalized);
}

function uniqueDevices(rows) {
  return new Set(rows.map(row => row.deviceId));
}

function rate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : 0;
}

function summarizeSharing(events, startDay, endDay) {
  const inWindow = events.filter(
    row =>
      row.day >= startDay &&
      row.day <= endDay &&
      !isExcludedDevice(row.deviceId)
  );
  const drawRows = inWindow.filter(row => row.event === "draw");
  const drawDevices = uniqueDevices(drawRows);
  const shareRows = inWindow.filter(
    row =>
      drawDevices.has(row.deviceId) &&
      (row.event === "share_click" || row.event === "card_saved")
  );
  const saveRows = shareRows.filter(row => row.event === "card_saved");
  const sharingDevices = uniqueDevices(shareRows);
  const savingDevices = uniqueDevices(saveRows);

  return {
    uniqueDrawDevices: drawDevices.size,
    sharingDevices: sharingDevices.size,
    shareParticipationRate: rate(sharingDevices.size, drawDevices.size),
    shareActions: shareRows.length,
    shareActionRate: rate(shareRows.length, drawDevices.size),
    savingDevices: savingDevices.size,
    cardSaveRate: rate(savingDevices.size, drawDevices.size),
  };
}

export function computeD7(ledgerRows, launchDay, reportDay) {
  const daysByDevice = new Map();
  for (const row of ledgerRows) {
    if (isExcludedDevice(row.deviceId) || row.day > reportDay) continue;
    const days = daysByDevice.get(row.deviceId) || new Set();
    days.add(row.day);
    daysByDevice.set(row.deviceId, days);
  }

  const cohorts = new Map();
  for (const days of daysByDevice.values()) {
    const sorted = [...days].sort();
    const firstDay = sorted[0];
    if (firstDay < launchDay || addDays(firstDay, 7) > reportDay) continue;
    const cohort = cohorts.get(firstDay) || { firstDrawDevices: 0, returnedD7: 0 };
    cohort.firstDrawDevices += 1;
    if (days.has(addDays(firstDay, 7))) cohort.returnedD7 += 1;
    cohorts.set(firstDay, cohort);
  }

  const byCohort = [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortDay, counts]) => ({
      cohortDay,
      ...counts,
      d7Rate: rate(counts.returnedD7, counts.firstDrawDevices),
    }));
  const firstDrawDevices = byCohort.reduce(
    (total, cohort) => total + cohort.firstDrawDevices,
    0
  );
  const returnedD7 = byCohort.reduce(
    (total, cohort) => total + cohort.returnedD7,
    0
  );
  return {
    mature: firstDrawDevices > 0,
    firstDrawDevices,
    returnedD7,
    d7Rate: rate(returnedD7, firstDrawDevices),
    cohorts: byCohort,
  };
}

export function computeMetrics(events, ledgerRows, launchDay, reportDay) {
  assertDateKey(launchDay, "launch date");
  assertDateKey(reportDay, "report date");
  if (reportDay < launchDay) throw new Error("report date precedes launch date");

  const cleanEvents = events.filter(
    row => typeof row.deviceId === "string" && row.deviceId && !isExcludedDevice(row.deviceId)
  );
  const periodEvents = cleanEvents.filter(
    row => row.day >= launchDay && row.day <= reportDay
  );
  const firstDrawByDevice = new Map();
  for (const event of periodEvents
    .filter(row => row.event === "draw")
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)))) {
    if (!firstDrawByDevice.has(event.deviceId)) {
      firstDrawByDevice.set(event.deviceId, event);
    }
  }

  const attributedFirstDraws = [...firstDrawByDevice.values()].filter(
    row => row.props?.ref === "card"
  );
  const channelFirstDraws = {};
  for (const row of firstDrawByDevice.values()) {
    const source = String(row.props?.utm_source || "").trim();
    if (source) channelFirstDraws[source] = (channelFirstDraws[source] || 0) + 1;
  }

  const d7 = computeD7(ledgerRows, launchDay, reportDay);
  const period = summarizeSharing(periodEvents, launchDay, reportDay);
  const daily = summarizeSharing(periodEvents, reportDay, reportDay);
  const windowComplete = reportDay >= addDays(launchDay, 7);
  const gates = {
    uniqueDrawDevices: period.uniqueDrawDevices >= 300,
    shareParticipation: period.shareParticipationRate >= 0.1,
    d7: d7.mature && d7.d7Rate >= 0.15,
    attributedFirstDraws: attributedFirstDraws.length >= 25,
  };

  return {
    launchDay,
    reportDay,
    windowComplete,
    excludedDevicePrefixes: ["smoke-", "test-"],
    daily,
    period,
    d7,
    attribution: {
      cardReferredFirstDrawDevices: new Set(
        attributedFirstDraws.map(row => row.deviceId)
      ).size,
      channelFirstDrawDevices: channelFirstDraws,
    },
    gates,
    decisionReady: windowComplete && d7.mature,
    allGatesPassed:
      windowComplete && d7.mature && Object.values(gates).every(Boolean),
  };
}
