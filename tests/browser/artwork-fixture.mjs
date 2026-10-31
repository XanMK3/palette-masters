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
