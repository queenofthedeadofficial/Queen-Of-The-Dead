//=============================================================================
// EnemyHPTextColor.js
//=============================================================================

/*:
 * @plugindesc Changes enemy HP text color based on remaining HP percentage.
 * Requires YEP_X_VisualHpGauge.
 *
 * @help
 * Enemy HP values:
 *   Above 50%  = White
 *   1-50%      = Yellow
 *   0 HP       = Red
 *
 */

(function() {

    if (!Imported.YEP_X_VisualHpGauge) return;

    var _drawCurrentAndMax =
        Window_VisualHPGauge.prototype.drawCurrentAndMax;

    Window_VisualHPGauge.prototype.drawCurrentAndMax =
    function(current, max, x, y, width, color1, color2) {

        if (this._battler && this._battler.isEnemy()) {

            var hpRate = current / max;

            if (current <= 0) {
                color1 = '#ff6666';
            } else if (hpRate <= 0.5) {
                color1 = '#ffff66';
            } else {
                color1 = '#ffffff';
            }

            color2 = color1;
        }

        _drawCurrentAndMax.call(
            this,
            current,
            max,
            x,
            y,
            width,
            color1,
            color2
        );

    };

})();