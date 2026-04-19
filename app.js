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
  clearLocationBtn: document.getElementById('clearLocationBtn'),
  locationStatus: document.getElementById('locationStatus'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  sortMode: document.getElementById('sortMode'),
  minPrice: document.getElementById('minPrice'),
  maxPrice: document.getElementById('maxPrice'),
  savedAfter: document.getElementById('savedAfter'),
  savedBefore: document.getElementById('savedBefore'),
  shortlistOnly: document.getElementById('shortlistOnly'),
  hidePassed: document.getElementById('hidePassed'),
  urlOnly: document.getElementById('urlOnly'),
  titledOnly: document.getElementById('titledOnly'),
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
  els.clearLocationBtn.addEventListener('click', clearLocation);
  els.exportCsvBtn.addEventListener('click', exportFilteredCsv);
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
    els.shortlistOnly,
    els.hidePassed,
    els.urlOnly,
    els.titledOnly,
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
    els.shortlistOnly.checked = Boolean(prefs.shortlistOnly);
    els.hidePassed.checked = Boolean(prefs.hidePassed);
    els.urlOnly.checked = Boolean(prefs.urlOnly);
    els.titledOnly.checked = prefs.titledOnly !== false;
    els.hideUnknown.checked = Boolean(prefs.hideUnknown);
    els.hideAutos.checked = Boolean(prefs.hideAutos);
    els.hideHousing.checked = Boolean(prefs.hideHousing);
    els.compactImport.checked = prefs.compactImport !== false;
  } catch {
    els.statusFilter.value = 'all';
    els.titledOnly.checked = true;
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
    shortlistOnly: els.shortlistOnly.checked,
    hidePassed: els.hidePassed.checked,
    urlOnly: els.urlOnly.checked,
    titledOnly: els.titledOnly.checked,
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
      stats.failedFiles ? `Files skipped: ${stats.failedFiles}` : null
    ].filter(Boolean).join(' '));
  } catch (error) {
    console.error(error);
    applyFiltersAndRender();
    setImportStatus('Import worked, but Safari could not save all records locally. Compact iPhone import is on, but the remaining records are still too large for Safari storage. Clear imported data and try again.', true);
  }
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
      const json = JSON.parse(text);
      const fileItems = parseFileByName(entry.name.split('/').pop() || entry.name, json, stats);
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
  if (lower.endsWith('collections.json')) return 0;
  if (lower.endsWith('your_marketplace_listing_history.json')) return 1;
  if (lower.endsWith('your_saved_items.json')) return 2;
  return 9;
}

function shouldParseZipEntry(name) {
  const lower = String(name || '').toLowerCase();
  return lower.endsWith('collections.json') ||
    lower.endsWith('your_marketplace_listing_history.json') ||
    lower.endsWith('your_saved_items.json');
}

function parseFileByName(fileName, json, stats) {
  const lower = String(fileName || '').toLowerCase();
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

function normalizeCollectionEntry(entry, collectionTitle, collectionUpdated) {
  const inner = Array.isArray(entry?.dict) ? entry.dict : [];
  const title = getLabelValue(inner, 'Product name') || getLabelValue(inner, 'Title') || getLabelValue(inner, 'Name');
  const price = normalizePrice(getLabelValue(inner, 'Price'));
  const description = getLabelValue(inner, 'Description') || '';
  const url = getLabelHref(inner, 'URL') || getLabelValue(inner, 'URL') || extractMarketplaceUrl(description) || '';
  const areaText = inferAreaFromText(`${description} ${collectionTitle}`);
  const statusBundle = inferStatus({ description, title, url }, title, url);

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
    const url = extractMarketplaceUrl(description) || '';
    const areaText = inferAreaFromText(description);
    const viewedAt = getLabelTimestamp(labelValues, 'Latest time viewed') || getLabelTimestamp(labelValues, 'Time first viewed') || row.timestamp;
    const statusBundle = inferStatus({ title, description, url }, title, url);

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
    .replace(/(pickup|local|obo|firm|fcfs|holds|hold|pending|porch|delivery|cash only)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferStatus(rec, title, url) {
  const haystack = decodeFbText(JSON.stringify(rec || {})).toLowerCase();
  const titleText = String(title || '').toLowerCase();
  const urlText = String(url || '');

  if (/sold/.test(haystack) || /sold/.test(titleText)) {
    return { status: 'sold', confidence: /sold/.test(titleText) ? 'title' : 'text', reason: 'Found sold wording in the exported record.' };
  }
  if (/unavailable|no longer available|removed|not available|expired|deleted/.test(haystack)) {
    return { status: 'unavailable', confidence: 'text', reason: 'Found unavailable or removed wording in the exported record.' };
  }
  if (url && /facebook\.com\/marketplace\/item\//.test(urlText)) {
    return { status: 'active', confidence: 'url', reason: 'Found a direct Marketplace item URL in the export.' };
  }
  if (title) {
    return { status: 'unknown', confidence: 'title_only', reason: 'The export has a title but no direct Marketplace item URL.' };
  }
  return { status: 'unknown', confidence: 'heuristic', reason: 'The export does not include enough information to classify this item confidently.' };
}

function extractMarketplaceUrl(text) {
  const match = decodeFbText(String(text || '')).match(/https?:\/\/www\.facebook\.com\/marketplace\/item\/\d+\/?/i);
  return match ? match[0] : '';
}

function extractPrice(text) {
  const match = decodeFbText(String(text || '')).match(/\$\s?\d[\d,]*(?:\.\d{2})?/);
  return match ? match[0] : '';
}

function inferAreaFromText(text) {
  const source = decodeFbText(String(text || ''));
  const patterns = [
    /(Beaverton,?\s*OR)/i,
    /(Tigard,?\s*OR)/i,
    /(Portland,?\s*OR)/i,
    /(Hillsboro,?\s*OR)/i,
    /(Vancouver,?\s*WA)/i,
    /(Gresham,?\s*OR)/i,
    /(Lake Oswego,?\s*OR)/i,
    /(Salem,?\s*OR)/i,
    /(Oregon City,?\s*OR)/i
  ];
  for (const re of patterns) {
    const m = source.match(re);
    if (m) return m[1];
  }
  return '';
}

function guessLatLon(areaText) {
  const area = String(areaText || '').toLowerCase();
  const known = [
    { re: /beaverton/, latitude: 45.4871, longitude: -122.8037 },
    { re: /portland/, latitude: 45.5152, longitude: -122.6784 },
    { re: /vancouver/, latitude: 45.6387, longitude: -122.6615 },
    { re: /tigard/, latitude: 45.4312, longitude: -122.7715 },
    { re: /hillsboro/, latitude: 45.5229, longitude: -122.9898 },
    { re: /lake oswego/, latitude: 45.4207, longitude: -122.6706 },
    { re: /gresham/, latitude: 45.5001, longitude: -122.4302 },
    { re: /oregon city/, latitude: 45.3573, longitude: -122.6068 },
    { re: /salem/, latitude: 44.9429, longitude: -123.0351 },
    { re: /seattle/, latitude: 47.6062, longitude: -122.3321 }
  ];
  const match = known.find(k => k.re.test(area));
  return match || { latitude: null, longitude: null };
}

function buildId(title, url, areaText, savedRaw, sourceType) {
  return [title || '', url || '', areaText || '', savedRaw || '', sourceType || ''].join('||').toLowerCase();
}

function dedupeAndMerge(newItems, existingItems) {
  const map = new Map(existingItems.map(item => [item.id, item]));
  for (const item of newItems) {
    const existing = map.get(item.id);
    map.set(item.id, existing ? { ...item, notes: existing.notes, shortlist: existing.shortlist, passed: existing.passed } : item);
  }
  return Array.from(map.values());
}

function scoreCompactStrength(item) {
  let score = 0;
  if (hasMeaningfulTitle(item)) score += 50;
  if (item.url) score += 45;
  if (item.sourceType === 'collection') score += 25;
  if (item.sourceType === 'listing_history') score += 10;
  if (item.price != null) score += 15;
  if (item.areaText) score += 10;
  if (item.status === 'active') score += 8;
  if (item.status === 'unavailable' || item.status === 'sold') score += 4;
  if (item.status === 'unknown' && !item.url) score -= 30;
  return score;
}

function compactItemsForIphone(items) {
  const deduped = dedupeAndMerge(items, []);
  const strong = deduped.filter(item => hasMeaningfulTitle(item) && (item.url || item.sourceType === 'collection'));
  const fallback = deduped.filter(item => !strong.some(s => s.id === item.id) && hasMeaningfulTitle(item) && item.sourceType === 'listing_history');
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
      state.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      saveLocation();
      updateLocationStatus();
      recomputeDistances();
      applyFiltersAndRender();
    },
    error => {
      alert(`Location failed: ${error.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function clearLocation() {
  state.location = null;
  saveLocation();
  updateLocationStatus();
  recomputeDistances();
  applyFiltersAndRender();
}

function updateLocationStatus() {
  if (!state.location) {
    els.locationStatus.textContent = 'Location not set.';
    return;
  }
  els.locationStatus.textContent = `Location set: ${state.location.latitude.toFixed(5)}, ${state.location.longitude.toFixed(5)}`;
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
  const query = els.searchInput.value.trim().toLowerCase();
  const minPrice = els.minPrice.value ? Number(els.minPrice.value) : null;
  const maxPrice = els.maxPrice.value ? Number(els.maxPrice.value) : null;
  const savedAfter = els.savedAfter.value ? new Date(els.savedAfter.value + 'T00:00:00').getTime() : null;
  const savedBefore = els.savedBefore.value ? new Date(els.savedBefore.value + 'T23:59:59').getTime() : null;

  let items = state.items.filter(item => {
    if (els.statusFilter.value !== 'all' && item.status !== els.statusFilter.value) return false;
    if (els.shortlistOnly.checked && !item.shortlist) return false;
    if (els.hidePassed.checked && item.passed) return false;
    if (els.urlOnly.checked && !item.url) return false;
    if (els.titledOnly.checked && !hasMeaningfulTitle(item)) return false;
    if (els.hideUnknown.checked && item.status === 'unknown') return false;
    if (els.hideAutos.checked && looksLikeAutomotive(item)) return false;
    if (els.hideHousing.checked && looksLikeHousing(item)) return false;
    if (minPrice != null && (item.price == null || item.price < minPrice)) return false;
    if (maxPrice != null && (item.price == null || item.price > maxPrice)) return false;
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
  return Boolean(title) && title !== '(untitled saved item)' && title !== '(untitled listing)';
}

function looksLikeAutomotive(item) {
  const text = `${item.title || ''} ${item.cleanedTitle || ''} ${item.statusReason || ''}`.toLowerCase();
  if (!text.trim()) return false;
  const strong = [
    /\b(?:sedan|coupe|hatchback|convertible|suv|truck|pickup|van|minivan|wagon|motorcycle|atv|rv|camper)\b/,
    /\b(?:clean title|salvage title|rebuilt title|automatic transmission|manual transmission)\b/,
    /\b\d{4}\s+(?:ford|chevy|chevrolet|gmc|toyota|honda|nissan|mazda|lexus|bmw|mercedes|audi|jeep|dodge|ram|subaru|kia|hyundai|cadillac|lincoln|volkswagen|vw|porsche|tesla)\b/,
    /\b(?:f150|f-150|silverado|camry|civic|accord|corvette|mustang|wrangler|tacoma|tundra|town car|altima|corolla|rav4|crv|cr-v|pilot|escape)\b/,
    /\b(?:mileage|miles)\b/
  ];
  return strong.some(re => re.test(text));
}

function looksLikeHousing(item) {
  const text = `${item.title || ''} ${item.cleanedTitle || ''} ${item.statusReason || ''}`.toLowerCase();
  if (!text.trim()) return false;
  const strong = [
    /\b\d+\s*bed(?:room)?s?\b/,
    /\b\d+\s*bath(?:room)?s?\b/,
    /\b(?:house|home|condo|townhouse|apartment|studio|duplex|triplex|real estate|realtor|lease|for rent|rentals?)\b/,
    /\b(?:mobile home|manufactured home|land for sale|parcel|lot for sale|sq ?ft|square feet|acres?)\b/
  ];
  return strong.some(re => re.test(text));
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

function renderSummary(items) {
  const counts = state.items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const withDistance = items.filter(i => i.distanceMiles != null).length;
  const fromCollections = items.filter(i => i.sourceType === 'collection').length;
  const fromHistory = items.filter(i => i.sourceType === 'listing_history').length;
  const titled = items.filter(hasMeaningfulTitle).length;
  const withUrl = items.filter(i => i.url).length;
  const unknownNoUrl = items.filter(i => i.status === 'unknown' && !i.url).length;
  const passedHidden = els.hidePassed.checked ? state.items.filter(i => i.passed).length : 0;
  const autoHidden = els.hideAutos.checked ? state.items.filter(i => looksLikeAutomotive(i)).length : 0;
  const housingHidden = els.hideHousing.checked ? state.items.filter(i => looksLikeHousing(i)).length : 0;
  const text = [
    `${items.length} shown of ${state.items.length} total`,
    `Active ${counts.active || 0}`,
    `Unavailable ${counts.unavailable || 0}`,
    `Sold ${counts.sold || 0}`,
    `Unknown ${counts.unknown || 0}`,
    `Distance ready ${withDistance}`,
    `Collections ${fromCollections}`,
    `History ${fromHistory}`,
    `Titled ${titled}`,
    `With URL ${withUrl}`,
    `Unknown without URL ${unknownNoUrl}`,
    els.hidePassed.checked ? `Passed hidden ${passedHidden}` : null,
    els.hideAutos.checked ? `Autos hidden ${autoHidden}` : null,
    els.hideHousing.checked ? `Housing hidden ${housingHidden}` : null,
    els.compactImport.checked ? 'Compact import on' : 'Compact import off'
  ].filter(Boolean).join(' • ');
  els.summary.textContent = text;
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
    const reasonEl = node.querySelector('.reason');
    const notesInput = node.querySelector('.notes-input');
    const copyTitleBtn = node.querySelector('.copy-title-btn');
    const copyEbayTitleBtn = node.querySelector('.copy-ebay-title-btn');
    const marketplaceBtn = node.querySelector('.marketplace-link-btn');
    const ebayBtn = node.querySelector('.ebay-link-btn');
    const shortlistToggle = node.querySelector('.shortlist-toggle');
    const passedToggle = node.querySelector('.passed-toggle');

    titleEl.textContent = item.title || '(untitled listing)';
    priceEl.textContent = item.price != null ? `$${formatMoney(item.price)}` : 'No price';
    areaEl.textContent = item.areaText || 'Area unknown';
    distanceEl.textContent = item.distanceMiles != null ? `${item.distanceMiles} mi` : 'Distance unknown';
    savedDateEl.textContent = item.savedAt ? `${item.sourceType} • ${formatDate(item.savedAt)}` : `${item.sourceType} • date unknown`;
    statusEl.textContent = item.status;
    statusEl.classList.add(item.status);
    confidenceEl.textContent = `Status source: ${item.statusConfidence}`;
    reasonEl.textContent = item.statusReason || 'No additional reason recorded.';
    notesInput.value = item.notes || '';
    shortlistToggle.checked = Boolean(item.shortlist);
    passedToggle.checked = Boolean(item.passed);

    copyTitleBtn.addEventListener('click', () => copyText(item.title || ''));
    copyEbayTitleBtn.addEventListener('click', () => copyText(item.cleanedTitle || item.title || ''));
    marketplaceBtn.addEventListener('click', () => openUrl(item.url));
    ebayBtn.addEventListener('click', () => openEbaySoldSearch(item));
    notesInput.addEventListener('change', () => updateItem(item.id, { notes: notesInput.value }));
    shortlistToggle.addEventListener('change', () => updateItem(item.id, { shortlist: shortlistToggle.checked }));
    passedToggle.addEventListener('change', () => updateItem(item.id, { passed: passedToggle.checked }));

    if (!item.url) marketplaceBtn.disabled = true;

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

  if (state.location) {
    state.map.setView([state.location.latitude, state.location.longitude], 10);
  } else {
    state.map.setView([45.5152, -122.6784], 9);
  }
}

function renderMap(items) {
  if (!state.map || !state.markersLayer) return;
  state.markersLayer.clearLayers();

  const mappedItems = items.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
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
    state.map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function buildPopupHtml(item) {
  return `
    <div>
      <div class="popup-title">${escapeHtml(item.title || '(untitled listing)')}</div>
      <div>${escapeHtml(item.areaText || 'Area unknown')}</div>
      <div>${item.price != null ? `$${formatMoney(item.price)}` : 'No price'}${item.distanceMiles != null ? ` • ${item.distanceMiles} mi` : ''}</div>
      <div>Status: ${escapeHtml(item.status)} • ${escapeHtml(item.sourceType || '')}</div>
      <div class="popup-actions">
        <button type="button" data-popup-copy="${encodeURIComponent(item.title || '')}">Copy title</button>
        ${item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">Open Marketplace</a>` : ''}
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
