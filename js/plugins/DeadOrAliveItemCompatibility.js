// DeadOrAliveItem + YEP compatibility

(function() {

var _Window_BattleActor_isEnabled =
    Window_BattleActor.prototype.isEnabled;

Window_BattleActor.prototype.isEnabled = function(index) {
    var action = BattleManager.inputtingAction();

    if (action && action.isDeadOrAlive && action.isDeadOrAlive()) {
        return true;
    }

    return _Window_BattleActor_isEnabled.call(this, index);
};

})();