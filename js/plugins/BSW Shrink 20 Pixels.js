//=============================================================================
// Andrew_ShrinkBattleStatusWindow.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_ShrinkBattleStatusWindow = true;

var Andrew = Andrew || {};
Andrew.ShrinkBSW = Andrew.ShrinkBSW || {};

/*:
 * @plugindesc v1.00 Shrinks the battle status window (the box with the
 * HP/MP/TP parameters) by a configurable pixel amount.
 * @author Andrew
 *
 * @param Height Reduction
 * @desc Pixels to remove from the battle status window's height.
 * @default 20
 * @type number
 * @min 0
 *
 * @help
 * ============================================================================
 * What this does
 * ============================================================================
 * Window_BattleStatus is bottom-anchored (y = boxHeight - height), so
 * shrinking its height pulls the top edge down while the bottom edge stays
 * flush with the screen bottom.
 *
 * YEP_BattleStatusWindow.js already computes the basic area, gauge area,
 * and state icon area off this.contents.height at draw time (see
 * gaugeAreaRect / basicAreaRect), so no other changes are needed - once the
 * window is shorter, the gauges/name/icons redraw inside the smaller box
 * automatically.
 *
 * ============================================================================
 * Load Order
 * ============================================================================
 * Place this BELOW YEP_BattleStatusWindow.js and BELOW YEP_BattleEngineCore
 * (and below any other plugin that changes Window_BattleStatus's size),
 * so this plugin's alias runs last and applies on top of whatever height
 * those plugins already set.
 *
 * ============================================================================
 * Terms of Use
 * ============================================================================
 * Free to use and edit for your project.
 * ============================================================================
 */
//=============================================================================

Andrew.ShrinkBSW.params = PluginManager.parameters('Andrew_ShrinkBattleStatusWindow');
Andrew.ShrinkBSW.heightReduction = Number(Andrew.ShrinkBSW.params['Height Reduction'] || 20);

Andrew.ShrinkBSW.Window_BattleStatus_windowHeight =
    Window_BattleStatus.prototype.windowHeight;
Window_BattleStatus.prototype.windowHeight = function() {
    var height = Andrew.ShrinkBSW.Window_BattleStatus_windowHeight.call(this);
    return Math.max(0, height - Andrew.ShrinkBSW.heightReduction);
};