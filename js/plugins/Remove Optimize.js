/*:
 * @plugindesc Remove Optimize from the Equip screen (works with YEP equip). Place after YEP equip plugin.
 * @author You
 * @help
 * Removes the Optimize command from the equip command window and disables its handler.
 */
(function(){
  'use strict';

  // Patch Window_EquipCommand.makeCommandList to remove optimize entry
  var _wec_make = Window_EquipCommand.prototype.makeCommandList;
  Window_EquipCommand.prototype.makeCommandList = function() {
    _wec_make.call(this);
    try {
      if (this._list && Array.isArray(this._list)) {
        var idx = this._list.findIndex(function(c){ return c && c.symbol === 'optimize'; });
        if (idx >= 0) this._list.splice(idx, 1);
      }
    } catch(e) {
      console.error('PH_RemoveOptimizeEquip: error removing optimize command', e);
    }
  };

  // Neutralize the optimize handler on Scene_Equip if present
  if (typeof Scene_Equip !== 'undefined') {
    if (typeof Scene_Equip.prototype.commandOptimize === 'function') {
      Scene_Equip.prototype.commandOptimize = function() {
        // no-op to prevent any optimize behavior
        if (typeof SoundManager !== 'undefined' && SoundManager.playCancel) SoundManager.playCancel();
      };
    }
    // Some YEP versions may use a different handler name; also guard for common alternatives
    if (typeof Scene_Equip.prototype.onOptimize === 'function') {
      Scene_Equip.prototype.onOptimize = function() {
        if (typeof SoundManager !== 'undefined' && SoundManager.playCancel) SoundManager.playCancel();
      };
    }
  }

  console.log('PH_RemoveOptimizeEquip: installed.');
})();
