/*:
 * @plugindesc Ensure global openCustomSynthesisCategory(category) exists and safely opens the custom synthesis scene if present. Paste into js/plugins and enable. @author You
 */
(function(){
  'use strict';

  // Safe global function that other scripts / Common Events can call.
  window.openCustomSynthesisCategory = function(category) {
    try {
      if (!category) {
        console.warn('openCustomSynthesisCategory called without category.');
        return;
      }
      console.log('[openCustomSynthesisCategory] called with:', category);

      // If a custom scene exists, push it and set the category after the scene is created.
      if (typeof Scene_CustomSynthesis !== 'undefined') {
        SceneManager.push(Scene_CustomSynthesis);
        // small delay to allow the scene to initialize
        setTimeout(function() {
          var s = SceneManager._scene;
          if (s && typeof s.setCategory === 'function') {
            s.setCategory(category);
            console.log('[openCustomSynthesisCategory] Scene_CustomSynthesis opened and category set:', category);
          } else {
            console.warn('[openCustomSynthesisCategory] Scene_CustomSynthesis opened but setCategory not found on scene.');
          }
        }, 10);
        return;
      }

      // If Scene_CustomSynthesis is not present, try to open YEP scenes safely
      var scene = (typeof Scene_ItemSynthesis !== 'undefined') ? Scene_ItemSynthesis : (typeof Scene_Synthesis !== 'undefined' ? Scene_Synthesis : null);
      if (scene) {
        // set flags YEP-style and push the scene
        $gameSystem._synthFilter = category;
        $gameSystem._synthDirectOpen = true;
        try {
          SceneManager.push(scene);
          console.log('[openCustomSynthesisCategory] Pushed YEP synthesis scene for category:', category);
        } catch (e) {
          console.error('[openCustomSynthesisCategory] Failed to push YEP synthesis scene:', e);
        }
        return;
      }

      // If neither custom nor YEP scenes exist, warn
      console.warn('[openCustomSynthesisCategory] No synthesis scene found (Scene_CustomSynthesis, Scene_ItemSynthesis, Scene_Synthesis).');
    } catch (err) {
      console.error('[openCustomSynthesisCategory] Unexpected error:', err);
    }
  };

  // Small startup log so you can confirm the plugin loaded
  console.log('[EnsureOpenCustomSynthesis] global openCustomSynthesisCategory defined.');
})();
