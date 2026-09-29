//=============================================================================
// ADRI_InBattleEnemyStatus.js
//=============================================================================

//=============================================================================
 /*:
 * @plugindesc Enemy status display window. 
 *
 *
 * @author Fortunastreet
 *
 * @param Show stats eval
 * @parent ---General---
 * @desc Determine if enemy stats are shown. 'battler' refers to the current enemy.
 * @default true
 *
 * @param Command Text
 * @parent ---General---
 * @desc The text used for 'Enemy status' command text in the Party Window.
 * @default Enemy status
 *
 * @param Unknown stat
 * @parent ---General---
 * @desc The text used if the enemy isn't in the battle yet.
 * @default ???
 *
 * @help
 *
 * Free to use if proper credits are given.
 *
 * Requires YEP_X_InBattleStatus.js
 * Place this plugin under all Yanfly plugins
 *
 *
 */
 
 var Imported = Imported || {};
　Imported.ADRI_InBattleEnemyStatus = true;

 var ADRI = ADRI || {};
 ADRI.Parameters = PluginManager.parameters('ADRI_InBattleEnemyStatus');
 ADRI.Params = ADRI.Params || {};
 ADRI.Params.EnemyStatusText = String(ADRI.Parameters['Command Text']) || 'Enemy status';
 ADRI.Params.UnknownStat = String(ADRI.Parameters['Unknown stat']) || '???';
 ADRI.Params.ShowStatsEval = String(ADRI.Parameters['Show stats eval']) || 'true';

if (Imported.YEP_X_InBattleStatus) {
	
//=============================================================================
// Scene_Battle
//=============================================================================

ADRI_InBattleEnemyStatus_Scene_Battle_createAllWindows =
  Scene_Battle.prototype.createAllWindows;
Scene_Battle.prototype.createAllWindows = function() {
  ADRI_InBattleEnemyStatus_Scene_Battle_createAllWindows.call(this);
  this.addPageHandler();
  this.createEnemyInBattleStatusWindows();
};

Scene_Battle.prototype.addPageHandler = function() {
  this._inBattleStateList.setHandler('pagedown',   this.switchToInBattleEnemyStatusWindow.bind(this));
};

Scene_Battle.prototype.createEnemyInBattleStatusWindows = function() {
  this._inBattleEnemyStatusWindow = new Window_InBattleEnemyStatus();
  this._enemyStatusWindow = new Window_EnemyBattleStatus();
  this.addChild(this._inBattleEnemyStatusWindow);
  this.addChild(this._enemyStatusWindow);
  var win = this._inBattleEnemyStatusWindow;
  this._inBattleEnemyStateList = new Window_InBattleEnemyStateList(win);
  this._inBattleEnemyStateList.setHelpWindow(this._helpWindow);
  this._inBattleEnemyStateList.setStatusWindow(this._enemyStatusWindow);
  this.addChild(this._inBattleEnemyStateList);
  this._inBattleEnemyStateList.setHandler('cancel', this.onInBattleEnemyStatusCancel.bind(this));
  this._inBattleEnemyStateList.setHandler('pageup',   this.switchToInBattleStatusWindow.bind(this));
  this._enemyStatusWindow.setInBattleEnemyStatusWindow(this._inBattleEnemyStateList);
};

Scene_Battle.prototype.onInBattleEnemyStatusCancel = function() {
  this._enemyStatusWindow.hide();
  this._helpWindow.hide();
  this._inBattleEnemyStatusWindow.hide();
  this._inBattleEnemyStateList.hide();
  this._enemyStatusWindow.deselect();
  this._inBattleEnemyStateList.deactivate();
  this._partyCommandWindow.activate();
  if (Imported.YEP_X_PartyLimitGauge) {
    $gameSystem.setShowPartyLimitGauge(this._showPartyLimitGauge);
    $gameSystem.setShowTroopLimitGauge(this._showTroopLimitGauge);
  }
};

Scene_Battle.prototype.switchToInBattleEnemyStatusWindow = function() {
  this._inBattleStatusWindow.hide();
  this._enemyStatusWindow.deselect();
  this._inBattleStateList.hide();
  this._inBattleStateList.deactivate();
  
  this._partyCommandWindow.select(this._partyCommandWindow.findSymbol('inBattleEnemyStatus'));
  
  this._enemyStatusWindow.refresh();
  this._enemyStatusWindow.show();
  this._inBattleEnemyStatusWindow.show();
  this._inBattleEnemyStateList.show();
  this._inBattleEnemyStateList.activate();
  this._inBattleEnemyStateList.setBattler($gameTroop.aliveMembers()[0]);
  this._statusWindow.deselect();
};

Scene_Battle.prototype.switchToInBattleStatusWindow = function() {
  this._enemyStatusWindow.hide();
  this._enemyStatusWindow.deselect();
  this._inBattleEnemyStatusWindow.hide();
  this._inBattleEnemyStateList.hide();
  this._inBattleEnemyStateList.deactivate();
  
  this._partyCommandWindow.select(this._partyCommandWindow.findSymbol('inBattleStatus'));
  
  this._inBattleStatusWindow.show();
  this._inBattleStateList.show();
  this._inBattleStateList.activate();
  this._inBattleStateList.setBattler($gameParty.battleMembers()[0]);
};

ADRI_InBattleEnemyStatus_Scene_Battle_createPartyCommandWindow = Scene_Battle.prototype.createPartyCommandWindow;
Scene_Battle.prototype.createPartyCommandWindow = function() {
  ADRI_InBattleEnemyStatus_Scene_Battle_createPartyCommandWindow.call(this);
  var win = this._partyCommandWindow;
  win.setHandler('inBattleEnemyStatus', this.commandInBattleEnemyStatus.bind(this));
};

Scene_Battle.prototype.commandInBattleEnemyStatus = function() {
  this._helpWindow.show();
  this._enemyStatusWindow.refresh();
  this._enemyStatusWindow.show();
  this._inBattleEnemyStatusWindow.show();
  this._inBattleEnemyStateList.show();
  this._inBattleEnemyStateList.activate();
  this._inBattleEnemyStateList.setBattler($gameTroop.aliveMembers()[0]);
  if (Imported.YEP_X_PartyLimitGauge) {
    this._showPartyLimitGauge = $gameSystem.isShowPartyLimitGauge();
    this._showTroopLimitGauge = $gameSystem.isShowTroopLimitGauge();
    $gameSystem.setShowPartyLimitGauge(false);
    $gameSystem.setShowTroopLimitGauge(false);
  }
};

ADRI_InBattleEnemyStatus_Scene_Battle_isAnyInputWindowActive = Scene_Battle.prototype.isAnyInputWindowActive;
Scene_Battle.prototype.isAnyInputWindowActive = function() {
  if (this._inBattleEnemyStateList && this._inBattleEnemyStateList.active) return true;
  return ADRI_InBattleEnemyStatus_Scene_Battle_isAnyInputWindowActive.call(this);
};

if (Imported.YEP_X_BattleSysCTB) {

ADRI_InBattleEnemyStatus_Scene_Battle_updateWindowPositionsCTB = Scene_Battle.prototype.updateWindowPositionsCTB;
Scene_Battle.prototype.updateWindowPositionsCTB = function() {
  if (this._inBattleEnemyStatusWindow && this._inBattleEnemyStatusWindow.visible) {
    return;
  }
  ADRI_InBattleEnemyStatus_Scene_Battle_updateWindowPositionsCTB.call(this);
};
	
}
	
//=============================================================================
// Window_PartyCommand
//=============================================================================

ADRI_InBattleEnemyStatus_Window_PartyCommand_makeCommandList = Window_PartyCommand.prototype.makeCommandList;
Window_PartyCommand.prototype.makeCommandList = function() {
  ADRI_InBattleEnemyStatus_Window_PartyCommand_makeCommandList.call(this);
  this.makeEnemyInBattleStatusCommand();
};

Window_PartyCommand.prototype.makeEnemyInBattleStatusCommand = function() {
  if (!$gameSystem.isShowInBattleStatus()) return;
  var index = this.findSymbol('escape');
  var text = ADRI.Params.EnemyStatusText;
  this.addCommandAt(index, text, 'inBattleEnemyStatus', true);
};

//=============================================================================
// Window_InBattleStateList
//=============================================================================

Window_InBattleStateList.prototype.cursorPagedown = function() {
    // Do nothing
};

Window_InBattleStateList.prototype.cursorPageup = function() {
    // Do nothing
};

//=============================================================================
// Window_InBattleEnemyStateList
//=============================================================================

function Window_InBattleEnemyStateList() {
    this.initialize.apply(this, arguments);
}

Window_InBattleEnemyStateList.prototype = Object.create(Window_InBattleStateList.prototype);
Window_InBattleEnemyStateList.prototype.constructor = Window_InBattleEnemyStateList;

Window_InBattleEnemyStateList.prototype.initialize = function(parentWindow) {
  Window_InBattleStateList.prototype.initialize.call(this, parentWindow);
  this._battler = $gameTroop.aliveMembers()[0];
};

Window_InBattleEnemyStateList.prototype.setBattler = function(battler) {
  this._battler = battler;
  this._parentWindow.setBattler(battler);
  this.refresh();
  this.select(0);
  if (this._statusWindow) {
    var index = $gameTroop.aliveMembers().indexOf(battler)
    this._statusWindow.select(index);
  }
};

Window_InBattleEnemyStateList.prototype.updateLeftRight = function() {
  var index = $gameTroop.aliveMembers().indexOf(this._battler);
  var current = index;
  if (Input.isRepeated('left')) {
    index -= 1;
  } else if (Input.isRepeated('right')) {
    index += 1;
  }
  index = index.clamp(0, $gameTroop.aliveMembers().length - 1);
  if (current !== index) {
    var battler = $gameTroop.aliveMembers()[index];
    this.setBattler(battler);
    SoundManager.playCursor();
  }
};
	
//=============================================================================
// Window_InBattleEnemyStatus
//=============================================================================

function Window_InBattleEnemyStatus() {
    this.initialize.apply(this, arguments);
}

Window_InBattleEnemyStatus.prototype = Object.create(Window_InBattleStatus.prototype);
Window_InBattleEnemyStatus.prototype.constructor = Window_InBattleEnemyStatus;

Window_InBattleEnemyStatus.prototype.initialize = function() {
  Window_InBattleStatus.prototype.initialize.call(this);
  this._battler = $gameTroop.aliveMembers()[0];
  this.refresh();
};

Window_InBattleEnemyStatus.prototype.refresh = function() {
  this.contents.clear();
  if (!this._battler) return;
  var battler = this._battler;
  var showStats = eval(ADRI.Params.ShowStatsEval);
  this.refreshSimpleVersion(showStats);
};

Window_InBattleEnemyStatus.prototype.refreshSimpleVersion = function(showStats) {
  var x = this.standardPadding() + eval(Yanfly.Param.IBSStatusListWidth);
  var w = this.contents.width - x;
  this.drawSimpleEnemyStatus(this._battler, showStats, x, 0, w);
  w = this.contents.width - x;
  var y = Math.ceil(this.lineHeight() * 4.5);
  var h = this.contents.height - y;
  if (h >= this.lineHeight() * 6) {
    for (var i = 2; i < 8; ++i) {
      this.drawParam(i, showStats, x, y, w, this.lineHeight());
      y += this.lineHeight();
    }
  } else {
    w = Math.floor(w / 2);
    x2 = x;
    for (var i = 2; i < 8; ++i) {
      this.drawParam(i, showStats, x2, y, w, this.lineHeight());
      if (i % 2 === 0) {
        x2 += w;
      } else {
        x2 = x;
        y += this.lineHeight();
      }
    }
  }
};

Window_InBattleEnemyStatus.prototype.drawSimpleEnemyStatus = function(enemy, showStats, x, y, width) {
    var lineHeight = this.lineHeight();
    var x2 = x + 80;
    var width2 = width - 80;
	// var x2 = x + 180;
    // var width2 = Math.min(200, width - 180 - this.textPadding());
    this.drawEnemyFullName(enemy, showStats, x2, y, width2);
    this.drawActorIcons(enemy, x2, y + lineHeight * 1);
    this.drawEnemyHp(enemy, showStats, x2, y + lineHeight * 2, width2);
    this.drawEnemyMp(enemy, showStats, x2, y + lineHeight * 3, width2);
};

Window_InBattleEnemyStatus.prototype.drawEnemyFullName = function(enemy, showStats, x, y, width) {
	width = width || 336;
	if (enemy.level) {
		this.drawActorName(enemy, x, y, width - 84);
		// Simple drawActorLevel
		this.changeTextColor(this.systemColor());
		this.drawText(TextManager.levelA, x + width - 84, y, 48);
		this.resetTextColor();
		this.drawText(showStats ? enemy.level : ADRI.Params.UnknownStat, x + width - 36, y, 36, 'right');
	} else {
		this.drawText(enemy.name(), x, y, width, 'right');
	}
};

Window_InBattleEnemyStatus.prototype.drawEnemyHp = function(enemy, showStats, x, y, width) {
	var showGauge = Imported.YEP_X_VisualHpGauge ? $gameSystem.showHpGaugeEnemy(enemy.enemyId()) : true;
	if (showStats && showGauge) {
		this.drawActorHp(enemy, x, y, width);
	} else {
		width = width || 186;
		var color1 = this.hpGaugeColor1();
		var color2 = this.hpGaugeColor2();
		this.drawGauge(x, y, width, 0, color1, color2); // Draw an empty gauge
		this.changeTextColor(this.systemColor());
		this.drawText(TextManager.hpA, x, y, 44);
		this.drawUnknownCurrentAndMax(ADRI.Params.UnknownStat, showStats ? enemy.mhp : ADRI.Params.UnknownStat, x, y, width, this.normalColor(), this.normalColor());
	}
};

Window_InBattleEnemyStatus.prototype.drawEnemyMp = function(enemy, showStats, x, y, width) {
	var showGauge = Imported.YEP_X_VisualHpGauge ? $gameSystem.showHpGaugeEnemy(enemy.enemyId()) : true;
	if (showStats && showGauge) {
		this.drawActorMp(enemy, x, y, width);
	} else {
		width = width || 186;
		var color1 = this.mpGaugeColor1();
		var color2 = this.mpGaugeColor2();
		this.drawGauge(x, y, width, 0, color1, color2); // Draw an empty gauge
		this.changeTextColor(this.systemColor());
		this.drawText(TextManager.mpA, x, y, 44);
		this.drawUnknownCurrentAndMax(ADRI.Params.UnknownStat, showStats ? enemy.mmp : ADRI.Params.UnknownStat, x, y, width, this.normalColor(), this.normalColor());
	}
};

Window_InBattleEnemyStatus.prototype.drawUnknownCurrentAndMax = function(current, max, x, y, width, color1, color2) {
    var labelWidth = this.textWidth('HP');
	var maxWidth = this.textWidth(Yanfly.Util.toGroup(max));
	var currentWidth = this.textWidth('???');
    var slashWidth = this.textWidth('/');
    var x1 = x + width - maxWidth;
    var x2 = x1 - slashWidth;
    var x3 = x2 - currentWidth;
    if (x3 >= x + labelWidth) {
        this.changeTextColor(color1);
        this.drawText(Yanfly.Util.toGroup(current), x3, y, currentWidth,
          'right');
        this.changeTextColor(color2);
        this.drawText('/', x2, y, slashWidth, 'right');
        this.drawText(Yanfly.Util.toGroup(max), x1, y, maxWidth, 'right');
    } else {
        this.changeTextColor(color1);
        this.drawText(Yanfly.Util.toGroup(current), x1, y, currentWidth,
          'right');
    }
};

Window_InBattleEnemyStatus.prototype.drawParam = function(paramId, showStats, dx, dy, dw, dh) {  
	this.drawDarkRect(dx, dy, dw, dh);
	var level = this._battler._buffs[paramId];
	var icon = this._battler.buffIconIndex(level, paramId);
	this.drawIcon(icon, dx + 2, dy + 2);
	dx += Window_Base._iconWidth + 4;
	dw -= Window_Base._iconWidth + 4 + this.textPadding() + 2;
	this.changeTextColor(this.systemColor());
	this.drawText(TextManager.param(paramId), dx, dy, dw);
	var value = this._battler.param(paramId);
	this.changeTextColor(this.paramchangeTextColor(level));
	this.drawText(showStats ? Yanfly.Util.toGroup(value) : ADRI.Params.UnknownStat, dx, dy, dw, 'right');
};

//=============================================================================
// Window_EnemyBattleStatus
//=============================================================================

function Window_EnemyBattleStatus() {
    this.initialize.apply(this, arguments);
}

Window_EnemyBattleStatus.prototype = Object.create(Window_Selectable.prototype);
Window_EnemyBattleStatus.prototype.constructor = Window_EnemyBattleStatus;

Window_EnemyBattleStatus.prototype.initialize = function() {
    var width = this.windowWidth();
    var height = this.windowHeight();
    var x = Graphics.boxWidth - width;
    var y = Graphics.boxHeight - height;
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
    this.hide();
};

Window_EnemyBattleStatus.prototype.windowWidth = function() {
    return Graphics.boxWidth - 192;
};

Window_EnemyBattleStatus.prototype.windowHeight = function() {
    return this.fittingHeight(this.numVisibleRows());
};

Window_EnemyBattleStatus.prototype.lineHeight = function() {
	var height = Window_Selectable.prototype.lineHeight.call(this);
    return this.maxItems() > 4 ? height : 2 * height;
};

Window_EnemyBattleStatus.prototype.numVisibleRows = function() {
    return this.maxItems() > 4 ? 4 : 2;
};

Window_EnemyBattleStatus.prototype.setInBattleEnemyStatusWindow = function(win) {
  this._inBattleEnemyStatusWindow = win;
};

Window_EnemyBattleStatus.prototype.maxItems = function() {
    return $gameTroop.aliveMembers().length;
};

Window_EnemyBattleStatus.prototype.maxRows = function() {
    return this.maxItems() > 4 ? 4 : 2;
};

Window_EnemyBattleStatus.prototype.maxCols = function() {
    return 2;
};

Window_EnemyBattleStatus.prototype.drawItem = function(index) {
	this.resetTextColor();
    var enemy = $gameTroop.aliveMembers()[index];		
    var name = enemy.name();
    var rect = this.itemRectForText(index);
    this.drawText(name, rect.x, rect.y, rect.width);
};

Window_EnemyBattleStatus.prototype.update = function() {
  Window_Selectable.prototype.update.call(this);
  this.processInBattleStatusTouch();
};

Window_EnemyBattleStatus.prototype.processInBattleStatusTouch = function() {
  if (!this._inBattleEnemyStatusWindow) return;
  if (!this._inBattleEnemyStatusWindow.active) return;
  if (TouchInput.isTriggered() && this.isTouchedInsideFrame()) {
    this.onInBattleStatusTouch();
  }
};

Window_EnemyBattleStatus.prototype.onInBattleStatusTouch = function() {
  var lastIndex = this.index();
  var x = this.canvasToLocalX(TouchInput.x);
  var y = this.canvasToLocalY(TouchInput.y);
  var hitIndex = this.hitTest(x, y);
  if (hitIndex >= 0) {
    var enemy = $gameTroop.aliveMembers()[hitIndex];
    var win = this._inBattleEnemyStatusWindow;
    if (win && enemy) {
      win.setBattler(enemy);
      SoundManager.playCursor();
    }
  }
};

//=============================================================================
// Window_CTBIcon
//=============================================================================

if (Imported.YEP_X_BattleSysCTB) {

ADRI_InBattleEnemyStatus_Window_CTBIcon_isReduceOpacity =
  Window_CTBIcon.prototype.isReduceOpacity;
Window_CTBIcon.prototype.isReduceOpacity = function() {
  if (SceneManager._scene._inBattleEnemyStatusWindow) {
    if (SceneManager._scene._inBattleEnemyStatusWindow.visible) return true;
  }
  return ADRI_InBattleEnemyStatus_Window_CTBIcon_isReduceOpacity.call(this);
};

}; // Imported.YEP_X_BattleSysCTB

}