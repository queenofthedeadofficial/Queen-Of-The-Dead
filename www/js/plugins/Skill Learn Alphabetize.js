/*:
 * @plugindesc Automatically sorts the Learn Skill menu alphabetically by skill name. Compatible with YEP_SkillLearnSystem. 
 * @author Andrew
 *
 * @help
 * This plugin overrides the Learn Skill menu to sort skills alphabetically
 * by name every time the list is built. It does not require configuration.
 *
 * Place this plugin below YEP_SkillLearnSystem in the Plugin Manager.
 */

(function() {
  const _makeItemList = Window_SkillLearn.prototype.makeItemList;
  Window_SkillLearn.prototype.makeItemList = function() {
    _makeItemList.call(this);
    if (Array.isArray(this._data)) {
      this._data.sort((a, b) => {
        const na = (a && a.name && a.name.toUpperCase()) || '';
        const nb = (b && b.name && b.name.toUpperCase()) || '';
        return na.localeCompare(nb);
      });
    }
  };

  console.log('[LearnSort] Permanent alphabetical sort patch applied to Learn Skill menu.');
})();