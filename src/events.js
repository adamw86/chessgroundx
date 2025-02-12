import * as drag from './drag.js';
import * as draw from './draw.js';
import * as pocket from './pocket.js';
import { isRightButton } from './util.js';
export function bindBoard(s, onResize) {
    const boardEl = s.dom.elements.board;
    // In case of zooming boards in bughouse, observing s.dom.elements.wrap
    // causes recursive onResize calls, so we will just observe the document.body
    const target = (s.dimensionsCssVarsSuffix) ? document.body : s.dom.elements.wrap;
    if ('ResizeObserver' in window)
        new ResizeObserver(onResize).observe(target);
    if (s.viewOnly)
        return;
    // Cannot be passive, because we prevent touch scrolling and dragging of
    // selected elements.
    const onStart = startDragOrDraw(s);
    boardEl.addEventListener('touchstart', onStart, {
        passive: false,
    });
    boardEl.addEventListener('mousedown', onStart, {
        passive: false,
    });
    if (s.disableContextMenu || s.drawable.enabled) {
        boardEl.addEventListener('contextmenu', e => e.preventDefault());
    }
}
// returns the unbind function
export function bindDocument(s, onResize) {
    const unbinds = [];
    // Old versions of Edge and Safari do not support ResizeObserver. Send
    // chessground.resize if a user action has changed the bounds of the board.
    if (!('ResizeObserver' in window))
        unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
    if (!s.viewOnly) {
        const onmove = dragOrDraw(s, drag.move, draw.move);
        const onend = dragOrDraw(s, drag.end, draw.end);
        for (const ev of ['touchmove', 'mousemove'])
            unbinds.push(unbindable(document, ev, onmove));
        for (const ev of ['touchend', 'mouseup'])
            unbinds.push(unbindable(document, ev, onend));
        const onScroll = () => s.dom.bounds.clear();
        unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
        const pocketTop = s.dom.elements.pocketTop;
        const pocketBottom = s.dom.elements.pocketBottom;
        const pocketStart = startDragOrDrawPocket(s);
        [pocketTop, pocketBottom].forEach(el => {
            if (el) {
                for (const ev of ['touchstart', 'mousedown'])
                    unbinds.push(unbindable(el, ev, pocketStart));
                if (s.disableContextMenu || s.drawable.enabled)
                    unbinds.push(unbindable(el, 'contextmenu', e => e.preventDefault()));
            }
        });
    }
    return () => unbinds.forEach(f => f());
}
function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback, options);
}
const startDragOrDraw = (s) => e => {
    if (s.draggable.current)
        drag.cancel(s);
    else if (s.drawable.current)
        draw.cancel(s);
    else if (e.shiftKey || isRightButton(e)) {
        if (s.drawable.enabled)
            draw.start(s, e);
    }
    else if (!s.viewOnly) {
        drag.start(s, e);
    }
};
const startDragOrDrawPocket = (s) => e => {
    if (s.draggable.current)
        drag.cancel(s);
    else if (s.drawable.current)
        draw.cancel(s);
    else if (e.shiftKey || isRightButton(e)) {
        if (s.drawable.enabled)
            draw.start(s, e);
    }
    else if (!s.viewOnly) {
        pocket.drag(s, e);
    }
};
const dragOrDraw = (s, withDrag, withDraw) => e => {
    if (s.drawable.current) {
        if (s.drawable.enabled)
            withDraw(s, e);
    }
    else if (!s.viewOnly)
        withDrag(s, e);
};
