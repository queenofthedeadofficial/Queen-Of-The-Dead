/*:
 * @plugindesc PH Warehouse MetaRules Fix — wraps populateRules, loadRules and enforces meta rules (place after PH_Warehouse)
 * @author Patch
 * @help
 * Drop this file into js/plugins and enable it after PH_Warehouse.
 * It wraps populateRules and loadRules so CE "meta: Key: Value" lines are always attached to rules,
 * resolves UI wrapper objects to DB entries when verifying/depositing, and is idempotent.
 */

(function(){
  'use strict';

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

  function attachMetaToRules(ph){
    try {
      if(!ph || !ph._rules) return;
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
          if(ph._rules[current] && !ph._rules[current]._meta) ph._rules[current]._meta = [];
        } else if(current && ph._rules[current]){
          if(text.toLowerCase().indexOf('meta:') === 0){
            var token = text.slice(5).trim();
            var sep = (token.indexOf(':')>-1)?':':(token.indexOf('=')>-1?'=':null);
            if(!sep) continue;
            var parts = token.split(sep);
            var key = parts[0] ? parts[0].trim().toLowerCase() : '';
            var value = parts.slice(1).join(sep).trim().toLowerCase();
            if(!key || !value) continue;
            ph._rules[current]._meta = ph._rules[current]._meta || [];
            if(!ph._rules[current]._meta.some(function(m){ return m.key===key && m.value===value; })) {
              ph._rules[current]._meta.push({ key:key, value:value });
            }
          }
        }
      }
    } catch(e){ console.warn('PH_Warehouse_MetaRules_Fix: attachMetaToRules failed', e); }
  }

  function wrapPopulateRules(ph){
    if(!ph) return false;
    if(ph._meta_populate_wrapped) return true;
    ph._meta_populate_wrapped = ph.populateRules;
    ph.populateRules = function(warehouseVar){
      try { ph._meta_populate_wrapped.apply(this, arguments); } catch(e){ console.warn('PH_Warehouse_MetaRules_Fix: original populateRules threw', e); }
      try { attachMetaToRules(ph); } catch(e){ console.warn('PH_Warehouse_MetaRules_Fix: post-hook failed', e); }
    };
    return true;
  }

  function wrapLoadRules(ph){
    if(!ph) return false;
    if(ph._meta_load_wrapped) return true;
    ph._meta_load_wrapped = ph.loadRules;
    ph.loadRules = function(){
      try { ph._meta_load_wrapped.apply(this, arguments); } catch(e){ console.warn('PH_Warehouse_MetaRules_Fix: original loadRules threw', e); }
      try { attachMetaToRules(ph); } catch(e){ console.warn('PH_Warehouse_MetaRules_Fix: loadRules post-hook failed', e); }
    };
    return true;
  }

  function wrapVerifyAndDeposit(ph){
    if(!ph) return false;

    if(!ph._meta_verify_wrapped && ph.verifyItem){
      ph._meta_verify_wrapped = ph.verifyItem;
      ph.verifyItem = function(item){
        var base = false;
        try { base = ph._meta_verify_wrapped.apply(this, arguments); } catch(e){ base = false; }
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
          if(typeof actual === 'undefined' || actual !== cond.value) return false;
        }
        return true;
      };
    }

    if(!ph._meta_deposit_wrapped && ph.deposit){
      ph._meta_deposit_wrapped = ph.deposit;
      ph.deposit = function(item){
        var candidate = item && (item.item || item.object || item._item) || item;
        var dbObj = resolveToDbObject(candidate);
        if(dbObj) return ph._meta_deposit_wrapped.apply(this, [dbObj]);
        return ph._meta_deposit_wrapped.apply(this, arguments);
      };
    }

    return true;
  }

  function installer(){
    var tries = 0;
    var maxTries = 40;
    var id = setInterval(function(){
      tries++;
      var ph = window.PHPlugins && window.PHPlugins.PHWarehouse;
      if(ph){
        try {
          wrapPopulateRules(ph);
          wrapLoadRules(ph);
          attachMetaToRules(ph);
          wrapVerifyAndDeposit(ph);
          try { ph.loadRules && ph.loadRules(); } catch(e){}
          console.log('PH_Warehouse_MetaRules_Fix: installed. populateWrapped:', !!ph._meta_populate_wrapped, 'loadWrapped:', !!ph._meta_load_wrapped, 'verifyWrapped:', !!ph._meta_verify_wrapped);
          clearInterval(id);
          return;
        } catch(e){
          console.warn('PH_Warehouse_MetaRules_Fix: install attempt failed', e);
        }
      }
      if(tries >= maxTries){
        clearInterval(id);
        console.warn('PH_Warehouse_MetaRules_Fix: installer retries exhausted.');
      }
    }, 200);
  }

  window.PH_Warehouse_MetaRules_Fix = {
    attachNow: function(){ var ph = window.PHPlugins && window.PHPlugins.PHWarehouse; if(ph){ attachMetaToRules(ph); console.log('attachNow done'); } else console.warn('PH_Warehouse not found'); },
    resolveToDbObject: resolveToDbObject
  };

  installer();

})();
