//=============================================================================
// Andrew_AFKScavengingIndicator.js
//=============================================================================

/*:
 * @plugindesc v1.00 Shows a purely visual "AFK Scavenging" text box on the map
 * while a switch is on. Holding OK closes it. Does not pause game processing.
 * @author Andrew
 *
 * @param AFK Switch ID
 * @desc The switch ID that shows/hides the AFK Scavenging text box.
 * @default 597
 *
 * @param Hold Frames
 * @desc How many frames the OK button (Enter/A/X) must be held to close the box.
 * @default 60
 *
 * @param Line 1 Text
 * @desc First line of text in the box.
 * @default You are now AFK Scavenging. You have scavenged \v[140] resources.
 *
 * @param Line 2 Text
 * @desc Second line of text in the box.
 * @default Hold Enter/A/X to stop.
 *
 * @param Refresh Variable ID
 * @desc The box redraws its text any time this variable's value increases.
 * @default 140
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * While the configured switch (default: Switch 597) is ON, a text box the
 * same size as the default message window appears at the bottom of the map
 * screen, showing:
 *
 *   You are now AFK Scavenging. You have scavenged \v[140] resources.
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
 * Variable 140) increases in value. This is useful since it has a \V[140]
 * escape code in Line 1 Text and you want it to update live (e.g. a
 * resources-scavenged counter), since window text otherwise only redraws
 * when refresh() is explicitly called.
 *
 * This plugin is independent from Andrew_AFKFishingIndicator.js (separate
 * switch, variable, window, and namespace), so both can run at the same
 * time without conflicting.
 *
 * Place this plugin anywhere below the core engine plugins.
 *
 * ============================================================================
 */
//=============================================================================

var Andrew = Andrew || {};
Andrew.AFKScavenging = Andrew.AFKScavenging || {};
Andrew.Parameters = PluginManager.parameters(document.currentScript.src
  .split('/').pop().replace(/\.js$/, ''));

Andrew.AFKScavenging.SwitchId = Number(Andrew.Parameters['AFK Switch ID'] || 597);
Andrew.AFKScavenging.HoldFrames = Number(Andrew.Parameters['Hold Frames'] || 60);
Andrew.AFKScavenging.Line1 = String(Andrew.Parameters['Line 1 Text'] ||
  'You are now AFK Scavenging. You have scavenged \\v[140] resources.');
Andrew.AFKScavenging.Line2 = String(Andrew.Parameters['Line 2 Text'] ||
  'Hold Enter/A/X to stop.');
Andrew.AFKScavenging.VariableId = Number(Andrew.Parameters['Refresh Variable ID'] || 140);

//=============================================================================
// Window_AFKScavenging
//=============================================================================

function Window_AFKScavenging() {
    this.initialize.apply(this, arguments);
}

Window_AFKScavenging.prototype = Object.create(Window_Base.prototype);
Window_AFKScavenging.prototype.constructor = Window_AFKScavenging;

Window_AFKScavenging.prototype.initialize = function() {
    var width = Graphics.boxWidth;
    var height = this.fittingHeight(4);
    var x = 0;
    var y = Graphics.boxHeight - height;
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._holdCount = 0;
    this.openness = 0;
    this._lastVariableValue = $gameVariables.value(Andrew.AFKScavenging.VariableId);
    this.refresh();
};

Window_AFKScavenging.prototype.textWidthEx = function(text) {
    return this.drawTextEx(text, 0, this.contents.height);
};

Window_AFKScavenging.prototype.refresh = function() {
    var line1 = Andrew.AFKScavenging.Line1;
    var line2 = Andrew.AFKScavenging.Line2;
    var w1 = this.textWidthEx(line1);
    var w2 = this.textWidthEx(line2);
    var dx1 = Math.max((this.contents.width - w1) / 2, 0);
    var dx2 = Math.max((this.contents.width - w2) / 2, 0);
    this.contents.clear();
    this.drawTextEx(line1, dx1, 0);
    this.drawTextEx(line2, dx2, this.lineHeight());
};

Window_AFKScavenging.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    var currentValue = $gameVariables.value(Andrew.AFKScavenging.VariableId);
    if (currentValue > this._lastVariableValue) {
      this.refresh();
    }
    this._lastVariableValue = currentValue;
};

//=============================================================================
// Scene_Map
//=============================================================================

Andrew.AFKScavenging.Scene_Map_createAllWindows =
    Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    Andrew.AFKScavenging.Scene_Map_createAllWindows.call(this);
    this.createAFKScavengingWindow();
};

Scene_Map.prototype.createAFKScavengingWindow = function() {
    this._afkScavengingWindow = new Window_AFKScavenging();
    this.addWindow(this._afkScavengingWindow);
};

Andrew.AFKScavenging.Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    Andrew.AFKScavenging.Scene_Map_update.call(this);
    this.updateAFKScavengingWindow();
};

Scene_Map.prototype.updateAFKScavengingWindow = function() {
    var win = this._afkScavengingWindow;
    if (!win) return;
    var switchOn = $gameSwitches.value(Andrew.AFKScavenging.SwitchId);
    if (switchOn) {
      if (win.openness < 255 && !win._opening) {
        win.refresh();
        win.open();
      }
      if (Input.isPressed('ok')) {
        win._holdCount++;
        if (win._holdCount >= Andrew.AFKScavenging.HoldFrames) {
          win._holdCount = 0;
          $gameSwitches.setValue(Andrew.AFKScavenging.SwitchId, false);
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