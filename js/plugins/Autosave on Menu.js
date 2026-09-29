//=============================================================================
// Andrew_AutosaveOnMenuOpen.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_AutosaveOnMenuOpen = true;

var Andrew = Andrew || {};
Andrew.AutosaveMenu = Andrew.AutosaveMenu || {};
Andrew.AutosaveMenu.version = 1.50;

//=============================================================================
/*:
 * @plugindesc v1.50 Autosaves over the current save slot every time the
 * player opens OR closes the Main Menu, with a player-facing On/Off
 * option, an optional "Autosaving..." textbox, and a script call for
 * manually triggering an autosave on demand.
 * @author Andrew
 *
 * @param Option Command Text
 * @desc The text shown for this option in the Options menu.
 * @default Autosave
 *
 * @param Default Setting
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Is Autosave-on-menu-open enabled by default for new players?
 * @default true
 *
 * @param Show Option
 * @type boolean
 * @on YES
 * @off NO
 * @desc Give the player the option to turn this on/off in the
 * Options menu?
 * @default true
 *
 * @param Show Saving Message
 * @type boolean
 * @on YES
 * @off NO
 * @desc Show an "Autosaving..." textbox while the autosave-on-menu-open
 * save is taking place? If NO, the save happens silently like before.
 * @default true
 *
 * @param Autosaving Text
 * @desc The text displayed in the textbox while autosaving.
 * @default Autosaving...
 *
 * @param Message Position
 * @type select
 * @option Top Left
 * @value topLeft
 * @option Top Right
 * @value topRight
 * @option Bottom Left
 * @value bottomLeft
 * @option Bottom Right
 * @value bottomRight
 * @option Center
 * @value center
 * @desc Where on the screen the "Autosaving..." textbox appears.
 * @default bottomRight
 *
 * @param Minimum Display Frames
 * @type number
 * @min 1
 * @desc Minimum number of frames (60 = 1 second) the textbox stays
 * visible, even if the save itself finishes instantly.
 * @default 40
 *
 * @param Async File Write
 * @type boolean
 * @on YES
 * @off NO
 * @desc Write the save file to disk asynchronously so the actual disk
 * I/O doesn't block the game loop? (Local/NW.js deploys only.)
 * @default true
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Whenever the player opens OR closes the Main Menu (backing out to the
 * map), this plugin saves the game over whichever save slot they last
 * manually saved to (or loaded from). It adds an "Autosave" option to the
 * Options menu with ON/OFF settings so the player can turn this behavior
 * off if they don't want it.
 *
 * Optionally, it also shows a small "Autosaving..." textbox on the Main
 * Menu screen while the save happens, which closes automatically once the
 * save is finished (and a minimum display time has passed, so it doesn't
 * just flash on screen for an instant save).
 *
 * This plugin tracks its own "has the player saved, and to which slot"
 * state internally. It does not depend on or interact with
 * YEP_X_Autosave's internal state, so it isn't affected by anything that
 * might interfere with that plugin's own tracking.
 *
 * ============================================================================
 * Requirements
 * ============================================================================
 *
 * Requires YEP_SaveCore.js (for DataManager.saveGameWithoutRescue and
 * $gameSystem.onBeforeSave). If YEP_X_Autosave.js is also present, this
 * plugin will reuse its "Autosave Complete!" popup window for visual
 * feedback where available. If YEP_X_Autosave.js is not present, saving
 * still works fine without it.
 *
 * *NOTE: If you're also using YEP_X_Autosave.js's own "Autosave on Main
 * Menu" parameter, turn that OFF in its Plugin Manager parameters. Leaving
 * both on will cause the game to save twice (and show two popups) every
 * time the menu opens.
 *
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 *   EnableAutosaveMenu
 *   DisableAutosaveMenu
 *   - Forcibly enables or disables this plugin's autosave-on-menu-open
 *   behavior at the game/dev level (for example, to suppress it during a
 *   specific sequence). This does not touch the player's own On/Off
 *   setting -- if the player has it set to Off, it stays off regardless.
 *   This setting is saved as part of the save file.
 *
 * ============================================================================
 * Script Calls
 * ============================================================================
 *
 *   Andrew.AutosaveMenu.autosaveNow();
 *   - Manually triggers an autosave over the player's current save slot,
 *   using the same async-aware save routine as the automatic menu-open
 *   autosave. Use this from an event's "Script..." command. If "Show Saving
 *   Message" is on, this shows the "Autosaving..." textbox on whichever
 *   scene the call was made from (map, menu, battle, etc), just like the
 *   automatic menu-open autosave does. It ignores the player's
 *   Options-menu Autosave toggle and the EnableAutosaveMenu/
 *   DisableAutosaveMenu plugin commands -- this is an explicit save call,
 *   not the automatic on-menu-open behavior. It does nothing if the player
 *   hasn't saved/loaded yet (no slot to save into) or if a save is already
 *   in progress.
 *
 *   Optionally pass a callback to know once the write has finished:
 *
 *     Andrew.AutosaveMenu.autosaveNow(function(err) {
 *       if (!err) {
 *         // saved successfully
 *       }
 *     });
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.50:
 * - Now also autosaves when the player CLOSES the Main Menu (cancels back
 *   out to the map), not just when they open it. Uses the same On/Off
 *   toggle, EnableAutosaveMenu/DisableAutosaveMenu commands, and
 *   "Autosaving..." textbox as the menu-open autosave -- the textbox is
 *   shown on Scene_Map once control returns there, via the same
 *   pendingAutosave hand-off already used for the menu-open case.
 *
 * Version 1.40:
 * - The "Autosaving..." textbox now shows for every autosave, not just the
 *   automatic menu-open one. Andrew.AutosaveMenu.autosaveNow() now opens it
 *   on whichever scene the call was made from (as long as "Show Saving
 *   Message" is on), instead of always saving silently. The underlying
 *   textbox logic moved from Scene_Menu to Scene_Base so any scene can
 *   show it. The window itself is created lazily on first use rather than
 *   on every scene's create(), since creating it that early crashed on
 *   Scene_Boot (before $gameSystem exists).
 *
 * Version 1.30:
 * - Added Andrew.AutosaveMenu.autosaveNow(), a script call for manually
 *   triggering an autosave over the current slot from an event. Reuses the
 *   same async-aware save routine as the automatic menu-open autosave, but
 *   saves silently (no "Autosaving..." textbox, since that window only
 *   exists on Scene_Menu) and ignores the player's Autosave On/Off toggle.
 *
 * Version 1.20:
 * - The save call is now deferred a tick past the "Autosaving..." textbox
 *   opening, and (on local/NW.js deploys) the actual disk write is done
 *   asynchronously via fs.writeFile instead of the engine's default
 *   blocking fs.writeFileSync. This reduces, but does not fully eliminate,
 *   the frame hitch on larger save files -- JSON serialization and
 *   LZString compression are still synchronous CPU work and will still
 *   cause a (smaller) stutter. Toggle via the "Async File Write" param.
 *
 * Version 1.10:
 * - Added an optional "Autosaving..." textbox that shows on the Main Menu
 *   while the autosave happens and closes once it's done.
 *
 * Version 1.00:
 * - Finished plugin.
 */
//=============================================================================

//=============================================================================
// Parameter Variables
//=============================================================================

Andrew.AutosaveMenu.Parameters = PluginManager.parameters('Andrew_AutosaveOnMenuOpen');
Andrew.AutosaveMenu.Param = Andrew.AutosaveMenu.Param || {};

Andrew.AutosaveMenu.Param.OptionText =
    Andrew.AutosaveMenu.Parameters['Option Command Text'] === undefined ?
    'Autosave' : String(Andrew.AutosaveMenu.Parameters['Option Command Text']);
Andrew.AutosaveMenu.Param.DefaultOn =
    Andrew.AutosaveMenu.Parameters['Default Setting'] === undefined ?
    true : eval(String(Andrew.AutosaveMenu.Parameters['Default Setting']));
Andrew.AutosaveMenu.Param.ShowOption =
    Andrew.AutosaveMenu.Parameters['Show Option'] === undefined ?
    true : eval(String(Andrew.AutosaveMenu.Parameters['Show Option']));
Andrew.AutosaveMenu.Param.ShowSavingMessage =
    Andrew.AutosaveMenu.Parameters['Show Saving Message'] === undefined ?
    true : eval(String(Andrew.AutosaveMenu.Parameters['Show Saving Message']));
Andrew.AutosaveMenu.Param.AutosavingText =
    Andrew.AutosaveMenu.Parameters['Autosaving Text'] === undefined ?
    'Autosaving...' : String(Andrew.AutosaveMenu.Parameters['Autosaving Text']);
Andrew.AutosaveMenu.Param.MessagePosition =
    Andrew.AutosaveMenu.Parameters['Message Position'] === undefined ?
    'bottomRight' : String(Andrew.AutosaveMenu.Parameters['Message Position']);
Andrew.AutosaveMenu.Param.MinDisplayFrames =
    Andrew.AutosaveMenu.Parameters['Minimum Display Frames'] === undefined ?
    40 : Number(Andrew.AutosaveMenu.Parameters['Minimum Display Frames']);
Andrew.AutosaveMenu.Param.AsyncFileWrite =
    Andrew.AutosaveMenu.Parameters['Async File Write'] === undefined ?
    true : eval(String(Andrew.AutosaveMenu.Parameters['Async File Write']));

//=============================================================================
// Internal Session State
//=============================================================================
// Tracked independently of YEP_X_Autosave's $gameTemp._autosaveNewGame flag
// on purpose, so nothing else in the project can interfere with it.

Andrew.AutosaveMenu.hasSaved = false;
Andrew.AutosaveMenu.slotId = null;
Andrew.AutosaveMenu.pendingAutosave = false;

// Async-write pipeline state. `useAsyncWrite` is only ever set true for the
// duration of this plugin's own save call (see Scene_Menu below), so it
// never changes the behavior of manual player saves or other systems that
// call DataManager.saveGame directly.
Andrew.AutosaveMenu.useAsyncWrite = false;
Andrew.AutosaveMenu.writeInProgress = false;
Andrew.AutosaveMenu.onAsyncWriteComplete = null;

//=============================================================================
// ConfigManager
//=============================================================================

ConfigManager.andrewAutosaveMenu = Andrew.AutosaveMenu.Param.DefaultOn;

Andrew.AutosaveMenu.ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
  var config = Andrew.AutosaveMenu.ConfigManager_makeData.call(this);
  config.andrewAutosaveMenu = this.andrewAutosaveMenu;
  return config;
};

Andrew.AutosaveMenu.ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
  Andrew.AutosaveMenu.ConfigManager_applyData.call(this, config);
  if (config['andrewAutosaveMenu'] === undefined) {
    this.andrewAutosaveMenu = Andrew.AutosaveMenu.Param.DefaultOn;
  } else {
    this.andrewAutosaveMenu = config['andrewAutosaveMenu'];
  }
};

//=============================================================================
// Window_Options
//=============================================================================

Andrew.AutosaveMenu.Window_Options_addGeneralOptions =
    Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
  Andrew.AutosaveMenu.Window_Options_addGeneralOptions.call(this);
  if (Andrew.AutosaveMenu.Param.ShowOption) {
    this.addCommand(Andrew.AutosaveMenu.Param.OptionText, 'andrewAutosaveMenu');
  }
};

//=============================================================================
// JsonEx (diagnostic: time the actual stringify call)
//=============================================================================

Andrew.AutosaveMenu.JsonEx_stringify = JsonEx.stringify;
JsonEx.stringify = function(object) {
  if (!Andrew.AutosaveMenu.useAsyncWrite) {
    return Andrew.AutosaveMenu.JsonEx_stringify.call(this, object);
  }
  console.time('[AutosaveDiag] JsonEx.stringify (real)');
  var result = Andrew.AutosaveMenu.JsonEx_stringify.call(this, object);
  console.timeEnd('[AutosaveDiag] JsonEx.stringify (real)');
  return result;
};

//=============================================================================
// DataManager (diagnostic: per-key save content size)
//=============================================================================

Andrew.AutosaveMenu.DataManager_makeSaveContents = DataManager.makeSaveContents;
DataManager.makeSaveContents = function() {
  console.time('[AutosaveDiag] makeSaveContents (real)');
  var contents = Andrew.AutosaveMenu.DataManager_makeSaveContents.call(this);
  console.timeEnd('[AutosaveDiag] makeSaveContents (real)');

  console.time('[AutosaveDiag] diagnostic overhead (NOT real save cost)');
  console.log('[AutosaveDiag] --- save content breakdown by key ---');
  var results = [];
  Object.keys(contents).forEach(function(key) {
    var size = 'n/a';
    try {
      size = Andrew.AutosaveMenu.JsonEx_stringify.call(JsonEx, contents[key]).length;
    } catch (e) {
      size = 'ERROR: ' + e.message;
    }
    results.push({ key: key, size: size });
  });
  results.sort(function(a, b) {
    var aNum = typeof a.size === 'number' ? a.size : -1;
    var bNum = typeof b.size === 'number' ? b.size : -1;
    return bNum - aNum;
  });
  results.forEach(function(r) {
    var display = typeof r.size === 'number' ?
        (r.size + ' chars (~' + (r.size / 1024).toFixed(1) + ' KB)') : r.size;
    console.log('[AutosaveDiag]   ' + r.key + ': ' + display);
  });
  console.log('[AutosaveDiag] --- end breakdown ---');

  if (contents.actors && contents.actors._data) {
    console.log('[AutosaveDiag] --- actors breakdown ---');
    contents.actors._data.forEach(function(actor, index) {
      if (!actor) return;
      var fieldResults = [];
      Object.keys(actor).forEach(function(field) {
        var size = 'n/a';
        try {
          size = Andrew.AutosaveMenu.JsonEx_stringify.call(JsonEx, actor[field]).length;
        } catch (e) {
          size = 'ERROR: ' + e.message;
        }
        fieldResults.push({ field: field, size: size });
      });
      fieldResults.sort(function(a, b) {
        var aNum = typeof a.size === 'number' ? a.size : -1;
        var bNum = typeof b.size === 'number' ? b.size : -1;
        return bNum - aNum;
      });
      var totalSize = fieldResults.reduce(function(sum, f) {
        return sum + (typeof f.size === 'number' ? f.size : 0);
      }, 0);
      console.log('[AutosaveDiag]   actor[' + index + '] (' +
          (actor._name || '?') + '), total ~' +
          (totalSize / 1024).toFixed(1) + ' KB:');
      fieldResults.slice(0, 8).forEach(function(f) {
        var display = typeof f.size === 'number' ?
            (f.size + ' chars (~' + (f.size / 1024).toFixed(1) + ' KB)') : f.size;
        console.log('[AutosaveDiag]     ' + f.field + ': ' + display);
      });
    });
    console.log('[AutosaveDiag] --- end actors breakdown ---');
  } else if (contents.actors) {
    console.log('[AutosaveDiag] contents.actors has no ._data -- actual keys: ' +
        Object.keys(contents.actors).join(', '));
    Object.keys(contents.actors).forEach(function(key) {
      var val = contents.actors[key];
      var size = 'n/a';
      try {
        size = JSON.stringify(val).length;
      } catch (e) {
        size = 'ERROR: ' + e.message;
      }
      var display = typeof size === 'number' ?
          (size + ' chars (~' + (size / 1024).toFixed(1) + ' KB)') : size;
      console.log('[AutosaveDiag]   contents.actors.' + key + ': ' + display +
          (Array.isArray(val) ? ' [array, length ' + val.length + ']' : ''));
    });
  }

  if (contents.map) {
    console.log('[AutosaveDiag] --- map breakdown ---');
    var mapFieldResults = [];
    Object.keys(contents.map).forEach(function(field) {
      var size = 'n/a';
      try {
        size = Andrew.AutosaveMenu.JsonEx_stringify.call(JsonEx, contents.map[field]).length;
      } catch (e) {
        size = 'ERROR: ' + e.message;
      }
      mapFieldResults.push({ field: field, size: size });
    });
    mapFieldResults.sort(function(a, b) {
      var aNum = typeof a.size === 'number' ? a.size : -1;
      var bNum = typeof b.size === 'number' ? b.size : -1;
      return bNum - aNum;
    });
    mapFieldResults.forEach(function(f) {
      var display = typeof f.size === 'number' ?
          (f.size + ' chars (~' + (f.size / 1024).toFixed(1) + ' KB)') : f.size;
      var val = contents.map[f.field];
      console.log('[AutosaveDiag]   ' + f.field + ': ' + display +
          (Array.isArray(val) ? ' [array, length ' + val.length + ']' : ''));
    });
    // If _events is the big one, break it down further: per-event size and
    // how many events actually have non-trivial (non-default) state.
    if (contents.map._events && Array.isArray(contents.map._events)) {
      var events = contents.map._events;
      var eventSizes = [];
      events.forEach(function(ev, idx) {
        if (!ev) return;
        var size = 'n/a';
        try {
          size = Andrew.AutosaveMenu.JsonEx_stringify.call(JsonEx, ev).length;
        } catch (e) {
          size = 'ERROR: ' + e.message;
        }
        eventSizes.push({ idx: idx, size: size });
      });
      eventSizes.sort(function(a, b) {
        var aNum = typeof a.size === 'number' ? a.size : -1;
        var bNum = typeof b.size === 'number' ? b.size : -1;
        return bNum - aNum;
      });
      var eventTotal = eventSizes.reduce(function(sum, e) {
        return sum + (typeof e.size === 'number' ? e.size : 0);
      }, 0);
      console.log('[AutosaveDiag]   _events total: ~' +
          (eventTotal / 1024).toFixed(1) + ' KB across ' + eventSizes.length + ' events');

      // Aggregate check: how many events are carrying a non-trivial
      // interpreter command list right now?
      var eventsWithList = 0;
      var listTotalSize = 0;
      events.forEach(function(ev) {
        if (!ev || !ev._interpreter || !ev._interpreter._list) return;
        var list = ev._interpreter._list;
        if (Array.isArray(list) && list.length > 0) {
          eventsWithList++;
          try {
            listTotalSize += Andrew.AutosaveMenu.JsonEx_stringify.call(JsonEx, list).length;
          } catch (e) { /* ignore */ }
        }
      });
      console.log('[AutosaveDiag]   events with a non-empty _interpreter._list: ' +
          eventsWithList + ' / ' + eventSizes.length + ', totaling ~' +
          (listTotalSize / 1024).toFixed(1) + ' KB');
      console.log('[AutosaveDiag]   top 5 largest events:');
      eventSizes.slice(0, 5).forEach(function(e) {
        var display = typeof e.size === 'number' ?
            (e.size + ' chars (~' + (e.size / 1024).toFixed(1) + ' KB)') : e.size;
        console.log('[AutosaveDiag]     event[' + e.idx + ']: ' + display);
      });

      // Drill into the single largest event's own fields, to see whether
      // it's the interpreter's captured command list (_interpreter._list)
      // driving the size -- the classic "parallel process event" cause.
      if (eventSizes.length > 0 && typeof eventSizes[0].size === 'number') {
        var biggestEvent = events[eventSizes[0].idx];
        console.log('[AutosaveDiag]   biggest event[' + eventSizes[0].idx +
            '] field breakdown:');
        var evFieldResults = [];
        Object.keys(biggestEvent).forEach(function(field) {
          var size = 'n/a';
          try {
            size = Andrew.AutosaveMenu.JsonEx_stringify.call(
                JsonEx, biggestEvent[field]).length;
          } catch (e) {
            size = 'ERROR: ' + e.message;
          }
          evFieldResults.push({ field: field, size: size });
        });
        evFieldResults.sort(function(a, b) {
          var aNum = typeof a.size === 'number' ? a.size : -1;
          var bNum = typeof b.size === 'number' ? b.size : -1;
          return bNum - aNum;
        });
        evFieldResults.slice(0, 8).forEach(function(f) {
          var display = typeof f.size === 'number' ?
              (f.size + ' chars (~' + (f.size / 1024).toFixed(1) + ' KB)') : f.size;
          console.log('[AutosaveDiag]     ' + f.field + ': ' + display);
        });
        // If it has an interpreter, check its _list specifically.
        if (biggestEvent._interpreter) {
          var interp = biggestEvent._interpreter;
          console.log('[AutosaveDiag]   _interpreter breakdown:');
          Object.keys(interp).forEach(function(field) {
            var size = 'n/a';
            try {
              size = Andrew.AutosaveMenu.JsonEx_stringify.call(
                  JsonEx, interp[field]).length;
            } catch (e) {
              size = 'ERROR: ' + e.message;
            }
            var display = typeof size === 'number' ?
                (size + ' chars (~' + (size / 1024).toFixed(1) + ' KB)') : size;
            var val = interp[field];
            console.log('[AutosaveDiag]     _interpreter.' + field + ': ' + display +
                (Array.isArray(val) ? ' [array, length ' + val.length + ']' : ''));
          });
        }
      }
    }
    console.log('[AutosaveDiag] --- end map breakdown ---');
  }

  console.timeEnd('[AutosaveDiag] diagnostic overhead (NOT real save cost)');
  return contents;
};

//=============================================================================
// DataManager
//=============================================================================

Andrew.AutosaveMenu.DataManager_setupNewGame = DataManager.setupNewGame;
DataManager.setupNewGame = function() {
  Andrew.AutosaveMenu.DataManager_setupNewGame.call(this);
  Andrew.AutosaveMenu.hasSaved = false;
  Andrew.AutosaveMenu.slotId = null;
};

Andrew.AutosaveMenu.DataManager_saveGame = DataManager.saveGameWithoutRescue;
DataManager.saveGameWithoutRescue = function(savefileId) {
  var value = Andrew.AutosaveMenu.DataManager_saveGame.call(this, savefileId);
  Andrew.AutosaveMenu.hasSaved = true;
  Andrew.AutosaveMenu.slotId = savefileId;
  return value;
};

Andrew.AutosaveMenu.DataManager_loadGame = DataManager.loadGameWithoutRescue;
DataManager.loadGameWithoutRescue = function(savefileId) {
  var value = Andrew.AutosaveMenu.DataManager_loadGame.call(this, savefileId);
  Andrew.AutosaveMenu.hasSaved = true;
  Andrew.AutosaveMenu.slotId = savefileId;
  return value;
};

//=============================================================================
// StorageManager
//=============================================================================
// Only kicks in while Andrew.AutosaveMenu.useAsyncWrite is true, which is
// only during this plugin's own autosave call. Everywhere else (manual
// saves, other plugins calling DataManager.saveGame) behaves exactly as
// before, using the engine's normal blocking write.

Andrew.AutosaveMenu.StorageManager_saveToLocalFile =
    StorageManager.saveToLocalFile;
StorageManager.saveToLocalFile = function(savefileId, json) {
  if (!Andrew.AutosaveMenu.Param.AsyncFileWrite ||
      !Andrew.AutosaveMenu.useAsyncWrite) {
    Andrew.AutosaveMenu.StorageManager_saveToLocalFile.call(
        this, savefileId, json);
    return;
  }

  console.log('[AutosaveDiag] async saveToLocalFile OVERRIDE FIRED');
  console.log('[AutosaveDiag] raw JSON length: ' + json.length + ' chars (~' +
      (json.length / 1024).toFixed(1) + ' KB)');
  var compressLabel = '[AutosaveDiag] compress ' + savefileId + '-' + Date.now();
  console.time(compressLabel);
  var data = LZString.compressToBase64(json);
  console.timeEnd(compressLabel);

  var fs = require('fs');
  var dirPath = this.localFileDirectoryPath();
  var filePath = this.localFilePath(savefileId);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  Andrew.AutosaveMenu.writeInProgress = true;
  var writeLabel = '[AutosaveDiag] disk write ' + savefileId + '-' + Date.now();
  console.time(writeLabel);
  fs.writeFile(filePath, data, function(err) {
    console.timeEnd(writeLabel);
    Andrew.AutosaveMenu.writeInProgress = false;
    if (err) {
      console.error('Andrew_AutosaveOnMenuOpen: async save failed', err);
    }
    if (Andrew.AutosaveMenu.onAsyncWriteComplete) {
      var callback = Andrew.AutosaveMenu.onAsyncWriteComplete;
      Andrew.AutosaveMenu.onAsyncWriteComplete = null;
      callback(err);
    }
  });
};

//=============================================================================
// Game_System
//=============================================================================

Andrew.AutosaveMenu.Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
  Andrew.AutosaveMenu.Game_System_initialize.call(this);
  this._andrewAutosaveMenuAllowed = true;
};

Game_System.prototype.andrewCanAutosaveMenu = function() {
  if (this._andrewAutosaveMenuAllowed === undefined) {
    this._andrewAutosaveMenuAllowed = true;
  }
  return this._andrewAutosaveMenuAllowed;
};

Game_System.prototype.andrewSetAutosaveMenuAllowed = function(value) {
  this._andrewAutosaveMenuAllowed = value;
};

//=============================================================================
// Game_Interpreter
//=============================================================================

Andrew.AutosaveMenu.Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
  Andrew.AutosaveMenu.Game_Interpreter_pluginCommand.call(this, command, args);
  if (command.match(/EnableAutosaveMenu/i)) {
    $gameSystem.andrewSetAutosaveMenuAllowed(true);
  } else if (command.match(/DisableAutosaveMenu/i)) {
    $gameSystem.andrewSetAutosaveMenuAllowed(false);
  }
};

//=============================================================================
// Scene_Map
//=============================================================================
// Decides WHETHER to autosave. If the "Autosaving..." textbox is enabled,
// the actual save + message display is handed off to Scene_Menu (see
// below), since that's the scene the player will actually be looking at
// when the save happens, and it needs real rendered frames to show/hide
// on, not just a single synchronous JS call.

Andrew.AutosaveMenu.Scene_Map_callMenu = Scene_Map.prototype.callMenu;
Scene_Map.prototype.callMenu = function() {
  Andrew.AutosaveMenu.Scene_Map_callMenu.call(this);
  Andrew.AutosaveMenu.andrewRequestAutosave();
};

//=============================================================================
// Andrew.AutosaveMenu.andrewRequestAutosave
//=============================================================================
// Shared gatekeeper for both the menu-open autosave (Scene_Map, above) and
// the menu-close autosave (Scene_Menu, below) -- same On/Off toggle, same
// EnableAutosaveMenu/DisableAutosaveMenu flag, same "don't stack on top of
// an in-progress write" guard. If a message is wanted, this defers the
// actual save via pendingAutosave so it happens (and the textbox shows) on
// whichever scene starts next -- Scene_Menu when opening, Scene_Map when
// closing -- since that's the scene that will actually have frames to
// render the textbox on.

Andrew.AutosaveMenu.andrewRequestAutosave = function() {
  if (!ConfigManager.andrewAutosaveMenu) return;
  if (!$gameSystem.andrewCanAutosaveMenu()) return;
  if (!Andrew.AutosaveMenu.hasSaved || Andrew.AutosaveMenu.slotId === null) return;
  if ($gameMap.mapId() <= 0) return;
  // Don't stack a new autosave on top of one that's still writing to disk.
  if (Andrew.AutosaveMenu.writeInProgress) return;

  if (Andrew.AutosaveMenu.Param.ShowSavingMessage) {
    Andrew.AutosaveMenu.pendingAutosave = true;
  } else {
    // No message wanted -- save via the same async-aware path, just
    // without any UI feedback.
    Andrew.AutosaveMenu.andrewAsyncSave(Andrew.AutosaveMenu.slotId, null);
  }
};

//=============================================================================
// Scene_Menu
//=============================================================================
// Decides whether to autosave when the player backs OUT of the Main Menu
// entirely (cancels the main command window, sending them back to the
// map). Hooked on Scene_Menu's own popScene specifically -- not a generic
// Scene_MenuBase hook -- so it does NOT fire when backing out of a
// submenu (Items, Skills, Options, Save, etc.) to Scene_Menu, only when
// leaving Scene_Menu itself for the map.

Andrew.AutosaveMenu.Scene_Menu_popScene = Scene_Menu.prototype.popScene;
Scene_Menu.prototype.popScene = function() {
  Andrew.AutosaveMenu.andrewRequestAutosave();
  Andrew.AutosaveMenu.Scene_Menu_popScene.call(this);
};

//=============================================================================
// Andrew.AutosaveMenu.andrewAsyncSave
//=============================================================================
// Shared save routine used by both the silent path (above) and the
// "Autosaving..." textbox path (Scene_Menu, below). Defers the actual save
// call by one tick (so it doesn't land on the same frame as whatever UI
// just opened) and, on local/NW.js deploys, writes the file asynchronously
// via the StorageManager override so disk I/O doesn't block the game loop.
// `onComplete(err)` is called once the write has actually finished (or
// immediately, for web-storage deploys where there's no async file I/O to
// wait on).

Andrew.AutosaveMenu.andrewAsyncSave = function(savefileId, onComplete) {
  Andrew.AutosaveMenu.useAsyncWrite = true;
  setTimeout(function() {
    if (StorageManager.isLocalMode() && Andrew.AutosaveMenu.Param.AsyncFileWrite) {
      Andrew.AutosaveMenu.onAsyncWriteComplete = function(err) {
        Andrew.AutosaveMenu.useAsyncWrite = false;
        console.timeEnd('[AutosaveDiag] TOTAL saveGameWithoutRescue call');
        if (onComplete) onComplete(err);
      };
      console.time('[AutosaveDiag] onBeforeSave');
      if ($gameSystem.onBeforeSave) $gameSystem.onBeforeSave();
      console.timeEnd('[AutosaveDiag] onBeforeSave');
      console.time('[AutosaveDiag] TOTAL saveGameWithoutRescue call');
      DataManager.saveGameWithoutRescue(savefileId);
    } else {
      // Web-storage deploys (or async writing turned off): falls back to
      // the engine's normal synchronous save, so it's done by the time
      // this call returns.
      if ($gameSystem.onBeforeSave) $gameSystem.onBeforeSave();
      DataManager.saveGameWithoutRescue(savefileId);
      Andrew.AutosaveMenu.useAsyncWrite = false;
      if (onComplete) onComplete(null);
    }
  }, 0);
};

//=============================================================================
// Andrew.AutosaveMenu.autosaveNow
//=============================================================================
// Manually triggers an autosave over the player's current save slot, using
// the same async-aware save routine as the automatic menu-open autosave.
// Meant to be called from an event's "Script..." command:
//
//   Andrew.AutosaveMenu.autosaveNow();
//
// If "Show Saving Message" is on, this shows the "Autosaving..." textbox
// on whichever scene the call was made from (map events, common events,
// battle, etc) -- the textbox is no longer tied to Scene_Menu specifically.
// It also ignores the player's
// Options-menu Autosave toggle and the EnableAutosaveMenu/
// DisableAutosaveMenu plugin-command flag, since this is an explicit,
// deliberate save call rather than the automatic on-menu-open behavior.
//
// Optionally pass a callback to run once the write has actually finished:
//
//   Andrew.AutosaveMenu.autosaveNow(function(err) {
//     if (!err) { /* saved successfully */ }
//   });
//
// Does nothing (and calls the callback with an Error) if the player has
// never manually saved or loaded yet, since there's no slot to autosave
// into, or if a save is already in progress.

Andrew.AutosaveMenu.autosaveNow = function(onComplete) {
  if (!Andrew.AutosaveMenu.hasSaved || Andrew.AutosaveMenu.slotId === null) {
    console.warn('Andrew_AutosaveOnMenuOpen: autosaveNow() called with no ' +
        'save slot on record (player has not saved/loaded yet); skipping.');
    if (onComplete) onComplete(new Error('No save slot on record'));
    return;
  }
  if (Andrew.AutosaveMenu.writeInProgress) {
    console.warn('Andrew_AutosaveOnMenuOpen: autosaveNow() called while a ' +
        'save is already in progress; skipping.');
    if (onComplete) onComplete(new Error('Save already in progress'));
    return;
  }
  var scene = SceneManager._scene;
  if (scene && scene.andrewStartAutosaveMessage) {
    // Let the scene decide whether to show the textbox (it falls back to a
    // silent save on its own if "Show Saving Message" is off).
    scene.andrewStartAutosaveMessage(onComplete);
  } else {
    Andrew.AutosaveMenu.andrewAsyncSave(Andrew.AutosaveMenu.slotId, onComplete);
  }
};

//=============================================================================
// Window_AndrewAutosaveMsg
//=============================================================================
// A small textbox reading "Autosaving..." (or whatever text is configured).
// Uses the engine's normal window open/close animation, so it fades/scales
// in and out rather than popping abruptly.

function Window_AndrewAutosaveMsg() {
  this.initialize.apply(this, arguments);
}

Window_AndrewAutosaveMsg.prototype = Object.create(Window_Base.prototype);
Window_AndrewAutosaveMsg.prototype.constructor = Window_AndrewAutosaveMsg;

Window_AndrewAutosaveMsg.prototype.initialize = function() {
  var width = this.andrewWindowWidth();
  var height = this.andrewWindowHeight();
  Window_Base.prototype.initialize.call(this, 0, 0, width, height);
  this.openness = 0;
  this.refresh();
  this.andrewUpdatePosition();
};

Window_AndrewAutosaveMsg.prototype.andrewWindowWidth = function() {
  var text = Andrew.AutosaveMenu.Param.AutosavingText;
  var bitmap = new Bitmap(1, 1);
  bitmap.fontFace = this.standardFontFace();
  bitmap.fontSize = this.standardFontSize();
  var textWidth = bitmap.measureTextWidth(text);
  bitmap = null;
  return textWidth + this.standardPadding() * 2 + 8;
};

Window_AndrewAutosaveMsg.prototype.andrewWindowHeight = function() {
  return this.lineHeight() + this.standardPadding() * 2;
};

Window_AndrewAutosaveMsg.prototype.andrewUpdatePosition = function() {
  var margin = 16;
  var pos = Andrew.AutosaveMenu.Param.MessagePosition;
  var x, y;
  switch (pos) {
    case 'topLeft':
      x = margin;
      y = margin;
      break;
    case 'topRight':
      x = Graphics.boxWidth - this.width - margin;
      y = margin;
      break;
    case 'bottomLeft':
      x = margin;
      y = Graphics.boxHeight - this.height - margin;
      break;
    case 'center':
      x = (Graphics.boxWidth - this.width) / 2;
      y = (Graphics.boxHeight - this.height) / 2;
      break;
    case 'bottomRight':
    default:
      x = Graphics.boxWidth - this.width - margin;
      y = Graphics.boxHeight - this.height - margin;
      break;
  }
  this.x = x;
  this.y = y;
};

Window_AndrewAutosaveMsg.prototype.refresh = function() {
  this.contents.clear();
  this.resetFontSettings();
  var text = Andrew.AutosaveMenu.Param.AutosavingText;
  this.drawText(text, 0, 0, this.contentsWidth(), 'center');
};

//=============================================================================
// Scene_Base
//=============================================================================
// Performs the actual autosave, showing the "Autosaving..." textbox while it
// happens. Hooked at the Scene_Base level (rather than just Scene_Menu) so
// that EVERY autosave gets the textbox -- both the automatic menu-open
// autosave (still handed off from Scene_Map to whichever scene starts next,
// normally Scene_Menu) and manual Andrew.AutosaveMenu.autosaveNow() calls,
// which can fire from any scene an event Script call runs in (map, battle,
// common event, etc). The textbox window itself is created lazily, on the
// first autosave a given scene actually performs -- see
// andrewStartAutosaveMessage below for why.

Scene_Base.prototype.createAndrewAutosaveMsgWindow = function() {
  this._andrewAutosaveMsgWindow = new Window_AndrewAutosaveMsg();
  this.addChild(this._andrewAutosaveMsgWindow);
};

Andrew.AutosaveMenu.Scene_Base_start = Scene_Base.prototype.start;
Scene_Base.prototype.start = function() {
  Andrew.AutosaveMenu.Scene_Base_start.call(this);
  this.andrewStartAutosaveIfPending();
};

// Used by the automatic menu-open path: Scene_Map flags pendingAutosave,
// then whichever scene starts next (normally Scene_Menu) picks it up here.
Scene_Base.prototype.andrewStartAutosaveIfPending = function() {
  if (!Andrew.AutosaveMenu.pendingAutosave) return;
  Andrew.AutosaveMenu.pendingAutosave = false;
  this.andrewStartAutosaveMessage(null);
};

// Used by both the pending-autosave path above and by
// Andrew.AutosaveMenu.autosaveNow() calling directly into the currently
// active scene. Opens the textbox, waits a few frames, performs the save,
// and keeps the textbox open until both the save finishes and the minimum
// display time has passed.
//
// The window is created here on first use rather than in Scene_Base.create,
// since creating it that early runs on every scene -- including Scene_Boot,
// before $gameSystem exists yet -- which crashes deep in Window_Base's
// tone-update logic. By the time an autosave can actually happen (the
// player has a save slot), $gameSystem is always ready.
Scene_Base.prototype.andrewStartAutosaveMessage = function(onComplete) {
  if (!Andrew.AutosaveMenu.Param.ShowSavingMessage) {
    // Textbox turned off in the plugin params -- fall back to a silent
    // save so the request still goes through.
    Andrew.AutosaveMenu.andrewAsyncSave(Andrew.AutosaveMenu.slotId, onComplete);
    return;
  }
  if (!this._andrewAutosaveMsgWindow) {
    this.createAndrewAutosaveMsgWindow();
  }
  this._andrewAutosaveActive = true;
  this._andrewAutosaveStarted = false;
  this._andrewAutosaveSaved = false;
  this._andrewAutosaveTimer = 0;
  this._andrewAutosaveOnComplete = onComplete || null;
  this._andrewAutosaveMsgWindow.open();
};

Andrew.AutosaveMenu.Scene_Base_update = Scene_Base.prototype.update;
Scene_Base.prototype.update = function() {
  Andrew.AutosaveMenu.Scene_Base_update.call(this);
  this.andrewUpdateAutosave();
};

Scene_Base.prototype.andrewUpdateAutosave = function() {
  if (!this._andrewAutosaveActive) return;
  this._andrewAutosaveTimer++;

  // Let the textbox actually open on screen for a few frames before
  // kicking off the save.
  if (!this._andrewAutosaveStarted && this._andrewAutosaveTimer >= 10) {
    this._andrewAutosaveStarted = true;
    this.andrewPerformAutosave();
  }

  // Keep the textbox open for a minimum amount of time, AND until the save
  // has actually finished writing (this._andrewAutosaveSaved is only set
  // true by the completion callback, not the moment the call fires).
  if (this._andrewAutosaveSaved &&
      this._andrewAutosaveTimer >= Andrew.AutosaveMenu.Param.MinDisplayFrames) {
    if (this._andrewAutosaveMsgWindow) this._andrewAutosaveMsgWindow.close();
    this._andrewAutosaveActive = false;
  }
};

Scene_Base.prototype.andrewPerformAutosave = function() {
  var scene = this;
  Andrew.AutosaveMenu.andrewAsyncSave(Andrew.AutosaveMenu.slotId, function(err) {
    scene._andrewAutosaveSaved = true;
    if (scene._andrewAutosaveOnComplete) {
      var callback = scene._andrewAutosaveOnComplete;
      scene._andrewAutosaveOnComplete = null;
      callback(err);
    }
  });
};

//=============================================================================
// End of File
//=============================================================================