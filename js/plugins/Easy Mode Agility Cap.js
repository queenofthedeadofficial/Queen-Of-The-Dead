//=============================================================================
// EnemyAgilityCap.js
//=============================================================================

/*:
 * @plugindesc v1.0 Caps the maximum Agility of all enemies while a switch is OFF.
 * @author Andrew
 *
 * @param Switch ID
 * @type switch
 * @desc While this switch is OFF, enemy Agility is capped.
 * @default 606
 *
 * @param Agility Cap
 * @type number
 * @min 1
 * @desc The maximum Agility enemies can have while the switch is OFF.
 * @default 5
 *
 * @help
 * While the chosen switch is OFF, the maximum Agility of every enemy is
 * limited to the Agility Cap value (default 5). While the switch is ON, the
 * cap is removed and enemies use the normal parameter maximum.
 *
 * The cap applies to the final Agility value, including buffs, states and
 * trait bonuses, and is checked live, so toggling the switch mid-battle takes
 * effect immediately. Actors are not affected. No plugin commands.
 */

(function() {
    'use strict';

    var pluginName = 'EnemyAgilityCap';
    var params = PluginManager.parameters(pluginName);
    var switchId = Number(params['Switch ID'] || 606);
    var agilityCap = Number(params['Agility Cap'] || 5);

    var AGI_PARAM_ID = 6;

    var _Game_Enemy_paramMax = Game_Enemy.prototype.paramMax;
    Game_Enemy.prototype.paramMax = function(paramId) {
        var max = _Game_Enemy_paramMax.call(this, paramId);
        if (paramId === AGI_PARAM_ID && $gameSwitches && !$gameSwitches.value(switchId)) {
            return Math.min(max, agilityCap);
        }
        return max;
    };

})();