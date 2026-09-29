/*:
 * @plugindesc Turns OFF switch 485 if any party member takes damage from state 20.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * If any battler in the party takes HP damage from state 20,
 * switch 485 will immediately be turned OFF.
 *
 * This only triggers from state damage (regen/slip damage),
 * not normal attacks or skills.
 *
 * No plugin commands.
 * ============================================================================
 */

(function() {

    var TARGET_STATE_ID = 20;
    var TARGET_SWITCH_ID = 485;

    var _Game_Battler_regenerateHp = Game_Battler.prototype.regenerateHp;
    Game_Battler.prototype.regenerateHp = function() {

        var prevHp = this.hp;

        _Game_Battler_regenerateHp.call(this);

        // Check if battler is an actor in the party
        if (!this.isActor()) return;
        if (!$gameParty.members().contains(this)) return;

        // Must currently have the target state
        if (!this.isStateAffected(TARGET_STATE_ID)) return;

        // HP decreased from regeneration/slip damage
        if (this.hp < prevHp) {
            $gameSwitches.setValue(TARGET_SWITCH_ID, false);
        }
    };

})();