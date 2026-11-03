/*:
 * @plugindesc PH Warehouse Display Filter + Deposit Fix — lockstep filtering and deposit uses displayed row (UI-only)
 * @author Patch (merged)
 * @help
 * - Enable after PH_Warehouse.
 * - Keeps _data and parallel arrays aligned, rebuilds amounts from PH qtty.
 * - Ensures deposit uses the DB object shown in the selected row.
 * - Non-destructive: only modifies display and deposit routing; original methods are preserved.
 * - Debug helpers: PH_Warehouse_DisplayFilter.setDebug(true), .realignNow(), .restoreDeposit()
 */

(function(){
  'use strict';
  var PLUGIN = 'PH_Warehouse_DisplayFilter_FixDeposit';
  var DEBUG = false;

  function log(){ if(DEBUG) console.log.apply(console, arguments); }

  function isWarehouseScene(){
    var s = SceneManager._scene;
    return !!(s && s.constructor && String(s.constructor.name).toLowerCase().indexOf('warehouse') > -1);
  }

  // Resolve DB object from wrapper shapes
  function resolveCandidate(entry){
    if(!entry) return null;
    if(typeof entry === 'number') return entry;
    var cand = entry.item || entry.object || entry._item || entry.data || entry._data || entry;
    if(cand && typeof cand === 'object' && (cand.id === undefined) && (entry.id || entry.itemId || entry._id)) cand = entry;
    return cand;
  }

  // Build keep mask using ph.verifyItem on DB objects
  function buildKeepMask(ph, arr, categoryHint){
    var mask = [];
    if(!ph || !Array.isArray(arr)) return mask;
    var cat = String(categoryHint || ph._lastCategory || 'item').toLowerCase();
    for(var i=0;i<arr.length;i++){
      var entry = arr[i];
      try {
        if(typeof entry === 'number'){
          var db = (cat === 'weapon') ? $dataWeapons : (cat === 'armor') ? $dataArmors : $dataItems;
          var obj = db && db[entry];
          mask.push(!!(obj && ph.verifyItem(obj)));
        } else {
          var cand = resolveCandidate(entry);
          // if cand is wrapper but has id, resolve DB object first
          var dbObj = null;
          if(cand && (cand.id || cand.itemId || cand._id)){
            var id = cand.id || cand.itemId || cand._id;
            dbObj = ($dataItems && $dataItems[id]) || ($dataWeapons && $dataWeapons[id]) || ($dataArmors && $dataArmors[id]) || null;
          }
          var verifyArg = dbObj || cand;
          mask.push(!!(verifyArg && ph.verifyItem(verifyArg)));
        }
      } catch(e){
        mask.push(false);
        log(PLUGIN + ': verify error at index', i, e);
      }
    }
    return mask;
  }

  // Apply mask to _data and parallel arrays of equal length; preserve selection
  function applyKeepMask(win, mask){
    if(!win || !Array.isArray(win._data) || !Array.isArray(mask)) return;
    var oldLen = win._data.length;
    if(mask.length !== oldLen){
      log(PLUGIN + ': mask length mismatch', mask.length, oldLen);
      return;
    }

    var oldIndex = (typeof win.index === 'function') ? win.index() : (win._index || 0);
    var newData = [];
    var parallelKeys = Object.keys(win).filter(function(k){
      if(k === '_data') return false;
      var v = win[k];
      return Array.isArray(v) && v.length === oldLen;
    });
    var newParallels = {};
    parallelKeys.forEach(function(k){ newParallels[k] = []; });

    var newIndex = 0;
    var foundSelected = false;
    for(var i=0;i<oldLen;i++){
      if(mask[i]){
        newData.push(win._data[i]);
        parallelKeys.forEach(function(k){ newParallels[k].push(win[k][i]); });
        if(i === oldIndex){ foundSelected = true; newIndex = newData.length - 1; }
      }
    }

    if(!foundSelected){
      // choose nearest kept index
      var firstKeptAfter = -1, lastKept = -1;
      for(var j=oldIndex;j<oldLen;j++) if(mask[j]) { firstKeptAfter = j; break; }
      for(var k=oldLen-1;k>=0;k--) if(mask[k]) { lastKept = k; break; }
      if(firstKeptAfter !== -1){
        var count = 0;
        for(var t=0;t<=firstKeptAfter;t++) if(mask[t]) count++;
        newIndex = Math.max(0, count - 1);
      } else if(lastKept !== -1){
        var count2 = 0;
        for(var t=0;t<=lastKept;t++) if(mask[t]) count2++;
        newIndex = Math.max(0, count2 - 1);
      } else newIndex = 0;
    }

    win._data = newData;
    parallelKeys.forEach(function(k){ win[k] = newParallels[k]; });

    try {
      if(typeof win.select === 'function') win.select(newIndex);
      else win._index = newIndex;
    } catch(e){ log(PLUGIN + ': set index failed', e); }

    log(PLUGIN + ': applied keep mask; kept rows:', newData.length, 'parallel keys:', parallelKeys);
  }

  // Rebuild amounts from PH canonical qtty
  function rebuildAmountsFromPH(win){
    try {
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(!ph) return;
      var wh = ph._warehouses && ph._warehouses[ph._lastActive];
      var cat = ph._lastCategory || 'item';
      var q = wh && wh.qtty && (wh.qtty[cat] || wh.qtty);
      if(!q) return;
      var amounts = win._data.map(function(entry){
        var cand = resolveCandidate(entry);
        var id = (cand && (cand.id || cand.itemId || cand._id)) || null;
        return (id != null && q[id] !== undefined) ? q[id] : 0;
      });
      if(Array.isArray(win._amounts)) win._amounts = amounts;
      else if(Array.isArray(win._itemAmounts)) win._itemAmounts = amounts;
      else win._amounts = amounts;
      log(PLUGIN + ': rebuilt amounts from PH qtty');
    } catch(e){ log(PLUGIN + ': rebuildAmountsFromPH error', e); }
  }

  function filterWindowDataLockstep(win){
    try {
      if(!win || !Array.isArray(win._data)) return;
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(!ph || typeof ph.verifyItem !== 'function') return;
      var category = ph._lastCategory || 'item';
      var mask = buildKeepMask(ph, win._data, category);
      applyKeepMask(win, mask);
      rebuildAmountsFromPH(win);
    } catch(e){ log(PLUGIN + ': filterWindowDataLockstep error', e); }
  }

  // Save original prototype method
  function saveOriginalProtoMethod(proto, name){
    var key = '_ph_orig_' + name;
    if(proto && typeof proto[name] === 'function' && !proto[key]){
      proto[key] = proto[name];
      log(PLUGIN + ': saved original proto.' + name);
    }
  }

  // Wrap Window_ItemList.makeItemList
  (function wrapWindowItemList(){
    if(typeof Window_ItemList === 'undefined') return;
    if(Window_ItemList.prototype._ph_display_wrapped) return;
    saveOriginalProtoMethod(Window_ItemList.prototype, 'makeItemList');
    var orig = Window_ItemList.prototype.makeItemList;
    Window_ItemList.prototype.makeItemList = function(){
      orig.call(this);
      try {
        if(!isWarehouseScene()) return;
        var ph = window.PHPlugins && PHPlugins.PHWarehouse;
        if(!ph || typeof ph.verifyItem !== 'function') return;
        if(Array.isArray(this._data) && this._data.length > 0) filterWindowDataLockstep(this);
      } catch(e){ console.warn(PLUGIN + ': Window_ItemList.makeItemList filter error', e); }
    };
    Window_ItemList.prototype._ph_display_wrapped = true;
  })();

  // Patch live constructor methods
  function patchLiveWindowConstructor(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._itemWindow) return;
      var w = s._itemWindow;
      var C = w.constructor;
      if(!C || !C.prototype) return;
      if(C.prototype._ph_display_patched) return;

      ['makeItemList','setData','refresh'].forEach(function(name){ saveOriginalProtoMethod(C.prototype, name); });

      function safeWrapProto(name){
        if(typeof C.prototype[name] !== 'function' || C.prototype['_ph_' + name + '_wrapped']) return;
        var orig = C.prototype[name];
        C.prototype['_ph_' + name + '_wrapped'] = orig;
        C.prototype[name] = function(){
          var res = orig.apply(this, arguments);
          try {
            if(!isWarehouseScene()) return res;
            var ph = window.PHPlugins && PHPlugins.PHWarehouse;
            if(!ph || typeof ph.verifyItem !== 'function') return res;
            if(Array.isArray(this._data) && this._data.length > 0) filterWindowDataLockstep(this);
          } catch(e){ if(DEBUG) console.warn(PLUGIN + ': safeWrapProto(' + name + ') error', e); }
          return res;
        };
      }

      safeWrapProto('makeItemList');
      safeWrapProto('setData');
      safeWrapProto('refresh');

      C.prototype._ph_display_patched = true;

      if(!w._ph_instance_wrapped){
        ['makeItemList','setData','refresh'].forEach(function(name){
          if(typeof w[name] === 'function' && !w['_ph_' + name + '_inst_wrapped']){
            var orig = w[name];
            w['_ph_' + name + '_inst_wrapped'] = orig;
            w[name] = function(){
              var res = orig.apply(this, arguments);
              try {
                if(!isWarehouseScene()) return res;
                var ph = window.PHPlugins && PHPlugins.PHWarehouse;
                if(!ph || typeof ph.verifyItem !== 'function') return res;
                if(Array.isArray(this._data) && this._data.length > 0) filterWindowDataLockstep(this);
              } catch(e){ if(DEBUG) console.warn(PLUGIN + ': instance wrapper error for', name, e); }
              return res;
            };
          }
        });

        try { if(Array.isArray(w._data)) filterWindowDataLockstep(w); if(typeof w.refresh === 'function') w.refresh(); } catch(e){ if(DEBUG) console.warn(PLUGIN + ': immediate instance filter error', e); }
        w._ph_instance_wrapped = true;
      }

    } catch(e){ if(DEBUG) console.warn(PLUGIN + ': patchLiveWindowConstructor error', e); }
  }

  // Installer: wait for PH then patch
  (function installer(){
    var tries = 0, max = 120;
    var id = setInterval(function(){
      tries++;
      try {
        var ph = window.PHPlugins && PHPlugins.PHWarehouse;
        if(!ph) return;
        patchLiveWindowConstructor();
      } catch(e){}
      if(tries >= max) clearInterval(id);
      var s = SceneManager._scene;
      if(s && s._itemWindow && s._itemWindow._ph_instance_wrapped) clearInterval(id);
    }, 150);
  })();

  // --- Deposit safety wrapper (prefer displayed row) ---
  (function installDepositWrapper(){
    var ph = window.PHPlugins && PHPlugins.PHWarehouse;
    if(!ph || !ph.deposit || ph._ph_deposit_wrapped) return;
    var origDeposit = ph.deposit;
    ph._ph_deposit_wrapped = origDeposit;
    ph.deposit = function(itemOrId){
      try {
        var scene = SceneManager._scene;
        if(scene){
          var w = scene._itemWindow || (function(){
            for(var k in scene) if(scene[k] && Array.isArray(scene[k]._data)) return scene[k];
            return null;
          })();
          if(w && Array.isArray(w._data)){
            var idx = (typeof w.index === 'function') ? w.index() : w._index;
            var displayed = w._data[idx];
            var displayedCand = displayed && (displayed.item || displayed.object || displayed._item) || displayed;
            if(displayedCand && typeof displayedCand === 'object'){
              var passedId = (itemOrId && (itemOrId.id || itemOrId.itemId || itemOrId._id)) || (typeof itemOrId === 'number' ? itemOrId : null);
              var dispId = displayedCand.id || displayedCand.itemId || displayedCand._id || null;
              if(dispId != null && passedId !== dispId){
                log(PLUGIN + ': deposit wrapper replacing passed id', passedId, 'with displayed id', dispId);
                try { return origDeposit.call(this, displayedCand); } catch(e){}
                try { return origDeposit.call(this, dispId); } catch(e){}
              }
            }
          }
        }
      } catch(e){ if(DEBUG) console.warn(PLUGIN + ': deposit wrapper error', e); }
      return origDeposit.apply(this, arguments);
    };
    log(PLUGIN + ': installed deposit wrapper (prefer displayed row).');
  })();

  // Public API
  window.PH_Warehouse_DisplayFilter = window.PH_Warehouse_DisplayFilter || {};
  window.PH_Warehouse_DisplayFilter.setDebug = function(v){ DEBUG = !!v; console.log(PLUGIN + ': DEBUG =', DEBUG); };
  window.PH_Warehouse_DisplayFilter.realignNow = function(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._itemWindow) return console.log(PLUGIN + ': no active item window');
      filterWindowDataLockstep(s._itemWindow);
      if(typeof s._itemWindow.refresh === 'function') s._itemWindow.refresh();
      console.log(PLUGIN + ': realigned display arrays now');
    } catch(e){ console.warn(PLUGIN + ': realignNow error', e); }
  };
  window.PH_Warehouse_DisplayFilter.restoreDeposit = function(){
    try {
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(ph && ph._ph_deposit_wrapped){ ph.deposit = ph._ph_deposit_wrapped; delete ph._ph_deposit_wrapped; console.log(PLUGIN + ': restored original PH.deposit'); }
      else console.log(PLUGIN + ': no wrapped deposit found');
    } catch(e){ console.warn(PLUGIN + ': restoreDeposit error', e); }
  };

  console.log(PLUGIN + ': installed (filter + deposit fix).');
})();
