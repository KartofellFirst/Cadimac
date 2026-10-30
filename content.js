
(() => {
  if (window.__tcTouch) return;
  window.__tcTouch = true;

  const IDLE_MS = 90;
  const SCALE = 1;
  const SIGN_X = -1;
  const SIGN_Y = -1;
  const DEBUG = false;
  let drag = null;

  const log = (...a) => DEBUG && console.log('[tc-touch]', ...a);

  function inScrollable(el) {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      const oy = s.overflowY, ox = s.overflowX;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  }

  function isViewport(el) {
    if (!el) return false;
    if (el.tagName === 'CANVAS') return true;
    if (inScrollable(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > innerWidth * 0.5 && r.height > innerHeight * 0.5;
  }

  function fire(target, type, x, y, shiftKey) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      button: type === 'mousemove' ? 0 : 2,
      buttons: type === 'mouseup' ? 0 : 2,
      shiftKey: !!shiftKey,
    }));
  }

  function endDrag(shiftKey) {
    if (!drag) return;
    clearTimeout(drag.timer);
    fire(drag.target, 'mouseup', drag.x, drag.y, shiftKey);
    log('mouseup', drag.x, drag.y);
    drag = null;
  }

  function onWheel(e) {
    if (e.ctrlKey || e.metaKey) return;

    if (!drag) {
      log('wheel over', e.target && e.target.tagName, e.target && e.target.className);
      if (!isViewport(e.target)) return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!drag) {
      drag = { target: e.target, x: e.clientX, y: e.clientY, timer: 0 };
      fire(drag.target, 'mousedown', drag.x, drag.y, e.shiftKey);
      log('mousedown', drag.x, drag.y);
    }

    drag.x += e.deltaX * SIGN_X * SCALE;
    drag.y += e.deltaY * SIGN_Y * SCALE;
    fire(drag.target, 'mousemove', drag.x, drag.y, e.shiftKey);

    clearTimeout(drag.timer);
    const shift = e.shiftKey;
    drag.timer = setTimeout(() => endDrag(shift), IDLE_MS);
  }

  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  log('installed');
})();
