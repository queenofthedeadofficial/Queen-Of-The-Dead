/*:
 * @plugindesc Gives 1 MP per turn to actors with state 54 and shows a floating number safely. 
 * @author ChatGPT
 *
 * @help
 * Adds 1 MP per actor with state 54 at the end of each turn.
 * Shows a floating number in the default MP color.
 */

(function() {

    var _BattleManager_endTurn = BattleManager.endTurn;
    BattleManager.endTurn = function() {
        _BattleManager_endTurn.call(this);

        $gameParty.members().forEach(function(actor) {
            if (actor.isStateAffected(54)) {
                actor.gainMp(1);
                // Show custom floating number
                if (SceneManager._scene._spriteset) {
                    SceneManager._scene._spriteset.showMpPopup(actor, 1);
                }
            }
        });
    };

    Spriteset_Battle.prototype.showMpPopup = function(actor, amount) {
        var sprite = this._actorSprites.find(function(s) {
            return s._battler === actor;
        });
        if (sprite) {
            sprite.createMpPopup(amount);
        }
    };

    Sprite_Battler.prototype.createMpPopup = function(amount) {
        var popup = new Sprite_Damage();
        popup.setup(this._battler, amount, true); // true = MP
        this.parent.addChild(popup);
    };

})();
