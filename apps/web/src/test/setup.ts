import '@testing-library/jest-dom'

// jsdom doesn't implement scrollIntoView — mock it globally
window.HTMLElement.prototype.scrollIntoView = function () {}
Element.prototype.scrollIntoView = function () {}

// jsdom does not implement scrollIntoView — polyfill for component tests
if (typeof window !== 'undefined') {
  window.Element.prototype.scrollIntoView = () => {}
}
