(function() {

    var _makeCommands = Game_Actor.prototype.makeActionCommands;

    Game_Actor.prototype.makeActionCommands = function() {

        var list = _makeCommands.call(this);

        // Only battle context
        if ($gameParty && $gameParty.inBattle && $gameParty.inBattle()) {

            var id = this.actorId();

            if (id >= 4 && id <= 20) {

                list = list.filter(function(cmd) {
                    return cmd && cmd.symbol !== 'equip';
                });

            }
        }

        return list;
    };

})();