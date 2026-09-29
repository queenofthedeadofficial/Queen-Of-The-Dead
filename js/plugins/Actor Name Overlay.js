/*:
 * @plugindesc Draws actor names as sprite overlays above the battle status window
 * @author
 *
 * @param Name Font Size
 * @type number
 * @min 1
 * @desc Font size for actor names
 * @default 20
 *
 * @param Name Y Offset
 * @type number
 * @desc Y position offset for names (negative = higher)
 * @default -10
 *
 * @help
 * This plugin draws actor names as sprite overlays that won't be clipped
 * by the battle status window's padding.
 */

(function() {
"use strict";

var parameters = PluginManager.parameters('ActorNameOverlay');
var namefontSize = Number(parameters['Name Font Size'] || 20);
var nameYOffset = Number(parameters['Name Y Offset'] || -10);

//=============================================================================
// Scene_Battle
//=============================================================================

var _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
Scene_Battle.prototype.initialize = function() {
    _Scene_Battle_initialize.call(this);
    this._actorNameSprites = [];
};

var _Scene_Battle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
Scene_Battle.prototype.createDisplayObjects = function() {
    _Scene_Battle_createDisplayObjects.call(this);
    this.createActorNameSprites();
};

Scene_Battle.prototype.createActorNameSprites = function() {
    // Remove old sprites if any
    for (var i = 0; i < this._actorNameSprites.length; i++) {
        this.removeChild(this._actorNameSprites[i]);
    }
    this._actorNameSprites = [];
    
    // Create new name sprites for each party member
    for (var i = 0; i < $gameParty.battleMembers().length; i++) {
        var sprite = new Sprite_ActorName(i);
        this._actorNameSprites.push(sprite);
        this.addWindow(sprite);
    }
};

var _Scene_Battle_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    this.updateActorNameSprites();
};

Scene_Battle.prototype.updateActorNameSprites = function() {
    for (var i = 0; i < this._actorNameSprites.length; i++) {
        this._actorNameSprites[i].update();
    }
};

//=============================================================================
// Sprite_ActorName
//=============================================================================

function Sprite_ActorName(actorIndex) {
    this.initialize(actorIndex);
}

Sprite_ActorName.prototype = Object.create(Sprite.prototype);
Sprite_ActorName.prototype.constructor = Sprite_ActorName;

Sprite_ActorName.prototype.initialize = function(actorIndex) {
    Sprite.prototype.initialize.call(this);
    this._actorIndex = actorIndex;
    this._actor = null;
    this._nameChanged = true;
    this.createBitmap();
};

Sprite_ActorName.prototype.createBitmap = function() {
    var actor = $gameParty.battleMembers()[this._actorIndex];
    if (!actor) {
        this.bitmap = new Bitmap(1, 1);
        return;
    }
    
    this._actor = actor;
    
    // Create bitmap matching face portrait dimensions
    var faceWidth = Window_Base._faceWidth;
    var boxHeight = 36; // Height from top of names to white border
    
    var bitmap = new Bitmap(faceWidth, boxHeight);
    bitmap.fontSize = namefontSize;
    bitmap.outlineWidth = 4;
    bitmap.outlineColor = 'black';
    
    // Determine text color (HP color)
    var hpRate = actor.hpRate();
    var color;
    if (hpRate >= 1.0) {
        color = '#ffffff';
    } else if (hpRate >= 0.5) {
        color = '#ffff00';
    } else {
        color = '#ff0000';
    }
    bitmap.textColor = color;
    
    // Center text vertically and horizontally within the box
    var padding = 4;
    bitmap.drawText(actor.name(), padding, 0, faceWidth - padding * 2, boxHeight, 'center');
    
    this.bitmap = bitmap;
};

Sprite_ActorName.prototype.setPosition = function() {
    if (!$gameParty.battleMembers()[this._actorIndex]) return;
    
    var statusWindow = SceneManager._scene._statusWindow;
    if (!statusWindow) return;
    
    var itemRect = statusWindow.itemRect(this._actorIndex);
    
    // Match the exact face portrait positioning from YEP_BattleStatusWindow
    var faceWidth = Window_Base._faceWidth;
    var faceHeight = Window_Base._faceHeight;
    
    // Face positioning: wx = rect.x + rect.width - ww - 6
    var wx = itemRect.x + itemRect.width - faceWidth - 6;
    var wy = itemRect.y;
    
    // Position name box directly above face portrait
    this.x = wx;
    this.y = wy - 36; // 36 is the height of the name box
};

Sprite_ActorName.prototype.update = function() {
    Sprite.prototype.update.call(this);
    var actor = $gameParty.battleMembers()[this._actorIndex];
    
    if (!actor || !this._actor) {
        this.visible = false;
        return;
    }
    
    if (this._actor !== actor || this._nameChanged) {
        this._actor = actor;
        this._nameChanged = false;
        this.createBitmap();
    }
    
    this.setPosition();
    this.visible = true;
};

})();