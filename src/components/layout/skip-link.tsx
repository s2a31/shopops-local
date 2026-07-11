/**
 * Keyboard users can jump straight to the page content. Visually hidden until
 * focused, then rendered as a prominent pill at the top of the viewport.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Skip to content
    </a>
  );
}
