/**
 * Universal Collection Showcase — minimal companion script.
 *
 * Responsibilities (carousel behavior itself comes from the theme's
 * slideshow engine in assets/slideshow.js — never duplicated here):
 *  1. Reveal-on-scroll via IntersectionObserver (fires once per element).
 *  2. Progress bar sync for the "progress" navigation style, driven by a
 *     MutationObserver on the engine's aria-hidden slide bookkeeping so we
 *     never depend on the engine's internal event names.
 *  3. Pause autoplay entirely when the visitor prefers reduced motion.
 *  4. Re-initializes on shopify:section:load, cleans up on unload.
 */
(function () {
  'use strict';

  const SECTION_SELECTOR = '[data-ucs]';
  const REVEAL_SELECTOR = '[data-ucs-reveal]';
  const REVEAL_THRESHOLD = 0.15;
  const LOW_END_CORE_COUNT = 4;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** @type {Map<Element, Array<() => void>>} */
  const cleanupRegistry = new Map();

  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  function isLowEndDevice() {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.hardwareConcurrency === 'number' &&
      navigator.hardwareConcurrency <= LOW_END_CORE_COUNT
    );
  }

  function revealImmediately(section) {
    section.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
      el.classList.add('is-revealed');
    });
  }

  function setupReveal(section, cleanups) {
    if (prefersReducedMotion() || isLowEndDevice()) {
      revealImmediately(section);
      return;
    }

    const targets = section.querySelectorAll(REVEAL_SELECTOR);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          // Fires once per element: repeating entrances distract.
          obs.unobserve(entry.target);
        });
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: '0px 0px -5% 0px' }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
    cleanups.push(function () {
      observer.disconnect();
    });
  }

  function setupProgress(section, cleanups) {
    const bars = section.querySelectorAll('[data-ucs-progress]');
    if (!bars.length) return;

    bars.forEach(function (bar) {
      const wrapper = bar.closest('.ucs__carousel');
      if (!wrapper) return;
      const slideshow = wrapper.querySelector('slideshow-component');
      if (!slideshow) return;

      const updateProgress = function () {
        const slides = slideshow.querySelectorAll('slideshow-slide');
        if (!slides.length) return;
        let currentIndex = 0;
        slides.forEach(function (slide, index) {
          if (slide.getAttribute('aria-hidden') === 'false') currentIndex = index;
        });
        const fraction = slides.length > 1 ? (currentIndex + 1) / slides.length : 1;
        bar.style.setProperty('--ucs-progress', String(fraction));
      };

      const observer = new MutationObserver(updateProgress);
      observer.observe(slideshow, {
        attributes: true,
        attributeFilter: ['aria-hidden'],
        subtree: true,
      });
      updateProgress();
      cleanups.push(function () {
        observer.disconnect();
      });
    });
  }

  function pauseAutoplayIfReducedMotion(section) {
    if (!prefersReducedMotion()) return;
    section.querySelectorAll('slideshow-component[autoplay]').forEach(function (slideshow) {
      if (typeof slideshow.pause === 'function') {
        slideshow.pause();
      } else {
        slideshow.setAttribute('paused', '');
      }
    });
  }

  function initSection(section) {
    if (cleanupRegistry.has(section)) return;
    const cleanups = [];

    section.classList.add('ucs-js');
    setupReveal(section, cleanups);
    setupProgress(section, cleanups);
    pauseAutoplayIfReducedMotion(section);

    cleanupRegistry.set(section, cleanups);
  }

  function destroySection(section) {
    const cleanups = cleanupRegistry.get(section);
    if (!cleanups) return;
    cleanups.forEach(function (fn) {
      fn();
    });
    cleanupRegistry.delete(section);
  }

  function initAll(root) {
    (root || document).querySelectorAll(SECTION_SELECTOR).forEach(initSection);
  }

  // React to reduced-motion preference changes mid-session.
  const onMotionPreferenceChange = function () {
    document.querySelectorAll(SECTION_SELECTOR).forEach(function (section) {
      if (prefersReducedMotion()) {
        revealImmediately(section);
        pauseAutoplayIfReducedMotion(section);
      }
    });
  };
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', onMotionPreferenceChange);
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    event.target.querySelectorAll(SECTION_SELECTOR).forEach(destroySection);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }
})();
