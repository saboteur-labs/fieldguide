/**
 * Page and part ordering (FR-9 to FR-12).
 *
 * buildNavigation(pages) takes an array of { path, data } (paths relative to
 * the guide root, '/'-separated) and returns:
 *   {
 *     landing: page | null,          root index.md
 *     pages:   page[],               ordered root-level pages, excluding index.md
 *     parts:   [{
 *       folder:  string,             folder path, e.g. 'protect-and-finish'
 *       title:   string,             index.md title, else derived from folder name
 *       summary: string | null,      index.md summary, else null
 *       order:   number | null,      index.md order, else null
 *       index:   page | null,        the folder's index.md entry
 *       pages:   page[],             ordered pages, excluding index.md
 *     }]                             ordered by order, then folder name
 *   }
 * Each page is the input entry unchanged, so unknown front matter keys in
 * `data` are carried through as-is. Parts are keyed by full directory path.
 */

function compareText(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function numericOrder(data) {
  const value = data && typeof data === 'object' ? data.order : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Ordered entries first (by order, then tiebreak), unordered after (by tiebreak). */
function compareOrdered(orderA, orderB, tieA, tieB) {
  if (orderA !== null && orderB !== null && orderA !== orderB) return orderA - orderB;
  if (orderA !== null && orderB === null) return -1;
  if (orderA === null && orderB !== null) return 1;
  return compareText(tieA, tieB);
}

function fileName(pagePath) {
  return pagePath.slice(pagePath.lastIndexOf('/') + 1);
}

function dirName(pagePath) {
  const at = pagePath.lastIndexOf('/');
  return at === -1 ? '' : pagePath.slice(0, at);
}

function sortPages(pages) {
  return [...pages].sort((a, b) =>
    compareOrdered(
      numericOrder(a.data),
      numericOrder(b.data),
      fileName(a.path),
      fileName(b.path),
    ),
  );
}

/** 'protect-and-finish' gives 'Protect and finish'. */
function deriveName(folder) {
  const last = folder.slice(folder.lastIndexOf('/') + 1);
  const spaced = last.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildPart(folder, members) {
  const index = members.find((p) => fileName(p.path) === 'index.md') ?? null;
  const data = index && index.data && typeof index.data === 'object' ? index.data : {};
  const title = typeof data.title === 'string' && data.title.trim() !== '' ? data.title : deriveName(folder);
  return {
    folder,
    title,
    summary: typeof data.summary === 'string' ? data.summary : null,
    order: numericOrder(data),
    index,
    pages: sortPages(members.filter((p) => p !== index)),
  };
}

export function buildNavigation(pages) {
  let landing = null;
  const rootPages = [];
  const folders = new Map();

  for (const entry of pages) {
    const folder = dirName(entry.path);
    if (folder === '') {
      if (fileName(entry.path) === 'index.md') landing = entry;
      else rootPages.push(entry);
    } else {
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder).push(entry);
    }
  }

  const parts = [...folders].map(([folder, members]) => buildPart(folder, members));
  parts.sort((a, b) => compareOrdered(a.order, b.order, a.folder, b.folder));

  return { landing, pages: sortPages(rootPages), parts };
}
