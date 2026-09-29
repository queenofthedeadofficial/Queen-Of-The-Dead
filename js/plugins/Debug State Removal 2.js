const _startInput = BattleManager.startInput;
BattleManager.startInput = function() {
    console.log("START INPUT", $gameTroop.turnCount());
    console.trace();
    _startInput.call(this);
};