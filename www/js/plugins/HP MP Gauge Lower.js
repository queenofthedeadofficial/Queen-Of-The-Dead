/*:
 * @plugindesc Minimal: shift HP/MP/TP gauges down by 15 pixels - place after YEP plugins
 * @help No parameters. Change OFFSET to adjust vertical shift.
 */
(function(){
  var OFFSET = 15; // pixels to move gauges downward

  var _Window_Base_drawGauge = Window_Base.prototype.drawGauge;
  Window_Base.prototype.drawGauge = function(x, y, width, rate, color1, color2) {
    _Window_Base_drawGauge.call(this, x, y + OFFSET, width, rate, color1, color2);
  };
})();
