/*:
 * @plugindesc Hide EXP display for specific actor IDs on the status screen (RMMV).
 */
(function() {
  var _Window_Status_drawExpInfo = Window_Status.prototype.drawExpInfo;
  Window_Status.prototype.drawExpInfo = function(x, y) {
    var actor = this._actor;
    if (actor && [1,2,3].indexOf(actor.actorId()) >= 0) {
      // skip drawing EXP block for these actor IDs
      return;
    }
    _Window_Status_drawExpInfo.call(this, x, y);
  };

  // Optional: also make expTotalValue/expNextValue return dashes for consistency
  var _Window_Status_expTotalValue = Window_Status.prototype.expTotalValue;
  Window_Status.prototype.expTotalValue = function() {
    var actor = this._actor;
    if (actor && [1,2,3].indexOf(actor.actorId()) >= 0) return "-------";
    return _Window_Status_expTotalValue.call(this);
  };

  var _Window_Status_expNextValue = Window_Status.prototype.expNextValue;
  Window_Status.prototype.expNextValue = function() {
    var actor = this._actor;
    if (actor && [1,2,3].indexOf(actor.actorId()) >= 0) return "-------";
    return _Window_Status_expNextValue.call(this);
  };
})();
