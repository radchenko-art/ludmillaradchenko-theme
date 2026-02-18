/**
 * Product image zoom (elevate-zoom window) – desktop only, does not interfere with click-to-open zoom dialog.
 */
(function () {
  'use strict';

  var DESKTOP_BREAKPOINT = 992;
  var mediaQuery = typeof window.matchMedia !== 'undefined' && window.matchMedia('(min-width: ' + DESKTOP_BREAKPOINT + 'px)');

  function isDesktop() {
    return mediaQuery && mediaQuery.matches;
  }

  function getVisibleZoomImage(gallery) {
    if (!gallery) return null;
    var slide = gallery.querySelector('slideshow-slide:not([aria-hidden="true"]) .product-media__image');
    if (slide) return slide;
    return gallery.querySelector('.product-media-container--image .product-media__image') || null;
  }

  function initZoomOnImage(img) {
    if (!img || !window.elevateZoom) return null;
    var zoomUrl = img.getAttribute('data-zoom-image') || img.getAttribute('data_zoom_image') || img.getAttribute('data-max-resolution') || img.getAttribute('data_max_resolution');
    if (!zoomUrl) return null;
    img.setAttribute('data-zoom-image', zoomUrl);
    return window.elevateZoom(img, {
      zoomWindowWidth: 400,
      zoomWindowHeight: 400,
      zoomWindowPosition: 1,
      borderColour: '#888',
      showLens: true
    });
  }

  function teardownZoom(img) {
    if (img && img._elevateZoom && typeof img._elevateZoom.destroy === 'function') {
      img._elevateZoom.destroy();
      img._elevateZoom = null;
    }
  }

  function removeAllZoomContainers() {
    var containers = document.querySelectorAll('body > .zoomContainer');
    for (var i = 0; i < containers.length; i++) {
      if (containers[i].parentNode) containers[i].parentNode.removeChild(containers[i]);
    }
  }

  function attachToGallery(gallery) {
    if (!isDesktop()) {
      removeAllZoomContainers();
      return;
    }
    var img = getVisibleZoomImage(gallery);
    if (!img || img._elevateZoom) return;
    var hasZoomUrl = !!(img.getAttribute('data-zoom-image') || img.getAttribute('data-max-resolution') || img.getAttribute('data_max_resolution'));
    if (hasZoomUrl) initZoomOnImage(img);
  }

  function reattach(gallery) {
    var allImgs = gallery.querySelectorAll('.product-media-container--image .product-media__image');
    for (var i = 0; i < allImgs.length; i++) {
      teardownZoom(allImgs[i]);
    }
    removeAllZoomContainers();
    attachToGallery(gallery);
  }

  function observeSlideChanges(gallery) {
    var slideshow = gallery.querySelector('slideshow-component');
    if (!slideshow) return;
    var observer = new MutationObserver(function () {
      if (!isDesktop()) return;
      reattach(gallery);
    });
    observer.observe(slideshow, { attributes: true, subtree: true, attributeFilter: ['aria-hidden'] });
  }

  function run() {
    if (typeof window.elevateZoom !== 'function') return;
    var gallery = document.querySelector('media-gallery');
    if (!gallery || !isDesktop()) return;
    reattach(gallery);
    observeSlideChanges(gallery);
  }

  function onResize() {
    if (!isDesktop()) {
      var gallery = document.querySelector('media-gallery');
      if (gallery) {
        var imgs = gallery.querySelectorAll('.product-media__image');
        for (var i = 0; i < imgs.length; i++) teardownZoom(imgs[i]);
        removeAllZoomContainers();
      }
    } else {
      run();
    }
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
    if (mediaQuery) {
      mediaQuery.addEventListener('change', onResize);
    }
    window.addEventListener('resize', onResize);
  }

  init();
})();
