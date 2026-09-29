/*:
 * @plugindesc Draws HP/MP stats as scene-level sprite overlay completely outside window bounds
 * @author
 *
 * @param Stat Font Size
 * @type number
 * @min 1
 * @desc Font size for HP/MP stats
 * @default 20
 *
 * @param Stat Box Height
 * @type number
 * @min 20
 * @desc Height of the stat display box
 * @default 40
 *
 * @param Stat Y Offset
 * @type number
 * @desc Y position offset for stats (positive = down, negative = up)
 * @default 0
 *
 * @param Stat X Offset
 * @type number
 * @desc X position offset for stats (positive = right, negative = left)
 * @default 0
 *
 * @help
 * This plugin draws HP/MP stats on a scene-level sprite that is completely
 * outside the battle status window, preventing any clipping issues.
 */
 
(function() {
"use strict";
 
var parameters = PluginManager.parameters('StatOverlay');
var statFontSize = Number(parameters['Stat Font Size'] || 20);
var statBoxHeight = Number(parameters['Stat Box Height'] || 40);
var statYOffset = Number(parameters['Stat Y Offset'] || 0);
var statXOffset = Number(parameters['Stat X Offset'] || 0);
 
//=============================================================================
// Scene_Battle
//=============================================================================
 
var _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
Scene_Battle.prototype.initialize = function() {
    _Scene_Battle_initialize.call(this);
    this._statOverlaySprite = null;
};
 
var _Scene_Battle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
Scene_Battle.prototype.createDisplayObjects = function() {
    _Scene_Battle_createDisplayObjects.call(this);
    this.createStatOverlaySprite();
};
 
Scene_Battle.prototype.createStatOverlaySprite = function() {
    // Create a single sprite covering the entire screen for all stats
    this._statOverlaySprite = new Sprite();
    this._statOverlaySprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this._statOverlaySprite.z = 10; // Above windows but below popups
    this.addChild(this._statOverlaySprite);
};
 
var _Scene_Battle_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    this.updateStatOverlay();
};
 
Scene_Battle.prototype.updateStatOverlay = function() {
    if (!this._statOverlaySprite) return;
    
    // Clear and redraw all stats
    this._statOverlaySprite.bitmap.clear();
    
    var statusWindow = this._statusWindow;
    if (!statusWindow) return;
    
    for (var i = 0; i < $gameParty.battleMembers().length; i++) {
        this.drawActorStatsOnOverlay(i, statusWindow);
    }
};
 
Scene_Battle.prototype.drawActorStatsOnOverlay = function(index, statusWindow) {
    var actor = $gameParty.battleMembers()[index];
    if (!actor) return;
    
    var bitmap = this._statOverlaySprite.bitmap;
    var itemRect = statusWindow.itemRect(index);
    
    // Get the absolute position of the status window
    var windowX = statusWindow.x;
    var windowY = statusWindow.y;
    
    // Get the gauge area rect (where HP/MP are displayed)
    var gaugeRect = statusWindow.gaugeAreaRect(index);
    
    // Convert to absolute screen coordinates
    var screenX = windowX + gaugeRect.x + statXOffset;
    var screenY = windowY + gaugeRect.y + statYOffset;
    
    // Draw HP and MP stats using canvas rendering
    this.drawStatsText(bitmap, actor, screenX, screenY);
};
 
Scene_Battle.prototype.drawStatsText = function(bitmap, actor, screenX, screenY) {
    var ctx = bitmap._context;
    ctx.save();
    
    // Setup font
    ctx.font = statFontSize + 'px Jersey10-Regular';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    var lineHeight = statFontSize + 4;
    var currentX = screenX;
    var currentY = screenY;
    
    // Draw HP label and value
    ctx.fillStyle = '#b0ff90';
    ctx.fillText('HP', currentX, currentY);
    
    ctx.fillStyle = '#ffffff';
    var hpText = actor.hp + ' / ' + actor.mhp;
    var hpLabelWidth = 30; // Width for "HP" text
    ctx.fillText(hpText, currentX + hpLabelWidth, currentY);
    
    // Draw MP label and value
    currentY += lineHeight;
    ctx.fillStyle = '#8cfffb';
    ctx.fillText('MP', currentX, currentY);
    
    ctx.fillStyle = '#ffffff';
    var mpText = actor.mp + ' / ' + actor.mmp;
    ctx.fillText(mpText, currentX + hpLabelWidth, currentY);
    
    ctx.restore();
};