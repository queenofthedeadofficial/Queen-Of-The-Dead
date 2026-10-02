/*:
 * @plugindesc Revives dead allies before item effects when <ReviveBeforeEffects>
 * is present and Actor 2 gained State 28 this turn. Item then applies to all
 * living allies with proper popups.
 */

(function() {

"use strict";

const REVIVE_TAG = /<ReviveBeforeEffects>/i;
const STATE_ID = 28;
const DEATH_STATE_ID = 1;
const REVIVE_HP = 1;

function itemHasTag(item) {
    return item && item.note && REVIVE_TAG.test(item.note);
}

//
// Track when state 28 is applied
//

const _addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    _addState.call(this, stateId);

    if (stateId === STATE_ID) {
        this._state28Turn = BattleManager._turnCount || 0;
    }
};

const _removeState = Game_Battler.prototype.removeState;
Game_Battler.prototype.removeState = function(stateId) {
    _removeState.call(this, stateId);

    if (stateId === STATE_ID) {
        this._state28Turn = null;
    }
};

//
// Revive dead allies
//

function reviveDeadAllies(subject) {

    const unit = subject.friendsUnit();
    const dead = unit.deadMembers();

    dead.forEach(b => {

        if (b.isStateAffected(DEATH_STATE_ID)) {

            b.removeState(DEATH_STATE_ID);
            b.setHp(REVIVE_HP);
            b.refresh();

        }

    });

}

//
// Main action hook
//

const _Game_Action_apply = Game_Action.prototype.apply;

Game_Action.prototype.apply = function(target) {

    // Prevent re-running the custom logic for the same action
    if (this._reviveProcessed) {
        return;
    }

    if (this.isItem()) {

        const item = this.item();

        if (itemHasTag(item)) {

            const actor2 = $gameActors.actor(2);
            const turn = BattleManager._turnCount || 0;

            if (actor2 && actor2._state28Turn === turn) {

                this._reviveProcessed = true;

                const subject = this.subject();
                const unit = subject.friendsUnit();

                reviveDeadAllies(subject);

                const targets = unit.aliveMembers();

                targets.forEach(t => {

                    const tempAction = new Game_Action(subject);
                    tempAction.setItemObject(item);

                    _Game_Action_apply.call(tempAction, t);

                    if (t.result().used) {
                        t.startDamagePopup();
                    }

                });

                if ($gameParty.consumeItem) {
                    $gameParty.consumeItem(item);
                }

                return;

            }

        }

    }

    _Game_Action_apply.call(this, target);

};

})();