/*:
 * @plugindesc PH Warehouse Context Guard — preserve category during verify and ensure deposit writes to intended category
 * @author Copilot (patched)
 * @help
 * Wraps PHWarehouse.verifyAllTogether to preserve _lastActive/_lastCategory
 * during its execution, and wraps deposit to capture the intended category
 * before calling the original deposit and to ensure the canonical qtty key
 * exists afterwards. Also pre-creates category buckets before deposit runs
 * to avoid indexOf/qtty errors when helpers mutate context. Reversible via
 * PHW_ContextGuard_restore().
 */
(function(){
  'use strict';
  var PL = 'PHW_ContextGuard';

  function resolveEntry(e){ return e && (e.item || e.object || e._item) || e; }
  function resolveId(e){ var c = resolveEntry(e); return c && (c.id || c.itemId || c._id) || null; }

  function safeInstall(){
    if(!window.PHPlugins || !PHPlugins.PHWarehouse) return false;
    var ph = PHPlugins.PHWarehouse;

    // --- Wrap verifyAllTogether to preserve context during its run ---
    if(!ph.__phw_verify_guard_installed && typeof ph.verifyAllTogether === 'function'){
      ph.__phw_verify_guard_installed = true;
      ph.__phw_verify_guard_orig = ph.verifyAllTogether;
      ph.verifyAllTogether = function(item){
        var savedActive = this._lastActive;
        var savedCategory = this._lastCategory;
        try {
          return ph.__phw_verify_guard_orig.apply(this, arguments);
        } finally {
          try { this._lastActive = savedActive; } catch(e){}
          try { this._lastCategory = savedCategory; } catch(e){}
        }
      };
      console.log(PL+': verifyAllTogether guard installed');
    }

    // --- Pre-create category buckets BEFORE deposit runs (safe) ---
    if(!ph.__phw_deposit_bucket_installed && typeof ph.deposit === 'function'){
      ph.__phw_deposit_bucket_installed = true;
      // keep original for later wrapping chain
      ph.__phw_deposit_bucket_orig = ph.deposit;
      ph.deposit = function(item){
        // capture intended context BEFORE any internal helpers run
        var intendedActive = this._lastActive;
        var intendedCategory = this._lastCategory;

        // best-effort align from an open Warehouse window
        try {
          var s = SceneManager._scene;
          if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
            var win = s._windowLayer.children.find(function(w){
              return w && String((w.constructor && w.constructor.name) || '').indexOf('WarehouseItemList') !== -1;
            });
            if(win){
              if('_activeName' in win && !intendedActive) intendedActive = win._activeName;
              if('_categoryName' in win && !intendedCategory) intendedCategory = win._categoryName;
            }
          }
        } catch(e){}

        // Ensure containers exist for the intended target BEFORE calling original deposit
        try {
          this._warehouses = this._warehouses || {};
          if(intendedActive && !this._warehouses[intendedActive]) this._warehouses[intendedActive] = {};
          var instPre = this._warehouses && this._warehouses[intendedActive];
          if(instPre){
            instPre.items = instPre.items || {};
            instPre.qtty = instPre.qtty || {};
            if(intendedCategory) instPre.items[intendedCategory] = instPre.items[intendedCategory] || [];
            if(intendedCategory) instPre.qtty[intendedCategory] = instPre.qtty[intendedCategory] || {};
          }
        } catch(e){ console.warn(PL+': pre-create buckets failed', e); }

        // call original deposit (this may be wrapped further by Meta Rules)
        var res;
        try { res = ph.__phw_deposit_bucket_orig.apply(this, arguments); } catch(e){ console.warn(PL+': original deposit threw', e); res = undefined; }

        // Post-sync: ensure canonical qtty exists under the captured intendedCategory
        try {
          var id = resolveId(item);
          if(!id) return res;
          var active = intendedActive || this._lastActive;
          var category = intendedCategory || this._lastCategory;
          this._warehouses = this._warehouses || {};
          var inst = this._warehouses && this._warehouses[active];
          if(!inst) return res;
          inst.items = inst.items || {};
          inst.qtty = inst.qtty || {};
          inst.items[category] = inst.items[category] || [];
          inst.qtty[category] = inst.qtty[category] || {};
          var key = String(id);
          if(!(key in inst.qtty[category])) inst.qtty[category][key] = 0;
          // ensure id present in items list using array style
          var usesNumbers = inst.items[category].some(function(x){ return typeof x === 'number'; });
          var presentNumber = inst.items[category].indexOf(Number(id)) !== -1;
          var presentString = inst.items[category].indexOf(key) !== -1;
          if(!presentNumber && !presentString) inst.items[category].push(usesNumbers ? Number(id) : key);
          // normalize and recompute capacity
          try {
            Object.keys(inst.qtty[category] || {}).forEach(function(k){ inst.qtty[category][k] = Number(inst.qtty[category][k] || 0); });
            var total = 0;
            Object.keys(inst.qtty || {}).forEach(function(c){
              Object.keys(inst.qtty[c] || {}).forEach(function(k){ total += Number(inst.qtty[c][k] || 0); });
            });
            inst.currentCapacity = total;
          } catch(e){}
          // refresh windows
          try { var s2 = SceneManager._scene; if(s2 && s2._windowLayer && Array.isArray(s2._windowLayer.children)) s2._windowLayer.children.forEach(function(w){ if(w && typeof w.refresh === 'function') w.refresh(); }); } catch(e){}
        } catch(e){ console.warn(PL+': post-deposit bucket sync failed', e); }

        return res;
      };
      console.log(PL+': deposit bucket wrapper installed');
    }

    // --- Wrap deposit capture (additional defensive wrapper) ---
    // If Meta Rules or other wrappers replaced deposit after the above install,
    // install a capture wrapper that preserves intended context and ensures qtty.
    if(!ph.__phw_deposit_capture_installed && typeof ph.deposit === 'function'){
      ph.__phw_deposit_capture_installed = true;
      ph.__phw_deposit_capture_orig = ph.deposit;

      ph.deposit = function(item){
        // capture intended context BEFORE any internal changes
        var intendedActive = this._lastActive;
        var intendedCategory = this._lastCategory;

        // try to align from an open window if available (best-effort)
        try {
          var s = SceneManager._scene;
          if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
            var win = s._windowLayer.children.find(function(w){
              return w && String((w.constructor && w.constructor.name) || '').indexOf('WarehouseItemList') !== -1;
            });
            if(win){
              if('_activeName' in win && !intendedActive) intendedActive = win._activeName;
              if('_categoryName' in win && !intendedCategory) intendedCategory = win._categoryName;
            }
          }
        } catch(e){}

        // call original deposit (Meta Rules and verifyAllTogether run here)
        var res;
        try { res = ph.__phw_deposit_capture_orig.apply(this, arguments); } catch(e){ console.warn(PL+': original deposit threw', e); res = undefined; }

        // Post-sync: ensure qtty exists under the captured intendedCategory
        try {
          var cand = resolveEntry(item);
          var id = resolveId(item);
          if(!id) return res;
          var active = intendedActive || this._lastActive;
          var category = intendedCategory || this._lastCategory;
          this._warehouses = this._warehouses || {};
          var inst = this._warehouses[active];
          if(!inst) return res;
          inst.items = inst.items || {};
          inst.qtty = inst.qtty || {};
          inst.items[category] = inst.items[category] || [];
          inst.qtty[category] = inst.qtty[category] || {};
          var key = String(id);
          if(!(key in inst.qtty[category])) inst.qtty[category][key] = 0;
          var usesNumbers = inst.items[category].some(function(x){ return typeof x === 'number'; });
          var presentNumber = inst.items[category].indexOf(Number(id)) !== -1;
          var presentString = inst.items[category].indexOf(key) !== -1;
          if(!presentNumber && !presentString) inst.items[category].push(usesNumbers ? Number(id) : key);
          try {
            Object.keys(inst.qtty[category] || {}).forEach(function(k){ inst.qtty[category][k] = Number(inst.qtty[category][k] || 0); });
            var total = 0;
            Object.keys(inst.qtty || {}).forEach(function(c){
              Object.keys(inst.qtty[c] || {}).forEach(function(k){ total += Number(inst.qtty[c][k] || 0); });
            });
            inst.currentCapacity = total;
          } catch(e){}
          try { var s2 = SceneManager._scene; if(s2 && s2._windowLayer && Array.isArray(s2._windowLayer.children)) s2._windowLayer.children.forEach(function(w){ if(w && typeof w.refresh === 'function') w.refresh(); }); } catch(e){}
        } catch(e){ console.warn(PL+': post-sync failed', e); }

        return res;
      };

      console.log(PL+': deposit capture wrapper installed (defensive)');
    }

    return true;
  }

  // Try to install immediately, otherwise wait for PHPlugins to be ready
  if(!safeInstall()){
    var tries = 0;
    var interval = setInterval(function(){
      tries++;
      if(safeInstall() || tries > 30) clearInterval(interval);
    }, 200);
  }

  // Restore function
  window.PHW_ContextGuard_restore = function(){
    try {
      if(window.PHPlugins && PHPlugins.PHWarehouse){
        var ph = PHPlugins.PHWarehouse;
        if(ph.__phw_verify_guard_orig){
          ph.verifyAllTogether = ph.__phw_verify_guard_orig;
          delete ph.__phw_verify_guard_orig;
          delete ph.__phw_verify_guard_installed;
        }
        if(ph.__phw_deposit_bucket_orig){
          ph.deposit = ph.__phw_deposit_bucket_orig;
          delete ph.__phw_deposit_bucket_orig;
          delete ph.__phw_deposit_bucket_installed;
        }
        // If a later capture wrapper replaced deposit, restore that too
        if(ph.__phw_deposit_capture_orig){
          ph.deposit = ph.__phw_deposit_capture_orig;
          delete ph.__phw_deposit_capture_orig;
          delete ph.__phw_deposit_capture_installed;
        }
      }
      console.log(PL+': restored originals where present');
    } catch(e){
      console.warn(PL+': restore failed', e);
    }
  };

})();
