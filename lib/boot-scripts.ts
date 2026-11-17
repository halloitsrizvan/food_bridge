// Plain module (no "use client") so the server layout can read these strings.
export const APPEARANCE_KEY = "fb:appearance";
export const LANG_KEY = "fb:lang";

/** Applies saved font/size/motion and <html lang> before first paint so nothing flashes. */
export const BOOT_SCRIPT = `try{var d=document.documentElement,a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"{}");d.dataset.font=a.font||"default";d.dataset.size=a.size||"md";d.dataset.motion=a.motion||"full";var l=localStorage.getItem("${LANG_KEY}");if(l==="ml"||l==="hi"||l==="en")d.lang=l}catch(e){}`;
