export const node = (name: string, className?: string, text?: string): HTMLElement => {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
