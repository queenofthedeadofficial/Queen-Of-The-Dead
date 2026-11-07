/*:
 * @plugindesc v1.0 Move YEP In-Battle Status into the Actor Command list (before Attack). Enable after YEP_X_InBattleStatus.js. Minimal, non-destructive. 
 * @author Andrew
 *
 * @help
 * Inserts the YEP in-battle Status command into the actor command window
 * (before Attack) and disables the original party-command insertion so the
 * command appears only in the actor list. Delegates to YEP's
 * Scene_Battle.commandInBattleStatus (or commandStatus fallback).
 *
 * This plugin is intentionally minimal and non-destructive: it does not
 * modify YEP_X_InBattleStatus.js directly; it only overrides behavior at
 * runtime. Keep this plugin enabled after YEP_X_InBattleStatus.
 */

(function() {

  // --- Disable YEP's party insertion by overriding the function to a no-op ---
  if (Window_PartyCommand && Window_PartyCommand.prototype.makeInBattleStatusCommand) {
    Window_PartyCommand.prototype.makeInBattleStatusCommand = function() {
      // intentionally empty to prevent duplicate command in party window
    };
  }

  // --- Insert "Status" into the actor command list before 'attack' (non-destructive) ---
  var _WAC_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function() {
    _WAC_makeCommandList.call(this);

    // Avoid duplicate insertion
    if (this.findSymbol && (this.findSymbol('inBattleStatus') >= 0 || this.findSymbol('status') >= 0)) {
      return;
    }

    var attackIndex = this.findSymbol ? this.findSymbol('attack') : -1;
    if (attackIndex < 0) attackIndex = this._list ? this._list.length : 0;

    if (typeof this.addCommandAt === 'function') {
      this.addCommandAt(attackIndex, Yanfly && Yanfly.Param && Yanfly.Param.IBSCmdName ? Yanfly.Param.IBSCmdName : 'Status', 'inBattleStatus', true);
    } else {
      var obj = { name: (Yanfly && Yanfly.Param && Yanfly.Param.IBSCmdName ? Yanfly.Param.IBSCmdName : 'Status'), symbol: 'inBattleStatus', enabled: true, ext: null };
      if (!this._list) this._list = [];
      this._list.splice(attackIndex, 0, obj);
    }
  };

  // --- Helper: hide/deactivate actor window safely before delegating to YEP ---
  function hideActorWindow(scene) {
    if (!scene) return;
    if (scene._actorCommandWindow) {
      scene._actorCommandWindow.deactivate();
      scene._actorCommandWindow.hide();
    }
    if (scene._partyCommandWindow) {
      scene._partyCommandWindow.deactivate();
    }
  }

  // --- Save which window was active so YEP's cancel/restore can be matched if needed ---
  function markStatusFromActor(scene) {
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

  // --- Bind handler in Scene_Battle.createActorCommandWindow to call YEP's in-battle status ---
  var _SB_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
  Scene_Battle.prototype.createActorCommandWindow = function() {
    _SB_createActorCommandWindow.call(this);

    if (!this._actorCommandWindow) return;

    // Only set handler if not already set by another plugin
    if (!this._actorCommandWindow._handlers) this._actorCommandWindow._handlers = {};

    if (!this._actorCommandWindow._handlers['inBattleStatus']) {
      if (typeof this.commandInBattleStatus === 'function') {
        this._actorCommandWindow.setHandler('inBattleStatus', function() {
          markStatusFromActor(this);
          hideActorWindow(this);
          this.commandInBattleStatus();
        }.bind(this));
      } else if (typeof this.commandStatus === 'function') {
        this._actorCommandWindow.setHandler('inBattleStatus', function() {
          markStatusFromActor(this);
          hideActorWindow(this);
          this.commandStatus();
        }.bind(this));
      } else {
        // fallback: push Scene_Status for current actor
        this._actorCommandWindow.setHandler('inBattleStatus', function() {
          var actor = BattleManager.actor();
          if (!actor) {
            if (SceneManager._scene && SceneManager._scene._actorCommandWindow) SceneManager._scene._actorCommandWindow.activate();
            return;
          }
          markStatusFromActor(this);
          hideActorWindow(this);
          $gameTemp._battleStatusActorId = actor.actorId ? actor.actorId() : (actor._actorId || null);
          SceneManager.push(Scene_Status);
        }.bind(this));
      }
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

  // --- If YEP's onInBattleStatusCancel exists, wrap it to restore windows when needed ---
  if (Scene_Battle && Scene_Battle.prototype.onInBattleStatusCancel) {
    var _SB_onInBattleStatusCancel = Scene_Battle.prototype.onInBattleStatusCancel;
    Scene_Battle.prototype.onInBattleStatusCancel = function() {
      _SB_onInBattleStatusCancel.call(this);
      if ($gameTemp._statusOpenedFromActorCommand) {
        // restore actor/party windows similar to YEP's normal restore
        $gameTemp._statusOpenedFromActorCommand = false;
        var saved = $gameTemp._statusSavedActiveWindow;
        $gameTemp._statusSavedActiveWindow = null;
        if (saved === 'actor' && this._actorCommandWindow) {
          this._actorCommandWindow.show();
          this._actorCommandWindow.activate();
          if (this._partyCommandWindow) this._partyCommandWindow.deactivate();
        } else if (saved === 'party' && this._partyCommandWindow) {
          this._partyCommandWindow.show();
          this._partyCommandWindow.activate();
          if (this._actorCommandWindow) this._actorCommandWindow.deactivate();
        } else {
          if (this._partyCommandWindow) {
            this._partyCommandWindow.show();
            this._partyCommandWindow.activate();
            if (this._actorCommandWindow) this._actorCommandWindow.deactivate();
          } else if (this._actorCommandWindow) {
            this._actorCommandWindow.show();
            this._actorCommandWindow.activate();
          }
        }
      }
    };
  } else {
    // If YEP doesn't provide that method (unlikely), provide a minimal restore handler
    Scene_Battle.prototype.onInBattleStatusCancel = function() {
      if ($gameTemp._statusOpenedFromActorCommand) {
        $gameTemp._statusOpenedFromActorCommand = false;
        var saved = $gameTemp._statusSavedActiveWindow;
        $gameTemp._statusSavedActiveWindow = null;
        if (saved === 'actor' && this._actorCommandWindow) {
          this._actorCommandWindow.show();
          this._actorCommandWindow.activate();
        } else if (this._partyCommandWindow) {
          this._partyCommandWindow.show();
          this._partyCommandWindow.activate();
        } else if (this._actorCommandWindow) {
          this._actorCommandWindow.show();
          this._actorCommandWindow.activate();
        }
      } else {
        if (this._partyCommandWindow) this._partyCommandWindow.activate();
      }
    };
  }

})();
