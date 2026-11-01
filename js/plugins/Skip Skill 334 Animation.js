/*:
 * @plugindesc Skips the battle animation for Skill ID 334.
 * @author ChatGPT
 *
 * @help
 * This plugin prevents Skill #334 from displaying its animation
 * during battle. All effects still occur normally.
 *
 * Place below YEP_BattleEngineCore if you're using it.
 */

(function() {

    var SKILL_ID = 334;

    var _Window_BattleLog_startAction = Window_BattleLog.prototype.startAction;
    Window_BattleLog.prototype.startAction = function(subject, action, targets) {

        var item = action.item();

        if (item && DataManager.isSkill(item) && item.id === SKILL_ID) {

            this.push('performActionStart', subject, action);
            this.push('performAction', subject, action);

            // Skip showAnimation entirely.
            this.push('waitForMovement');

            return;
        }

        _Window_BattleLog_startAction.call(this, subject, action, targets);
    };

})();