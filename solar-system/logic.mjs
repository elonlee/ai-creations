export const nextIndex=(index,step,count)=>(index+step%count+count)%count;
export const clampSpeed=value=>Math.max(0,Math.min(4,Number(value)||0));
export const focusDistance=(radius,fovDegrees,fill)=>radius/(Math.tan(fovDegrees*Math.PI/360)*fill);
export const textureTier=quality=>quality==='ultra'?['ultra','hd','standard']:quality==='hd'?['hd','standard']:['standard'];
export function advanceSynchronizedRotation(surface,overlay,step){
  surface.rotation.y+=step;
  overlay.rotation.y=surface.rotation.y;
}
