(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    rsvpDate: '2026-11-14',
    addressLine1: '221 W China Grade Loop',
    addressLine2: 'Bakersfield CA 93308'
  });

  // Coordinates are in the attached 720 x 1008 PNG coordinate system.  Each
  // mask covers only the replaceable pixels in the supplied master image.
  const TEMPLATES = Object.freeze({
    christmas: {
      id: 'christmas', width: 720, height: 1008, image: 'assets/invitations/christmas-master.png.b64',
      dateStyle: 'weekday-month-day-year', rsvpStyle: 'by-short-month-day',
      fields: {
        eventDate: { x: 104, y: 401, width: 514, height: 48, baseline: 433, font: 'italic 28px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 },
        addressLine1: { x: 119, y: 496, width: 482, height: 38, baseline: 526, font: 'italic 27px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 },
        addressLine2: { x: 133, y: 531, width: 454, height: 38, baseline: 560, font: 'italic 27px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 },
        rsvpBy: { x: 239, y: 840, width: 248, height: 42, baseline: 869, font: 'bold 22px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 }
      },
      qr: { x: 562, y: 850, width: 158, height: 158, quietZone: 4 },
      mask: '#f7f8f5'
    },
    thanksgiving: {
      id: 'thanksgiving', width: 720, height: 1008, image: 'assets/invitations/thanksgiving-master.png.b64',
      dateStyle: 'weekday-month-day-year-upper', rsvpStyle: 'by-short-month-day',
      fields: {
        eventDate: { x: 121, y: 421, width: 478, height: 43, baseline: 452, font: 'italic 27px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: .2 },
        addressLine1: { x: 122, y: 516, width: 476, height: 38, baseline: 546, font: 'italic 27px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 },
        addressLine2: { x: 133, y: 551, width: 454, height: 38, baseline: 580, font: 'italic 27px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 },
        rsvpBy: { x: 239, y: 840, width: 248, height: 42, baseline: 871, font: 'bold 22px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: 0 }
      },
      qr: { x: 558, y: 846, width: 162, height: 162, quietZone: 4 },
      mask: '#f5f3ed'
    },
    wedding: {
      id: 'wedding', width: 720, height: 1008, image: 'assets/invitations/wedding-master.png.b64',
      dateStyle: 'wedding-two-line', rsvpStyle: 'by-short-month-day',
      fields: {
        eventDate: { x: 133, y: 475, width: 454, height: 76, baseline: 505, secondBaseline: 540, font: '23px Georgia, "Times New Roman", serif', secondFont: 'italic 22px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: .5 },
        addressLine1: { x: 175, y: 650, width: 370, height: 39, baseline: 681, font: 'italic 22px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: .4 },
        addressLine2: { x: 165, y: 684, width: 390, height: 39, baseline: 714, font: 'italic 22px Georgia, "Times New Roman", serif', align: 'center', color: '#4d4a50', tracking: .4 },
        rsvpBy: null
      },
      // The supplied wedding PNG contains no QR. This fixed, previously blank
      // lower-right region avoids moving any source artwork or wording.
      qr: { x: 553, y: 816, width: 120, height: 120, quietZone: 4 },
      mask: '#faf8f8'
    }
  });

  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });
  const numberWords = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  function underHundredWords(value) {
    if (value < 20) return numberWords[value];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    return `${tens[Math.floor(value / 10)]}${value % 10 ? `-${numberWords[value % 10]}` : ''}`;
  }
  function yearWords(year) {
    if (year >= 2000 && year < 2100) return `Two thousand and ${underHundredWords(year - 2000)}`;
    return String(year);
  }
  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    return match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], 12)) : null;
  }
  function formatEventDate(templateId, value) {
    const date = parseDate(value); if (!date) return '';
    const template = TEMPLATES[templateId];
    if (template.dateStyle === 'wedding-two-line') return [`${weekday.format(date).toUpperCase()}, ${date.getUTCDate()} OF ${monthLong.format(date).toUpperCase()}`, yearWords(date.getUTCFullYear()).replace(/^./, c => c.toUpperCase())];
    const text = `${weekday.format(date)} ${monthLong.format(date).toUpperCase()} ${date.getUTCDate()} ${date.getUTCFullYear()}`;
    return template.dateStyle.endsWith('-upper') ? text.toUpperCase() : text;
  }
  function formatRsvpDate(value) {
    const date = parseDate(value); if (!date) return '';
    return `BY ${monthShort.format(date).toUpperCase()}. ${date.getUTCDate()}`;
  }
  function filenameFor(accountName, eventName) {
    const safe = `${accountName}-${eventName}-Invitation`.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${safe || 'Invitation'}.png`;
  }
  function settings(eventState) { return { rsvpDate: eventState.rsvpDate || DEFAULTS.rsvpDate, addressLine1: eventState.addressLine1 || DEFAULTS.addressLine1, addressLine2: eventState.addressLine2 || DEFAULTS.addressLine2 }; }
  function invitationModel(templateId, eventState, qrUrl) {
    const template = TEMPLATES[templateId], values = settings(eventState);
    return { template, values: { eventDate: formatEventDate(templateId, eventState.eventDate), rsvpBy: formatRsvpDate(values.rsvpDate), addressLine1: values.addressLine1, addressLine2: values.addressLine2 }, qrUrl };
  }
  function trackedText(ctx, text, field, y, font = field.font) {
    ctx.font = font; ctx.fillStyle = field.color; ctx.textAlign = field.align; ctx.textBaseline = 'alphabetic';
    const x = field.align === 'center' ? field.x + field.width / 2 : field.x;
    if (!field.tracking || !ctx.letterSpacing) ctx.fillText(text, x, y);
    else { ctx.letterSpacing = `${field.tracking}px`; ctx.fillText(text, x, y); ctx.letterSpacing = '0px'; }
  }
  async function loadImage(src) {
    // Master artwork is committed as Base64 text because the review transport
    // cannot carry binary files. Decode it only in memory; no derived copy is
    // stored and the decoded bytes remain identical to the supplied PNG.
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Unable to load invitation master: ${response.status}`);
    const encoded = (await response.text()).replace(/\s/g, '');
    const binary = atob(encoded), bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
      image.onerror = error => { URL.revokeObjectURL(objectUrl); reject(error); };
      image.src = objectUrl;
    });
  }
  async function render(canvas, model, qr) {
    const { template, values } = model, ctx = canvas.getContext('2d');
    canvas.width = template.width; canvas.height = template.height;
    ctx.drawImage(await loadImage(template.image), 0, 0, template.width, template.height);
    Object.values(template.fields).filter(Boolean).forEach(field => { ctx.fillStyle = template.mask; ctx.fillRect(field.x, field.y, field.width, field.height); });
    const dateField = template.fields.eventDate;
    if (Array.isArray(values.eventDate)) { trackedText(ctx, values.eventDate[0], dateField, dateField.baseline); trackedText(ctx, values.eventDate[1], dateField, dateField.secondBaseline, dateField.secondFont); }
    else trackedText(ctx, values.eventDate, dateField, dateField.baseline);
    ['addressLine1', 'addressLine2', 'rsvpBy'].forEach(key => { const field = template.fields[key]; if (field) trackedText(ctx, values[key], field, field.baseline); });
    const q = template.qr, count = qr.getModuleCount(), quiet = q.quietZone, modules = count + quiet * 2;
    ctx.fillStyle = '#fff'; ctx.fillRect(q.x, q.y, q.width, q.height);
    const scale = Math.min(q.width, q.height) / modules, left = q.x + (q.width - modules * scale) / 2, top = q.y + (q.height - modules * scale) / 2;
    ctx.fillStyle = '#000';
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) ctx.fillRect(left + (col + quiet) * scale, top + (row + quiet) * scale, scale + .15, scale + .15);
    return canvas;
  }
  function overflowWarnings(canvas, model) {
    const ctx = canvas.getContext('2d'), warnings = [];
    Object.entries(model.template.fields).forEach(([key, field]) => {
      if (!field) return; const value = model.values[key]; const lines = Array.isArray(value) ? value : [value];
      lines.forEach((line, index) => { ctx.font = index ? (field.secondFont || field.font) : field.font; if (ctx.measureText(line).width + Math.max(0, line.length - 1) * (field.tracking || 0) > field.width) warnings.push(key); });
    });
    return [...new Set(warnings)];
  }

  root.Invitation = { TEMPLATES, DEFAULTS, parseDate, formatEventDate, formatRsvpDate, filenameFor, settings, invitationModel, render, overflowWarnings };
  if (typeof module !== 'undefined') module.exports = root.Invitation;
})(typeof globalThis !== 'undefined' ? globalThis : window);
