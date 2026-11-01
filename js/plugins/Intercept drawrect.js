/*:
 * @plugindesc Runtime interceptor that forces dark UI rectangles to render
 * transparent. Designed to neutralize YEP darkRect panels globally.
 */

(function() {

"use strict";

//------------------------------------------------
// Utility: detect dark rectangle colors
//------------------------------------------------

function isDarkColor(color) {
    if (!color) return false;
    color = color.toLowerCase();

    return (
        color.includes("rgba(0,0,0") ||
        color.includes("rgba(0, 0, 0") ||
        color === "#000000" ||
        color === "#000" ||
        color === "black"
    );
}

//------------------------------------------------
// fillRect interception
//------------------------------------------------

const _fillRect = Bitmap.prototype.fillRect;
Bitmap.prototype.fillRect = function(x, y, width, height, color) {

    if (isDarkColor(color)) {
        color = "rgba(0,0,0,0)";
    }

    _fillRect.call(this, x, y, width, height, color);
};

//------------------------------------------------
// gradientFillRect interception
//------------------------------------------------

const _gradientFillRect = Bitmap.prototype.gradientFillRect;
Bitmap.prototype.gradientFillRect = function(x, y, width, height, color1, color2, vertical) {

    if (isDarkColor(color1)) color1 = "rgba(0,0,0,0)";
    if (isDarkColor(color2)) color2 = "rgba(0,0,0,0)";

    _gradientFillRect.call(this, x, y, width, height, color1, color2, vertical);
};

//------------------------------------------------
// Canvas fallback (some plugins draw directly)
//------------------------------------------------

const _contextFillRect = CanvasRenderingContext2D.prototype.fillRect;
CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {

    if (this.fillStyle) {
        const style = String(this.fillStyle).toLowerCase();
        if (style.includes("rgba(0,0,0") || style === "#000000" || style === "#000") {
            const old = this.fillStyle;
            this.fillStyle = "rgba(0,0,0,0)";
            _contextFillRect.call(this, x, y, w, h);
            this.fillStyle = old;
            return;
        }
    }

    _contextFillRect.call(this, x, y, w, h);
};

})();