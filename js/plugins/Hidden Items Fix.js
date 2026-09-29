/*:
 * @plugindesc v1.00 Fix: ensure Window_ShopBuy uses sanitized goods so valid items marked -1 show.
 * @author Generated
 * @help
 * Place this plugin below YEP_X_HideShowShopItems (or below YEP_ShopMenuCore).
 */

(function(){
  'use strict';
  if (!window.Window_ShopBuy) return;

  function sanitizeShopGoodsArray(goods) {
    if (!Array.isArray(goods)) return goods;
    for (var i = 0; i < goods.length; i++) {
      var g = goods[i];
      if (!Array.isArray(g)) continue;
      if (g[0] === -1 && typeof g[1] === 'number' && $dataItems && $dataItems[g[1]]) {
        var copy = g.slice(); copy[0] = 0; goods[i] = copy;
      }
    }
    return goods;
  }

  if (!Window_ShopBuy._fixPatched) {
    Window_ShopBuy._fixPatched = true;
    Window_ShopBuy._fix_orig_makeItemList = Window_ShopBuy.prototype.makeItemList;
    Window_ShopBuy.prototype.makeItemList = function() {
      if (this._shopGoods) sanitizeShopGoodsArray(this._shopGoods);
      return Window_ShopBuy._fix_orig_makeItemList.call(this);
    };
    console.log('Fix_ShowHiddenItems: patched Window_ShopBuy.makeItemList');
  }
})();
