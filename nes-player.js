(() => {
  'use strict';
  let game={};try{game=JSON.parse(decodeURIComponent(location.hash.slice(1)));}catch{}
  const es=game.lang==='es',t=(en,sp)=>es?sp:en,$=id=>document.getElementById(id);
  document.documentElement.lang=es?'es':'en';document.title=game.title||'NES player';
  let browser=null,loaded=false,loading=false,paused=false,request=null,alive=true;
  const controls={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',select:'KeyF',start:'KeyH',b:'KeyJ',a:'KeyK',...game.controls};
  const controllerNames={a:'BUTTON_A',b:'BUTTON_B',select:'BUTTON_SELECT',start:'BUTTON_START',up:'BUTTON_UP',down:'BUTTON_DOWN',left:'BUTTON_LEFT',right:'BUTTON_RIGHT'};
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);$('retry').hidden=!error;}
  function release(){if(!browser)return;for(let i=0;i<8;i++)browser.nes.buttonUp(1,i);}
  function focus(){ $('stage').focus(); }
  function pause(value){if(!loaded||paused===value)return;release();paused=value;if(paused)browser.stop();else browser.start();status(paused?t('Click the game or press H to resume.','Haz clic en el juego o pulsa H para continuar.'):t('Playing. H = Start · Escape = return.','Jugando. H = Start · Escape = volver.'));}
  function fail(error){if(!alive)return;loading=false;loaded=false;request=null;browser?.stop();$('cover').hidden=false;$('opening').textContent=t('Let’s try that again.','Intentémoslo de nuevo.');$('opening-note').textContent=t('Your lesson answers are safe.','Tus respuestas de la lección siguen guardadas.');status(t('Could not load the game. ','No se pudo cargar el juego. ')+(error?.name==='AbortError'?t('The download timed out.','La descarga tardó demasiado.'):error?.message||String(error)),true);}
  function createBrowser(){
    browser?.destroy();$('nes').replaceChildren();
    browser=new jsnes.Browser({container:$('nes'),onError:fail});
    const keys={};for(const [action,code]of Object.entries(controls)){const match=/^Key([A-Z])$/.exec(code);if(match&&controllerNames[action])keys[match[1].charCodeAt(0)]=[1,jsnes.Controller[controllerNames[action]],match[1]];}
    // Assign a per-player map; do not inherit JSNES defaults or another page's keys.
    browser.keyboard.keys=keys;
  }
  async function start(){
    if(loading)return;
    if(loaded){pause(false);focus();return;}
    let parsed;try{parsed=new URL(game.url);if(parsed.protocol!=='https:'&&parsed.origin!==location.origin)throw new Error();}catch{fail(new Error(t('No valid game link is configured.','No hay un enlace válido configurado.')));return;}
    loading=true;status(t('Loading game from Wix…','Cargando el juego desde Wix…'));
    const controller=new AbortController();request=controller;const timer=setTimeout(()=>controller.abort(),30000);
    try{
      // The parent opens this iframe from the student's click; no second start step.
      createBrowser();
      const response=await fetch(parsed.href,{signal:controller.signal,mode:'cors',credentials:'omit'});
      if(!response.ok)throw new Error(t('The game host returned ','El servidor respondió ')+response.status+'.');
      if(Number(response.headers.get('content-length'))>LAB_ROM.MAX_ARCHIVE)throw new Error(t('Link to one game per ZIP.','Enlaza un solo juego por ZIP.'));
      const bytes=await LAB_ROM.bounded(response.body,LAB_ROM.MAX_ARCHIVE);
      const rom=await LAB_ROM.extract(bytes,game.romFile||'');if(!alive)return;
      browser.loadROM(rom);loaded=true;loading=false;paused=false;request=null;
      $('cover').hidden=true;
      browser.fitInParent();status(t('Ready. H = Start · F = Select · J = B · K = A','Listo. H = Start · F = Select · J = B · K = A'));focus();
      parent.postMessage({type:'game-loaded'},location.origin);
      if(document.hidden)pause(true);
    }catch(error){if(error instanceof TypeError)error=new Error(t('The browser could not fetch the file. Check the URL, Wix CORS permissions, and school network access.','El navegador no pudo descargar el archivo. Comprueba la URL, los permisos CORS de Wix y la red de la escuela.'));fail(error);}
    finally{clearTimeout(timer);}
  }
  $('retry').onclick=start;
  $('return').onclick=()=>parent.postMessage({type:'close-game'},location.origin);
  $('stage').addEventListener('pointerdown',()=>{if(loaded&&paused)pause(false);focus();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();parent.postMessage({type:'close-game'},location.origin);return;}if(loaded&&paused&&e.code===controls.start){e.preventDefault();pause(false);focus();}} ,true);
  window.addEventListener('blur',()=>{release();pause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  new ResizeObserver(()=>browser?.fitInParent()).observe($('stage'));
  window.addEventListener('pagehide',()=>{alive=false;request?.abort();release();browser?.destroy();browser=null;});
  if(game.controlsImage){try{const imageURL=new URL(game.controlsImage,location.href);if(imageURL.protocol==='https:'||imageURL.origin===location.origin){$('controls-image').src=imageURL.href;$('controls-image').hidden=false;$('controls-image').onerror=()=>{$('controls-image').hidden=true;};}}catch{}}
  $('opening').textContent=game.title||t('Loading game…','Cargando juego…');$('opening-note').textContent=t('Your game starts automatically.','El juego empieza automáticamente.');$('retry').textContent=t('Try again','Intentar otra vez');$('return').textContent=t('Return to lesson','Volver a la lección');$('move-label').textContent=t('Move','Mover');$('focus-note').textContent=t('Click the game screen to use the keyboard. Close and reopen to begin again.','Haz clic en la pantalla para usar el teclado. Cierra y vuelve a abrir para reiniciar.');$('escape-note').textContent=t('Esc: return to lesson','Esc: volver a la lección');$('controls-title').textContent=t('CONTROLS','CONTROLES');$('controls-image').alt=t('NES keyboard controls: W A S D move, F Select, H Start, J B, K A','Controles NES: W A S D mover, F Select, H Start, J B, K A');
  start();
})();
