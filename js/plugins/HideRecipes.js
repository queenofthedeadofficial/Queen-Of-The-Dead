/*:
 * @plugindesc Hides all items with the <Category: Recipe> tag from the item menu.
 */
(() => {
  const _Window_ItemList_includes = Window_ItemList.prototype.includes;
  Window_ItemList.prototype.includes = function(item) {
    if (item && item.note && item.note.match(/<Category:\s*Recipe>/i)) {
      return false;
    }
    return _Window_ItemList_includes.call(this, item);
  };
})();