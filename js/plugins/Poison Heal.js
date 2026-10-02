//=============================================================================
// Andrew_PoisonPairHeal.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_PoisonPairHeal = true;

var Andrew = Andrew || {};
Andrew.PoisonPairHeal = Andrew.PoisonPairHeal || {};

/*:
 * @plugindesc v1.02 Heals 2 HP at the end of the regen phase if the
 * battler had both State 4 and State 112 at the START of that phase,
 * after all other regen formulas (HP/MP/TP regen, DoT, etc.) have run.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Andrew_PoisonPairHeal.js
 * ============================================================================
 *
 * Snapshots whether both required states are present at the very start
 * of each battler's own regen phase (Game_Battler.prototype.regenerateAll),
 * BEFORE the original regenerateAll runs. The heal is then applied after
 * the original regenerateAll returns, based on that snapshot rather than
 * a live re-check.
 *
 * This matters because the poison state's own DoT tick, processed inside
 * the original regenerateAll, can kill the battler and strip their
 * states (via YEP_BuffsStatesCore's death-state handling, or whatever
 * plugin in your stack clears states on death) before this function
 * returns. A live isStateAffected() check done afterward would then find
 * neither state present anymore, even though the battler legitimately
 * qualified at the start of the phase -- silently skipping the heal that
 * was supposed to counteract the poison in the first place. The snapshot
 * avoids that.
 *
 * ----------------------------------------------------------------------------
 * Load Order
 * ----------------------------------------------------------------------------
 * If you want this heal captured inside Andrew_NetRegenHp.js's net
 * buffering (so it contributes to that phase's single net HP change
 * rather than resolving as its own separate popup), this plugin MUST be
 * placed ABOVE Andrew_NetRegenHp.js in the Plugin Manager list. That
 * way NetRegenHp captures this plugin's regenerateAll as the "original"
 * it wraps, and this heal's gainHp() call happens while NetRegenHp's
 * buffering flag is active.
 *
 * If this plugin is placed BELOW Andrew_NetRegenHp.js instead, this
 * heal will resolve outside that buffering window and show as its own
 * separate, un-netted popup.
 *
 * ----------------------------------------------------------------------------
 * Known interactions
 * ----------------------------------------------------------------------------
 * - Andrew_NetDoTHoTPopup.js consolidates DoT/HoT into a single popup
 *   per phase. The manual startDamagePopup() call here is independent
 *   of that consolidation and may show as a separate popup alongside
 *   the netted one.
 *
 * ============================================================================
 */

(function() {

    var REQUIRED_STATE_1 = 4;
    var REQUIRED_STATE_2 = 112;
    var HEAL_AMOUNT = 2;

    Andrew.PoisonPairHeal.Game_Battler_regenerateAll = Game_Battler.prototype.regenerateAll;
    Game_Battler.prototype.regenerateAll = function() {
        // Snapshot BEFORE the original regen chain runs. Poison's own DoT
        // tick can kill the battler and strip their states before this
        // function returns, so a live re-check afterward would miss
        // battlers who legitimately qualified at the start of the phase.
        var hadBothStates = this.isStateAffected(REQUIRED_STATE_1) &&
            this.isStateAffected(REQUIRED_STATE_2);

        Andrew.PoisonPairHeal.Game_Battler_regenerateAll.call(this);

        if (hadBothStates) {
            var oldHp = this.hp;
            this.gainHp(HEAL_AMOUNT);
            if (this.hp !== oldHp) {
                this.startDamagePopup();
            }
            this.clearResult();
        }
    };

})();