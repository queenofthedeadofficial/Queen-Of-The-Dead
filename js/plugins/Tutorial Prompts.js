/*:
 * @plugindesc Battle tutorial prompts when Actor 2 or Actor 3 become active command actors.
 * @author ChatGPT
 *
 * @help
 * Actor 2:
 *   Switch 4987 OFF:
 *   Shows:
 *   "Cast Life of the Party with Emma."
 *   Turns Switch 4987 ON after closing.
 *
 * Actor 3:
 *   Switch 4986 OFF:
 *   Shows:
 *   "Use Quick Attack with Rose's Rat"
 *   "and Magic Dart with Rose's Lasher."
 *   Turns Switch 4986 ON after closing.
 *
 * Designed for YEP_BattleEngineCore.
 *
 * Place below YEP_BattleEngineCore.
 */

(function() {
    "use strict";

    const SETTINGS = {
        2: {
            switchId: 4987,
            message:
                "Cast \\C[34]Life of the Party\\C[0] with Emma."
        },

        3: {
            switchId: 4986,
            message:
                "Use \\C[34]Quick Attack\\C[0] with Rose's Rat\nand \\C[34]Magic Dart\\C[0] with Rose's Lasher."
        }
    };


    let lastActorId = null;
    let pendingMessage = null;
    let waitingForClose = false;


    function checkActor() {

        const actor = BattleManager.actor();

        if (!actor) return;

        const actorId = actor.actorId();

        if (actorId === lastActorId) return;

        lastActorId = actorId;

        const data = SETTINGS[actorId];

        if (!data) return;

        if ($gameSwitches.value(data.switchId)) return;

        pendingMessage = data;
    }


    const _Scene_Battle_changeInputWindow =
        Scene_Battle.prototype.changeInputWindow;


    Scene_Battle.prototype.changeInputWindow = function() {

        _Scene_Battle_changeInputWindow.call(this);

        checkActor();
    };


    const _Scene_Battle_update =
        Scene_Battle.prototype.update;


    Scene_Battle.prototype.update = function() {

        _Scene_Battle_update.call(this);


        if (pendingMessage &&
            !$gameMessage.isBusy() &&
            !waitingForClose) {

            waitingForClose = true;

            $gameMessage.add(
                pendingMessage.message
            );

            return;
        }


        if (waitingForClose &&
            !$gameMessage.isBusy()) {

            $gameSwitches.setValue(
                pendingMessage.switchId,
                true
            );


            const scene = SceneManager._scene;

            if (scene && scene.changeInputWindow) {
                scene.changeInputWindow();
            }


            pendingMessage = null;
            waitingForClose = false;
        }
    };

})();