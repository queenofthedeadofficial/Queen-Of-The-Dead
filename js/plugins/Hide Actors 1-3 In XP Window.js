//=============================================================================
// Hide Actors 1-3 From Victory EXP Window
// Place BELOW YEP_VictoryAftermath.js
//=============================================================================

/*:
 * @plugindesc Prevents actors 1-3 from appearing in the Victory EXP window.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * Actors with database IDs 1, 2, and 3 will not have their EXP data drawn
 * in the YEP_VictoryAftermath EXP window.
 *
 * This only affects the visual display.
 * EXP is still awarded normally.
 *
 * Place BELOW YEP_VictoryAftermath.js
 * ============================================================================
 */

(function() {

    //--------------------------------------------------------------------------
    // Replace visible actor list
    //--------------------------------------------------------------------------

    Window_VictoryExp.prototype.visibleBattleMembers = function() {
        return $gameParty.battleMembers().filter(function(actor) {
            return actor.actorId() > 3;
        });
    };

    //--------------------------------------------------------------------------
    // Use filtered count
    //--------------------------------------------------------------------------

    Window_VictoryExp.prototype.maxItems = function() {
        return this.visibleBattleMembers().length;
    };

    //--------------------------------------------------------------------------
    // Draw actor face/profile
    //--------------------------------------------------------------------------

    Window_VictoryExp.prototype.drawItem = function(index) {
        var actor = this.visibleBattleMembers()[index];
        if (!actor) return;
        this.drawActorProfile(actor, index);
    };

    //--------------------------------------------------------------------------
    // Draw gauges/info
    //--------------------------------------------------------------------------

    Window_VictoryExp.prototype.drawItemGauge = function(index) {
        var actor = this.visibleBattleMembers()[index];
        if (!actor) return;
        this.drawActorGauge(actor, index);
    };

})();