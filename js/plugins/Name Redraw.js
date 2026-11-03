/*:
 * @plugindesc Draws actor names as scene-level sprite overlay completely outside window bounds
 * @author
 *
 * @param Name Font Size
 * @type number
 * @min 1
 * @desc Font size for actor names
 * @default 20
 *
 * @param Name Box Height
 * @type number
 * @min 0
 * @desc Height of the name box above each face portrait
 * @default 36
 *
 * @param Name Outline Width
 * @type number
 * @min 0
 * @decimals 1
 * @desc Boldness of the text outline (0 = no outline, higher = thicker)
 * @default 2
 *
 * @help
 * This plugin draws actor names on a scene-level sprite that is completely
 * outside the battle status window, preventing any clipping issues.
 * Names only appear when the status window is open.
 */

(function() {
"use strict";

var parameters = PluginManager.parameters('Name_Override');
var nameFontSize = Number(parameters['Name Font Size'] || 20);
var nameBoxHeight = Number(parameters['Name Box Height'] || 36);
var nameOutlineWidth = Number(parameters['Name Outline Width'] || 2.5);

//=============================================================================
// Scene_Battle
//=============================================================================

var _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
Scene_Battle.prototype.initialize = function() {
    _Scene_Battle_initialize.call(this);
    this._nameOverlaySprite = null;
    this._messageWasActive = false;
};

var _Scene_Battle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
Scene_Battle.prototype.createDisplayObjects = function() {
    _Scene_Battle_createDisplayObjects.call(this);
    this.createNameOverlaySprite();
};

Scene_Battle.prototype.createNameOverlaySprite = function() {
    // Create a single sprite covering the entire screen for all names
    this._nameOverlaySprite = new Sprite();
    this._nameOverlaySprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this._nameOverlaySprite.z = 10; // Above windows but below popups
    this._nameOverlaySprite.visible = false; // Start hidden
    this.addChild(this._nameOverlaySprite);
};

var _Scene_Battle_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    this.updateNameOverlay();
};

Scene_Battle.prototype.updateNameOverlay = function() {
    if (!this._nameOverlaySprite) return;
    
    var statusWindow = this._statusWindow;
    if (!statusWindow) {
        this._nameOverlaySprite.visible = false;
        return;
    }
    
    // Hide when skill, item, or ADRI enemy scan windows are active
    var skillWindowActive = this._skillWindow && this._skillWindow.active;
    var itemWindowActive = this._itemWindow && this._itemWindow.active;
    var inBattleEnemyStateListActive = this._inBattleEnemyStateList && this._inBattleEnemyStateList.active;
    
    // Hide during victory aftermath (YEP_VictoryAftermath)
    var inVictoryPhase = BattleManager.isVictoryPhase && BattleManager.isVictoryPhase();
    
    // Hide during/after battle end (during transition back to map)
    var battleEnded = !BattleManager.isBattleTest && BattleManager._battlePhase === 'battleEnd';
    var sceneChanging = SceneManager.isSceneChanging();
    
    // Track message activity - once a message appears, stay hidden for a brief grace period
    var messageActive = $gameMessage && ($gameMessage.isBusy() || ($gameMessage._texts && $gameMessage._texts.length > 0));
    if (messageActive) {
        this._messageWasActive = true;
        this._messageGracePeriod = 5; // 5 frames of grace period after message ends
    }
    
    // Decrement grace period
    if (this._messageGracePeriod > 0) {
        this._messageGracePeriod--;
    }
    
    var textBoxHidden = this._messageWasActive && (messageActive || this._messageGracePeriod > 0);
    
    var shouldHide = skillWindowActive || itemWindowActive || inBattleEnemyStateListActive || inVictoryPhase || battleEnded || sceneChanging || textBoxHidden;
    
    this._nameOverlaySprite.visible = !shouldHide;
    
    if (!shouldHide) {
        // Clear and redraw all names
        this._nameOverlaySprite.bitmap.clear();
        
        for (var i = 0; i < $gameParty.battleMembers().length; i++) {
            this.drawActorNameOnOverlay(i, statusWindow);
        }
    } else {
        this._nameOverlaySprite.bitmap.clear();
    }
};

Scene_Battle.prototype.drawActorNameOnOverlay = function(index, statusWindow) {
    var actor = $gameParty.battleMembers()[index];
    if (!actor) return;
    
    var bitmap = this._nameOverlaySprite.bitmap;
    var itemRect = statusWindow.itemRect(index);
    
    // Get the absolute position of the status window
    var windowX = statusWindow.x;
    var windowY = statusWindow.y;
    
    // Face portrait positioning (from YEP_BattleStatusWindow.drawStatusFace)
    var faceWidth = Window_Base._faceWidth;
    var wx = itemRect.x + itemRect.width - faceWidth - 6;
    var wy = itemRect.y;
    
    // Convert to absolute screen coordinates
    var screenX = windowX + wx + 23;
    var screenY = windowY + wy - nameBoxHeight + 31;
    
    // Determine text color based on HP
    var hpRate = actor.hpRate();
    console.log('[NameOverride debug]', actor.name(), 'hp=', actor.hp, 'hpRate=', hpRate);
    var color;
    if (actor.hp <= 0) {
        color = '#ff2f37';
    } else if (hpRate > 0.5) {
        color = '#ffffff';
    } else if (hpRate > 0) {
        color = '#ffff00';
    } else {
        color = '#ff0000';
    }
    
    // Use direct canvas rendering for unlimited font size support
    var ctx = bitmap._context;
    ctx.save();
    
    // Setup font - use Jersey10-Regular.ttf
    ctx.font = nameFontSize + 'px Jersey10-Regular';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw outline with configurable width
    ctx.strokeStyle = 'black';
    ctx.lineWidth = nameOutlineWidth;
    ctx.strokeText(actor.name(), screenX + faceWidth / 2, screenY + nameBoxHeight / 2);
    
    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(actor.name(), screenX + faceWidth / 2, screenY + nameBoxHeight / 2);
    
    ctx.restore();
};

})();