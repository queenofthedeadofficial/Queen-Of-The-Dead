/*:
 * @plugindesc v3.0 RenderTexture-based HSL color grading (MV-safe full screen postprocessing)
 * @author ChatGPT
 *
 * @param EnabledByDefault
 * @type boolean
 * @default true
 *
 * @param MasterSatMul
 * @type number
 * @decimals 3
 * @default 1.15
 *
 * @param MasterLightAdd
 * @type number
 * @decimals 3
 * @default -0.02
 *
 * @help
 * HSLColorGrade v3.0
 * - TRUE postprocessing system (RenderTexture pipeline)
 * - No tilemap filters (avoids black screen issues)
 * - Safe across MV + Pixi + YEP plugin stacks
 */

(function() {

  var params = PluginManager.parameters("HSLColorGrade") || {};

  var _enabled = String(params.EnabledByDefault || "true") === "true";

  var masterSatMul = Number(params.MasterSatMul || 1.15);
  var masterLightAdd = Number(params.MasterLightAdd || -0.02);

  // ----------------------------------------------------
  // SHADER (SAFE FRAGMENT ONLY)
  // ----------------------------------------------------

  var frag = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform float masterSatMul;
uniform float masterLightAdd;

vec3 rgb2hsl(vec3 c){
  float r=c.r,g=c.g,b=c.b;
  float maxc=max(r,max(g,b));
  float minc=min(r,min(g,b));
  float h=0.0,s=0.0,l=(maxc+minc)*0.5;

  if(maxc!=minc){
    float d=maxc-minc;
    s = l>0.5 ? d/(2.0-maxc-minc) : d/(maxc+minc);

    if(maxc==r) h=(g-b)/d + (g<b?6.0:0.0);
    else if(maxc==g) h=(b-r)/d + 2.0;
    else h=(r-g)/d + 4.0;

    h/=6.0;
  }
  return vec3(h,s,l);
}

float hue2rgb(float p,float q,float t){
  if(t<0.0) t+=1.0;
  if(t>1.0) t-=1.0;
  if(t<1.0/6.0) return p+(q-p)*6.0*t;
  if(t<1.0/2.0) return q;
  if(t<2.0/3.0) return p+(q-p)*(2.0/3.0-t)*6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl){
  float h=hsl.x,s=hsl.y,l=hsl.z;
  if(s==0.0) return vec3(l);

  float q = l < 0.5 ? l*(1.0+s) : l+s-l*s;
  float p = 2.0*l - q;

  return vec3(
    hue2rgb(p,q,h+1.0/3.0),
    hue2rgb(p,q,h),
    hue2rgb(p,q,h-1.0/3.0)
  );
}

void main(){
  vec4 c = texture2D(uSampler, vTextureCoord);

  if(c.a < 0.001){
    gl_FragColor = c;
    return;
  }

  vec3 hsl = rgb2hsl(c.rgb);

  hsl.y = clamp(hsl.y * masterSatMul, 0.0, 1.0);
  hsl.z = clamp(hsl.z + masterLightAdd, 0.0, 1.0);

  vec3 rgb = hsl2rgb(hsl);

  gl_FragColor = vec4(rgb, c.a);
}
`;

  // ----------------------------------------------------
  // RENDER TEXTURE PIPELINE (CORE FIX)
  // ----------------------------------------------------

  var _filter = null;
  var _sprite = null;
  var _renderTexture = null;

  function createPipeline(scene) {
    if (!scene) return;

    if (!PIXI || !PIXI.Filter || !PIXI.RenderTexture) {
      console.error("HSLColorGrade: PIXI missing required classes");
      return;
    }

    if (_filter) return;

    try {

      // 1. Create filter
      _filter = new PIXI.Filter(undefined, frag, {
        masterSatMul: masterSatMul,
        masterLightAdd: masterLightAdd
      });

      // 2. Create render texture (fullscreen buffer)
      _renderTexture = PIXI.RenderTexture.create(
        Graphics.width,
        Graphics.height
      );

      // 3. Create sprite that displays buffer
      _sprite = new PIXI.Sprite(_renderTexture);
      _sprite.filters = [_filter];

      // 4. Attach above scene
      SceneManager._scene.addChild(_sprite);

    } catch (e) {
      console.error("HSLColorGrade v3: pipeline failed", e);
      _filter = null;
      _sprite = null;
      _renderTexture = null;
    }
  }

  // ----------------------------------------------------
  // UPDATE PIPELINE EACH FRAME
  // ----------------------------------------------------

  function updatePipeline(scene) {
    if (!_enabled) return;

    if (!_filter || !_sprite || !_renderTexture) return;

    try {
      // Render whole scene into texture
      Graphics._renderer.render(SceneManager._scene, _renderTexture);
    } catch (e) {
      console.error("HSLColorGrade render error:", e);
    }
  }

  // ----------------------------------------------------
  // HOOKS
  // ----------------------------------------------------

  var _Scene_Map_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function() {
    _Scene_Map_start.call(this);
    createPipeline(this);
  };

  var _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    updatePipeline(this);
  };

  // ----------------------------------------------------
  // TOGGLE
  // ----------------------------------------------------

  var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _pluginCommand.call(this, command, args);

    if (command === "HSLGrade") {
      var sub = (args[0] || "").toLowerCase();
      if (sub === "on") _enabled = true;
      if (sub === "off") _enabled = false;
      if (sub === "toggle") _enabled = !_enabled;
    }
  };

})();