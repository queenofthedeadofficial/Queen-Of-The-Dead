/*:
 * @plugindesc Replaces RPG Maker MV window backgrounds with solid rectangles.
 */

(function() {

const COLOR = "rgba(0,0,0,1)"; // change color here

// Remove frame
Window.prototype._refreshFrame = function() {};

// Remove margin artifacts
Window.prototype._margin = 0;

// Remove padding gaps
Window.prototype.standardPadding = function() {
    return 0;
};

// Draw solid background
Window.prototype._refreshBack = function() {
    const w = this._width;
    const h = this._height;

    this._windowBackSprite.bitmap = new Bitmap(w, h);
    this._windowBackSprite.bitmap.fillAll(COLOR);
};

// Force full opacity
const _Window_update = Window.prototype.update;
Window.prototype.update = function() {
    _Window_update.call(this);
    this.backOpacity = 255;
};

})();