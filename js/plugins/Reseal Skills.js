/*:
 * @plugindesc Seals unusable skills in the main menu. v1.0
 * @author ChatGPT
 *
 * @help
 * In the Skill menu, skills become disabled if:
 *  - The actor lacks enough MP.
 *  - The actor lacks enough TP.
 *  - The skill cannot be used from the menu.
 *
 * No plugin commands.
 */

(function() {

    const _Window_SkillList_isEnabled = Window_SkillList.prototype.isEnabled;
    Window_SkillList.prototype.isEnabled = function(item) {
        if (!item) return false;

        // Only affects the main menu skill scene.
        if (SceneManager._scene instanceof Scene_Skill) {

            // Only Always (0) and Menu (2) are usable.
            if (item.occasion !== 0 && item.occasion !== 2) {
                return false;
            }

            if (!this._actor.canPaySkillCost(item)) {
                return false;
            }

            return true;
        }

        return _Window_SkillList_isEnabled.call(this, item);
    };

})();