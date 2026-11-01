/*:
 * @plugindesc Displays battler state names under actor names in Scene_Item's actor-select window, cycling every N frames. Only active while that window is active.
 * Standalone companion to Display_States.js / Display_States_Menu.js.
 *
 * @param Item Actor State Font Size
 * @type number
 * @min 1
 * @desc Font size for state names
 * @default 18
 *
 * @param Item Actor State Y Offset
 * @type number
 * @desc Vertical offset (from directly under the name line)
 * @default 0
 *
 * @param Item Actor State X Offset
 * @type number
 * @desc Horizontal offset (from the left edge of the name)
 * @default 0
 *
 * @param Item Actor State Outline Width
 * @type number
 * @min 0
 * @decimals 1
 * @desc Boldness of the text outline (0 = no outline, higher = thicker)
 * @default 2
 *
 * @param Cycle Frames
 * @type number
 * @min 1
 * @desc How many frames between state cycles
 * @default 60
 *
 * @help
 * ============================================================================
 * Display States - Item Actor Select
 * ============================================================================
 * Companion to Display_States.js / Display_States_Menu.js. Adds the same
 * cycling state-name overlay to Scene_Item's actor-select window
 * (Window_MenuActor, referenced as SceneManager._scene._actorWindow),
 * aligned directly underneath each actor's name, left-aligned.
 *
 * The overlay only draws while SceneManager._scene._actorWindow.active is
 * true - i.e. only during the moment the player is choosing which actor to
 * use the item on. It's hidden the rest of the time in Scene_Item.
 *
 * HOW ALIGNMENT WORKS:
 * Same approach as Display_States_Menu.js: aliases
 * Window_Base.prototype.drawActorName and records the exact local (x, y,
 * width) used to draw each actor's name whenever Window_MenuActor draws it.
 * This plugin is self-contained (does its own capture) so it doesn't depend
 * on Display_States_Menu.js being present.
 *
 * If your actor-select window draws names some other way (not via
 * drawActorName), the overlay won't find a position and simply won't draw
 * for that actor - use the X/Y Offset params to nudge things, or let me know
 * what draws the name in your setup and I'll hook the right method instead.
 *
 * Load order: below YEP item/menu plugins, same convention as other Andrew_
 * plugins.
 * ============================================================================
 */

(function() {

"use strict";

var parameters = PluginManager.parameters('Display States Item Actor');
var itemActorStateFont = Number(parameters['Item Actor State Font Size'] || 18);
var itemActorStateYOffset = Number(parameters['Item Actor State Y Offset'] || 0);
var itemActorStateXOffset = Number(parameters['Item Actor State X Offset'] || 0);
var itemActorStateOutlineWidth = Number(parameters['Item Actor State Outline Width'] || 2);
var itemActorStateCycleFrames = Number(parameters['Cycle Frames'] || 60);

function getAlphabeticalStates(battler) {
    if (!battler) return [];

    return battler.states()
        .filter(function(state) {
            return state && !state.meta["Hide State"];
        })
        .sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
}

//=============================================================================
// Window_Base - capture actor name draw position whenever Window_MenuActor
// draws it, regardless of what layout logic decided the position.
//=============================================================================

var _Window_Base_drawActorName = Window_Base.prototype.drawActorName;
Window_Base.prototype.drawActorName = function(actor, x, y, width) {
    _Window_Base_drawActorName.call(this, actor, x, y, width);
    if (actor && this instanceof Window_MenuActor) {
        this._itemActorStateNamePos = this._itemActorStateNamePos || {};
        this._itemActorStateNamePos[actor.actorId()] = {
            x: x,
            y: y,
            width: width || 168
        };
    }
};

//=============================================================================
// Scene_Item
//=============================================================================

var _Scene_Item_create = Scene_Item.prototype.create;
Scene_Item.prototype.create = function() {
    _Scene_Item_create.call(this);
    this._itemActorStateIndex = {};
    this._itemActorStateCycleFrame = 0;
    this.createItemActorStateOverlaySprite();
};

Scene_Item.prototype.createItemActorStateOverlaySprite = function() {
    this._itemActorStateOverlaySprite = new Sprite();
    this._itemActorStateOverlaySprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this._itemActorStateOverlaySprite.z = 10; // Above windows but below popups
    this._itemActorStateOverlaySprite.visible = false;
    this.addChild(this._itemActorStateOverlaySprite);
};

var _Scene_Item_update = Scene_Item.prototype.update;
Scene_Item.prototype.update = function() {
    _Scene_Item_update.call(this);
    this.updateItemActorStateOverlay();
};

Scene_Item.prototype.updateItemActorStateOverlay = function() {
    if (!this._itemActorStateOverlaySprite) return;

    var actorWindow = this._actorWindow;
    if (!actorWindow) {
        this._itemActorStateOverlaySprite.visible = false;
        return;
    }

    var sceneChanging = SceneManager.isSceneChanging();
    var shouldHide = sceneChanging || !actorWindow.active;

    this._itemActorStateOverlaySprite.visible = !shouldHide;

    if (shouldHide) {
        this._itemActorStateOverlaySprite.bitmap.clear();
        return;
    }

    // Update state cycle, keyed by actorId so order changes don't matter
    this._itemActorStateCycleFrame++;
    if (this._itemActorStateCycleFrame >= itemActorStateCycleFrames) {
        this._itemActorStateCycleFrame = 0;

        $gameParty.members().forEach(function(actor) {
            if (!actor) return;
            var id = actor.actorId();
            var states = getAlphabeticalStates(actor);

            if (this._itemActorStateIndex[id] === undefined)
                this._itemActorStateIndex[id] = 0;

            if (states.length > 0) {
                this._itemActorStateIndex[id]++;
                if (this._itemActorStateIndex[id] >= states.length)
                    this._itemActorStateIndex[id] = 0;
            } else {
                this._itemActorStateIndex[id] = 0;
            }
        }, this);
    }

    // Clear and redraw all states
    this._itemActorStateOverlaySprite.bitmap.clear();

    $gameParty.members().forEach(function(actor) {
        this.drawActorStateOnItemActorOverlay(actor, actorWindow);
    }, this);
};

Scene_Item.prototype.drawActorStateOnItemActorOverlay = function(actor, actorWindow) {
    if (!actor) return;

    var namePos = actorWindow._itemActorStateNamePos && actorWindow._itemActorStateNamePos[actor.actorId()];
    if (!namePos) return; // Name hasn't been drawn yet this session

    var states = getAlphabeticalStates(actor);
    if (!states.length) return;

    var id = actor.actorId();
    if (this._itemActorStateIndex[id] === undefined)
        this._itemActorStateIndex[id] = 0;

    var state = states[this._itemActorStateIndex[id]];
    if (!state) return;

    var bitmap = this._itemActorStateOverlaySprite.bitmap;

    // Left-aligned under the name, one line height below it, plus manual offsets
    var screenX = actorWindow.x + namePos.x + itemActorStateXOffset;
    var screenY = actorWindow.y + namePos.y + actorWindow.lineHeight() + itemActorStateYOffset;

    var ctx = bitmap._context;
    ctx.save();

    ctx.font = itemActorStateFont + 'px Jersey10-Regular';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = itemActorStateOutlineWidth;
    ctx.fillStyle = '#ffffff';

    ctx.strokeText(state.name, screenX, screenY);
    ctx.fillText(state.name, screenX, screenY);

    ctx.restore();
};

})();