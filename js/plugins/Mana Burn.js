//=============================================================================
// Andrew Plugins - Mana Burn
// Andrew_ManaBurn.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_ManaBurn = true;

var Andrew = Andrew || {};
Andrew.ManaBurn = Andrew.ManaBurn || {};
Andrew.ManaBurn.version = 1.02;

// Color of the Mana Burn damage popup. Edit this to change it.
Andrew.ManaBurn.popupColor = '#7F1B87';
Andrew.ManaBurn.eventId = 0;
Andrew.ManaBurn.shownIds = [];
Andrew.ManaBurn.digitBitmapCache = null;
Andrew.ManaBurn.digitBitmapColor = '';

//=============================================================================
 /*:
 * @plugindesc v1.02 Skills and states tagged <Mana Burn> deal MP damage equal
 * to the HP damage they deal. (Load below YEP_X_ExtDoT)
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin adds a "Mana Burn" effect. Anything tagged with <Mana Burn>
 * that deals HP damage to a battler will also deal MP damage to that same
 * battler, equal to the HP damage dealt.
 *
 * This is a standalone plugin with no parameters. It does not require any
 * other plugin, but to burn MP from damage over time states it needs
 * YEP_X_ExtDoT, and this plugin must be placed BELOW YEP_X_ExtDoT (and below
 * YEP_BattleEngineCore) in the plugin list.
 *
 * ============================================================================
 * Notetags
 * ============================================================================
 *
 * Skill Notetags:
 *
 *   <Mana Burn>
 *   - Whenever this skill deals HP damage to a target, the target also loses
 *   MP equal to the HP damage dealt. This includes HP drain skills. Healing
 *   skills, MP damage skills and skills that miss are not affected.
 *
 * State Notetags:
 *
 *   <Mana Burn>
 *   - Whenever this state's own damage over time (created with YEP_X_ExtDoT's
 *   <DoT Formula: x> or <Custom DoT Formula>) deals HP damage to the battler
 *   carrying it, that battler also loses MP equal to the HP damage dealt.
 *
 *   Examples:
 *     <Mana Burn>
 *     <DoT Formula: a.mat * 2>
 *
 * ============================================================================
 * Notes
 * ============================================================================
 *
 * - "HP damage dealt" is the number that the HP damage popup shows. If the
 *   target does not have enough MP, the MP loss is capped at the MP the target
 *   has left. A target with 0 MP simply takes no MP damage.
 *
 * - The MP damage is applied directly and is NOT modified by MP damage rates,
 *   variance, or anything else. It always matches the HP damage dealt.
 *
 * - Vanilla slip damage (negative HP regeneration traits) cannot be tied to a
 *   specific state, so it does not trigger Mana Burn. Only YEP_X_ExtDoT
 *   states do.
 *
 * - The burned MP is shown as a single popup next to the HP damage popup. It
 *   uses the digits from img/system/Damage.png (same size and style as every
 *   other damage number), tinted to #7F1B87. To change the color, edit
 *   Andrew.ManaBurn.popupColor near the top of this file.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.02:
 * - The Mana Burn popup now uses the digits from img/system/Damage.png
 *   (tinted #7F1B87) instead of drawn text, so it matches the other damage
 *   numbers in size and style.
 *
 * Version 1.01:
 * - Fixed the Mana Burn popup showing twice when the battle engine also
 *   creates its own MP popup. Exactly one popup is now shown per burn.
 * - Mana Burn popup is now drawn in #7F1B87.
 *
 * Version 1.00:
 * - Finished Plugin!
 */
//=============================================================================

//=============================================================================
// DataManager
// ----------------------------------------------------------------------------
// Notetag processing
//=============================================================================

Andrew.ManaBurn.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function() {
  if (!Andrew.ManaBurn.DataManager_isDatabaseLoaded.call(this)) return false;

  if (!Andrew._loaded_Andrew_ManaBurn) {
    this.processManaBurnNotetags($dataSkills);
    this.processManaBurnNotetags($dataStates);
    Andrew._loaded_Andrew_ManaBurn = true;
  }

  return true;
};

DataManager.processManaBurnNotetags = function(group) {
  var regex = /<MANA[ _]?BURN>/i;
  for (var n = 1; n < group.length; n++) {
    var obj = group[n];
    if (!obj) continue;
    obj.manaBurn = regex.test(obj.note || '');
  }
};

//=============================================================================
// Game_ActionResult
// ----------------------------------------------------------------------------
// Tracks how much MP was burned so the popup can display it. Reset with the
// rest of the result so it can never go stale.
//=============================================================================

Andrew.ManaBurn.Game_ActionResult_clear = Game_ActionResult.prototype.clear;
Game_ActionResult.prototype.clear = function() {
  Andrew.ManaBurn.Game_ActionResult_clear.call(this);
  this.andrewManaBurn = 0;
  this.andrewManaBurnId = 0;
};

//=============================================================================
// Game_Battler
// ----------------------------------------------------------------------------
// Core burn effect and damage over time support
//=============================================================================

Game_Battler.prototype.executeManaBurn = function(hpDamage) {
  var burn = Math.min(Math.floor(hpDamage), this.mp);
  if (!(burn > 0)) return 0;
  this.gainMp(-burn);
  this._result.andrewManaBurn = burn;
  this._result.andrewManaBurnId = ++Andrew.ManaBurn.eventId;
  return burn;
};

// While a tagged state's DoT tick is being processed, any HP damage taken
// through gainHp is mirrored onto MP.
Andrew.ManaBurn.Game_Battler_gainHp = Game_Battler.prototype.gainHp;
Game_Battler.prototype.gainHp = function(value) {
  Andrew.ManaBurn.Game_Battler_gainHp.call(this, value);
  if (Andrew.ManaBurn.dotState && value < 0) {
    this.executeManaBurn(-value);
  }
};

if (typeof Game_Battler.prototype.processDamageOverTimeStateEffect === 'function') {
  Andrew.ManaBurn.Game_Battler_processDamageOverTimeStateEffect =
    Game_Battler.prototype.processDamageOverTimeStateEffect;
  Game_Battler.prototype.processDamageOverTimeStateEffect = function(state) {
    var previous = Andrew.ManaBurn.dotState;
    Andrew.ManaBurn.dotState = (state && state.manaBurn) ? state : null;
    try {
      Andrew.ManaBurn.Game_Battler_processDamageOverTimeStateEffect.call(
        this, state);
    } finally {
      Andrew.ManaBurn.dotState = previous;
    }
  };
}

//=============================================================================
// Game_Action
// ----------------------------------------------------------------------------
// Skill support: burn after HP damage has been applied to the target.
//=============================================================================

Andrew.ManaBurn.Game_Action_executeHpDamage =
  Game_Action.prototype.executeHpDamage;
Game_Action.prototype.executeHpDamage = function(target, value) {
  Andrew.ManaBurn.Game_Action_executeHpDamage.call(this, target, value);
  var item = this.item();
  if (item && item.manaBurn) {
    var dealt = target.result().hpDamage;
    if (dealt > 0) target.executeManaBurn(dealt);
  }
};

//=============================================================================
// Sprite_Damage
// ----------------------------------------------------------------------------
// Shows the burned MP as ONE colored number. Each burn carries an id; the
// first popup sprite to claim it draws the number. Any MP-only popup the
// battle engine makes for the burn has its own digits removed, so the burn
// can never appear twice.
//=============================================================================

Andrew.ManaBurn.claimPopup = function(id) {
  var list = Andrew.ManaBurn.shownIds;
  if (list.indexOf(id) >= 0) return false;
  list.push(id);
  if (list.length > 64) list.shift();
  return true;
};

Andrew.ManaBurn.Sprite_Damage_setup = Sprite_Damage.prototype.setup;
Sprite_Damage.prototype.setup = function(target) {
  Andrew.ManaBurn.Sprite_Damage_setup.call(this, target);
  this.setupManaBurnPopup(target);
};

Sprite_Damage.prototype.setupManaBurnPopup = function(target) {
  var result = this._result || target.result();
  if (!result || !(result.andrewManaBurn > 0)) return;
  var mpOnly = !result.hpAffected;
  if (mpOnly) {
    // The engine's own (uncolored) MP number for this burn: remove it.
    while (this.children.length > 0) this.removeChild(this.children[0]);
  }
  if (result.missed || result.evaded || !target.isAlive()) return;
  var w = this.digitWidth();
  var h = this.digitHeight();
  var digits = Andrew.ManaBurn.getDigitBitmap(this._damageBitmap);
  if (!digits || w <= 0 || h <= 0) return;
  if (!Andrew.ManaBurn.claimPopup(result.andrewManaBurnId)) return;
  var gap = 0.5;
  var hpCount = this.children.length;
  var hpLength = mpOnly ? 0 : String(Math.abs(result.hpDamage)).length;
  var text = String(result.andrewManaBurn);
  var mpShift = mpOnly ? 0 : (hpLength + gap) / 2 * w;
  var hpShift = (text.length + gap) / 2 * w;
  for (var i = 0; i < hpCount; i++) this.children[i].x -= hpShift;
  for (var j = 0; j < text.length; j++) {
    var sprite = this.createChildSprite();
    sprite.bitmap = digits;
    sprite.setFrame(Number(text[j]) * w, 0, w, h);
    sprite.x = (j - (text.length - 1) / 2) * w + mpShift;
    sprite.dy = -j;
  }
};

// Builds (once) a copy of the white digit row of Damage.png tinted to the
// popup color: multiply keeps the black outline and turns the white fill into
// the exact color, then the original alpha is restored.
Andrew.ManaBurn.getDigitBitmap = function(source) {
  if (!source || !source.isReady() || source.width <= 0) return null;
  var color = Andrew.ManaBurn.popupColor;
  if (Andrew.ManaBurn.digitBitmapCache &&
      Andrew.ManaBurn.digitBitmapColor === color) {
    return Andrew.ManaBurn.digitBitmapCache;
  }
  var img = source._canvas || source._image;
  if (!img) return null;
  var w = source.width;
  var h = Math.floor(source.height / 5);
  var bitmap = new Bitmap(w, h);
  var ctx = bitmap._context;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
  ctx.restore();
  bitmap._setDirty();
  Andrew.ManaBurn.digitBitmapCache = bitmap;
  Andrew.ManaBurn.digitBitmapColor = color;
  return bitmap;
};

//=============================================================================
// End of File
//=============================================================================