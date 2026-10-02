/*:
 * @plugindesc Allows negative HP during regeneration and prevents state removal during the regeneration phase. v1.1
 * @author ChatGPT
 *
 * @help
 * During regeneration:
 *
 * - HP minimum clamp becomes -99.
 * - States are protected from being removed.
 * - Death cleanup is delayed until regeneration finishes.
 *
 * After regeneration:
 *
 * - HP below 0 is set to 0.
 * - If HP is 0, normal death processing occurs.
 *
 * This is designed for situations where a battler can hit 0 HP
 * from slip damage and recover before regeneration ends.
 */

(function() {

    var inRegeneration = false;
    var pendingDeath = false;


    //-------------------------------------------------------------------------
    // Track regeneration phase
    //-------------------------------------------------------------------------

    var _Game_Battler_regenerateAll =
        Game_Battler.prototype.regenerateAll;

    Game_Battler.prototype.regenerateAll = function() {

        inRegeneration = true;
        pendingDeath = false;

        _Game_Battler_regenerateAll.call(this);

        inRegeneration = false;


        // Finish HP cleanup after regeneration
        if (this._hp < 0) {
            this._hp = 0;
        }


        // Now allow death normally
        if (this._hp <= 0) {
            this.die();
        }

        this.refresh();
    };


    //-------------------------------------------------------------------------
    // Allow negative HP during regeneration only
    //-------------------------------------------------------------------------

    var _Game_BattlerBase_setHp =
        Game_BattlerBase.prototype.setHp;

    Game_BattlerBase.prototype.setHp = function(hp) {

        if (inRegeneration) {
            this._hp = hp.clamp(-99, this.mhp);
            return;
        }

        _Game_BattlerBase_setHp.call(this, hp);
    };


    //-------------------------------------------------------------------------
    // Prevent death cleanup during regeneration
    //-------------------------------------------------------------------------

    var _Game_BattlerBase_die =
        Game_BattlerBase.prototype.die;

    Game_BattlerBase.prototype.die = function() {

        if (inRegeneration) {
            pendingDeath = true;
            return;
        }

        _Game_BattlerBase_die.call(this);
    };


    //-------------------------------------------------------------------------
    // Preserve states during regeneration
    //-------------------------------------------------------------------------
    // Some plugins call clearStates() when HP reaches 0.
    // Block it while regeneration is active.

    var _Game_BattlerBase_clearStates =
        Game_BattlerBase.prototype.clearStates;

    Game_BattlerBase.prototype.clearStates = function() {

        if (inRegeneration) {
            return;
        }

        _Game_BattlerBase_clearStates.call(this);
    };


})();