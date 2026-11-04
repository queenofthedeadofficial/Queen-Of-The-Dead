/*:
 * @plugindesc MP Drain Skills - Recover MP equal to actual HP damage dealt.
 * @author Andrew
 *
 * @help
 * Add this notetag to a skill:
 *
 * <Drain MP>
 *
 * The user recovers MP equal to the actual HP damage dealt to the target.
 *
 * Example:
 * Target takes 40 HP damage
 * User recovers 40 MP
 *
 * The amount is based on actual HP lost, so damage cannot restore more MP
 * than the target actually lost.
 */

(function() {

    var _Game_Action_executeHpDamage =
        Game_Action.prototype.executeHpDamage;

    Game_Action.prototype.executeHpDamage = function(target, value) {

        var item = this.item();
        var user = this.subject();

        var oldHp = target.hp;

        _Game_Action_executeHpDamage.call(this, target, value);

        if (item && item.meta && item.meta['Drain MP']) {

            var actualDamage = Math.max(0, oldHp - target.hp);

            if (actualDamage > 0 && user && user.isActor()) {
                user.gainMp(actualDamage);
            }
        }
    };

})();