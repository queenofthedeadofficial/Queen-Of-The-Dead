/*:
 * @plugindesc Alphabetizes actor skills in the main menu skill scene.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * This plugin alphabetizes skills shown in the main menu skill scene.
 *
 * - Affects actor skill lists in the menu
 * - Does NOT affect battle order
 * - Does NOT affect database order
 *
 * No plugin commands.
 * ============================================================================
 */

(function() {

    Window_SkillList.prototype.makeItemList = function() {
        if (this._actor) {
            this._data = this._actor.skills().filter(function(item) {
                return this.includes(item);
            }, this);

            this._data.sort(function(a, b) {
                return a.name.localeCompare(b.name);
            });

        } else {
            this._data = [];
        }
    };

})();