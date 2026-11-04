/*:
 * @plugindesc Hides EXP section for Actors 1-3 in YEP_StatusMenuCore.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * Prevents the following from drawing in the General tab of
 * YEP_StatusMenuCore for Actors 1, 2, and 3:
 *
 * - Current EXP label
 * - Current EXP value
 * - Next Level label
 * - EXP to next level value
 * - EXP gauges
 * - Total EXP for next level section
 *
 * Other actors remain unaffected.
 *
 * Place BELOW YEP_StatusMenuCore.
 * ============================================================================
 */

(function() {
    'use strict';

    var _Window_StatusInfo_drawGeneralExp =
        Window_StatusInfo.prototype.drawGeneralExp;

    Window_StatusInfo.prototype.drawGeneralExp = function(dx, dy, dw, dh) {
        if (this._actor && this._actor.actorId() >= 1 &&
            this._actor.actorId() <= 3) {
            return;
        }

        _Window_StatusInfo_drawGeneralExp.call(this, dx, dy, dw, dh);
    };

})();