import '@testing-library/jest-dom';

// jsdom doesn't implement PointerEvent / pointer capture - base-ui (and most
// Radix-style headless UI kits) listen for these on custom controls like
// Checkbox/Select/ToggleGroup, so clicks on them silently no-op without this.
if (typeof window !== 'undefined') {
  if (!window.PointerEvent) {
    class PointerEvent extends MouseEvent {}
    // @ts-expect-error - minimal polyfill, not a full PointerEvent implementation
    window.PointerEvent = PointerEvent;
  }
  Object.defineProperties(window.HTMLElement.prototype, {
    hasPointerCapture: { value: window.HTMLElement.prototype.hasPointerCapture ?? (() => false), configurable: true },
    setPointerCapture: { value: window.HTMLElement.prototype.setPointerCapture ?? (() => {}), configurable: true },
    releasePointerCapture: { value: window.HTMLElement.prototype.releasePointerCapture ?? (() => {}), configurable: true },
    scrollIntoView: { value: window.HTMLElement.prototype.scrollIntoView ?? (() => {}), configurable: true },
  });
}
