(function() {
    'use strict';

    var ARMOR_NAME = "Cement Shoes";

    var _Game_BattlerBase_param = Game_BattlerBase.prototype.param;

    Game_BattlerBase.prototype.param = function(paramId) {

        // AGI parameter
        if (paramId === 6 && this.isActor()) {

            var hasCementShoes = this.armors().some(function(armor) {
                return armor && armor.name === ARMOR_NAME;
            });

            if (hasCementShoes) {
                return 1;
            }
        }

        return _Game_BattlerBase_param.call(this, paramId);
    };

})();