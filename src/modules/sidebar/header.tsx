export function Header() {
  return (
    <div class="sidehead">
      <span class="brandmark">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-lucide="palette"
          aria-hidden="true"
          class="lucide lucide-palette w-5 h-5 text-white"
        >
          <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
        </svg>
      </span>
      <div class="brand">Palette masters</div>
      <span class="live">● WIKIMEDIA</span>
    </div>
  );
}
export function ShuffleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      data-lucide="shuffle"
      aria-hidden="true"
      class="lucide lucide-shuffle w-3 h-3"
    >
      <path d="m18 14 4 4-4 4"></path>
      <path d="m18 2 4 4-4 4"></path>
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path>
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path>
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>
    </svg>
  );
}
