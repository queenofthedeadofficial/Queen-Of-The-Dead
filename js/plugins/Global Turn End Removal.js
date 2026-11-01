(function() {

    const _BattleManager_endTurn = BattleManager.endTurn;

    BattleManager.endTurn = function() {

        _BattleManager_endTurn.call(this);

        $gameActors._data.forEach(actor => {

            if (!actor) return;

            // skip active battle members if desired
            if ($gameParty.battleMembers().includes(actor)) return;

            actor.updateStateTurns();
            actor.removeStatesAuto(2);

        });
    };

})();