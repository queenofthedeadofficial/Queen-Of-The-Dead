/*:
 * @plugindesc Runs Common Event 231 when the battle input cursor moves onto Actor 2 while Switch 4987 is OFF.
 * @author ChatGPT
 *
 * @help
 * If Switch 4987 is OFF, moving the battle input cursor onto
 * Actor ID 2 will reserve Common Event 231.
 *
 * Triggers only once each time the cursor enters Actor 2.
 */

(function() {
    "use strict";

    const SWITCH_ID = 4987;
    const ACTOR_ID = 2;
    const COMMON_EVENT_ID = 231;

    let lastActorId = null;

    const _Window_BattleStatus_update = Window_BattleStatus.prototype.update;
    Window_BattleStatus.prototype.update = function() {
        _Window_BattleStatus_update.call(this);

        if (!this.active) {
            lastActorId = null;
            return;
        }

        const actor = this.actor(this.index());
        const actorId = actor ? actor.actorId() : null;

        if (actorId !== lastActorId) {
            if (actorId === ACTOR_ID && !$gameSwitches.value(SWITCH_ID)) {
                $gameTemp.reserveCommonEvent(COMMON_EVENT_ID);
            }
            lastActorId = actorId;
        }
    };
})();