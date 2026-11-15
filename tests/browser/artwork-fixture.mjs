// Supply deterministic artwork pixels through the normal image-loading path.
export async function loadArtworkFixture(page, body) {
  await page.route(/^https:\/\//, (route) => {
    if (route.request().resourceType() !== 'image') return route.abort();
    return route.fulfill({
      contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      ...(body ? { body } : { path: 'assets/palette-test-sample.png' }),
    });
  });
  await page.reload();
}

// Color values are part of each swatch button's accessible name.
export async function paletteColors(page) {
  return page
    .getByRole('button', { name: /^Copy palette color / })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label').match(/#[0-9a-f]{6}/i)[0]),
    );
}
