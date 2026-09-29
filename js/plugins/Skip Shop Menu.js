//=============================================================================
// Andrew_ShopSkipToBuy.js
//=============================================================================

var Andrew = Andrew || {};
Andrew.ShopSkipToBuy = Andrew.ShopSkipToBuy || {};

//=============================================================================
/*:
 * @plugindesc v1.00 Skips the Buy/Sell/Equip/Cancel command window in shops
 * and jumps straight to the item list. Cancel closes the shop.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Place this plugin BELOW YEP_ShopMenuCore in the Plugin Manager list.
 *
 * Normally, opening a shop shows a command window with Buy / Sell / Equip /
 * Cancel, and you must select "Buy" before you can browse items. This
 * plugin leaves that command window visible (with "Buy" shown selected) for
 * aesthetic purposes, but skips it for input purposes and opens the Buy
 * list immediately. Pressing Cancel while browsing the buy list closes the
 * shop directly, instead of returning to the command window.
 *
 * ============================================================================
 * Important Notes
 * ============================================================================
 *
 * This effectively makes every shop "buy only" from the player's
 * perspective. The command window (and therefore the Sell and Equip
 * options) is never shown, so if a shop event has selling enabled, players
 * will have no way to reach it through the menu.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.00:
 * - Finished plugin!
 */
//=============================================================================

//=============================================================================
// Scene_Shop
//=============================================================================

Andrew.ShopSkipToBuy.Scene_Shop_create = Scene_Shop.prototype.create;
Scene_Shop.prototype.create = function() {
    Andrew.ShopSkipToBuy.Scene_Shop_create.call(this);
    this._commandWindow.deactivate();
    this.commandBuy();
};

Scene_Shop.prototype.onBuyCancel = function() {
    this.popScene();
};