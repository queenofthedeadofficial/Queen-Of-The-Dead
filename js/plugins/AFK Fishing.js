//=============================================================================
// Andrew_AFKFishingIndicator.js
//=============================================================================

/*:
 * @plugindesc v1.00 Shows a purely visual "AFK Fishing" text box on the map
 * while a switch is on. Holding OK closes it. Does not pause game processing.
 * @author Andrew
 *
 * @param AFK Switch ID
 * @desc The switch ID that shows/hides the AFK Fishing text box.
 * @default 596
 *
 * @param Hold Frames
 * @desc How many frames the OK button (Enter/A/X) must be held to close the box.
 * @default 60
 *
 * @param Line 1 Text
 * @desc First line of text in the box.
 * @default You are now AFK Fishing. You have caught \v[147] fish.
 *
 * @param Line 2 Text
 * @desc Second line of text in the box.
 * @default Hold Enter/A/X to stop.
 *
 * @param Refresh Variable ID
 * @desc The box redraws its text any time this variable's value increases.
 * @default 147
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * While the configured switch (default: Switch 596) is ON, a text box the
 * same size as the default message window appears at the bottom of the map
 * screen, showing:
 *
 *   You are now AFK Fishing.
 *   Hold Enter/A/X to stop.
 *
 * This window is purely a visual overlay. It does NOT use $gameMessage and
 * does NOT pause map events, player movement, or any other game processing.
 * It simply floats on top of Scene_Map like a HUD element.
 *
 * Holding the OK button (Enter on keyboard, A/X on gamepad - both map to
 * RPG Maker's built-in 'ok' input) for the configured number of frames turns
 * the switch back OFF, which closes the box. Nothing else about the input
 * is intercepted or consumed, so it will not interfere with any other
 * 'ok' behavior (menus, event interaction, etc.) happening at the same time.
 *
 * Turning the switch off/on from an event or another plugin will also
 * close/open the box normally, since it simply watches the switch value.
 *
 * The box also redraws its text any time the configured variable (default:
 * Variable 147) increases in value. This is useful if you put a \V[147]
 * escape code into Line 1 or Line 2 Text and want it to update live (e.g.
 * a fish-caught counter), since window text otherwise only redraws when
 * refresh() is explicitly called.
 *
 * Place this plugin anywhere below the core engine plugins.
 *
 * ============================================================================
 */
//=============================================================================

var Andrew = Andrew || {};
Andrew.AFKFishing = Andrew.AFKFishing || {};
Andrew.Parameters = PluginManager.parameters(document.currentScript.src
  .split('/').pop().replace(/\.js$/, ''));

Andrew.AFKFishing.SwitchId = Number(Andrew.Parameters['AFK Switch ID'] || 596);
Andrew.AFKFishing.HoldFrames = Number(Andrew.Parameters['Hold Frames'] || 60);
Andrew.AFKFishing.Line1 = String(Andrew.Parameters['Line 1 Text'] ||
  'You are now AFK Fishing. You have caught \\v[147] fish.');
Andrew.AFKFishing.Line2 = String(Andrew.Parameters['Line 2 Text'] ||
  'Hold Enter/A/X to stop.');
Andrew.AFKFishing.VariableId = Number(Andrew.Parameters['Refresh Variable ID'] || 147);

//=============================================================================
// Window_AFKFishing
//=============================================================================

function Window_AFKFishing() {
    this.initialize.apply(this, arguments);
}

Window_AFKFishing.prototype = Object.create(Window_Base.prototype);
Window_AFKFishing.prototype.constructor = Window_AFKFishing;

Window_AFKFishing.prototype.initialize = function() {
    var width = Graphics.boxWidth;
    var height = this.fittingHeight(4);
    var x = 0;
    var y = Graphics.boxHeight - height;
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._holdCount = 0;
    this.openness = 0;
    this._lastVariableValue = $gameVariables.value(Andrew.AFKFishing.VariableId);
    this.refresh();
};

Window_AFKFishing.prototype.textWidthEx = function(text) {
    return this.drawTextEx(text, 0, this.contents.height);
};

Window_AFKFishing.prototype.refresh = function() {
    var line1 = Andrew.AFKFishing.Line1;
    var line2 = Andrew.AFKFishing.Line2;
    var w1 = this.textWidthEx(line1);
    var w2 = this.textWidthEx(line2);
    var dx1 = Math.max((this.contents.width - w1) / 2, 0);
    var dx2 = Math.max((this.contents.width - w2) / 2, 0);
    this.contents.clear();
    this.drawTextEx(line1, dx1, 0);
    this.drawTextEx(line2, dx2, this.lineHeight());
};

Window_AFKFishing.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    var currentValue = $gameVariables.value(Andrew.AFKFishing.VariableId);
    if (currentValue > this._lastVariableValue) {
      this.refresh();
    }
    this._lastVariableValue = currentValue;
};

//=============================================================================
// Scene_Map
//=============================================================================

Andrew.AFKFishing.Scene_Map_createAllWindows =
    Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    Andrew.AFKFishing.Scene_Map_createAllWindows.call(this);
    this.createAFKFishingWindow();
};

Scene_Map.prototype.createAFKFishingWindow = function() {
    this._afkFishingWindow = new Window_AFKFishing();
    this.addWindow(this._afkFishingWindow);
};

Andrew.AFKFishing.Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    Andrew.AFKFishing.Scene_Map_update.call(this);
    this.updateAFKFishingWindow();
};

Scene_Map.prototype.updateAFKFishingWindow = function() {
    var win = this._afkFishingWindow;
    if (!win) return;
    var switchOn = $gameSwitches.value(Andrew.AFKFishing.SwitchId);
    if (switchOn) {
      if (win.openness < 255 && !win._opening) {
        win.refresh();
        win.open();
      }
      if (Input.isPressed('ok')) {
        win._holdCount++;
        if (win._holdCount >= Andrew.AFKFishing.HoldFrames) {
          win._holdCount = 0;
          $gameSwitches.setValue(Andrew.AFKFishing.SwitchId, false);
        }
      } else {
        win._holdCount = 0;
      }
    } else {
      win._holdCount = 0;
      if (win.openness > 0 && !win._closing) {
        win.close();
      }
    }
};