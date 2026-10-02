/*:
 * @plugindesc Alphabetically sorts all default inventory categories
 *            (Items, Weapons, Armors, Key Items).
 * @target MV
 */
(() => {
  function sortByName(arr) {
    return arr.sort((a, b) => {
      if (!a || !b) return 0;
      return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
    });
  }

  // Override the master makeItemList
  const _Window_ItemList_makeItemList = Window_ItemList.prototype.makeItemList;
  Window_ItemList.prototype.makeItemList = function() {
    _Window_ItemList_makeItemList.call(this);
    // _data already filtered by category at this point
    this._data = sortByName(this._data);
  };

  // Optional: if you also want alphabetic order inside the shop scene
  const _Window_ShopSell_makeItemList = Window_ShopSell.prototype.makeItemList;
  Window_ShopSell.prototype.makeItemList = function() {
    _Window_ShopSell_makeItemList.call(this);
    this._data = sortByName(this._data);
  };
})();