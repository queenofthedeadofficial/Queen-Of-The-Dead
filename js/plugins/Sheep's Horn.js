/*:
 * @plugindesc Weapons with <Sheep's Horn> cause the wielder's physical attacks to ignore enemy DEF.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * SHEEP'S HORN
 * ============================================================================
 *
 * Add this notetag to a weapon:
 *
 * <Sheep's Horn>
 *
 * While the weapon is equipped, all physical attacks made by the wielder
 * ignore the target's DEF.
 *
 * This applies to:
 * - The normal Attack command
 * - Physical skills
 *
 * It does not affect:
 * - Magical skills
 * - Certain-hit skills
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //-------------------------------------------------------------------------
    // Game_Action.prototype.evalDamageFormula
    //-------------------------------------------------------------------------
    //
    // Evaluate physical damage formulas while temporarily treating the target's
    // DEF as 0.
    //

    var _Game_Action_evalDamageFormula =
        Game_Action.prototype.evalDamageFormula;

    Game_Action.prototype.evalDamageFormula = function(target) {

        var subject = this.subject();
        var item = this.item();

        // Safety checks
        if (!subject || !item || !target) {
            return _Game_Action_evalDamageFormula.call(this, target);
        }

        // Only physical attacks and skills
        if (item.hitType !== 1) {
            return _Game_Action_evalDamageFormula.call(this, target);
        }

        // Check equipped weapons
        var hasSheepsHorn = subject.weapons &&
            subject.weapons().some(function(weapon) {
                return weapon &&
                    weapon.meta &&
                    weapon.meta["Sheep's Horn"];
            });

        if (!hasSheepsHorn) {
            return _Game_Action_evalDamageFormula.call(this, target);
        }

        // Temporarily override DEF to zero.
        //
        // NOTE: target.def is a getter-only accessor property defined on
        // Game_BattlerBase.prototype (via Object.defineProperty, no setter),
        // the same as hp/atk/mat/etc. You cannot assign to it directly --
        // in strict mode that throws a TypeError, and even without strict
        // mode it silently no-ops, so DEF was never actually being
        // overridden. Instead, define an own property on the target
        // instance, which takes precedence over the prototype's getter
        // when the damage formula reads b.def.
        Object.defineProperty(target, 'def', {
            value: 0,
            configurable: true
        });

        // Evaluate the normal damage formula
        var result =
            _Game_Action_evalDamageFormula.call(this, target);

        // Remove the override so the prototype's normal getter takes
        // over again (rather than trying to reassign a value to it).
        delete target.def;

        return result;
    };

})();