//=============================================================================
// Andrew_ShopStatusTweaks.js
//=============================================================================

var Andrew = Andrew || {};
Andrew.ShopStatusTweaks = Andrew.ShopStatusTweaks || {};

//=============================================================================
/*:
 * @plugindesc v1.00 Recolors the item possession count and removes the
 * can't-equip dashes in the shop status window.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Place this plugin BELOW YEP_ShopMenuCore in the Plugin Manager list.
 *
 * This plugin makes two cosmetic changes to the shop status window
 * (Window_ShopStatus):
 *
 * 1. The "Possession" label is drawn in yellow (#fff200). The quantity
 *    number next to it stays the default text color.
 *
 * 2. Actors who can't equip the currently viewed item no longer show a
 *    dash / "Cannot Equip" placeholder in the stat comparison area. This
 *    is handled for both Actor Mode (drawActorCantEquip) and Default Mode
 *    (drawActorEquipInfo), since which one applies depends on this
 *    project's "Default Mode" plugin parameter.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.00:
 * - Finished plugin!
 */
//=============================================================================

Andrew.ShopStatusTweaks.PossessionColor = '#fff200';

//=============================================================================
// Window_ShopStatus
//=============================================================================

Window_ShopStatus.prototype.drawPossession = function(x, y) {
    var width = this.contents.width - this.textPadding() - x;
    var possessionWidth = this.textWidth('0000');
    this.changeTextColor(Andrew.ShopStatusTweaks.PossessionColor);
    this.drawText(TextManager.possession, x, y, width - possessionWidth);
    this.resetTextColor();
    this.drawText(this._item ? $gameParty.numItems(this._item) : '', x, y,
        width, 'right');
};

// Actor Mode: stat-by-stat grid. Leave the box blank for actors who can't
// equip the item, instead of drawing a "-".
Window_ShopStatus.prototype.drawActorCantEquip = function(actor, rect) {
};

// Default Mode: one row per actor. Leave the row blank (aside from the
// actor's name) for actors who can't equip the item, instead of drawing
// the "Cannot Equip" text (which may be configured as a dash).
Window_ShopStatus.prototype.drawActorEquipInfo = function(x, y, actor) {
    var enabled = actor.canEquip(this._item);
    this.changePaintOpacity(enabled);
    this.resetTextColor();
    this.resetFontSettings();
    this.drawText(actor.name(), x, y, this.contents.width - x);
    if (enabled) {
      var item1 = this.currentEquippedItem(actor, this._item.etypeId);
      this.contents.fontSize = Yanfly.Param.ShopStatFontSize;
      this.drawActorParamChange(x, y, actor, item1);
    }
    this.changePaintOpacity(true);
};