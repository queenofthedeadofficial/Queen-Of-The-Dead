/*:
 * @plugindesc PH_Warehouse MetaRules AutoWrap — ensures meta-rule parsing and wrapper installation (place below PH_Warehouse)
 * @author Patch
 *
 * @help
 * Companion plugin that:
 *  - parses CE "meta: Key: Value" lines under {RuleName}
 *  - normalizes DB meta values
 *  - resolves UI wrapper objects to DB entries by meta/name
 *  - wraps populateRules so _meta is reattached after rules are rebuilt
 *  - installs wrappers at load and retries for a short period to catch late replacements
 *
 * No plugin commands.
 */

(function(){
  'use strict';

  var RETRY_INTERVAL = 200;   // ms
  var RETRY_COUNT = 30;       // total retry window ~6s

  function parseMetaToken(str){
    if(!str) return null;
    var sep = (str.indexOf(':') > -1) ? ':' : (str.indexOf('=') > -1 ? '=' : null);
    if(!sep) return null;
    var parts = str.split(sep);
    var key = parts[0].trim().toLowerCase();
    var value = parts.slice(1).join(sep).trim().toLowerCase();
    if(!key || !value) return null;
    return { key: key, value: value };
  }

  function normalizeAllDbMeta(){
    try {
      [$dataItems, $dataWeapons, $dataArmors].forEach(function(db){
        if(!db) return;
        for(var i=1;i<db.length;i++){
          var e = db[i];
          if(!e || !e.meta) continue;
          Object.keys(e.meta).forEach(function(k){ e.meta[k] = String(e.meta[k]).trim(); });
        }
      });
    } catch(e){ console.warn('PH_Warehouse_MetaRules_AutoWrap: normalizeAllDbMeta failed', e); }
  }

  function populateRuleMetaFromCE(ph){
    try {
      if(!$dataCommonEvents) return;
      var ce = $dataCommonEvents.find(function(c){ return c && c.name === 'PHWarehouse'; });
      if(!ce || !ce.list) return;
      var current = null;
      for(var i=0;i<ce.list.length;i++){
        var cmd = ce.list[i];
        if(!cmd || !cmd.parameters) continue;
        var text = String(cmd.parameters[0] || '').trim();
        if(text.charAt(0) === '{' && text.charAt(text.length-1) === '}'){
          current = text.slice(1, text.length-1);
          if(ph._rules && ph._rules[current] && !ph._rules[current]._meta) ph._rules[current]._meta = [];
        } else if(current && ph._rules && ph._rules[current]){
          if(text.toLowerCase().indexOf('meta:') === 0){
            var token = text.slice(5).trim();
            var parsed = parseMetaToken(token);
            if(parsed){
              ph._rules[current]._meta = ph._rules[current]._meta || [];
              var exists = ph._rules[current]._meta.some(function(m){ return m.key===parsed.key && m.value===parsed.value; });
              if(!exists) ph._rules[current]._meta.push(parsed);
            }
          }
        }
      }
    } catch(e){ console.warn('PH_Warehouse_MetaRules_AutoWrap: populateRuleMetaFromCE failed', e); }
  }

  function resolveToDbObject(candidate){
    if(!candidate) return null;
    if(candidate.meta && (candidate.id || candidate.name)) return candidate;
    var candMeta = {};
    if(candidate.meta && typeof candidate.meta === 'object'){
      Object.keys(candidate.meta).forEach(function(k){ candMeta[k.toLowerCase()] = String(candidate.meta[k]).trim().toLowerCase(); });
    }
    var candName = candidate.name || candidate.itemName || candidate.ename || candidate.description || '';
    var dbs = [$dataArmors, $dataItems, $dataWeapons];
    for(var d=0; d<dbs.length; d++){
      var db = dbs[d];
      if(!db) continue;
      for(var i=1;i<db.length;i++){
        var entry = db[i];
        if(!entry) continue;
        if(Object.keys(candMeta).length > 0){
          var ok = true;
          Object.keys(candMeta).forEach(function(k){
            var ev = entry.meta && (entry.meta[k] !== undefined ? String(entry.meta[k]).trim().toLowerCase() : undefined);
            if(typeof ev === 'undefined' || ev !== candMeta[k]) ok = false;
          });
          if(ok) return entry;
        }
        if(candName){
          if(entry.name === candName) return entry;
          if(entry.description && entry.description === candName) return entry;
        }
      }
    }
    return null;
  }

  function installWrappers(ph){
    if(!ph) return false;

    // normalize DB meta and populate CE meta initially
    normalizeAllDbMeta();
    populateRuleMetaFromCE(ph);

    // Wrap populateRules so _meta is reattached after rules are rebuilt
    if(!ph._orig_populateRules){
      ph._orig_populateRules = ph.populateRules;
      ph.populateRules = function(warehouseVar){
        // call original populateRules to rebuild _rules
        ph._orig_populateRules.apply(this, arguments);
        // then reattach _meta from CE
        try {
          if(!$dataCommonEvents) return;
          var ce = $dataCommonEvents.find(function(c){ return c && c.name === 'PHWarehouse'; });
          if(!ce || !ce.list) return;
          var current = null;
          for(var i=0;i<ce.list.length;i++){
            var cmd = ce.list[i];
            if(!cmd || !cmd.parameters) continue;
            var text = String(cmd.parameters[0] || '').trim();
            if(text.charAt(0) === '{' && text.charAt(text.length-1) === '}'){
              current = text.slice(1, text.length-1);
              if(this._rules && this._rules[current] && !this._rules[current]._meta) this._rules[current]._meta = [];
            } else if(current && this._rules && this._rules[current]){
              if(text.toLowerCase().indexOf('meta:') === 0){
                var token = text.slice(5).trim();
                var parsed = (function(t){
                  var sep = (t.indexOf(':')>-1)?':':(t.indexOf('=')>-1?'=':null);
                  if(!sep) return null;
                  var p = t.split(sep);
                  return { key: p[0].trim().toLowerCase(), value: p.slice(1).join(sep).trim().toLowerCase() };
                })(token);
                if(parsed){
                  this._rules[current]._meta = this._rules[current]._meta || [];
                  if(!this._rules[current]._meta.some(function(m){ return m.key===parsed.key && m.value===parsed.value; })) this._rules[current]._meta.push(parsed);
                }
              }
            }
          }
        } catch(e){ console.warn('PH_Warehouse_MetaRules_AutoWrap: populateRules post-hook failed', e); }
      };
    }

    // verifyItem wrapper (store original)
    if(!ph._orig_verifyItem){
      ph._orig_verifyItem = ph.verifyItem;
      ph.verifyItem = function(item){
        var base = false;
        try { base = ph._orig_verifyItem.apply(this, arguments); } catch(e){ base = false; }
        var ruleName = this._warehouses && this._warehouses[this._lastActive] ? this._warehouses[this._lastActive].rule : null;
        if(!ruleName) return base;
        var ruleObj = this._rules[ruleName];
        if(!ruleObj || !Array.isArray(ruleObj._meta) || ruleObj._meta.length === 0) return base;
        var candidate = item && (item.item || item.object || item._item) || item;
        var dbObj = resolveToDbObject(candidate) || candidate;
        var metaMap = {};
        if(dbObj && dbObj.meta) Object.keys(dbObj.meta).forEach(function(k){ metaMap[k.toLowerCase()] = String(dbObj.meta[k]).trim().toLowerCase(); });
        for(var m=0;m<ruleObj._meta.length;m++){
          var cond = ruleObj._meta[m];
          if(!cond || !cond.key) continue;
          var actual = metaMap[cond.key];
          if(typeof actual === 'undefined') return false;
          if(actual !== cond.value) return false;
        }
        return true;
      };
    }

    // deposit wrapper (store original)
    if(!ph._orig_deposit){
      ph._orig_deposit = ph.deposit;
      ph.deposit = function(item){
        var candidate = item && (item.item || item.object || item._item) || item;
        var dbObj = resolveToDbObject(candidate);
        if(dbObj) return ph._orig_deposit.apply(this, [dbObj]);
        return ph._orig_deposit.apply(this, arguments);
      };
    }

    // withdraw wrapper (store original) if present
    if(ph.withdraw && !ph._orig_withdraw){
      ph._orig_withdraw = ph.withdraw;
      ph.withdraw = function(item){
        var candidate = item && (item.item || item.object || item._item) || item;
        var dbObj = resolveToDbObject(candidate);
        if(dbObj) return ph._orig_withdraw.apply(this, [dbObj]);
        return ph._orig_withdraw.apply(this, arguments);
      };
    }

    return true;
  }

  // Retry loop to ensure wrappers are installed even if PH_Warehouse replaces methods later
  function ensureWrapped(){
    var tries = 0;
    var id = setInterval(function(){
      tries++;
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(ph){
        var ok = installWrappers(ph);
        if(ok){
          // confirm wrappers present
          if(ph._orig_verifyItem && ph._orig_deposit){
            clearInterval(id);
            console.log('PH_Warehouse_MetaRules_AutoWrap: wrappers installed.');
            return;
          }
        }
      }
      if(tries >= RETRY_COUNT){
        clearInterval(id);
        console.warn('PH_Warehouse_MetaRules_AutoWrap: wrapper install retries exhausted.');
      }
    }, RETRY_INTERVAL);
  }

  // Start after a short delay so plugin load order can settle
  setTimeout(ensureWrapped, 50);

  // Expose a small debug API on the global object for console verification
  window.PH_Warehouse_MetaRules = window.PH_Warehouse_MetaRules || {};
  window.PH_Warehouse_MetaRules.installWrappersNow = function(){ var ph = window.PHPlugins && PHPlugins.PHWarehouse; return installWrappers(ph); };
  window.PH_Warehouse_MetaRules.populateNow = function(){ var ph = window.PHPlugins && PHPlugins.PHWarehouse; populateRuleMetaFromCE(ph); normalizeAllDbMeta(); return true; };

  // Auto-run wrapper installer once more after load to guarantee wrappers are installed
  setTimeout(function(){
    try {
      if(window.PH_Warehouse_MetaRules && typeof window.PH_Warehouse_MetaRules.installWrappersNow === 'function'){
        window.PH_Warehouse_MetaRules.installWrappersNow();
        console.log('PH_Warehouse_MetaRules_AutoWrap: installWrappersNow executed.');
      }
    } catch(e){
      console.warn('PH_Warehouse_MetaRules_AutoWrap: installWrappersNow failed', e);
    }
  }, 120);

})();
