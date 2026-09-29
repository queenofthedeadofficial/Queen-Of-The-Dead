(function() {

const _removeState = Game_Battler.prototype.removeState;

Game_Battler.prototype.removeState = function(stateId) {

    if (stateId !== 1) {
        console.log(
            "REMOVE STATE",
            stateId,
            $dataStates[stateId] ? $dataStates[stateId].name : "",
            "FROM",
            this.name()
        );
        console.trace();
    }

    _removeState.call(this, stateId);
};

})();