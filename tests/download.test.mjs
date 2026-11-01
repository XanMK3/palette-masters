import test from 'node:test';
import assert from 'node:assert/strict';
import { createDownloadAdapter } from '../.cache/tests/app/download.js';

function browser(t, failure) {
  const urls = [];
  const revoked = [];
  const timers = new Map();
  const links = [];
  let nextTimer = 0;
  let onClick = () => {};
  t.mock.method(URL, 'createObjectURL', (blob) => {
    urls.push(blob);
    return `blob:${urls.length}`;
  });
  t.mock.method(URL, 'revokeObjectURL', (url) => revoked.push(url));
  for (const key of ['document', 'window']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  globalThis.window = {
    setTimeout(callback) {
      if (failure === 'timer') throw new Error('timer');
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  globalThis.document = {
    createElement() {
      if (failure === 'create') throw new Error('create');
      const link = {
        attached: false,
        clicked: false,
        click() {
          if (failure === 'click') throw new Error('click');
          this.clicked = true;
          onClick();
        },
        remove() {
          this.attached = false;
        },
      };
      links.push(link);
      return link;
    },
    body: {
      append(link) {
        link.attached = true;
        if (failure === 'append') throw new Error('append');
      },
    },
  };
  return {
    urls,
    revoked,
    timers,
    links,
    onClick: (callback) => {
      onClick = callback;
    },
  };
}

test('download preserves content and defers URL release, then cleans up once', async (t) => {
  const b = browser(t);
  const adapter = createDownloadAdapter();
  adapter.save('theme.css', 'body {}', 'text/css');
  assert.equal(await b.urls[0].text(), 'body {}');
  assert.equal(b.urls[0].type, 'text/css');
  assert.equal(b.links[0].download, 'theme.css');
  assert.equal(b.links[0].href, 'blob:1');
  assert.equal(b.links[0].clicked, true);
  assert.equal(b.links[0].attached, false);
  assert.deepEqual(b.revoked, []);
  [...b.timers.values()][0]();
  adapter.dispose();
  assert.deepEqual(b.revoked, ['blob:1']);
  assert.equal(b.timers.size, 0);
});

for (const failure of ['create', 'append', 'click', 'timer']) {
  test(`download cleans up when ${failure} fails and preserves the error`, (t) => {
    const b = browser(t, failure);
    const adapter = createDownloadAdapter();
    assert.throws(() => adapter.save('theme.css', '', 'text/css'), new RegExp(failure));
    assert.deepEqual(b.revoked, ['blob:1']);
    assert.ok(b.links.every((link) => !link.attached));
    adapter.dispose();
    assert.deepEqual(b.revoked, ['blob:1']);
    assert.equal(b.timers.size, 0);
  });
}

test('disposal releases all downloads and prevents later saves', (t) => {
  const b = browser(t);
  const adapter = createDownloadAdapter();
  adapter.save('one.css', '', 'text/css');
  adapter.save('two.css', '', 'text/css');
  adapter.dispose();
  adapter.dispose();
  adapter.save('late.css', '', 'text/css');
  assert.equal(b.urls.length, 2);
  assert.deepEqual(b.revoked, ['blob:1', 'blob:2']);
  assert.equal(b.timers.size, 0);
});

test('disposal inside a click handler leaves no pending URL or timer', (t) => {
  const b = browser(t);
  const adapter = createDownloadAdapter();
  b.onClick(() => adapter.dispose());
  adapter.save('theme.css', '', 'text/css');
  assert.deepEqual(b.revoked, ['blob:1']);
  assert.equal(b.timers.size, 0);
  assert.equal(b.links[0].attached, false);
});
