/*:
 * @plugindesc ADRI/YEP: prevent attribute stacking by clearing param area before draw
 * @author Copilot
 */
(function(){
  'use strict';

  // Target prototypes to patch. Add or remove class names depending on your setup.
  var targets = [
    'Window_InBattleStatus',
    'Window_InBattleEnemyStatus',
    'Window_BattleStatus',
    'Window_InBattleEnemyStateList' // optional, remove if not present
  ];

  targets.forEach(function(name){
    var cls = window[name];
    if (!cls || !cls.prototype) return;
    var proto = cls.prototype;
    // Keep original if present
    if (!proto.__orig_drawParam) proto.__orig_drawParam = proto.drawParam;

    proto.drawParam = function(paramId, showStats, dx, dy, dw, dh) {
      // Clear the area where the param will be drawn to avoid stacking
      try {
        // Slightly expand the clear rect to be safe
        var pad = 2;
        this.contents.clearRect(dx - pad, dy - pad, dw + pad * 2, dh + pad * 2);
      } catch (e) {
        // If clearRect isn't available for some reason, fallback to drawing a fully transparent rect
        try { this.contents.fillRect(dx, dy, dw, dh, 'rgba(0,0,0,0)'); } catch (e2) {}
      }

      // Draw icon and text (same visual as earlier override but without dark box)
      var level = this._battler && this._battler._buffs ? this._battler._buffs[paramId] : 0;
      var icon = this._battler && this._battler.buffIconIndex ? this._battler.buffIconIndex(level, paramId) : 0;
      if (icon) this.drawIcon(icon, dx + 2, dy + 2);
      dx += Window_Base._iconWidth + 4;
      dw -= Window_Base._iconWidth + 4 + this.textPadding() + 2;
      this.changeTextColor(this.systemColor());
      this.drawText(TextManager.param(paramId), dx, dy, dw);
      var value = this._battler && this._battler.param ? this._battler.param(paramId) : 0;
      this.changeTextColor(this.paramchangeTextColor ? this.paramchangeTextColor(level) : this.normalColor());
      // Use Yanfly util if available, otherwise plain value
      var out = (typeof Yanfly !== 'undefined' && Yanfly.Util && Yanfly.Util.toGroup) ? Yanfly.Util.toGroup(value) : String(value);
      this.drawText(showStats ? out : (ADRI && ADRI.Params ? ADRI.Params.UnknownStat : '???'), dx, dy, dw, 'right');
    };
  });

  console.log('Attribute clear patch applied to:', targets.filter(function(n){ return window[n] && window[n].prototype; }));
})();
