/*:
 * @plugindesc WH Fix Category Band — unified solid/hover highlight for Warehouse category UI
 * @author Copilot
 * @help
 * Drop this file into js/plugins and enable it. It patches the
 * Window_WarehouseCategory prototype to draw a single uniform band
 * across the full contents width. Solid when focused, flashing when
 * selectable-but-not-focused. Includes a revert helper.
 *
 * No plugin commands.
 */

(function(){
  'use strict';

  // Safety: only run if the window class exists
  if (typeof Window_WarehouseCategory === 'undefined' || typeof Window_Selectable === 'undefined') {
    console.warn('WH_FixCategoryBand: target classes not found; plugin inactive.');
    return;
  }

  var PLUGIN = {
    BAND_FILL: 'rgba(255,255,255,0.06)',   // main band color
    BAND_TOP:  'rgba(255,255,255,0.12)',   // top highlight
    BAND_BOT:  'rgba(0,0,0,0.12)',         // bottom shadow
    FLASH_FRAMES: 20,
    FLASH_BASE: 0.72
  };

  // Save originals once
  var proto = Window_WarehouseCategory.prototype;
  if (!proto.__wh_orig_update) proto.__wh_orig_update = proto.update || function(){};

  // Install patch idempotently
  if (!proto.__wh_plugin_installed) {
    proto.__wh_plugin_installed = true;

    proto.update = function(){
      try { proto.__wh_orig_update.call(this); } catch(e){}

      try {
        // Only operate for the single-centered category layout we care about
        if (!(this.__wh_single_centered && Array.isArray(this._list) && this._list.length === 1)) return;

        // Hide engine cursor sprite to avoid double-draw
        try { if (this._windowCursorSprite) this._windowCursorSprite.visible = false; } catch(e){}

        // Compute band rect in contents coordinates
        var rect = (typeof this.itemRectForText === 'function') ? this.itemRectForText(0) : {x:0,y:0,width:this.width,height:this.lineHeight?this.lineHeight():36};
        var bandX = 0;
        var bandW = (this.contents && this.contents.width) ? this.contents.width : this.width;
        var bandY = rect.y;
        var bandH = rect.height;

        // Determine states
        var focused = !!this.active;
        var selectableButNotFocused = !focused && (SceneManager._scene && SceneManager._scene._itemWindow && SceneManager._scene._itemWindow.active);

        // Clear only the band area to avoid wiping other content
        try { this.contents.clearRect(bandX, bandY, bandW, bandH); } catch(e){}

        // Draw solid when focused
        if (focused) {
          try {
            this.contents.fillRect(bandX, bandY, bandW, bandH, PLUGIN.BAND_FILL);
            this.contents.fillRect(bandX, bandY, bandW, 1, PLUGIN.BAND_TOP);
            this.contents.fillRect(bandX, bandY + bandH - 1, bandW, 1, PLUGIN.BAND_BOT);
          } catch(e){}
        }
        // Draw flashing when selectable but not focused
        else if (selectableButNotFocused) {
          try {
            var phase = Math.floor(Graphics.frameCount / PLUGIN.FLASH_FRAMES) % 2;
            var phaseMul = phase ? 1.0 : 0.45;
            var flashAlpha = Math.max(0, Math.min(1, PLUGIN.FLASH_BASE * phaseMul));
            this.contents.fillRect(bandX, bandY, bandW, bandH, 'rgba(255,255,255,' + flashAlpha + ')');
            this.contents.fillRect(bandX, bandY, bandW, 1, 'rgba(255,255,255,' + Math.min(1, flashAlpha * 1.4) + ')');
            this.contents.fillRect(bandX, bandY + bandH - 1, bandW, 1, 'rgba(0,0,0,' + Math.min(1, flashAlpha * 0.6) + ')');
          } catch(e){}
        }
        // else: leave default drawing (no band)

        // Redraw centered text on top of the band
        try {
          var item = this._list && this._list[0];
          var text = (item && (item.name || item.text || item.symbol)) || '';
          var lineH = (typeof this.lineHeight === 'function') ? this.lineHeight() : bandH;
          var yOffset = Math.max(0, Math.floor((bandH - lineH) / 2));
          var drawY = bandY + yOffset;
          this.resetTextColor();
          this.drawText(text, bandX, drawY, bandW, 'center');
        } catch(e){}
      } catch(err){
        // Fail silently but log for debugging
        if (typeof console !== 'undefined') console.error('WH_FixCategoryBand update error', err);
      }
    };
  }

  // One-time helper to hide the internal left child if present (best-effort)
  function hideInternalLeftChild(){
    try {
      var scene = SceneManager._scene;
      if (!scene) return;
      var parentWindow = scene._windowLayer && scene._windowLayer.children && scene._windowLayer.children.find(function(c){ return c && c.constructor && c.constructor.name === 'Window_WarehouseCategory'; }) || scene._categoryWindow;
      if (!parentWindow || !parentWindow.children) return;
      // child index 1 was the left artifact in your trace; hide if present
      if (parentWindow.children[1]) parentWindow.children[1].visible = false;
    } catch(e){ if (typeof console !== 'undefined') console.warn('WH_FixCategoryBand hide child failed', e); }
  }

  // Run hide helper now (scene may be active)
  try { hideInternalLeftChild(); } catch(e){}

  // Expose a revert helper so you can restore original behavior easily
  window.WH_FixCategoryBand = window.WH_FixCategoryBand || {};
  window.WH_FixCategoryBand.revert = function(){
    try {
      if (proto.__wh_orig_update) proto.update = proto.__wh_orig_update;
      proto.__wh_plugin_installed = false;
      // show children again
      var scene = SceneManager._scene;
      if (scene && scene._windowLayer && scene._windowLayer.children) {
        var parentWindow = scene._windowLayer.children.find(function(c){ return c && c.constructor && c.constructor.name === 'Window_WarehouseCategory'; }) || scene._categoryWindow;
        if (parentWindow && parentWindow.children) parentWindow.children.forEach(function(ch){ try{ ch.visible = true; }catch(e){} });
      }
      if (typeof console !== 'undefined') console.log('WH_FixCategoryBand reverted. Reload scene if necessary.');
    } catch(e){ if (typeof console !== 'undefined') console.error('WH_FixCategoryBand revert error', e); }
  };

  // Done
  if (typeof console !== 'undefined') console.log('WH_FixCategoryBand installed.');
})();