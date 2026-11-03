(function() {
    'use strict';

    var _Game_Action_executeHpDamage = Game_Action.prototype.executeHpDamage;

    Game_Action.prototype.executeHpDamage = function(target, value) {
        _Game_Action_executeHpDamage.call(this, target, value);

        // Configurable IDs
        var SKILL_ID = 205;
        var SWITCH_ID = 511;

        if (!target.isActor()) return;
        if (target.result().hpDamage <= 0) return;

        var item = this.item();
        if (!item) return;

        if (DataManager.isSkill(item) && item.id === SKILL_ID) {
            $gameSwitches.setValue(SWITCH_ID, false);
        }
    };

})();
