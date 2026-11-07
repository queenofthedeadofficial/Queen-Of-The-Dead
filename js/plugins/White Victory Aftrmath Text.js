/*:
 * @plugindesc Force Victory Aftermath level/EXP labels to white (color 0). Combined version. Place below YEP_VictoryAftermath.
 * @author Minimal (combined)
 * @help
 * Forces the Victory Aftermath "Gained EXP" label/value and the level label
 * (TextManager.levelA) to white (color index 0). Keep this plugin below
 * YEP_VictoryAftermath so Window_VictoryExp is defined when overrides run.
 */

(function() {

  // Force the "level / exp values" text to white
  Window_VictoryExp.prototype.drawExpValues = function(actor, rect) {
    var wy = rect.y + this.lineHeight();
    var actorLv = actor._preVictoryLv;
    var bonusExp = 1.0 * actor._expGained * this._tick / Yanfly.Param.VAGaugeTicks;
    var nowExp = actor._preVictoryExp - actor.expForLevel(actorLv) + bonusExp;
    var nextExp = actor.expForLevel(actorLv + 1) - actor.expForLevel(actorLv);
    if (actorLv === actor.maxLevel()) {
      var text = Yanfly.Param.VAMaxLv;
    } else if (nowExp >= nextExp) {
      var text = Yanfly.Param.VALevelUp;
    } else {
      var text = Yanfly.Util.toGroup(parseInt(nextExp - nowExp));
    }
    // Force white for the right-hand value text
    this.changeTextColor(this.textColor(0));
    this.drawText(text, rect.x + 2, wy, rect.width - 4, 'right');
  };

  // Force the "Gained EXP" label and value to white
  Window_VictoryExp.prototype.drawExpGained = function(actor, rect) {
    var wy = rect.y + this.lineHeight() * 2;
    if (wy >= rect.y + rect.height) return;
    // Force white for the label
    this.changeTextColor(this.textColor(0));
    this.drawText(Yanfly.Param.VAGainedExp, rect.x + 2, wy, rect.width - 4, 'left');
    var bonusExp = 1.0 * actor._expGained * this._tick / Yanfly.Param.VAGaugeTicks;
    var expParse = Yanfly.Util.toGroup(parseInt(bonusExp));
    var expText = Yanfly.Param.VAGainedExpfmt.format(expParse);
    // Force white for the value
    this.changeTextColor(this.textColor(0));
    this.drawText(expText, rect.x + 2, wy, rect.width - 4, 'right');
  };

  // Force the "Level" label (TextManager.levelA) to white while keeping the numeric level color unchanged.
  Window_VictoryExp.prototype.drawLevel = function(actor, rect) {
    // Draw the numeric level (keep original numeric color)
    this.changeTextColor(this.normalColor());
    if (this.actorExpRate(actor) >= 1.0) {
      var text = Yanfly.Util.toGroup(actor._postVictoryLv);
    } else {
      var text = Yanfly.Util.toGroup(actor._preVictoryLv);
    }
    this.drawText(text, rect.x + 2, rect.y, rect.width - 4, 'right');

    // Calculate width for the label area
    var ww = rect.width - 4 - this.textWidth('0' + Yanfly.Util.toGroup(actor.maxLevel()));

    // Force the label color to white (color index 0)
    this.changeTextColor(this.textColor(0));
    this.drawText(TextManager.levelA, rect.x + 2, rect.y, ww, 'right');
  };

})();
