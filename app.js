const STORAGE_KEYS = {
  items: 'mpso_items_v4',
  location: 'mpso_location_v1',
  prefs: 'mpso_prefs_v4'
};

const state = {
  items: [],
  filteredItems: [],
  location: null,
  map: null,
  markersLayer: null,
  locationLayer: null,
  pickingLocation: false,
  currentTab: 'list'
};

const DEMO_ITEMS = [
  {
    id: 'demo-1',
    title: 'Mid Century Dresser Solid Wood 6 Drawer',
    cleanedTitle: 'mid century dresser solid wood 6 drawer',
    price: 85,
    url: 'https://www.facebook.com/marketplace/item/1234567890/',
    areaText: 'Beaverton, OR',
    latitude: 45.4871,
    longitude: -122.8037,
    savedAt: '2026-04-12T18:30:00Z',
    status: 'active',
    statusConfidence: 'demo',
    statusReason: 'Demo record with Marketplace item URL.',
    sourceType: 'demo',
    notes: '',
    shortlist: true,
    passed: false,
    distanceMiles: null
  },
  {
    id: 'demo-2',
    title: 'Vintage KitchenAid Mixer Works Great',
    cleanedTitle: 'vintage kitchenaid mixer works great',
    price: 120,
    url: '',
    areaText: 'Portland, OR',
    latitude: 45.5152,
    longitude: -122.6784,
    savedAt: '2026-04-10T21:15:00Z',
    status: 'unknown',
    statusConfidence: 'demo',
    statusReason: 'Demo record without a live Marketplace URL.',
    sourceType: 'demo',
    notes: '',
    shortlist: false,
    passed: false,
    distanceMiles: null
  }
];

const els = {
  fileInput: document.getElementById('fileInput'),
  importBtn: document.getElementById('importBtn'),
  importStatus: document.getElementById('importStatus'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  clearDataBtn: document.getElementById('clearDataBtn'),
  useLocationBtn: document.getElementById('useLocationBtn'),
  dropPinBtn: document.getElementById('dropPinBtn'),
  clearLocationBtn: document.getElementById('clearLocationBtn'),
  planningAreaSelect: document.getElementById('planningAreaSelect'),
  locationStatus: document.getElementById('locationStatus'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  sortMode: document.getElementById('sortMode'),
  minPrice: document.getElementById('minPrice'),
  maxPrice: document.getElementById('maxPrice'),
  savedAfter: document.getElementById('savedAfter'),
  savedBefore: document.getElementById('savedBefore'),
  maxDistance: document.getElementById('maxDistance'),
  buyerModeBtn: document.getElementById('buyerModeBtn'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  shortlistOnly: document.getElementById('shortlistOnly'),
  hidePassed: document.getElementById('hidePassed'),
  hideSoldUnavailable: document.getElementById('hideSoldUnavailable'),
  facebookLinkOnly: document.getElementById('facebookLinkOnly'),
  urlOnly: document.getElementById('urlOnly'),
  pricedOnly: document.getElementById('pricedOnly'),
  titledOnly: document.getElementById('titledOnly'),
  hideJunkTitles: document.getElementById('hideJunkTitles'),
  hideUnknown: document.getElementById('hideUnknown'),
  hideAutos: document.getElementById('hideAutos'),
  hideHousing: document.getElementById('hideHousing'),
  compactImport: document.getElementById('compactImport'),
  clearFlagsBtn: document.getElementById('clearFlagsBtn'),
  summary: document.getElementById('summary'),
  listTabBtn: document.getElementById('listTabBtn'),
  mapTabBtn: document.getElementById('mapTabBtn'),
  listView: document.getElementById('listView'),
  mapView: document.getElementById('mapView'),
  itemsList: document.getElementById('itemsList'),
  mapSummary: document.getElementById('mapSummary'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  itemCardTemplate: document.getElementById('itemCardTemplate')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  bindEvents();
  restoreState();
  initMap();
  applyFiltersAndRender();
}

function bindEvents() {
  els.fileInput.addEventListener('change', onFilesSelected);
  els.importBtn.addEventListener('click', importSelectedFiles);
  els.loadSampleBtn.addEventListener('click', loadDemoData);
  els.clearDataBtn.addEventListener('click', clearImportedData);
  els.clearFlagsBtn.addEventListener('click', clearNotesAndFlags);
  els.useLocationBtn.addEventListener('click', useCurrentLocation);
  els.dropPinBtn.addEventListener('click', startDropPinMode);
  els.clearLocationBtn.addEventListener('click', clearLocation);
  els.planningAreaSelect.addEventListener('change', onPlanningAreaSelected);
  els.exportCsvBtn.addEventListener('click', exportFilteredCsv);
  els.buyerModeBtn.addEventListener('click', applyBuyerMode);
  els.clearFiltersBtn.addEventListener('click', clearFilters);
  els.listTabBtn.addEventListener('click', () => switchTab('list'));
  els.mapTabBtn.addEventListener('click', () => switchTab('map'));

  [
    els.searchInput,
    els.statusFilter,
    els.sortMode,
    els.minPrice,
    els.maxPrice,
    els.savedAfter,
    els.savedBefore,
    els.maxDistance,
    els.shortlistOnly,
    els.hidePassed,
    els.hideSoldUnavailable,
    els.facebookLinkOnly,
    els.urlOnly,
    els.pricedOnly,
    els.titledOnly,
    els.hideJunkTitles,
    els.hideUnknown,
    els.hideAutos,
    els.hideHousing
  ].forEach(el => {
    el.addEventListener('input', onFilterChanged);
    el.addEventListener('change', onFilterChanged);
  });
}

function restoreState() {
  try {
    const cachedItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.items) || '[]');
    if (Array.isArray(cachedItems)) state.items = cachedItems;
  } catch {}

  try {
    const loc = JSON.parse(localStorage.getItem(STORAGE_KEYS.location) || 'null');
    if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
      state.location = loc;
    }
  } catch {}

  try {
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs) || '{}');
    if (prefs.searchInput) els.searchInput.value = prefs.searchInput;
    els.statusFilter.value = prefs.statusFilter || 'all';
    if (prefs.sortMode) els.sortMode.value = prefs.sortMode;
    if (prefs.minPrice) els.minPrice.value = prefs.minPrice;
    if (prefs.maxPrice) els.maxPrice.value = prefs.maxPrice;
    if (prefs.savedAfter) els.savedAfter.value = prefs.savedAfter;
    if (prefs.savedBefore) els.savedBefore.value = prefs.savedBefore;
    if (prefs.maxDistance) els.maxDistance.value = prefs.maxDistance;
    els.shortlistOnly.checked = Boolean(prefs.shortlistOnly);
    els.hidePassed.checked = Boolean(prefs.hidePassed);
    els.hideSoldUnavailable.checked = Boolean(prefs.hideSoldUnavailable);
    els.facebookLinkOnly.checked = Boolean(prefs.facebookLinkOnly);
    els.urlOnly.checked = Boolean(prefs.urlOnly);
    els.pricedOnly.checked = Boolean(prefs.pricedOnly);
    els.titledOnly.checked = prefs.titledOnly !== false;
    els.hideJunkTitles.checked = prefs.hideJunkTitles !== false;
    els.hideUnknown.checked = Boolean(prefs.hideUnknown);
    els.hideAutos.checked = Boolean(prefs.hideAutos);
    els.hideHousing.checked = Boolean(prefs.hideHousing);
    els.compactImport.checked = prefs.compactImport !== false;
  } catch {
    els.statusFilter.value = 'all';
    els.titledOnly.checked = true;
    els.hideJunkTitles.checked = true;
    els.compactImport.checked = true;
  }

  updateLocationStatus();
  recomputeDistances();
  setImportStatus(state.items.length ? `Loaded ${state.items.length} locally cached records.` : 'No items loaded yet.');
}

function saveItems() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
}

function saveLocation() {
  localStorage.setItem(STORAGE_KEYS.location, JSON.stringify(state.location));
}

function savePrefs() {
  const prefs = {
    searchInput: els.searchInput.value,
    statusFilter: els.statusFilter.value,
    sortMode: els.sortMode.value,
    minPrice: els.minPrice.value,
    maxPrice: els.maxPrice.value,
    savedAfter: els.savedAfter.value,
    savedBefore: els.savedBefore.value,
    maxDistance: els.maxDistance.value,
    shortlistOnly: els.shortlistOnly.checked,
    hidePassed: els.hidePassed.checked,
    hideSoldUnavailable: els.hideSoldUnavailable.checked,
    facebookLinkOnly: els.facebookLinkOnly.checked,
    urlOnly: els.urlOnly.checked,
    pricedOnly: els.pricedOnly.checked,
    titledOnly: els.titledOnly.checked,
    hideJunkTitles: els.hideJunkTitles.checked,
    hideUnknown: els.hideUnknown.checked,
    hideAutos: els.hideAutos.checked,
    hideHousing: els.hideHousing.checked,
    compactImport: els.compactImport.checked
  };
  localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs));
}

function setImportStatus(message, isError = false) {
  if (!els.importStatus) return;
  els.importStatus.textContent = message;
  els.importStatus.classList.toggle('error', Boolean(isError));
}

async function onFilesSelected() {
  const files = Array.from(els.fileInput.files || []);
  if (!files.length) {
    setImportStatus('No file selected.');
    return;
  }
  const names = files.map(f => f.name).join(', ');
  setImportStatus(`Selected ${files.length} file${files.length === 1 ? '' : 's'}: ${names}. Tap Import selected file.`);
}

async function importSelectedFiles() {
  const files = Array.from(els.fileInput.files || []);
  if (!files.length) {
    setImportStatus('Choose a zip or JSON file first.', true);
    return;
  }

  setImportStatus('Importing selected file. This may take a bit on iPhone...');

  const rawItems = [];
  const stats = {
    collections: 0,
    listingHistory: 0,
    genericSavedLogs: 0,
    fallback: 0,
    zipEntriesRead: 0,
    zipJsonFiles: 0,
    zipFiles: 0,
    failedFiles: 0,
    beforeCompact: 0,
    keptCompact: 0,
    compactDropped: 0
  };

  for (const file of files) {
    try {
      const lower = String(file.name || '').toLowerCase();
      if (lower.endsWith('.zip')) {
        const zipItems = await parseZipFile(file, stats);
        rawItems.push(...zipItems);
      } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        const text = await file.text();
        const fileItems = parseFileByName(file.name, text, stats);
        rawItems.push(...fileItems);
      } else {
        const text = await file.text();
        const json = JSON.parse(text);
        const fileItems = parseFileByName(file.name, json, stats);
        rawItems.push(...fileItems);
      }
    } catch (error) {
      stats.failedFiles += 1;
      console.error('Could not read file', file.name, error);
    }
  }

  if (!rawItems.length) {
    setImportStatus('No usable listing records were found in the selected file.', true);
    return;
  }

  stats.beforeCompact = rawItems.length;
  const processedItems = els.compactImport.checked ? compactItemsForIphone(rawItems) : rawItems;
  stats.keptCompact = processedItems.length;
  stats.compactDropped = stats.beforeCompact - stats.keptCompact;

  state.items = dedupeAndMerge(processedItems, state.items);
  recomputeDistances();

  try {
    saveItems();
    applyFiltersAndRender();
    els.fileInput.value = '';
    setImportStatus([
      `Imported ${state.items.length} saved records.`,
      els.compactImport.checked ? `Compact mode kept ${stats.keptCompact} of ${stats.beforeCompact}.` : null,
      stats.zipFiles ? `Zip files: ${stats.zipFiles}` : null,
      stats.zipJsonFiles ? `Zip JSON files read: ${stats.zipJsonFiles}` : null,
      stats.collections ? `Collections: ${stats.collections}` : null,
      stats.listingHistory ? `Listing history: ${stats.listingHistory}` : null,
      stats.genericSavedLogs ? `generic saved logs skipped: ${stats.genericSavedLogs}` : null,
      stats.failedFiles ? `Files skipped: ${stats.failedFiles}` : null,
      ...buildImportQualityHints(state.items, stats)
    ].filter(Boolean).join(' '));
  } catch (error) {
    console.error(error);
    applyFiltersAndRender();
    setImportStatus('Import worked, but Safari could not save all records locally. Compact iPhone import is on, but the remaining records are still too large for Safari storage. Clear imported data and try again.', true);
  }
}

function buildImportQualityHints(items, stats = {}) {
  if (!items.length) return [];

  const total = items.length;
  const mapReady = items.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).length;
  const directUrls = items.filter(item => hasDirectMarketplaceUrl(item.url)).length;
  const facebookLinks = items.filter(item => hasOpenableFacebookUrl(item.url)).length;
  const htmlRecords = items.filter(item => String(item.sourceType || '').includes('html')).length;
  const hints = [
    `Map-ready records: ${mapReady}.`,
    `Exact Marketplace URLs: ${directUrls}.`
  ];

  if (!mapReady) {
    hints.push('Map note: this import did not include recognizable item areas, so item pins cannot be created from this file.');
  } else if (mapReady < Math.ceil(total * 0.25)) {
    hints.push('Map note: only a small slice of this import has recognizable areas, so map pins will be limited.');
  }

  if (!directUrls) {
    hints.push(facebookLinks
      ? 'Link note: no exact Marketplace item URLs were exported; Facebook links may open posts, and Marketplace buttons search by title.'
      : 'Link note: no exact Marketplace item URLs were exported; Marketplace buttons search by title.');
  }

  if (htmlRecords && htmlRecords / total >= 0.5) {
    hints.push(stats.genericSavedLogs
      ? 'Export note: this looks like the weaker HTML export. The JSON export usually gives better Marketplace details for maps and links.'
      : 'Export note: this looks like an HTML export, which often omits areas and direct listing URLs.');
  }

  return hints;
}

async function parseZipFile(file, stats) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip is not loaded.');
  }

  stats.zipFiles += 1;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter(entry => !entry.dir && shouldParseZipEntry(entry.name))
    .sort((a, b) => prioritizeZipEntry(a.name) - prioritizeZipEntry(b.name) || a.name.localeCompare(b.name));

  const items = [];
  for (const entry of entries) {
    try {
      stats.zipEntriesRead += 1;
      const text = await entry.async('string');
      const entryName = entry.name.split('/').pop() || entry.name;
      const payload = /\.html?$/i.test(entryName) ? text : JSON.parse(text);
      const fileItems = parseFileByName(entryName, payload, stats);
      items.push(...fileItems);
      stats.zipJsonFiles += 1;
    } catch (error) {
      stats.failedFiles += 1;
      console.error('Could not parse zip entry', entry.name, error);
    }
  }

  return items;
}

function prioritizeZipEntry(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('collections.json') || lower.endsWith('collections.html')) return 0;
  if (lower.endsWith('your_marketplace_listing_history.json')) return 1;
  if (lower.endsWith('your_saved_items.json') || lower.endsWith('your_saved_items.html')) return 2;
  return 9;
}

function shouldParseZipEntry(name) {
  const lower = String(name || '').toLowerCase();
  return lower.endsWith('collections.json') ||
    lower.endsWith('your_marketplace_listing_history.json') ||
    lower.endsWith('your_saved_items.json') ||
    lower.endsWith('collections.html') ||
    lower.endsWith('your_saved_items.html');
}

function parseFileByName(fileName, json, stats) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.includes('collections.html')) {
    const items = parseCollectionsHtml(String(json || ''));
    stats.collections += items.length;
    return items;
  }
  if (lower.includes('your_saved_items.html')) {
    const items = parseSavedItemsHtml(String(json || ''));
    stats.genericSavedLogs += items.length;
    return items;
  }
  if (lower.includes('collections.json')) {
    const items = parseCollectionsJson(json);
    stats.collections += items.length;
    return items;
  }
  if (lower.includes('your_marketplace_listing_history.json')) {
    const items = parseListingHistoryJson(json);
    stats.listingHistory += items.length;
    return items;
  }
  if (lower.includes('your_saved_items.json')) {
    const { items, skipped } = parseSavedItemsJson(json);
    stats.genericSavedLogs += skipped;
    stats.fallback += items.length;
    return items;
  }

  const flattened = flattenObjects(json);
  const items = [];
  for (const record of flattened) {
    const item = normalizeGenericRecord(record);
    if (item) items.push(item);
  }
  stats.fallback += items.length;
  return items;
}

function parseSavedItemsJson(json) {
  const rows = Array.isArray(json?.saves_v2) ? json.saves_v2 : [];
  const items = [];
  let skipped = 0;

  for (const row of rows) {
    const item = normalizeSavedLogRow(row);
    if (item) items.push(item);
    else skipped += 1;
  }

  return { items, skipped };
}

function normalizeSavedLogRow(row) {
  const attachment = row?.attachments?.[0]?.data?.[0]?.external_context;
  if (!attachment?.source && !attachment?.name) return null;

  const title = attachment.name || row.title || 'Saved link';
  const url = attachment.source || '';
  const statusBundle = inferStatus({ title, url }, title, url);

  return {
    id: buildId(title, url, '', row.timestamp, 'saved_log'),
    title,
    cleanedTitle: cleanTitleForSearch(title),
    price: null,
    url,
    areaText: '',
    latitude: null,
    longitude: null,
    savedAt: normalizeDate(row.timestamp),
    status: statusBundle.status,
    statusConfidence: statusBundle.confidence,
    statusReason: statusBundle.reason,
    sourceType: 'saved_log',
    notes: '',
    shortlist: false,
    passed: false,
    distanceMiles: null
  };
}

function parseCollectionsJson(json) {
  const collections = Array.isArray(json) ? json : [];
  const items = [];

  for (const collection of collections) {
    const collectionTitle = getLabelValue(collection.label_values, 'Title') || '';
    const collectionUpdated = getLabelTimestamp(collection.label_values, 'Last updated time');

    for (const block of collection.label_values || []) {
      if (block?.title !== 'Saves' || !Array.isArray(block.dict)) continue;
      for (const entry of block.dict) {
        const item = normalizeCollectionEntry(entry, collectionTitle, collectionUpdated);
        if (item) items.push(item);
      }
    }
  }

  return items;
}

function parseCollectionsHtml(html) {
  const doc = parseHtmlDocument(html);
  if (!doc) return [];

  const items = [];
  doc.querySelectorAll('table').forEach((table, index) => {
    const fields = extractHtmlTableFields(table);
    const hasProductFields = Boolean(fields['Product name'] || fields.Price || fields.Description);
    if (!hasProductFields) return;

    const title = fields['Product name'] || fields.Title || '';
    const price = normalizePrice(fields.Price);
    const description = fields.Description || '';
    const nearbyText = getNearbyHtmlText(table, 7);
    const url = fields.URL || extractMarketplaceUrl(description) || '';
    const areaText = inferAreaFromText(`${description} ${fields.Group || ''} ${fields.Name || ''} ${fields.Title || ''} ${nearbyText}`);
    const statusBundle = inferStatus({ fields, description, nearbyText, title, url }, title, url);

    if (!title && price == null && !url) return;
    if (!title && !description) return;

    const guessed = guessLatLon(areaText);
    items.push({
      id: buildId(title, url, areaText, `${price ?? ''}|${description.slice(0, 120)}`, 'collection_html'),
      title: decodeFbText(title || '(untitled saved item)'),
      cleanedTitle: cleanTitleForSearch(title || ''),
      price,
      url,
      areaText,
      latitude: guessed.latitude,
      longitude: guessed.longitude,
      savedAt: normalizeDate(fields['Last updated time']),
      status: statusBundle.status,
      statusConfidence: statusBundle.confidence,
      statusReason: `${statusBundle.reason} Parsed from Facebook HTML export.`,
      sourceType: 'collection_html',
      notes: '',
      shortlist: false,
      passed: false,
      distanceMiles: null
    });
  });

  return dedupeAndMerge(items, []);
}

function parseSavedItemsHtml(html) {
  const doc = parseHtmlDocument(html);
  if (!doc) return [];

  const items = [];
  doc.querySelectorAll('h2').forEach((heading, index) => {
    const title = normalizeWhitespace(heading.textContent || '');
    if (!/saved/i.test(title) || /your saved items/i.test(title)) return;
    const statusBundle = inferStatus({ title }, title, '');
    items.push({
      id: buildId(title, '', '', `${index}`, 'saved_html'),
      title: decodeFbText(title),
      cleanedTitle: cleanTitleForSearch(title),
      price: null,
      url: '',
      areaText: '',
      latitude: null,
      longitude: null,
      savedAt: null,
      status: statusBundle.status,
      statusConfidence: statusBundle.confidence,
      statusReason: `${statusBundle.reason} Parsed from Facebook HTML export; HTML saved-items exports usually omit price, area, and direct Marketplace item URLs.`,
      sourceType: 'saved_html',
      notes: '',
      shortlist: false,
      passed: false,
      distanceMiles: null
    });
  });

  return items;
}

function parseHtmlDocument(html) {
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
}

function extractHtmlTableFields(table) {
  const fields = {};
  table.querySelectorAll(':scope > tbody > tr, :scope > tr').forEach(row => {
    const cells = Array.from(row.children).filter(el => el.tagName === 'TD' || el.tagName === 'TH');
    if (!cells.length) return;
    const label = getDirectText(cells[0]);
    if (!label) return;
    const valueCell = cells[1] || cells[0];
    const link = valueCell.querySelector('a[href]')?.getAttribute('href') || '';
    const value = link || normalizeWhitespace(valueCell.textContent || '');
    if (value && !fields[label]) fields[label] = value;
  });
  return fields;
}

function getNearbyHtmlText(element, maxLevels = 5) {
  const parts = [];
  let node = element;
  for (let i = 0; i < maxLevels && node; i += 1) {
    const text = normalizeWhitespace(node.textContent || '');
    if (text) parts.push(text);
    node = node.parentElement;
  }
  return parts.join(' ');
}

function getDirectText(element) {
  return normalizeWhitespace(Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent || '')
    .join(' '));
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeCollectionEntry(entry, collectionTitle, collectionUpdated) {
  const inner = Array.isArray(entry?.dict) ? entry.dict : [];
  const title = getLabelValue(inner, 'Product name') || getLabelValue(inner, 'Title') || getLabelValue(inner, 'Name');
  const price = normalizePrice(getLabelValue(inner, 'Price'));
  const description = getLabelValue(inner, 'Description') || '';
  const labelText = stringifyLabelValues(inner);
  const url = getLabelHref(inner, 'URL') || getLabelValue(inner, 'URL') || extractMarketplaceUrl(labelText) || extractMarketplaceUrl(description) || '';
  const areaText = inferAreaFromText(`${labelText} ${description} ${collectionTitle}`);
  const statusBundle = inferStatus({ description, labelText, title, url }, title, url);

  const hasUsefulListingFields = Boolean(title || price != null || url);
  if (!hasUsefulListingFields) return null;

  const guessed = guessLatLon(areaText);

  return {
    id: buildId(title, url, areaText, collectionUpdated, 'collection'),
    title: decodeFbText(title || '(untitled saved item)'),
    cleanedTitle: cleanTitleForSearch(title || ''),
    price,
    url,
    areaText,
    latitude: guessed.latitude,
    longitude: guessed.longitude,
    savedAt: normalizeDate(collectionUpdated),
    status: statusBundle.status,
    statusConfidence: statusBundle.confidence,
    statusReason: statusBundle.reason,
    sourceType: 'collection',
    notes: '',
    shortlist: false,
    passed: false,
    distanceMiles: null
  };
}

function parseListingHistoryJson(json) {
  const rows = Array.isArray(json) ? json : [];
  const items = [];

  for (const row of rows) {
    const labelValues = Array.isArray(row.label_values) ? row.label_values : [];
    const title = getLabelValue(labelValues, 'Title');
    const description = getLabelValue(labelValues, 'Description') || '';
    const labelText = stringifyLabelValues(labelValues);
    const url = extractMarketplaceUrl(labelText) || extractMarketplaceUrl(description) || '';
    const areaText = inferAreaFromText(`${labelText} ${description}`);
    const viewedAt = getLabelTimestamp(labelValues, 'Latest time viewed') || getLabelTimestamp(labelValues, 'Time first viewed') || row.timestamp;
    const statusBundle = inferStatus({ title, description, labelText, url }, title, url);

    if (!title) continue;

    const guessed = guessLatLon(areaText);

    items.push({
      id: buildId(title, url, areaText, viewedAt, 'listing_history'),
      title: decodeFbText(title),
      cleanedTitle: cleanTitleForSearch(title),
      price: normalizePrice(extractPrice(description)),
      url,
      areaText,
      latitude: guessed.latitude,
      longitude: guessed.longitude,
      savedAt: normalizeDate(viewedAt),
      status: statusBundle.status,
      statusConfidence: statusBundle.confidence,
      statusReason: statusBundle.reason,
      sourceType: 'listing_history',
      notes: '',
      shortlist: false,
      passed: false,
      distanceMiles: null
    });
  }

  return items;
}

function flattenObjects(input, out = []) {
  if (Array.isArray(input)) {
    input.forEach(v => flattenObjects(v, out));
  } else if (input && typeof input === 'object') {
    out.push(input);
    Object.values(input).forEach(v => flattenObjects(v, out));
  }
  return out;
}

function normalizeGenericRecord(rec) {
  const title = pickFirst(rec, ['title', 'name', 'listing_title', 'marketplace_title', 'label']);
  const url = pickFirst(rec, ['url', 'uri', 'href', 'permalink', 'listing_url', 'marketplace_url']);
  const areaText = inferAreaFromText(pickFirst(rec, ['location', 'location_text', 'city', 'region', 'area', 'subtitle']));
  const priceRaw = pickFirst(rec, ['price', 'listing_price', 'amount', 'value']);
  const savedRaw = pickFirst(rec, ['timestamp', 'created_timestamp', 'saved_timestamp', 'date', 'created_time']);
  const latitude = tryNumber(pickFirst(rec, ['latitude', 'lat', 'location_lat', 'marketplace_lat']));
  const longitude = tryNumber(pickFirst(rec, ['longitude', 'lng', 'lon', 'location_lng', 'marketplace_lng']));
  const statusBundle = inferStatus(rec, title, url);
  const price = normalizePrice(priceRaw);

  const useful = title || url || areaText || Number.isFinite(latitude) || Number.isFinite(longitude);
  if (!useful) return null;

  const guessed = guessLatLon(areaText);

  return {
    id: buildId(title, url, areaText, savedRaw, 'generic'),
    title: decodeFbText(String(title || '').trim()),
    cleanedTitle: cleanTitleForSearch(title || ''),
    price,
    url: String(url || '').trim(),
    areaText: areaText || '',
    latitude: Number.isFinite(latitude) ? latitude : guessed.latitude,
    longitude: Number.isFinite(longitude) ? longitude : guessed.longitude,
    savedAt: normalizeDate(savedRaw),
    status: statusBundle.status,
    statusConfidence: statusBundle.confidence,
    statusReason: statusBundle.reason,
    sourceType: 'generic',
    notes: '',
    shortlist: false,
    passed: false,
    distanceMiles: null
  };
}

function getLabelValue(labelValues, targetLabel) {
  for (const entry of labelValues || []) {
    if (entry?.label === targetLabel && entry.value != null && entry.value !== '') return entry.value;
  }
  return '';
}

function getLabelHref(labelValues, targetLabel) {
  for (const entry of labelValues || []) {
    if (entry?.label === targetLabel && entry.href) return entry.href;
  }
  return '';
}

function getLabelTimestamp(labelValues, targetLabel) {
  for (const entry of labelValues || []) {
    if (entry?.label === targetLabel && entry.timestamp_value) return entry.timestamp_value;
  }
  return null;
}

function stringifyLabelValues(labelValues) {
  const parts = [];
  for (const entry of labelValues || []) {
    if (!entry || typeof entry !== 'object') continue;
    ['label', 'value', 'href', 'title'].forEach(key => {
      if (entry[key] != null && entry[key] !== '') parts.push(String(entry[key]));
    });
    if (Array.isArray(entry.dict)) parts.push(stringifyLabelValues(entry.dict));
  }
  return parts.join(' ');
}

function pickFirst(obj, keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return '';
}

function tryNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function normalizePrice(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && value > 1e9) {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function decodeFbText(text) {
  try {
    return decodeURIComponent(escape(String(text || '')));
  } catch {
    return String(text || '');
  }
}

function cleanTitleForSearch(title) {
  return decodeFbText(String(title || ''))
    .toLowerCase()
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/\b(pickup|local|obo|firm|fcfs|holds|hold|pending|porch|delivery|cash only)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferStatus(rec, title, url) {
  const haystack = decodeFbText(JSON.stringify(rec || {})).toLowerCase();
  const titleText = String(title || '').toLowerCase();
  const urlText = String(url || '');

  if (/\bsold\b/.test(haystack) || /\bsold\b/.test(titleText)) {
    return { status: 'sold', confidence: /sold/.test(titleText) ? 'title' : 'text', reason: 'Found sold wording in the exported record.' };
  }
  if (/unavailable|no longer available|removed|not available|expired|deleted/.test(haystack)) {
    return { status: 'unavailable', confidence: 'text', reason: 'Found unavailable or removed wording in the exported record.' };
  }
  if (hasDirectMarketplaceUrl(urlText)) {
    return { status: 'active', confidence: 'url', reason: 'Found a direct Marketplace item URL in the export.' };
  }
  if (title) {
    return { status: 'unknown', confidence: 'title_only', reason: 'The export has a title but no direct Marketplace item URL.' };
  }
  return { status: 'unknown', confidence: 'heuristic', reason: 'The export does not include enough information to classify this item confidently.' };
}

function extractMarketplaceUrl(text) {
  const match = decodeFbText(String(text || '')).match(/https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/marketplace\/item\/\d+\/?(?:[^\s"'<>]*)?/i);
  return match ? match[0] : '';
}

function hasDirectMarketplaceUrl(url) {
  return /https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/marketplace\/item\/\d+/i.test(String(url || ''));
}

function hasOpenableFacebookUrl(url) {
  return /^https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\//i.test(String(url || ''));
}

function extractPrice(text) {
  const match = decodeFbText(String(text || '')).match(/\$\s?\d[\d,]*(?:\.\d{2})?/);
  return match ? match[0] : '';
}

function inferAreaFromText(text) {
  const source = decodeFbText(String(text || ''));
  const patterns = [
    /\b(?:listed in|location|seller location|pickup in|near)\s*:?\s*([A-Z][A-Za-z .'-]+,\s*(?:OR|WA))\b/i,
    /\b(Aloha,?\s*OR)\b/i,
    /\b(Beaverton,?\s*OR)\b/i,
    /\b(Bethany,?\s*OR)\b/i,
    /\b(Cedar Hills,?\s*OR)\b/i,
    /\b(Clackamas,?\s*OR)\b/i,
    /\b(Cornelius,?\s*OR)\b/i,
    /\b(Forest Grove,?\s*OR)\b/i,
    /\b(Gladstone,?\s*OR)\b/i,
    /\b(Tigard,?\s*OR)\b/i,
    /\b(Portland,?\s*OR)\b/i,
    /\b(Hillsboro,?\s*OR)\b/i,
    /\b(Vancouver,?\s*WA)\b/i,
    /\b(Gresham,?\s*OR)\b/i,
    /\b(Happy Valley,?\s*OR)\b/i,
    /\b(Lake Oswego,?\s*OR)\b/i,
    /\b(Milwaukie,?\s*OR)\b/i,
    /\b(Newberg,?\s*OR)\b/i,
    /\b(Eugene,?\s*OR)\b/i,
    /\b(Albany,?\s*OR)\b/i,
    /\b(Canby,?\s*OR)\b/i,
    /\b(Philomath,?\s*OR)\b/i,
    /\b(Salem,?\s*OR)\b/i,
    /\b(Oregon City,?\s*OR)\b/i,
    /\b(Sherwood,?\s*OR)\b/i,
    /\b(Tualatin,?\s*OR)\b/i,
    /\b(West Linn,?\s*OR)\b/i,
    /\b(Wilsonville,?\s*OR)\b/i,
    /\b(Woodburn,?\s*OR)\b/i,
    /\b(Camas,?\s*WA)\b/i,
    /\b(Longview,?\s*WA)\b/i
  ];
  for (const re of patterns) {
    const m = source.match(re);
    if (m) return normalizeAreaText(m[1]);
  }
  return '';
}

function normalizeAreaText(areaText) {
  const area = String(areaText || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*/g, ', ')
    .trim();
  const aliases = [
    { re: /^aloha(?:,\s*or)?$/i, value: 'Aloha, OR' },
    { re: /^beaverton(?:,\s*or)?$/i, value: 'Beaverton, OR' },
    { re: /^bethany(?:,\s*or)?$/i, value: 'Bethany, OR' },
    { re: /^cedar hills(?:,\s*or)?$/i, value: 'Cedar Hills, OR' },
    { re: /^clackamas(?:,\s*or)?$/i, value: 'Clackamas, OR' },
    { re: /^cornelius(?:,\s*or)?$/i, value: 'Cornelius, OR' },
    { re: /^forest grove(?:,\s*or)?$/i, value: 'Forest Grove, OR' },
    { re: /^gladstone(?:,\s*or)?$/i, value: 'Gladstone, OR' },
    { re: /^gresham(?:,\s*or)?$/i, value: 'Gresham, OR' },
    { re: /^happy valley(?:,\s*or)?$/i, value: 'Happy Valley, OR' },
    { re: /^hillsboro(?:,\s*or)?$/i, value: 'Hillsboro, OR' },
    { re: /^lake oswego(?:,\s*or)?$/i, value: 'Lake Oswego, OR' },
    { re: /^milwaukie(?:,\s*or)?$/i, value: 'Milwaukie, OR' },
    { re: /^newberg(?:,\s*or)?$/i, value: 'Newberg, OR' },
    { re: /^portland(?:,\s*or)?$/i, value: 'Portland, OR' },
    { re: /^salem(?:,\s*or)?$/i, value: 'Salem, OR' },
    { re: /^sherwood(?:,\s*or)?$/i, value: 'Sherwood, OR' },
    { re: /^tigard(?:,\s*or)?$/i, value: 'Tigard, OR' },
    { re: /^tualatin(?:,\s*or)?$/i, value: 'Tualatin, OR' },
    { re: /^west linn(?:,\s*or)?$/i, value: 'West Linn, OR' },
    { re: /^wilsonville(?:,\s*or)?$/i, value: 'Wilsonville, OR' },
    { re: /^woodburn(?:,\s*or)?$/i, value: 'Woodburn, OR' },
    { re: /^eugene(?:,\s*or)?$/i, value: 'Eugene, OR' },
    { re: /^albany(?:,\s*or)?$/i, value: 'Albany, OR' },
    { re: /^canby(?:,\s*or)?$/i, value: 'Canby, OR' },
    { re: /^oregon city(?:,\s*or)?$/i, value: 'Oregon City, OR' },
    { re: /^philomath(?:,\s*or)?$/i, value: 'Philomath, OR' },
    { re: /^camas(?:,\s*wa)?$/i, value: 'Camas, WA' },
    { re: /^longview(?:,\s*wa)?$/i, value: 'Longview, WA' },
    { re: /^vancouver(?:,\s*wa)?$/i, value: 'Vancouver, WA' }
  ];
  const match = aliases.find(alias => alias.re.test(area));
  return match ? match.value : area;
}

function guessLatLon(areaText) {
  const area = normalizeAreaText(areaText).toLowerCase();
  const known = [
    { re: /aloha/, latitude: 45.4943, longitude: -122.8671 },
    { re: /beaverton/, latitude: 45.4871, longitude: -122.8037 },
    { re: /bethany/, latitude: 45.5579, longitude: -122.8676 },
    { re: /cedar hills/, latitude: 45.5048, longitude: -122.7984 },
    { re: /clackamas/, latitude: 45.4076, longitude: -122.5704 },
    { re: /cornelius/, latitude: 45.5198, longitude: -123.0598 },
    { re: /forest grove/, latitude: 45.5198, longitude: -123.1107 },
    { re: /gladstone/, latitude: 45.3807, longitude: -122.5948 },
    { re: /portland/, latitude: 45.5152, longitude: -122.6784 },
    { re: /vancouver/, latitude: 45.6387, longitude: -122.6615 },
    { re: /tigard/, latitude: 45.4312, longitude: -122.7715 },
    { re: /hillsboro/, latitude: 45.5229, longitude: -122.9898 },
    { re: /happy valley/, latitude: 45.4468, longitude: -122.5304 },
    { re: /lake oswego/, latitude: 45.4207, longitude: -122.6706 },
    { re: /milwaukie/, latitude: 45.4462, longitude: -122.6393 },
    { re: /newberg/, latitude: 45.3001, longitude: -122.9732 },
    { re: /eugene/, latitude: 44.0521, longitude: -123.0868 },
    { re: /albany/, latitude: 44.6365, longitude: -123.1059 },
    { re: /canby/, latitude: 45.2629, longitude: -122.6926 },
    { re: /philomath/, latitude: 44.5401, longitude: -123.3676 },
    { re: /gresham/, latitude: 45.5001, longitude: -122.4302 },
    { re: /oregon city/, latitude: 45.3573, longitude: -122.6068 },
    { re: /salem/, latitude: 44.9429, longitude: -123.0351 },
    { re: /sherwood/, latitude: 45.3565, longitude: -122.8401 },
    { re: /tualatin/, latitude: 45.3840, longitude: -122.7630 },
    { re: /west linn/, latitude: 45.3657, longitude: -122.6123 },
    { re: /wilsonville/, latitude: 45.2998, longitude: -122.7737 },
    { re: /woodburn/, latitude: 45.1437, longitude: -122.8554 },
    { re: /camas/, latitude: 45.5871, longitude: -122.3995 },
    { re: /longview/, latitude: 46.1382, longitude: -122.9382 },
    { re: /seattle/, latitude: 47.6062, longitude: -122.3321 }
  ];
  const match = known.find(k => k.re.test(area));
  return match || { latitude: null, longitude: null };
}

function buildId(title, url, areaText, savedRaw, sourceType) {
  return [title || '', url || '', areaText || '', savedRaw || '', sourceType || ''].join('||').toLowerCase();
}

function dedupeAndMerge(newItems, existingItems) {
  const merged = [];
  const keyToIndex = new Map();

  for (const item of [...existingItems, ...newItems]) {
    const keys = getDedupeKeys(item);
    const existingIndex = keys.map(key => keyToIndex.get(key)).find(index => Number.isInteger(index));

    if (Number.isInteger(existingIndex)) {
      merged[existingIndex] = mergeDuplicateItems(merged[existingIndex], item);
      getDedupeKeys(merged[existingIndex]).forEach(key => keyToIndex.set(key, existingIndex));
      continue;
    }

    const index = merged.push(item) - 1;
    keys.forEach(key => keyToIndex.set(key, index));
  }

  return merged;
}

function getDedupeKeys(item) {
  const keys = [];
  if (item.id) keys.push(`id:${item.id}`);

  const url = String(item.url || '').trim().toLowerCase();
  if (url) keys.push(`url:${url}`);

  const title = cleanTitleForSearch(item.title || '').toLowerCase();
  if (title.length >= 3) {
    const price = item.price == null ? '' : String(item.price);
    const area = normalizeWhitespace(item.areaText || '').toLowerCase();
    if (price) keys.push(`title-price:${title}|${price}`);
    if (area) keys.push(`title-area:${title}|${area}`);
    if (!url && (isCollectionSource(item) || item.sourceType === 'listing_history' || item.sourceType === 'saved_html')) {
      keys.push(`title-only:${title}|${price}`);
    }
  }

  return keys;
}

function mergeDuplicateItems(existing, incoming) {
  const preferred = scoreItemDetail(incoming) > scoreItemDetail(existing) ? incoming : existing;
  return {
    ...preferred,
    notes: existing.notes || incoming.notes || '',
    shortlist: Boolean(existing.shortlist || incoming.shortlist),
    passed: Boolean(existing.passed || incoming.passed)
  };
}

function scoreItemDetail(item) {
  let score = 0;
  if (hasDirectMarketplaceUrl(item.url)) score += 100;
  else if (hasOpenableFacebookUrl(item.url)) score += 35;
  if (item.price != null) score += 20;
  if (item.areaText) score += 20;
  if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) score += 10;
  if (item.status === 'active') score += 8;
  if (item.sourceType === 'collection') score += 7;
  if (item.sourceType === 'collection_html') score += 5;
  if (item.sourceType === 'listing_history') score += 3;
  if (item.savedAt) score += 1;
  return score;
}

function scoreCompactStrength(item) {
  let score = 0;
  if (hasMeaningfulTitle(item)) score += 50;
  if (hasDirectMarketplaceUrl(item.url)) score += 45;
  if (isCollectionSource(item)) score += 25;
  if (item.sourceType === 'listing_history') score += 10;
  if (item.price != null) score += 15;
  if (item.areaText) score += 10;
  if (item.status === 'active') score += 8;
  if (item.status === 'unavailable' || item.status === 'sold') score += 4;
  if (item.status === 'unknown' && !hasDirectMarketplaceUrl(item.url)) score -= 30;
  if (looksLikeJunkTitle(item)) score -= 50;
  return score;
}

function isCollectionSource(item) {
  return item?.sourceType === 'collection' || item?.sourceType === 'collection_html';
}

function compactItemsForIphone(items) {
  const deduped = dedupeAndMerge(items, []);
  const strong = deduped.filter(item => hasMeaningfulTitle(item) && !looksLikeJunkTitle(item) && (hasDirectMarketplaceUrl(item.url) || isCollectionSource(item)));
  const strongIds = new Set(strong.map(item => item.id));
  const fallback = deduped.filter(item => !strongIds.has(item.id) && hasMeaningfulTitle(item) && !looksLikeJunkTitle(item) && item.sourceType === 'listing_history');
  fallback.sort((a, b) => scoreCompactStrength(b) - scoreCompactStrength(a) || compareDate(b.savedAt, a.savedAt));
  const kept = [...strong, ...fallback.slice(0, 250)];
  return dedupeAndMerge(kept, []);
}

function loadDemoData() {
  state.items = dedupeAndMerge(DEMO_ITEMS, state.items);
  recomputeDistances();
  saveItems();
  setImportStatus(`Loaded ${DEMO_ITEMS.length} demo items.`);
  applyFiltersAndRender();
}

function clearImportedData() {
  if (!confirm('Clear all locally stored imported items on this device?')) return;
  state.items = [];
  saveItems();
  setImportStatus('Cleared imported data on this device.');
  applyFiltersAndRender();
}

function clearNotesAndFlags() {
  if (!state.items.length) {
    setImportStatus('No saved notes or flags to clear.');
    return;
  }
  if (!confirm('Clear all notes, shortlist flags, and pass flags for the currently stored items?')) return;
  state.items = state.items.map(item => ({ ...item, notes: '', shortlist: false, passed: false }));
  saveItems();
  setImportStatus('Cleared notes and flags for locally stored items.');
  applyFiltersAndRender();
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not available in this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    position => {
      setDistancePoint(position.coords.latitude, position.coords.longitude, 'Current location');
    },
    error => {
      alert(`Location failed: ${error.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function startDropPinMode() {
  state.pickingLocation = true;
  switchTab('map');
  if (state.map) {
    setTimeout(() => state.map.invalidateSize(), 50);
  }
  els.dropPinBtn.classList.add('active-action');
  setImportStatus('Tap the map where you are now, where you will be later, or where you want to shop. Distances and nearby sorting will use that planning point.');
}

function onPlanningAreaSelected() {
  const point = getPlanningAreaPoint(els.planningAreaSelect.value);
  if (!point) return;
  setDistancePoint(point.latitude, point.longitude, point.label);
  if (state.map) {
    switchTab('map');
    state.map.setView([point.latitude, point.longitude], 12);
  }
  setImportStatus(`${point.label} set as planning point. Distances now sort from there.`);
}

function getPlanningAreaPoint(value) {
  const points = {
    se_portland: { label: 'SE Portland', latitude: 45.5051, longitude: -122.5797 },
    east_vancouver: { label: 'East Vancouver', latitude: 45.6257, longitude: -122.5540 },
    beaverton: { label: 'Beaverton', latitude: 45.4871, longitude: -122.8037 },
    tigard: { label: 'Tigard', latitude: 45.4312, longitude: -122.7715 },
    hillsboro: { label: 'Hillsboro', latitude: 45.5229, longitude: -122.9898 },
    gresham: { label: 'Gresham', latitude: 45.5001, longitude: -122.4302 },
    milwaukie: { label: 'Milwaukie', latitude: 45.4462, longitude: -122.6393 },
    lake_oswego: { label: 'Lake Oswego', latitude: 45.4207, longitude: -122.6706 },
    oregon_city: { label: 'Oregon City', latitude: 45.3573, longitude: -122.6068 },
    salem: { label: 'Salem', latitude: 44.9429, longitude: -123.0351 }
  };
  return points[value] || null;
}

function setDistancePoint(latitude, longitude, label = 'Planning point') {
  state.location = {
    latitude,
    longitude,
    label
  };
  state.pickingLocation = false;
  els.dropPinBtn.classList.remove('active-action');
  els.planningAreaSelect.value = '';
  saveLocation();
  updateLocationStatus();
  recomputeDistances();
  applyFiltersAndRender();
}

function clearLocation() {
  state.location = null;
  state.pickingLocation = false;
  els.dropPinBtn.classList.remove('active-action');
  els.planningAreaSelect.value = '';
  saveLocation();
  updateLocationStatus();
  recomputeDistances();
  applyFiltersAndRender();
}

function applyBuyerMode() {
  els.statusFilter.value = 'all';
  els.sortMode.value = state.location ? 'distance' : 'saved_asc';
  els.minPrice.value = '';
  els.maxPrice.value = '';
  els.savedAfter.value = '';
  els.savedBefore.value = '';
  els.maxDistance.value = '';
  els.shortlistOnly.checked = false;
  els.hidePassed.checked = true;
  els.hideSoldUnavailable.checked = true;
  els.facebookLinkOnly.checked = false;
  els.urlOnly.checked = false;
  els.pricedOnly.checked = true;
  els.titledOnly.checked = true;
  els.hideJunkTitles.checked = true;
  els.hideUnknown.checked = false;
  els.hideAutos.checked = true;
  els.hideHousing.checked = true;
  savePrefs();
  applyFiltersAndRender();
  setImportStatus(state.location
    ? 'Buying nearby mode is on: priced, non-vehicle, non-housing records sorted by your planning point. Add a max distance only when you want to narrow the list.'
    : 'Buying mode is on. Drop a map pin where you plan to be, or use here now as a shortcut.');
}

function clearFilters() {
  els.searchInput.value = '';
  els.statusFilter.value = 'all';
  els.sortMode.value = state.location ? 'distance' : 'saved_desc';
  els.minPrice.value = '';
  els.maxPrice.value = '';
  els.savedAfter.value = '';
  els.savedBefore.value = '';
  els.maxDistance.value = '';
  els.shortlistOnly.checked = false;
  els.hidePassed.checked = false;
  els.hideSoldUnavailable.checked = false;
  els.facebookLinkOnly.checked = false;
  els.urlOnly.checked = false;
  els.pricedOnly.checked = false;
  els.titledOnly.checked = true;
  els.hideJunkTitles.checked = true;
  els.hideUnknown.checked = false;
  els.hideAutos.checked = false;
  els.hideHousing.checked = false;
  savePrefs();
  applyFiltersAndRender();
}

function updateLocationStatus() {
  if (!state.location) {
    els.locationStatus.textContent = 'Planning point not set. Drop a map pin where you are now or where you will be later.';
    return;
  }
  els.locationStatus.textContent = `${state.location.label || 'Planning point'} set: ${state.location.latitude.toFixed(5)}, ${state.location.longitude.toFixed(5)}`;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function recomputeDistances() {
  state.items = state.items.map(item => {
    let distanceMiles = null;
    if (state.location && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
      distanceMiles = Number(haversineMiles(state.location.latitude, state.location.longitude, item.latitude, item.longitude).toFixed(2));
    }
    return { ...item, distanceMiles };
  });
}

function onFilterChanged() {
  savePrefs();
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  updateFilterVisualState();
  const query = els.searchInput.value.trim().toLowerCase();
  const minPrice = els.minPrice.value ? Number(els.minPrice.value) : null;
  const maxPrice = els.maxPrice.value ? Number(els.maxPrice.value) : null;
  const maxDistance = els.maxDistance.value ? Number(els.maxDistance.value) : null;
  const savedAfter = els.savedAfter.value ? new Date(els.savedAfter.value + 'T00:00:00').getTime() : null;
  const savedBefore = els.savedBefore.value ? new Date(els.savedBefore.value + 'T23:59:59').getTime() : null;

  let items = state.items.filter(item => {
    if (els.statusFilter.value !== 'all' && item.status !== els.statusFilter.value) return false;
    if (els.shortlistOnly.checked && !item.shortlist) return false;
    if (els.hidePassed.checked && item.passed) return false;
    if (els.hideSoldUnavailable.checked && (item.status === 'sold' || item.status === 'unavailable')) return false;
    if (els.facebookLinkOnly.checked && !hasOpenableFacebookUrl(item.url)) return false;
    if (els.urlOnly.checked && !hasDirectMarketplaceUrl(item.url)) return false;
    if (els.pricedOnly.checked && item.price == null) return false;
    if (els.titledOnly.checked && !hasMeaningfulTitle(item)) return false;
    if (els.hideJunkTitles.checked && looksLikeJunkTitle(item)) return false;
    if (els.hideUnknown.checked && item.status === 'unknown') return false;
    if (els.hideAutos.checked && looksLikeAutomotive(item)) return false;
    if (els.hideHousing.checked && looksLikeHousing(item)) return false;
    if (minPrice != null && (item.price == null || item.price < minPrice)) return false;
    if (maxPrice != null && (item.price == null || item.price > maxPrice)) return false;
    if (maxDistance != null && (item.distanceMiles == null || item.distanceMiles > maxDistance)) return false;
    if (savedAfter != null && (!item.savedAt || new Date(item.savedAt).getTime() < savedAfter)) return false;
    if (savedBefore != null && (!item.savedAt || new Date(item.savedAt).getTime() > savedBefore)) return false;
    if (query) {
      const haystack = `${item.title} ${item.cleanedTitle} ${item.areaText} ${item.notes} ${item.url} ${item.sourceType} ${item.statusReason || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  items = sortItems(items, els.sortMode.value);
  state.filteredItems = items;
  renderSummary(items);
  renderList(items);
  renderMap(items);
}

function hasMeaningfulTitle(item) {
  const title = String(item.title || '').trim().toLowerCase();
  if (!title || title === '(untitled saved item)' || title === '(untitled listing)') return false;
  return cleanTitleForSearch(title).length >= 2;
}

function looksLikeJunkTitle(item) {
  const rawTitle = String(item.title || '').trim();
  const title = decodeFbText(rawTitle).trim();
  const cleaned = cleanTitleForSearch(title);
  if (!title) return true;
  if (title === '(untitled saved item)' || title === '(untitled listing)') return true;
  if (cleaned.length < 3) return true;
  if (cleaned.split(/\s+/).filter(Boolean).length === 1 && cleaned.length < 4) return true;
  if (/^#+[\w-]+(?:\s+#+[\w-]+)*$/i.test(title)) return true;
  if (/^(?:https?:\/\/|www\.|facebook\.com|marketplace item|saved link)$/i.test(title)) return true;
  if (/^[\W_]+$/.test(title)) return true;
  if (/^(?:null|undefined|false|true|n\/a|none|unknown)$/i.test(title)) return true;
  if (/^\d+$/.test(cleaned) && cleaned.length < 5) return true;
  if ((title.match(/[{}[\]<>]/g) || []).length >= 4) return true;
  if (/^[a-f0-9]{12,}$/i.test(cleaned.replace(/\s+/g, ''))) return true;
  return false;
}

function looksLikeAutomotive(item) {
  const text = getCategoryText(item);
  if (!text.trim()) return false;
  if (/\b(?:car seat|toy car|hot wheels|matchbox|truck bed|bed frame|vanity|camper shell only|truck bed frame)\b/.test(text)) return false;
  if (/(?:^|[^a-z])(?:\d+)?classic(?:cars|trucks)(?:$|[^a-z])/.test(text)) return true;
  if (/\b(?:auto restoration|body tech|auto body|collision repair|auto repair|auto tech|auto shop|mechanic shop|mechanic special|car dealer|used car dealer|auto sales|car lot|automotive repair|classic cars|classiccars|classic trucks|classictrucks|car club|truck club|vehicle virgins)\b/.test(text)) return true;

  let score = 0;
  if (/\b(?:clean title|salvage title|rebuilt title|automatic transmission|manual transmission|vin|odometer|registration|smog|pink slip|title in hand)\b/.test(text)) score += 4;
  if (/\b(?:sedan|coupe|hatchback|convertible|suv|minivan|motorcycle|moped|scooter|atv|utv|rv|rvt|camper|motorhome|motor home|boat|boats|travel trailer|utility trailer|boat trailer|fifth wheel|5th wheel|toy hauler|living quarters)\b/.test(text)) score += 3;
  if (/\b(?:truck|trucks|pickup|pickups|van|vans|wagon|wagons)\b/.test(text)) score += 2;
  if (/\b(?:vehicle|automobile|car|cars|auto|autos)\b/.test(text)) score += 2;
  if (/\b\d{4}\s+(?:ford|chevy|chevrolet|gmc|toyota|honda|nissan|mazda|lexus|bmw|mercedes|mercedes-benz|audi|jeep|dodge|ram|subaru|kia|hyundai|cadillac|lincoln|volkswagen|vw|porsche|tesla|acura|infiniti|buick|chrysler|mitsubishi|volvo|mini|pontiac|saturn|scion|fiat|genesis|land rover|range rover|amc|daihatsu|alfa romeo|mercury|fleetwood|winnebago|airstream|tiffin|georgie boy|jayco|skyline|forest river|carriage|chinook|bayliner|arima|daelim|sym|keystone|grand design|brinkley|polaris)\b/.test(text)) score += 6;
  if (/\b(?:f150|f-150|f250|f-250|f350|f-350|silverado|sierra|camry|civic|accord|corvette|mustang|wrangler|tacoma|tundra|4runner|prius|town car|altima|sentra|maxima|corolla|rav4|crv|cr-v|pilot|escape|explorer|expedition|forester|outback|impreza|legacy|model 3|model y|avalon|gs350|gs 350|rx350|rx 350|es350|es 350|is250|is 250|cx-5|cx5|miata|grand marquis|rocky|matador|hmmwv|sea ranger|cruise master|cordi|hd 200|slingshot|hornet hideout|momentum 28g)\b/.test(text)) score += 4;
  if (/\b(?:toyota|honda|lexus|ford|chevy|chevrolet|gmc|nissan|subaru|mazda|bmw|mercedes|audi|jeep|dodge|hyundai|kia|tesla|fleetwood|winnebago|airstream|jayco|tiffin|chinook|bayliner|pontiac|mercury|daihatsu|keystone|grand design|brinkley|polaris)\s+[a-z0-9-]{2,}\b/.test(text)) score += 3;
  if (/\b(?:class a|class b|class c|diesel pusher|slide out|slide-out|tow package|tow hitch|boat motor|outboard motor|marine engine)\b/.test(text)) score += 3;
  if (/\b(?:mileage|miles|runs and drives|mechanic special|engine|transmission|awd|4wd|rwd|fwd|v6|v8|hybrid|diesel|turbo)\b/.test(text)) score += 2;
  if (/\b(?:xls sedan|sedan 4d|coupe 2d|sport utility|crew cab|extended cab)\b/.test(text)) score += 4;
  return score >= 3;
}

function looksLikeHousing(item) {
  const text = getCategoryText(item);
  if (!text.trim()) return false;
  if (/\b(?:dollhouse|birdhouse|playhouse|greenhouse|home decor|home theater|home gym|home office|apartment size|studio monitor|studio light|house plant|plant stand)\b/.test(text)) return false;

  let score = 0;
  if (/\b\d+\s*(?:br|bd|bed|beds|bedroom|bedrooms)\b/.test(text)) score += 3;
  if (/\b\d+(?:\.\d+)?\s*(?:ba|bath|baths|bathroom|bathrooms)\b/.test(text)) score += 3;
  if (/\b(?:apartment|apartments|condo|condominium|townhouse|duplex|triplex|studio apartment|room for rent|rooms for rent|private room|shared room)\b/.test(text)) score += 4;
  if (/\b(?:for rent|rentals?|lease|sublet|sublease|tenant|landlord|deposit|move in|move-in|available now)\b/.test(text)) score += 3;
  if (/\b(?:real estate|realtor|open house|mls|zillow|redfin|mortgage|property management)\b/.test(text)) score += 4;
  if (/\b(?:mobile home|manufactured home|land for sale|parcel|lot for sale|acreage|sq ?ft|square feet|acres?|adu|dwelling unit)\b/.test(text)) score += 4;
  if (/\b(?:house for rent|home for rent|apartment for rent|rental home|rental house|housing|section 8)\b/.test(text)) score += 5;
  if (/\$\s?\d[\d,]*\s*(?:\/|per)?\s*(?:mo|month)\b/.test(text)) score += 2;
  return score >= 3;
}

function getCategoryText(item) {
  return [
    item.title,
    item.cleanedTitle,
    item.areaText,
    item.statusReason,
    item.url,
    item.sourceType
  ].join(' ').toLowerCase();
}

function updateFilterVisualState() {
  document.querySelectorAll('.toggles label').forEach(label => {
    const input = label.querySelector('input[type="checkbox"]');
    label.classList.toggle('filter-active', Boolean(input?.checked));
  });
}

function sortItems(items, mode) {
  const cloned = [...items];
  cloned.sort((a, b) => {
    switch (mode) {
      case 'distance': {
        const ad = a.distanceMiles ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceMiles ?? Number.POSITIVE_INFINITY;
        return ad - bd || compareText(a.title, b.title);
      }
      case 'saved_desc':
        return compareDate(b.savedAt, a.savedAt) || compareText(a.title, b.title);
      case 'saved_asc':
        return compareDate(a.savedAt, b.savedAt) || compareText(a.title, b.title);
      case 'price_asc': {
        const ap = a.price ?? Number.POSITIVE_INFINITY;
        const bp = b.price ?? Number.POSITIVE_INFINITY;
        return ap - bp || compareText(a.title, b.title);
      }
      case 'price_desc': {
        const ap = a.price ?? Number.NEGATIVE_INFINITY;
        const bp = b.price ?? Number.NEGATIVE_INFINITY;
        return bp - ap || compareText(a.title, b.title);
      }
      case 'area':
        return compareText(a.areaText, b.areaText) || compareText(a.title, b.title);
      case 'title':
      default:
        return compareText(a.title, b.title);
    }
  });
  return cloned;
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

function compareDate(a, b) {
  return (new Date(a || 0).getTime()) - (new Date(b || 0).getTime());
}

function getActiveFilterLabels() {
  const labels = [];
  if (els.searchInput.value.trim()) labels.push('search');
  if (els.statusFilter.value !== 'all') labels.push(els.statusFilter.options[els.statusFilter.selectedIndex]?.text || 'status');
  if (els.minPrice.value) labels.push(`min $${els.minPrice.value}`);
  if (els.maxPrice.value) labels.push(`max $${els.maxPrice.value}`);
  if (els.savedAfter.value) labels.push(`after ${els.savedAfter.value}`);
  if (els.savedBefore.value) labels.push(`before ${els.savedBefore.value}`);
  if (els.maxDistance.value) labels.push(`within ${els.maxDistance.value} mi`);
  if (els.shortlistOnly.checked) labels.push('shortlist');
  if (els.hidePassed.checked) labels.push('hide passed');
  if (els.hideSoldUnavailable.checked) labels.push('hide sold/unavailable');
  if (els.facebookLinkOnly.checked) labels.push('Facebook link');
  if (els.urlOnly.checked) labels.push('direct URL');
  if (els.pricedOnly.checked) labels.push('priced');
  if (els.titledOnly.checked) labels.push('titled');
  if (els.hideJunkTitles.checked) labels.push('hide junk');
  if (els.hideUnknown.checked) labels.push('hide unknown');
  if (els.hideAutos.checked) labels.push('hide autos');
  if (els.hideHousing.checked) labels.push('hide housing');
  return labels;
}

function renderSummary(items) {
  const counts = state.items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const shownWithDistance = items.filter(i => i.distanceMiles != null).length;
  const shownFromCollections = items.filter(i => isCollectionSource(i)).length;
  const shownFromHistory = items.filter(i => i.sourceType === 'listing_history').length;
  const shownTitled = items.filter(hasMeaningfulTitle).length;
  const shownWithArea = items.filter(i => i.areaText).length;
  const shownWithUrl = items.filter(i => hasDirectMarketplaceUrl(i.url)).length;
  const shownWithFacebookUrl = items.filter(i => hasOpenableFacebookUrl(i.url)).length;
  const shownWithPrice = items.filter(i => i.price != null).length;
  const totalWithArea = state.items.filter(i => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)).length;
  const totalWithUrl = state.items.filter(i => hasDirectMarketplaceUrl(i.url)).length;
  const totalWithFacebookUrl = state.items.filter(i => hasOpenableFacebookUrl(i.url)).length;
  const totalWithPrice = state.items.filter(i => i.price != null).length;
  const junkTitleCount = state.items.filter(i => looksLikeJunkTitle(i)).length;
  const shownUnknownNoUrl = items.filter(i => i.status === 'unknown' && !hasDirectMarketplaceUrl(i.url)).length;
  const passedHidden = els.hidePassed.checked ? state.items.filter(i => i.passed).length : 0;
  const soldUnavailableHidden = els.hideSoldUnavailable.checked ? state.items.filter(i => i.status === 'sold' || i.status === 'unavailable').length : 0;
  const unpricedHidden = els.pricedOnly.checked ? state.items.filter(i => i.price == null).length : 0;
  const noFacebookLinkHidden = els.facebookLinkOnly.checked ? state.items.filter(i => !hasOpenableFacebookUrl(i.url)).length : 0;
  const autoHidden = els.hideAutos.checked ? state.items.filter(i => looksLikeAutomotive(i)).length : 0;
  const housingHidden = els.hideHousing.checked ? state.items.filter(i => looksLikeHousing(i)).length : 0;
  const activeFilters = getActiveFilterLabels();
  const text = [
    `${items.length} shown of ${state.items.length} total`,
    `Active ${counts.active || 0}`,
    `Unavailable ${counts.unavailable || 0}`,
    `Sold ${counts.sold || 0}`,
    `Unknown ${counts.unknown || 0}`,
    `Shown distance ready ${shownWithDistance}`,
    `Shown collections ${shownFromCollections}`,
    `Shown history ${shownFromHistory}`,
    `Shown titled ${shownTitled}`,
    `Shown with area ${shownWithArea}`,
    `Shown priced ${shownWithPrice}`,
    `Shown Facebook links ${shownWithFacebookUrl}`,
    `Shown direct URLs ${shownWithUrl}`,
    `Map-ready total ${totalWithArea}`,
    `Total priced ${totalWithPrice}`,
    `Total Facebook links ${totalWithFacebookUrl}`,
    `Total direct URLs ${totalWithUrl}`,
    `Shown unknown without URL ${shownUnknownNoUrl}`,
    activeFilters.length ? `Active filters: ${activeFilters.join(', ')}` : 'Active filters: none',
    els.hidePassed.checked ? `Passed hidden ${passedHidden}` : null,
    els.hideSoldUnavailable.checked ? `Sold/unavailable hidden ${soldUnavailableHidden}` : null,
    els.facebookLinkOnly.checked ? `No Facebook link hidden ${noFacebookLinkHidden}` : null,
    els.pricedOnly.checked ? `Unpriced hidden ${unpricedHidden}` : null,
    els.hideJunkTitles.checked ? `Junk titles hidden ${junkTitleCount}` : null,
    els.hideAutos.checked ? `Autos hidden ${autoHidden}` : null,
    els.hideHousing.checked ? `Housing hidden ${housingHidden}` : null,
    els.compactImport.checked ? 'Compact import on' : 'Compact import off'
  ].filter(Boolean).join(' • ');
  els.summary.textContent = text;
}

function formatSourceLabel(sourceType) {
  const labels = {
    collection: 'Collection',
    collection_html: 'Collection HTML',
    listing_history: 'History',
    saved_log: 'Saved log',
    saved_html: 'Saved HTML',
    generic: 'Generic',
    demo: 'Demo'
  };
  return labels[sourceType] || sourceType || 'Unknown source';
}

function renderList(items) {
  els.itemsList.innerHTML = '';
  if (!items.length) {
    els.itemsList.innerHTML = `<div class="empty-state">No matching items.</div>`;
    return;
  }

  for (const item of items) {
    const node = els.itemCardTemplate.content.firstElementChild.cloneNode(true);
    const titleEl = node.querySelector('.item-title');
    const priceEl = node.querySelector('.price-badge');
    const areaEl = node.querySelector('.area');
    const distanceEl = node.querySelector('.distance');
    const savedDateEl = node.querySelector('.saved-date');
    const statusEl = node.querySelector('.status-badge');
    const confidenceEl = node.querySelector('.confidence');
    const sourceBadgesEl = node.querySelector('.source-badges');
    const reasonEl = node.querySelector('.reason');
    const notesInput = node.querySelector('.notes-input');
    const copyTitleBtn = node.querySelector('.copy-title-btn');
    const copyEbayTitleBtn = node.querySelector('.copy-ebay-title-btn');
    const marketplaceBtn = node.querySelector('.marketplace-link-btn');
    const facebookBtn = node.querySelector('.facebook-link-btn');
    const ebayBtn = node.querySelector('.ebay-link-btn');
    const shortlistToggle = node.querySelector('.shortlist-toggle');
    const passedToggle = node.querySelector('.passed-toggle');

    titleEl.textContent = item.title || '(untitled listing)';
    priceEl.textContent = item.price != null ? `$${formatMoney(item.price)}` : 'No price';
    areaEl.textContent = item.areaText || 'Area unknown';
    distanceEl.textContent = item.distanceMiles != null ? `${item.distanceMiles} mi` : 'Distance unknown';
    savedDateEl.textContent = item.savedAt ? `${formatSourceLabel(item.sourceType)} • ${formatDate(item.savedAt)}` : `${formatSourceLabel(item.sourceType)} • date unknown`;
    statusEl.textContent = item.status;
    statusEl.classList.add(item.status);
    confidenceEl.textContent = `Status source: ${item.statusConfidence}`;
    sourceBadgesEl.innerHTML = '';
    [
      hasDirectMarketplaceUrl(item.url) ? 'URL-backed' : 'Title only',
      hasOpenableFacebookUrl(item.url) && !hasDirectMarketplaceUrl(item.url) ? 'Facebook post' : null,
      looksLikeAutomotive(item) ? 'Auto hidden by filter' : null,
      looksLikeHousing(item) ? 'Housing hidden by filter' : null,
      formatSourceLabel(item.sourceType),
      item.price != null ? 'Priced' : 'No price'
    ].filter(Boolean).forEach(label => {
      const badge = document.createElement('span');
      badge.className = 'meta data-badge';
      badge.textContent = label;
      sourceBadgesEl.appendChild(badge);
    });
    reasonEl.textContent = item.statusReason || 'No additional reason recorded.';
    notesInput.value = item.notes || '';
    shortlistToggle.checked = Boolean(item.shortlist);
    passedToggle.checked = Boolean(item.passed);

    titleEl.classList.add('clickable-title');
    titleEl.title = getTitleActionLabel(item);
    titleEl.addEventListener('click', () => openBestItemLink(item));
    copyTitleBtn.addEventListener('click', () => copyText(item.title || ''));
    copyEbayTitleBtn.addEventListener('click', () => copyText(item.cleanedTitle || item.title || ''));
    marketplaceBtn.addEventListener('click', () => hasDirectMarketplaceUrl(item.url) ? openUrl(item.url) : openMarketplaceSearch(item));
    facebookBtn.addEventListener('click', () => openUrl(item.url));
    ebayBtn.addEventListener('click', () => openEbaySoldSearch(item));
    notesInput.addEventListener('change', () => updateItem(item.id, { notes: notesInput.value }));
    shortlistToggle.addEventListener('change', () => updateItem(item.id, { shortlist: shortlistToggle.checked }));
    passedToggle.addEventListener('change', () => updateItem(item.id, { passed: passedToggle.checked }));

    if (!hasDirectMarketplaceUrl(item.url)) {
      marketplaceBtn.textContent = 'Search Marketplace';
      marketplaceBtn.title = 'Facebook did not export a direct item URL, so this searches Marketplace by title.';
    }
    if (!hasOpenableFacebookUrl(item.url) || hasDirectMarketplaceUrl(item.url)) {
      facebookBtn.disabled = true;
      facebookBtn.textContent = hasDirectMarketplaceUrl(item.url) ? 'Marketplace URL above' : 'No FB post';
      facebookBtn.title = hasDirectMarketplaceUrl(item.url)
        ? 'Use Open Marketplace for direct Marketplace item URLs.'
        : 'This export record does not include an openable Facebook post URL.';
    }

    els.itemsList.appendChild(node);
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleDateString();
}

function updateItem(id, patch) {
  state.items = state.items.map(item => item.id === id ? { ...item, ...patch } : item);
  saveItems();
  applyFiltersAndRender();
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }
  } catch {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function openUrl(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}

function openBestItemLink(item) {
  if (hasOpenableFacebookUrl(item.url)) {
    openUrl(item.url);
    return;
  }
  openMarketplaceSearch(item);
}

function openMarketplaceSearch(item) {
  openUrl(buildMarketplaceSearchUrl(item));
}

function buildMarketplaceSearchUrl(item) {
  const query = encodeURIComponent(item.cleanedTitle || item.title || '');
  return query ? `https://www.facebook.com/marketplace/search/?query=${query}` : '';
}

function getTitleActionLabel(item) {
  if (hasDirectMarketplaceUrl(item.url)) return 'Open direct Marketplace listing';
  if (hasOpenableFacebookUrl(item.url)) return 'Open Facebook post';
  return 'Search this title on Facebook Marketplace';
}

function openEbaySoldSearch(item) {
  const query = encodeURIComponent(item.cleanedTitle || item.title || '');
  const url = `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;
  openUrl(url);
}

function exportFilteredCsv() {
  const rows = [
    ['title', 'cleaned_title', 'price', 'area', 'distance_miles', 'saved_at', 'status', 'status_confidence', 'status_reason', 'source_type', 'shortlist', 'passed', 'notes', 'url']
  ];

  state.filteredItems.forEach(item => {
    rows.push([
      item.title || '',
      item.cleanedTitle || '',
      item.price ?? '',
      item.areaText || '',
      item.distanceMiles ?? '',
      item.savedAt || '',
      item.status || '',
      item.statusConfidence || '',
      item.statusReason || '',
      item.sourceType || '',
      item.shortlist ? 'yes' : 'no',
      item.passed ? 'yes' : 'no',
      item.notes || '',
      item.url || ''
    ]);
  });
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'marketplace_saved_filtered.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function switchTab(tabName) {
  state.currentTab = tabName;
  const isList = tabName === 'list';
  els.listTabBtn.classList.toggle('active', isList);
  els.mapTabBtn.classList.toggle('active', !isList);
  els.listView.classList.toggle('active-view', isList);
  els.mapView.classList.toggle('active-view', !isList);
  els.listTabBtn.setAttribute('aria-selected', isList ? 'true' : 'false');
  els.mapTabBtn.setAttribute('aria-selected', !isList ? 'true' : 'false');
  els.mapView.setAttribute('aria-hidden', isList ? 'true' : 'false');
  if (!isList && state.map) {
    setTimeout(() => state.map.invalidateSize(), 50);
  }
}

function initMap() {
  state.map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);
  state.markersLayer = L.layerGroup().addTo(state.map);
  state.locationLayer = L.layerGroup().addTo(state.map);
  state.map.on('click', event => {
    if (!state.pickingLocation) return;
    setDistancePoint(event.latlng.lat, event.latlng.lng, 'Planning point');
    state.map.setView([event.latlng.lat, event.latlng.lng], Math.max(state.map.getZoom(), 12));
    setImportStatus('Planning point set. Distances now sort from that point.');
  });

  if (state.location) {
    state.map.setView([state.location.latitude, state.location.longitude], 10);
  } else {
    state.map.setView([45.5152, -122.6784], 9);
  }
}

function renderMap(items) {
  if (!state.map || !state.markersLayer) return;
  state.markersLayer.clearLayers();
  renderDistancePoint();

  const mappedItems = items.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  const unmappedCount = items.length - mappedItems.length;
  const totalMappedItems = state.items.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).length;
  if (els.mapSummary) {
    els.mapSummary.textContent = mappedItems.length
      ? `Map shows ${mappedItems.length} of ${items.length} filtered item${items.length === 1 ? '' : 's'}. ${unmappedCount} item${unmappedCount === 1 ? '' : 's'} do not include a recognized area in the Facebook export. Pins are approximate.`
      : totalMappedItems
        ? `No shown items include a recognized area, so there are no item pins. This import has ${totalMappedItems} map-ready record${totalMappedItems === 1 ? '' : 's'}, but the current filters hide them. Clear price, status, vehicle, housing, or distance filters to see those pins.`
      : state.location
        ? `No filtered items include a recognized area, so there are no item pins. Your planning point is still set and list distances use it when item areas are available. This usually means Facebook did not export locations for these records.`
        : `No filtered items include a recognized area, so there are no item pins. Drop a map pin or choose an area to set a planning point. This usually means Facebook did not export locations for these records.`;
  }
  if (!mappedItems.length) return;

  const bounds = [];
  mappedItems.forEach(item => {
    const marker = L.marker([item.latitude, item.longitude]);
    marker.bindPopup(buildPopupHtml(item));
    marker.on('popupopen', () => attachPopupHandlers(item));
    marker.addTo(state.markersLayer);
    bounds.push([item.latitude, item.longitude]);
  });

  if (bounds.length && state.currentTab === 'map') {
    if (state.location) bounds.push([state.location.latitude, state.location.longitude]);
    state.map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function renderDistancePoint() {
  if (!state.locationLayer) return;
  state.locationLayer.clearLayers();
  if (!state.location) return;
  const marker = L.circleMarker([state.location.latitude, state.location.longitude], {
    radius: 10,
    color: '#111827',
    weight: 3,
    fillColor: '#fbbf24',
    fillOpacity: 0.9
  });
  marker.bindPopup(`<strong>${escapeHtml(state.location.label || 'Planning point')}</strong><br>Distances sort from here.`);
  marker.addTo(state.locationLayer);
}

function buildPopupHtml(item) {
  const hasUrl = hasDirectMarketplaceUrl(item.url);
  const hasFacebookPost = hasOpenableFacebookUrl(item.url) && !hasUrl;
  return `
    <div>
      <div class="popup-title">${escapeHtml(item.title || '(untitled listing)')}</div>
      <div>${escapeHtml(item.areaText || 'Area unknown')}</div>
      <div>${item.price != null ? `$${formatMoney(item.price)}` : 'No price'}${item.distanceMiles != null ? ` • ${item.distanceMiles} mi` : ''}</div>
      <div>Status: ${escapeHtml(item.status)} • ${escapeHtml(formatSourceLabel(item.sourceType))} • ${hasUrl ? 'URL-backed' : hasFacebookPost ? 'Facebook post' : 'Title only'}</div>
      <div class="popup-actions">
        <button type="button" data-popup-copy="${encodeURIComponent(item.title || '')}">Copy title</button>
        ${hasUrl ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">Open Marketplace</a>` : ''}
        ${!hasUrl ? `<a href="${escapeAttribute(buildMarketplaceSearchUrl(item))}" target="_blank" rel="noopener">Search Marketplace</a>` : ''}
        ${hasFacebookPost ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">Open Facebook post</a>` : ''}
        <button type="button" data-popup-ebay="${encodeURIComponent(item.cleanedTitle || item.title || '')}">eBay sold search</button>
      </div>
    </div>
  `;
}

function attachPopupHandlers() {
  const popupEl = document.querySelector('.leaflet-popup-content');
  if (!popupEl) return;
  popupEl.querySelectorAll('[data-popup-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyText(decodeURIComponent(btn.getAttribute('data-popup-copy') || '')));
  });
  popupEl.querySelectorAll('[data-popup-ebay]').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = decodeURIComponent(btn.getAttribute('data-popup-ebay') || '');
      openUrl(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`);
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(str) {
  return escapeHtml(str);
}
