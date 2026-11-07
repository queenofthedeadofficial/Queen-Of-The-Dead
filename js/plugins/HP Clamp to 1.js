(function() {

var STATE_ID = 75; // change this to your state ID

const _Game_BattlerBase_setHp = Game_BattlerBase.prototype.setHp;
Game_BattlerBase.prototype.setHp = function(hp) {
    if (this.isStateAffected(STATE_ID) && hp <= 0) {
        hp = 1;
    }
    _Game_BattlerBase_setHp.call(this, hp);
};

})();