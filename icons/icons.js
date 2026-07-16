const ICONS = {
  lock: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>`,

  flame: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14c3 0 5-2.5 5-5.5 0-3-2.5-6-3.5-7-.5 1.5-1 3.5-2.5 4.5C5.5 5 5 4 5 3c-1 2-2.5 4-2.5 6.5 0 2 1 3 2 3.5"/><path d="M7 14c1 0 2-1 2-2.5S7.5 9 7 9c0 1.5-.5 2-1 2.5s-.5 1.5 0 2S6.5 14 7 14z"/></svg>`,

  check: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5L6.5 12 13 4"/></svg>`,

  plus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

  chevronLeft: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5l-5 5 5 5"/></svg>`,

  chevronRight: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 5l5 5-5 5"/></svg>`
};

function icon(name, size) {
  const svg = ICONS[name];
  if (!svg) return '';
  if (size && size !== 16) {
    return svg.replace(`width="16"`, `width="${size}"`).replace(`height="16"`, `height="${size}"`)
      .replace(`width="24"`, `width="${size}"`).replace(`height="24"`, `height="${size}"`);
  }
  return svg;
}

export { ICONS, icon };
