//=============================================================================
// EnemyHPDisplayColor.js
//=============================================================================

/*:
 * @plugindesc Displays enemy current/max HP values and colors enemy HP label #b0ff90.
 * @author ChatGPT
 *
 * @help
 * Requires YEP_X_VisualHpGauge.js
 *
 * Enemy HP label ("HP") is drawn in #b0ff90.
 * Enemy current/max HP values are displayed normally.
 * Actors are unaffected.
 *
 */

(function() {

    if (!Imported.YEP_X_VisualHpGauge) return;

    var _drawActorHp = Window_VisualHPGauge.prototype.drawActorHp;

    Window_VisualHPGauge.prototype.drawActorHp = function(actor, x, y, width) {

        if (actor.isEnemy()) {

            var oldShowHP = Yanfly.Param.VHGShowHP;
            var oldShowValue = Yanfly.Param.VHGShowValue;
            var oldShowMax = Yanfly.Param.VHGShowMax;

            // Enable HP label and current/max values
            Yanfly.Param.VHGShowHP = true;
            Yanfly.Param.VHGShowValue = true;
            Yanfly.Param.VHGShowMax = true;

            var oldSystemColor = this.systemColor;

            // Change only the "HP" label color
            this.systemColor = function() {
                return '#b0ff90';
            };

            _drawActorHp.call(this, actor, x, y, width);

            // Restore original settings
            this.systemColor = oldSystemColor;
            Yanfly.Param.VHGShowHP = oldShowHP;
            Yanfly.Param.VHGShowValue = oldShowValue;
            Yanfly.Param.VHGShowMax = oldShowMax;

        } else {

            _drawActorHp.call(this, actor, x, y, width);

        }

    };

})();