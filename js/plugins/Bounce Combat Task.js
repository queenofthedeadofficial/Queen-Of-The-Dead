/*:
 * @plugindesc Turns OFF switch 480 if skills 214-217 deal 1+ HP damage.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Purpose
 * ============================================================================
 * Whenever skills 214, 215, 216, or 217 deal at least 1 HP damage,
 * switch 480 is automatically turned OFF.
 *
 * ============================================================================
 * Installation
 * ============================================================================
 * Can be placed anywhere below the default engine.
 * Compatible with YEP battle plugins.
 * ============================================================================
 */

(function() {
    'use strict';

    const TARGET_SWITCH_ID = 480;
    const TARGET_SKILLS = [214, 215, 216, 217];

    const _Game_Action_executeHpDamage =
        Game_Action.prototype.executeHpDamage;

    Game_Action.prototype.executeHpDamage = function(target, value) {

        _Game_Action_executeHpDamage.call(this, target, value);

        // Only care about positive HP damage
        if (value < 1) return;

        const item = this.item();
        if (!item) return;

        // Check skill IDs
        if (TARGET_SKILLS.includes(item.id)) {
            $gameSwitches.setValue(TARGET_SWITCH_ID, false);
        }
    };

})();