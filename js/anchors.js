const anchors = {
  weekday: [
    { id: 'day-job', title: 'Day Job', role: 'job', startTime: '01:00', endTime: '11:00' },
    { id: 'evening-word', title: 'Evening Word', role: 'faith', startTime: '19:30', endTime: '20:00' }
  ],
  sunday: [
    { id: 'day-job-1', title: 'Day Job', role: 'job', startTime: '01:00', endTime: '06:30' },
    { id: 'church', title: 'Sunday Church', role: 'faith', startTime: '06:30', endTime: '10:00' },
    { id: 'day-job-2', title: 'Day Job', role: 'job', startTime: '10:00', endTime: '14:30' },
    { id: 'evening-word', title: 'Evening Word', role: 'faith', startTime: '19:30', endTime: '20:00' }
  ]
};

function getAnchorsForToday() {
  const day = new Date().getDay();
  return day === 0 ? anchors.sunday : anchors.weekday;
}

function minutesFromMidnight(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentAnchor(anchorList) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const a of anchorList) {
    const start = minutesFromMidnight(a.startTime);
    const end = minutesFromMidnight(a.endTime);
    if (nowMin >= start && nowMin < end) {
      return a;
    }
  }
  return null;
}

function getNextAnchor(anchorList) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let next = null;
  let nextMin = Infinity;
  for (const a of anchorList) {
    const start = minutesFromMidnight(a.startTime);
    if (start > nowMin && start < nextMin) {
      next = a;
      nextMin = start;
    }
  }
  return next;
}

function runwayUntilNextAnchor(anchorList) {
  const next = getNextAnchor(anchorList);
  if (!next) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = minutesFromMidnight(next.startTime);
  return start - nowMin;
}

function isAnchorActive(anchorList) {
  return getCurrentAnchor(anchorList) !== null;
}

export {
  anchors,
  getAnchorsForToday,
  getCurrentAnchor,
  getNextAnchor,
  runwayUntilNextAnchor,
  isAnchorActive,
  minutesFromMidnight
};
