import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNavigation } from '../src/order.js';

const page = (p, data = {}) => ({ path: p, data });
const paths = (pages) => pages.map((p) => p.path);

test('pages sort by numeric order then filename within a folder (FR-9)', () => {
  const nav = buildNavigation([
    page('b.md', { order: 2 }),
    page('a.md', { order: 2 }),
    page('c.md', { order: 1.5 }),
    page('d.md', { order: 10 }),
  ]);
  assert.deepEqual(paths(nav.pages), ['c.md', 'a.md', 'b.md', 'd.md']);
});

test('pages without order come after all ordered pages, by filename (FR-9)', () => {
  const nav = buildNavigation([
    page('a-unordered.md', {}),
    page('z-ordered.md', { order: 99 }),
    page('b-unordered.md', { title: 'x' }),
    page('m-ordered.md', { order: -3 }),
  ]);
  assert.deepEqual(paths(nav.pages), [
    'm-ordered.md',
    'z-ordered.md',
    'a-unordered.md',
    'b-unordered.md',
  ]);
});

test('non-numeric order is treated as absent and sorts after ordered pages', () => {
  const nav = buildNavigation([
    page('a.md', { order: 'first' }),
    page('b.md', { order: 5 }),
    page('c.md', { order: Number.NaN }),
  ]);
  assert.deepEqual(paths(nav.pages), ['b.md', 'a.md', 'c.md']);
});

test('equal order values across different folders do not conflict (FR-9)', () => {
  const nav = buildNavigation([
    page('one/a.md', { order: 1 }),
    page('one/b.md', { order: 2 }),
    page('two/a.md', { order: 1 }),
    page('two/b.md', { order: 2 }),
    page('top.md', { order: 1 }),
  ]);
  assert.deepEqual(paths(nav.pages), ['top.md']);
  assert.equal(nav.parts.length, 2);
  assert.deepEqual(paths(nav.parts.find((p) => p.folder === 'one').pages), ['one/a.md', 'one/b.md']);
  assert.deepEqual(paths(nav.parts.find((p) => p.folder === 'two').pages), ['two/a.md', 'two/b.md']);
});

test('folder index.md supplies part title, summary and order (FR-10)', () => {
  const nav = buildNavigation([
    page('sec/index.md', { title: 'The Section', summary: 'About it', order: 4 }),
    page('sec/page.md', { title: 'P' }),
  ]);
  const [part] = nav.parts;
  assert.equal(part.folder, 'sec');
  assert.equal(part.title, 'The Section');
  assert.equal(part.summary, 'About it');
  assert.equal(part.order, 4);
  assert.equal(part.index.path, 'sec/index.md');
  assert.deepEqual(paths(part.pages), ['sec/page.md']);
});

test('folder without index.md derives its name from the folder name (FR-10)', () => {
  const nav = buildNavigation([page('protect-and-finish/sealing.md', {})]);
  const [part] = nav.parts;
  assert.equal(part.title, 'Protect and finish');
  assert.equal(part.summary, null);
  assert.equal(part.order, null);
  assert.equal(part.index, null);
});

test('folder index.md without a string title falls back to the folder name', () => {
  const nav = buildNavigation([page('write-it/index.md', { summary: 's' })]);
  assert.equal(nav.parts[0].title, 'Write it');
});

test('parts sort by index order then folder name; unordered parts come last', () => {
  const nav = buildNavigation([
    page('zeta/index.md', { order: 1 }),
    page('alpha/x.md', {}),
    page('beta/index.md', { order: 1 }),
    page('gamma/index.md', { order: 0 }),
    page('delta/x.md', {}),
  ]);
  assert.deepEqual(
    nav.parts.map((p) => p.folder),
    ['gamma', 'beta', 'zeta', 'alpha', 'delta'],
  );
});

test('root index.md is the landing page and is not in pages (FR-11)', () => {
  const nav = buildNavigation([
    page('index.md', { title: 'Home', summary: 's' }),
    page('intro.md', { order: 1 }),
  ]);
  assert.equal(nav.landing.path, 'index.md');
  assert.deepEqual(paths(nav.pages), ['intro.md']);
});

test('root index.md is optional (FR-11)', () => {
  const nav = buildNavigation([page('intro.md', {})]);
  assert.equal(nav.landing, null);
  assert.deepEqual(paths(nav.pages), ['intro.md']);
});

test('empty input gives an empty tree', () => {
  assert.deepEqual(buildNavigation([]), { landing: null, pages: [], parts: [] });
});

test('unknown front matter keys are carried through unchanged (FR-12)', () => {
  const extra = { title: 'T', custom: { nested: [1, 2] }, flag: true };
  const nav = buildNavigation([
    page('p.md', extra),
    page('sec/index.md', { title: 'S', weird: 'w' }),
    page('sec/q.md', { tag: 'x' }),
    page('index.md', { site: 'y' }),
  ]);
  assert.deepEqual(nav.pages[0].data, extra);
  assert.equal(nav.pages[0].data, extra);
  assert.deepEqual(nav.parts[0].index.data, { title: 'S', weird: 'w' });
  assert.deepEqual(nav.parts[0].pages[0].data, { tag: 'x' });
  assert.deepEqual(nav.landing.data, { site: 'y' });
});

test('page with missing data is tolerated', () => {
  const nav = buildNavigation([{ path: 'a.md' }, { path: 'sec/index.md', data: null }]);
  assert.equal(nav.pages.length, 1);
  assert.equal(nav.parts[0].title, 'Sec');
});

test('input array is not mutated', () => {
  const input = [page('b.md', { order: 2 }), page('a.md', { order: 1 })];
  buildNavigation(input);
  assert.deepEqual(paths(input), ['b.md', 'a.md']);
});
