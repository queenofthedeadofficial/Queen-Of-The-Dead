/*:
 * @plugindesc Re-check actor input after <Instant Cast> resolves.
 * Skips dead battlers (State ID 1). Does not interfere with manual turn skipping.
 */
(function() {
    'use strict';
    const DEATH_STATE_ID = 1;

    function isInstantCast(action) {
        if (!action || !action.item()) return false;
        const item = action.item();
        return item.meta && item.meta["Instant Cast"] !== undefined;
    }

    function isDead(actor) {
        return actor && actor.isStateAffected(DEATH_STATE_ID);
    }

    function actorHasValidAction(actor) {
        if (!actor) return false;
        // Dead actors should never require input
        if (isDead(actor)) return true;
        const action = actor.currentAction();
        return action && action.item();
    }

    function findFirstActorNeedingInput() {
        const members = $gameParty.battleMembers();
        for (let i = 0; i < members.length; i++) {
            const actor = members[i];
            if (isDead(actor)) continue;
            if (!actorHasValidAction(actor)) {
                return i;
            }
        }
        return -1;
    }

    function forceActorInput(index) {
        const actor = $gameParty.battleMembers()[index];
        if (!actor) return;
        if (isDead(actor)) return;

        const scene = SceneManager._scene;

        BattleManager._phase = 'input';
        BattleManager._actorIndex = index;
        BattleManager._currentActor = actor;
        actor.clearActions();

        // Let the engine do its normal setup first...
        scene.startActorCommandSelection();

        // ...then explicitly resync the status window cursor and command
        // window, in case startActorCommandSelection was overridden upstream
        // (e.g. by YEP) in a way that doesn't fully reset visual state when
        // called out-of-turn (i.e. not from the normal BattleManager flow).
        if (scene._statusWindow) {
            scene._statusWindow.select(index);
            scene._statusWindow.refresh();
        }
        if (scene._actorCommandWindow) {
            scene._actorCommandWindow.setup(actor);
            scene._actorCommandWindow.show();
            scene._actorCommandWindow.open();
            scene._actorCommandWindow.activate();
        }
        if (scene._partyCommandWindow) {
            scene._partyCommandWindow.close();
            scene._partyCommandWindow.deactivate();
        }
    }

    //--------------------------------------------------------------------------
    // After Instant Cast resolves — reposition input to whichever actor still
    // needs it. This is the ONLY hook point; we deliberately do NOT hook
    // selectNextCommand, since doing so previously stole focus back from any
    // actor whose turn the player intentionally skipped (skipped actors have
    // no currentAction(), so the old hook treated them as "needing input" on
    // every single command selection and force-reopened their command window).
    //--------------------------------------------------------------------------
    const _endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        const subject = this._subject;
        const action = subject ? subject.currentAction() : null;
        _endAction.call(this);
        if (!isInstantCast(action)) return;
        const index = findFirstActorNeedingInput();
        if (index >= 0) {
            forceActorInput(index);
        }
    };
})();