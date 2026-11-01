// Browsers expose no completion event for anchor downloads. This grace period
// lets the browser consume the blob URL; it does not indicate download completion.
const DOWNLOAD_URL_GRACE_MS = 1000;

/** Owns temporary download URLs. Saving after disposal is a no-op. */
export function createDownloadAdapter() {
  const pending = new Map<string, number | undefined>();
  let disposed = false;
  function release(url: string) {
    if (!pending.has(url)) return;
    const timer = pending.get(url);
    pending.delete(url);
    if (timer !== undefined) window.clearTimeout(timer);
    URL.revokeObjectURL(url);
  }
  return {
    save(filename: string, content: string, type: string) {
      if (disposed) return;
      const url = URL.createObjectURL(new Blob([content], { type }));
      pending.set(url, undefined);
      let link: HTMLAnchorElement | undefined;
      try {
        link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        // A synchronous click handler may have disposed this adapter.
        if (pending.has(url)) {
          pending.set(
            url,
            window.setTimeout(() => release(url), DOWNLOAD_URL_GRACE_MS),
          );
        }
      } catch (error) {
        release(url);
        throw error;
      } finally {
        link?.remove();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const url of pending.keys()) release(url);
    },
  };
}
