/** Queries are scoped to the module's supplied root. */
export function scopedGet(root: HTMLElement) {
  return <T extends HTMLElement = HTMLElement>(id: string): T => {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Missing module element #${id}`);
    return element;
  };
}
export const node = (name: string, className?: string, text?: string): HTMLElement => {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

export const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
