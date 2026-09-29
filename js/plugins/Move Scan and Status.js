/*:
 * @plugindesc v1.7 Move Scan and Status into actor command list (before Attack). Deactivates actor window and restores UI on return (YEP-like behavior). Andrew
 * @author Andrew
 *
 * @help
 * Inserts "Scan" and "Status" into the actor command window before Attack.
 * When Status is opened from the actor command, this plugin hides/deactivates
 * the actor window, marks the call, and restores the correct battle windows
 * and activation state when the in-battle status is closed to avoid freezing.
 *
 * Install: save as js/plugins/MoveScanStatusToActorCommand.js and enable after YEP/ADRI plugins.
 */

(function() {

  // --- Insert commands into Window_ActorCommand before 'attack' using addCommandAt ---
  var _WAC_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function() {
    _WAC_makeCommandList.call(this);

    // Avoid duplicate insertion
    if (this.findSymbol && (this.findSymbol('scan') >= 0 || this.findSymbol('status') >= 0)) {
      return;
    }

    var attackIndex = this.findSymbol ? this.findSymbol('attack') : -1;
    if (attackIndex < 0) attackIndex = this._list ? this._list.length : 0;

    if (typeof this.addCommandAt === 'function') {
      this.addCommandAt(attackIndex, 'Scan', 'scan', true);
      this.addCommandAt(attackIndex + 1, 'Status', 'status', true);
    } else {
      var objScan = { name: 'Scan', symbol: 'scan', enabled: true, ext: null };
      var objStatus = { name: 'Status', symbol: 'status', enabled: true, ext: null };
      if (!this._list) this._list = [];
      this._list.splice(attackIndex, 0, objScan);
      this._list.splice(attackIndex + 1, 0, objStatus);
    }
  };

  // --- Utility: hide/deactivate actor & party windows safely ---
  function hideAndDeactivateActorWindow(scene) {
    if (!scene) return;
    if (scene._actorCommandWindow) {
      scene._actorCommandWindow.deactivate();
      scene._actorCommandWindow.hide();
    }
    if (scene._partyCommandWindow) {
      // keep party window visible state as-is; do not force hide here
      scene._partyCommandWindow.deactivate();
    }
  }

  function restoreBattleWindows(scene, savedActive) {
    if (!scene) return;
    // Ensure in-battle status windows are hidden
    if (scene._inBattleStatusWindow) scene._inBattleStatusWindow.hide();
    if (scene._inBattleStateList) scene._inBattleStateList.hide();
    if (scene._inBattleEnemyStatusWindow) scene._inBattleEnemyStatusWindow.hide();
    if (scene._inBattleEnemyStateList) scene._inBattleEnemyStateList.hide();
    if (scene._enemyStatusWindow) scene._enemyStatusWindow.hide();

    // Show windows that should be visible
    if (scene._partyCommandWindow) scene._partyCommandWindow.show();
    if (scene._actorCommandWindow) scene._actorCommandWindow.show();

    // Restore activation based on savedActive
    if (savedActive === 'actor' && scene._actorCommandWindow) {
      scene._actorCommandWindow.activate();
      if (scene._partyCommandWindow) scene._partyCommandWindow.deactivate();
    } else if (savedActive === 'party' && scene._partyCommandWindow) {
      scene._partyCommandWindow.activate();
      if (scene._actorCommandWindow) scene._actorCommandWindow.deactivate();
    } else {
      // default: party active if present, else actor
      if (scene._partyCommandWindow) {
        scene._partyCommandWindow.activate();
        if (scene._actorCommandWindow) scene._actorCommandWindow.deactivate();
      } else if (scene._actorCommandWindow) {
        scene._actorCommandWindow.activate();
      }
    }
  }

  // --- Mark that status was opened from actor command and save active window ---
  function markStatusOpenedFromActorCommand(scene) {
    $gameTemp._statusOpenedFromActorCommand = true;
    $gameTemp._statusSavedActiveWindow = null;
    if (!scene) return;
    if (scene._actorCommandWindow && scene._actorCommandWindow.active) {
      $gameTemp._statusSavedActiveWindow = 'actor';
    } else if (scene._partyCommandWindow && scene._partyCommandWindow.active) {
      $gameTemp._statusSavedActiveWindow = 'party';
    } else {
      $gameTemp._statusSavedActiveWindow = null;
    }
  }

  // --- Hook Scene_Status.terminate to restore battle UI when returning from status opened by actor command ---
  if (Scene_Status && Scene_Status.prototype.terminate) {
    var _SceneStatus_terminate = Scene_Status.prototype.terminate;
    Scene_Status.prototype.terminate = function() {
      _SceneStatus_terminate.call(this);
      if ($gameTemp._statusOpenedFromActorCommand) {
        var saved = $gameTemp._statusSavedActiveWindow;
        $gameTemp._statusOpenedFromActorCommand = false;
        $gameTemp._statusSavedActiveWindow = null;
        var scene = SceneManager._scene;
        if (scene && scene instanceof Scene_Battle) {
          restoreBattleWindows(scene, saved);
        }
      }
    };
  }

  // --- Also hook ADRI/YEP in-battle cancel if present: onInBattleStatusCancel or onInBattleEnemyStatusCancel ---
  // Wrap existing onInBattleStatusCancel if it exists, else create one to restore actor window.
  if (Scene_Battle && Scene_Battle.prototype.onInBattleStatusCancel) {
    var _SB_onInBattleStatusCancel = Scene_Battle.prototype.onInBattleStatusCancel;
    Scene_Battle.prototype.onInBattleStatusCancel = function() {
      _SB_onInBattleStatusCancel.call(this);
      if ($gameTemp._statusOpenedFromActorCommand) {
        var saved = $gameTemp._statusSavedActiveWindow;
        $gameTemp._statusOpenedFromActorCommand = false;
        $gameTemp._statusSavedActiveWindow = null;
        restoreBattleWindows(this, saved);
      }
    };
  } else {
    // If not present, create a handler that ADRI/YEP might call when cancelling in-battle status
    Scene_Battle.prototype.onInBattleStatusCancel = function() {
      // Default ADRI/YEP behavior usually activates party command; mimic that
      if (this._enemyStatusWindow) this._enemyStatusWindow.hide();
      if (this._inBattleStatusWindow) this._inBattleStatusWindow.hide();
      if (this._inBattleStateList) this._inBattleStateList.hide();
      if (this._inBattleEnemyStatusWindow) this._inBattleEnemyStatusWindow.hide();
      if (this._inBattleEnemyStateList) this._inBattleEnemyStateList.hide();
      if (this._partyCommandWindow) this._partyCommandWindow.activate();
      if ($gameTemp._statusOpenedFromActorCommand) {
        var saved = $gameTemp._statusSavedActiveWindow;
        $gameTemp._statusOpenedFromActorCommand = false;
        $gameTemp._statusSavedActiveWindow = null;
        restoreBattleWindows(this, saved);
      }
    };
  }

  // --- Bind handlers in Scene_Battle.createActorCommandWindow without overwriting existing scene handlers ---
  var _SB_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
  Scene_Battle.prototype.createActorCommandWindow = function() {
    _SB_createActorCommandWindow.call(this);

    var setIfEmpty = function(win, symbol, handler) {
      if (!win) return;
      if (!win._handlers) win._handlers = {};
      if (!win._handlers[symbol]) {
        win.setHandler(symbol, handler);
      }
    };

    // SCAN: prefer Scene_Battle.commandScan, else fallback popup
    if (typeof this.commandScan === 'function') {
      setIfEmpty(this._actorCommandWindow, 'scan', function() {
        // mark and hide actor window to avoid input conflicts
        markStatusOpenedFromActorCommand(this);
        hideAndDeactivateActorWindow(this);
        this.commandScan();
      }.bind(this));
    } else {
      setIfEmpty(this._actorCommandWindow, 'scan', function() {
        var actor = BattleManager.actor();
        if (!actor) {
          if (SceneManager._scene && SceneManager._scene._actorCommandWindow) SceneManager._scene._actorCommandWindow.activate();
          return;
        }
        var text = actor.name() + ' uses Scan.';
        var w = new Window_Base(0, 0, Graphics.boxWidth, 72);
        w.drawText(text, 0, 0, Graphics.boxWidth, 'center');
        SceneManager._scene.addChild(w);
        setTimeout(function() {
          if (w && w.parent) w.parent.removeChild(w);
          if (SceneManager._scene && SceneManager._scene._actorCommandWindow) {
            SceneManager._scene._actorCommandWindow.activate();
          }
        }, 1000);
      }.bind(this));
    }

    // STATUS: prefer in-battle status (commandInBattleStatus), then commandStatus, then fallback to Scene_Status
    if (typeof this.commandInBattleStatus === 'function') {
      setIfEmpty(this._actorCommandWindow, 'status', function() {
        markStatusOpenedFromActorCommand(this);
        hideAndDeactivateActorWindow(this);
        this.commandInBattleStatus();
      }.bind(this));
    } else if (typeof this.commandStatus === 'function') {
      setIfEmpty(this._actorCommandWindow, 'status', function() {
        markStatusOpenedFromActorCommand(this);
        hideAndDeactivateActorWindow(this);
        this.commandStatus();
      }.bind(this));
    } else {
      setIfEmpty(this._actorCommandWindow, 'status', function() {
        var actor = BattleManager.actor();
        if (!actor) {
          if (SceneManager._scene && SceneManager._scene._actorCommandWindow) SceneManager._scene._actorCommandWindow.activate();
          return;
        }
        markStatusOpenedFromActorCommand(this);
        hideAndDeactivateActorWindow(this);
        $gameTemp._battleStatusActorId = actor.actorId ? actor.actorId() : (actor._actorId || null);
        SceneManager.push(Scene_Status);
      }.bind(this));
    }
  };

  // --- Ensure Scene_Status.prepare uses the actor id passed from battle (if any) ---
  if (Scene_Status && Scene_Status.prototype.prepare) {
    var _SceneStatus_prepare = Scene_Status.prototype.prepare;
    Scene_Status.prototype.prepare = function(actorId) {
      if ($gameTemp._battleStatusActorId) {
        actorId = $gameTemp._battleStatusActorId;
        $gameTemp._battleStatusActorId = null;
      }
      _SceneStatus_prepare.call(this, actorId);
    };
  }

})();
