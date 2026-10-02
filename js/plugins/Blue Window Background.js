/*:
 * @plugindesc Fill window interiors with a solid blue (MV) — non-destructive.
 * @author Custom
 */
(function() {
  var BLUE_HEX = "#0B3B8C"; // change to desired blue
  var OPACITY = 255; // 0-255

  var _Window_drawBackground = Window.prototype.drawBackground;
  Window.prototype.drawBackground = function(x, y, width, height) {
    // draw solid fill behind contents (use contents area so borders remain)
    var w = width || this.width;
    var h = height || this.height;
    this.contents.clear();
    this.contents.paintOpacity = OPACITY;
    this.contents.fillRect(0, 0, w, h, BLUE_HEX);
    // then draw the normal frame on top if you want borders preserved
    _Window_drawBackground.call(this, x, y, width, height);
  };

  Window.prototype.backOpacity = function() {
    return OPACITY;
  };
})();
