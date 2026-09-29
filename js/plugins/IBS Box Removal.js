/*:
 * @plugindesc YEP InBattleStatus: remove dark background behind attribute lines (actor & enemy)
 * @author Copilot
 */
(function(){
  'use strict';

  // Helper to patch a prototype's drawParam if present
  function removeDarkRectFrom(protoName) {
    var proto = window[protoName] && window[protoName].prototype;
    if (!proto || !proto.drawParam) return false;
    proto.__orig_drawParam = proto.__orig_drawParam || proto.drawParam;
    proto.drawParam = function(paramId, showStats, dx, dy, dw, dh) {
      // Same logic as original but skip drawDarkRect
      var level = this._battler._buffs[paramId];
      var icon = this._battler.buffIconIndex(level, paramId);
      this.drawIcon(icon, dx + 2, dy + 2);
      dx += Window_Base._iconWidth + 4;
      dw -= Window_Base._iconWidth + 4 + this.textPadding() + 2;
      this.changeTextColor(this.systemColor());
      this.drawText(TextManager.param(paramId), dx, dy, dw);
      var value = this._battler.param(paramId);
      this.changeTextColor(this.paramchangeTextColor(level));
      this.drawText(showStats ? Yanfly.Util.toGroup(value) : ADRI.Params.UnknownStat, dx, dy, dw, 'right');
    };
    return true;
  }

  var patched = false;
  patched = removeDarkRectFrom('Window_InBattleStatus') || patched;
  patched = removeDarkRectFrom('Window_InBattleEnemyStatus') || patched;
  patched = removeDarkRectFrom('Window_BattleStatus') || patched; // fallback for other systems

  if (!patched) console.warn('YEP dark-rect patch: no target prototypes found to patch.');
  else console.log('YEP dark-rect patch applied.');
})();
