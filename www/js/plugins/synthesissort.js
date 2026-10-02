/*:
 * @plugindesc Sorts Yanfly Item Synthesis recipes alphabetically.
 * @target MZ MV
 */
(() => {
  const _Window_SynthesisList_makeItemList =
        Window_SynthesisList.prototype.makeItemList;

  Window_SynthesisList.prototype.makeItemList = function() {
    _Window_SynthesisList_makeItemList.call(this);
    // Sort by database name
    this._data.sort((a, b) => {
      if (!a || !b) return 0;
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      return nameA.localeCompare(nameB);
    });
  };
})();