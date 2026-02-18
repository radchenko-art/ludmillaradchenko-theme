/**
 * ElevateZoom - window mode only, vanilla JS (no jQuery)
 * Based on jQuery elevateZoom 3.0.8 by Andrew Eades - www.elevateweb.co.uk/image-zoom
 * Licensed under MIT / GPL
 *
 * Usage:
 *   <img id="zoom_product" src="small.jpg" data-zoom-image="large.jpg" alt="">
 *   <script src="elevate-zoom-window.js"></script>
 *   <script>
 *     var api = elevateZoom('#zoom_product', {
 *       zoomWindowWidth: 400,
 *       zoomWindowHeight: 400,
 *       zoomWindowPosition: 1,  // 1=right, 11=left, 13=top, 7=bottom, etc.
 *       borderColour: '#888',
 *       showLens: true
 *     });
 *     // api.changeState('disable'); api.destroy();
 *   </script>
 */

(function (global) {
  'use strict';

  var defaultOptions = {
    zoomEnabled: true,
    zoomLevel: 1,
    zoomWindowWidth: 400,
    zoomWindowHeight: 400,
    zoomWindowOffetx: 0,
    zoomWindowOffety: 0,
    zoomWindowPosition: 1, // 1-16, 1=right of image, 11=left, etc.
    zoomWindowBgColour: '#fff',
    zoomWindowFadeIn: false,
    zoomWindowFadeOut: false,
    borderSize: 4,
    borderColour: '#888',
    showLens: true,
    lensBorderSize: 1,
    lensBorderColour: '#000',
    lensColour: 'white',
    lensOpacity: 0.4,
    cursor: 'crosshair',
    responsive: true,
    onZoomedImageLoaded: function () {}
  };

  function getPageOffset(el) {
    var rect = el.getBoundingClientRect();
    return {
      left: rect.left + (window.scrollX || window.pageXOffset),
      top: rect.top + (window.scrollY || window.pageYOffset)
    };
  }

  function ElevateZoom(elem, options) {
    this.elem = elem;
    this.options = {};
    for (var k in defaultOptions) this.options[k] = defaultOptions[k];
    for (var key in options) if (options.hasOwnProperty(key)) this.options[key] = options[key];

    this.imageSrc = elem.getAttribute('data-zoom-image') || elem.getAttribute('data_zoom_image') || elem.getAttribute('data-max-resolution') || elem.getAttribute('data_max_resolution') || elem.getAttribute('src') || '';
    this.zoomImage = this.imageSrc;
    this.zoomContainer = null;
    this.zoomLens = null;
    this.zoomWindow = null;
    this.isWindowActive = false;
    this.isLensActive = false;
    this.overWindow = false;
    this.isWindowSet = false;
    this.currentLoc = null;
    this.lastX = -1;
    this.lastY = -1;
    this.scrollLock = false;
    this._boundSetPosition = this.setPosition.bind(this);
    this._boundSetElementsShow = this.setElements.bind(this, 'show');
    this._boundSetElementsHide = this.setElements.bind(this, 'hide');
    this._boundTouchMove = this._onTouchMove.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);
  }

  ElevateZoom.prototype.init = function () {
    var parent = this.elem.parentNode;
    if (parent) {
      parent.removeAttribute('title');
      parent.removeAttribute('alt');
    }
    var self = this;
    setTimeout(function () { self.fetch(self.imageSrc); }, 1);
  };

  ElevateZoom.prototype.fetch = function (src) {
    var self = this;
    var img = new Image();
    img.onload = function () {
      self.largeWidth = img.width;
      self.largeHeight = img.height;
      self.startZoom();
      self.currentImage = self.imageSrc;
      self.options.onZoomedImageLoaded(self.elem);
    };
    img.src = src;
  };

  ElevateZoom.prototype.startZoom = function () {
    var el = this.elem;
    var rect = el.getBoundingClientRect();
    this.nzWidth = el.offsetWidth;
    this.nzHeight = el.offsetHeight;
    this.nzOffset = getPageOffset(el);
    this.currentZoomLevel = this.options.zoomLevel;
    this.zoomLock = 1;
    this.widthRatio = this.largeWidth / this.currentZoomLevel / this.nzWidth;
    this.heightRatio = this.largeHeight / this.currentZoomLevel / this.nzHeight;

    var zoomWindowWidth = this.options.zoomWindowWidth;
    var zoomWindowHeight = this.options.zoomWindowHeight;
    var lensHeight = this.nzHeight < zoomWindowWidth / this.widthRatio
      ? this.nzHeight
      : (zoomWindowHeight / this.heightRatio);
    var lensWidth = this.largeWidth < zoomWindowWidth
      ? this.nzWidth
      : (zoomWindowWidth / this.widthRatio);

    var zoomWindowStyle =
      'overflow:hidden;background-position:0 0;text-align:center;background-color:' + this.options.zoomWindowBgColour +
      ';width:' + zoomWindowWidth + 'px;height:' + zoomWindowHeight + 'px;float:left;background-size:' +
      (this.largeWidth / this.currentZoomLevel) + 'px ' + (this.largeHeight / this.currentZoomLevel) + 'px;' +
      'display:none;z-index:100;border:' + this.options.borderSize + 'px solid ' + this.options.borderColour +
      ';background-repeat:no-repeat;position:absolute;';

    var lensStyle =
      'background-position:0 0;width:' + lensWidth + 'px;height:' + lensHeight + 'px;float:right;display:none;' +
      'overflow:hidden;z-index:999;transform:translateZ(0);opacity:' + this.options.lensOpacity + ';' +
      'width:' + lensWidth + 'px;height:' + lensHeight + 'px;background-color:' + this.options.lensColour + ';' +
      'cursor:' + this.options.cursor + ';border:' + this.options.lensBorderSize + 'px solid ' + this.options.lensBorderColour +
      ';background-repeat:no-repeat;position:absolute;';

    this.zoomContainer = document.createElement('div');
    this.zoomContainer.className = 'zoomContainer';
    this.zoomContainer.style.cssText =
      'transform:translateZ(0);position:absolute;left:' + this.nzOffset.left + 'px;top:' + this.nzOffset.top + 'px;' +
      'height:' + this.nzHeight + 'px;width:' + this.nzWidth + 'px;';
    document.body.appendChild(this.zoomContainer);

    this.zoomLens = document.createElement('div');
    this.zoomLens.className = 'zoomLens';
    this.zoomLens.style.cssText = lensStyle;
    this.zoomLens.innerHTML = '\u00A0';
    this.zoomContainer.appendChild(this.zoomLens);

    this.windowOffsetLeft = 0;
    this.windowOffsetTop = 0;
    this._calcWindowOffset();

    this.zoomWindow = document.createElement('div');
    this.zoomWindow.className = 'zoomWindow';
    this.zoomWindow.style.cssText =
      'z-index:999;left:' + this.windowOffsetLeft + 'px;top:' + this.windowOffsetTop + 'px;' + zoomWindowStyle;
    this.zoomWindow.innerHTML = '\u00A0';
    this.zoomWindow.style.backgroundImage = "url('" + this.imageSrc.replace(/'/g, "%27") + "')";
    this.zoomContainer.appendChild(this.zoomWindow);
    this.isWindowSet = true;

    this._attachEvents();
  };

  ElevateZoom.prototype._calcWindowOffset = function () {
    var a = this;
    var zW = this.options.zoomWindowWidth;
    var zH = this.options.zoomWindowHeight;
    var border = this.options.borderSize;
    var nzW = this.nzWidth;
    var nzH = this.nzHeight;
    var zoomWinEl = this.zoomWindow;
    var winW = (zoomWinEl && zoomWinEl.offsetWidth) ? zoomWinEl.offsetWidth : zW;
    var winH = (zoomWinEl && zoomWinEl.offsetHeight) ? zoomWinEl.offsetHeight : zH;

    switch (a.options.zoomWindowPosition) {
      case 1: a.windowOffsetTop = a.options.zoomWindowOffety; a.windowOffsetLeft = nzW; break;
      case 2: if (zH > nzH) a.windowOffsetTop = -((zH / 2) - (nzH / 2)); a.windowOffsetLeft = nzW; break;
      case 3: a.windowOffsetTop = nzH - winH - 2 * border; a.windowOffsetLeft = nzW; break;
      case 4: a.windowOffsetTop = nzH; a.windowOffsetLeft = nzW; break;
      case 5: a.windowOffsetTop = nzH; a.windowOffsetLeft = nzW - winW - 2 * border; break;
      case 6: if (zH > nzH) { a.windowOffsetTop = nzH; a.windowOffsetLeft = -((zW / 2) - (nzW / 2) + 2 * border); } break;
      case 7: a.windowOffsetTop = nzH; a.windowOffsetLeft = 0; break;
      case 8: a.windowOffsetTop = nzH; a.windowOffsetLeft = -(winW + 2 * border); break;
      case 9: a.windowOffsetTop = nzH - winH - 2 * border; a.windowOffsetLeft = -(winW + 2 * border); break;
      case 10: if (zH > nzH) a.windowOffsetTop = -((zH / 2) - (nzH / 2)); a.windowOffsetLeft = -(winW + 2 * border); break;
      case 11: a.windowOffsetTop = a.options.zoomWindowOffety; a.windowOffsetLeft = -(winW + 2 * border); break;
      case 12: a.windowOffsetTop = -(winH + 2 * border); a.windowOffsetLeft = -(winW + 2 * border); break;
      case 13: a.windowOffsetTop = -(winH + 2 * border); a.windowOffsetLeft = 0; break;
      case 14: if (zH > nzH) { a.windowOffsetTop = -(winH + 2 * border); a.windowOffsetLeft = -((zW / 2) - (nzW / 2) + 2 * border); } break;
      case 15: a.windowOffsetTop = -(winH + 2 * border); a.windowOffsetLeft = nzW - winW - 2 * border; break;
      case 16: a.windowOffsetTop = -(winH + 2 * border); a.windowOffsetLeft = nzW; break;
      default: a.windowOffsetTop = a.options.zoomWindowOffety; a.windowOffsetLeft = nzW;
    }
    a.windowOffsetTop += a.options.zoomWindowOffety;
    a.windowOffsetLeft += a.options.zoomWindowOffetx;
  };

  ElevateZoom.prototype._onTouchMove = function (e) {
    var t = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches[0];
    if (t) { e.preventDefault(); this.setPosition(t); }
  };

  ElevateZoom.prototype._onTouchEnd = function () {
    this.showHideWindow('hide');
    if (this.options.showLens) this.showHideLens('hide');
  };

  ElevateZoom.prototype._attachEvents = function () {
    var self = this;
    function mousemove(e) {
      if (!self.overWindow) self.setElements('show');
      if (self.lastX !== e.clientX || self.lastY !== e.clientY) {
        self.setPosition(e);
        self.currentLoc = e;
      }
      self.lastX = e.clientX;
      self.lastY = e.clientY;
    }
    function mouseleave() {
      if (!self.scrollLock) self.setElements('hide');
    }
    function windowEnter() { self.overWindow = true; self.setElements('hide'); }
    function windowLeave() { self.overWindow = false; }

    this.elem.addEventListener('mousemove', mousemove);
    this.zoomContainer.addEventListener('mousemove', mousemove);
    this.zoomLens.addEventListener('mousemove', mousemove);
    this.elem.addEventListener('mouseenter', this._boundSetElementsShow);
    this.zoomContainer.addEventListener('mouseenter', this._boundSetElementsShow);
    this.elem.addEventListener('mouseleave', mouseleave);
    this.zoomContainer.addEventListener('mouseleave', mouseleave);
    this.zoomWindow.addEventListener('mouseenter', windowEnter);
    this.zoomWindow.addEventListener('mouseleave', windowLeave);

    this.elem.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    this.zoomContainer.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    this.elem.addEventListener('touchend', this._boundTouchEnd);
    this.zoomContainer.addEventListener('touchend', this._boundTouchEnd);
    this.zoomLens.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    this.zoomLens.addEventListener('touchend', this._boundTouchEnd);
  };

  ElevateZoom.prototype.setElements = function (mode) {
    if (!this.options.zoomEnabled) return;
    if (mode === 'show' && this.isWindowSet) {
      this.showHideWindow('show');
      if (this.options.showLens) this.showHideLens('show');
    } else if (mode === 'hide') {
      this.showHideWindow('hide');
      if (this.options.showLens) this.showHideLens('hide');
    }
  };

  ElevateZoom.prototype.showHideWindow = function (mode) {
    if (mode === 'show' && !this.isWindowActive) {
      this.zoomWindow.style.display = 'block';
      this.isWindowActive = true;
    } else if (mode === 'hide' && this.isWindowActive) {
      this.zoomWindow.style.display = 'none';
      this.isWindowActive = false;
    }
  };

  ElevateZoom.prototype.showHideLens = function (mode) {
    if (mode === 'show' && !this.isLensActive) {
      this.zoomLens.style.display = 'block';
      this.isLensActive = true;
    } else if (mode === 'hide' && this.isLensActive) {
      this.zoomLens.style.display = 'none';
      this.isLensActive = false;
    }
  };

  ElevateZoom.prototype.setPosition = function (e) {
    if (!this.options.zoomEnabled) return;
    var pageX = e.pageX != null ? e.pageX : e.clientX + (window.scrollX || document.documentElement.scrollLeft);
    var pageY = e.pageY != null ? e.pageY : e.clientY + (window.scrollY || document.documentElement.scrollTop);

    this.nzOffset = getPageOffset(this.elem);
    this.nzWidth = this.elem.offsetWidth;
    this.nzHeight = this.elem.offsetHeight;

    this.zoomContainer.style.top = this.nzOffset.top + 'px';
    this.zoomContainer.style.left = this.nzOffset.left + 'px';

    var mouseLeft = parseInt(pageX - this.nzOffset.left, 10);
    var mouseTop = parseInt(pageY - this.nzOffset.top, 10);

    if (mouseLeft <= 0 || mouseTop <= 0 || mouseLeft > this.nzWidth || mouseTop > this.nzHeight) {
      this.setElements('hide');
      return;
    }

    var lensW = this.zoomLens.offsetWidth;
    var lensH = this.zoomLens.offsetHeight;
    this.Etoppos = mouseTop < lensH / 2;
    this.Eboppos = mouseTop > this.nzHeight - lensH / 2 - 2 * this.options.lensBorderSize;
    this.Eloppos = mouseLeft < lensW / 2;
    this.Eroppos = mouseLeft > this.nzWidth - lensW / 2 - 2 * this.options.lensBorderSize;

    var lensLeftPos = mouseLeft - lensW / 2;
    var lensTopPos = mouseTop - lensH / 2;
    if (this.Etoppos) lensTopPos = 0;
    if (this.Eloppos) lensLeftPos = 0;
    if (this.Eboppos) lensTopPos = Math.max(this.nzHeight - lensH - 2 * this.options.lensBorderSize, 0);
    if (this.Eroppos) lensLeftPos = this.nzWidth - lensW - 2 * this.options.lensBorderSize;

    if (this.options.showLens) {
      this.zoomLens.style.left = lensLeftPos + 'px';
      this.zoomLens.style.top = lensTopPos + 'px';
    }

    this._setWindowPosition(pageX, pageY);
  };

  ElevateZoom.prototype._setWindowPosition = function (pageX, pageY) {
    var a = this;
    a._calcWindowOffset();
    a.zoomWindow.style.top = a.windowOffsetTop + 'px';
    a.zoomWindow.style.left = a.windowOffsetLeft + 'px';

    var winW = a.zoomWindow.offsetWidth;
    var winH = a.zoomWindow.offsetHeight;
    var windowLeftPos = -1 * ((pageX - a.nzOffset.left) * a.widthRatio - winW / 2);
    var windowTopPos = -1 * ((pageY - a.nzOffset.top) * a.heightRatio - winH / 2);

    if (a.Etoppos) windowTopPos = 0;
    if (a.Eloppos) windowLeftPos = 0;
    if (a.Eboppos) windowTopPos = -1 * (a.largeHeight / a.currentZoomLevel - winH);
    if (a.Eroppos) windowLeftPos = -1 * (a.largeWidth / a.currentZoomLevel - winW);

    if (a.zoomLock === 1) {
      if (a.widthRatio <= 1) windowLeftPos = 0;
      if (a.heightRatio <= 1) windowTopPos = 0;
    }
    if (a.largeHeight < a.options.zoomWindowHeight) windowTopPos = 0;
    if (a.largeWidth < a.options.zoomWindowWidth) windowLeftPos = 0;

    a.zoomWindow.style.backgroundPosition = windowLeftPos + 'px ' + windowTopPos + 'px';
  };

  ElevateZoom.prototype.changeState = function (state) {
    if (state === 'enable') this.options.zoomEnabled = true;
    if (state === 'disable') this.options.zoomEnabled = false;
  };

  ElevateZoom.prototype.getCurrentImage = function () {
    return this.zoomImage;
  };

  ElevateZoom.prototype.destroy = function () {
    if (this.zoomContainer && this.zoomContainer.parentNode) {
      this.zoomContainer.parentNode.removeChild(this.zoomContainer);
    }
    this.zoomContainer = null;
    this.zoomLens = null;
    this.zoomWindow = null;
  };

  function elevateZoom(elem, options) {
    if (typeof elem === 'string') elem = document.querySelector(elem);
    if (!elem || !elem.tagName || elem.tagName.toUpperCase() !== 'IMG') return null;
    var instance = new ElevateZoom(elem, options || {});
    instance.init();
    elem._elevateZoom = instance;
    return instance;
  }

  elevateZoom.ElevateZoom = ElevateZoom;
  elevateZoom.defaultOptions = defaultOptions;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = elevateZoom;
  } else {
    global.elevateZoom = elevateZoom;
  }
})(typeof window !== 'undefined' ? window : this);
