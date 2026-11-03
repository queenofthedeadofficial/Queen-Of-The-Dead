/*:
 * @plugindesc Adds \TARGET to Battle Messages to display the actor targeted by the current skill. v2.00
 * @author ChatGPT (rewritten)
 *
 * @help
 * ============================================================================
 * TARGET Escape Code
 * ============================================================================
 *
 * Put \TARGET in a Skill's message.
 *
 * Example:
 *
 *   \TARGET was struck!
 *
 * If the skill targets Rose, the message becomes:
 *
 *   Rose was struck!
 *
 * This is intended for actor-targeting skills.
 *
 * ============================================================================
 * v2.00 changes
 * ============================================================================
 * The target actor is now captured inside Game_Action.prototype.makeTargets
 * and stored on the action itself, instead of being captured in
 * BattleManager.startAction and stored on BattleManager.
 *
 * Under YEP_BattleEngineCore, startAction hands off to an action-sequence
 * list rather than resolving the message immediately, so BattleManager's
 * _targets could be stale, re-filtered, or empty by the time the message
 * window actually drew the text. makeTargets is where targets are actually
 * decided, and storing the result on the action (BattleManager._action)
 * keeps it valid for the whole lifetime of that action regardless of when
 * DISPLAY ACTION fires.
 *
 * Load order: place this below YEP_BattleEngineCore.js and any other
 * plugin that aliases Game_Action.prototype.makeTargets.
 * ============================================================================
 */

(function() {

    //=========================================================================
    // Game_Action.makeTargets
    // Capture the actor target at the moment targets are actually decided.
    //=========================================================================

    var _Game_Action_makeTargets =
        Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function() {

        var targets = _Game_Action_makeTargets.call(this);

        this._targetNameDisplayActor = null;

        if (targets && targets.length > 0) {

            for (var i = 0; i < targets.length; i++) {

                var target = targets[i];

                if (target &&
                    target.isActor &&
                    target.isActor()) {

                    this._targetNameDisplayActor = target;
                    break;
                }
            }
        }

        // Fallback: for friend-targeting actions where makeTargets somehow
        // returned nothing usable, fall back to the action's stored index.
        if (!this._targetNameDisplayActor &&
            this.isForFriend &&
            this.isForFriend() &&
            this._targetIndex >= 0) {

            var actor = $gameParty.members()[this._targetIndex];

            if (actor) {
                this._targetNameDisplayActor = actor;
            }
        }

        return targets;
    };


    //=========================================================================
    // Window_BattleLog.addText
    // Replace \TARGET before the text is queued, reading from the current
    // action rather than from BattleManager._targetActorForMessage.
    //=========================================================================

    var _Window_BattleLog_addText =
        Window_BattleLog.prototype.addText;

    Window_BattleLog.prototype.addText = function(text) {

        if (text && text.indexOf('\\TARGET') >= 0) {

            var action = BattleManager._action;
            var target = action ? action._targetNameDisplayActor : null;

            if (target &&
                target.isActor &&
                target.isActor()) {

                text = text.replace(/\\TARGET/gi, target.name());

            } else {

                // No actor target found.
                text = text.replace(/\\TARGET/gi, '');

            }
        }

        _Window_BattleLog_addText.call(this, text);
    };

})();