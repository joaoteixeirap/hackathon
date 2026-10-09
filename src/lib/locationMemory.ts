// One-shot handoff across client navigation. No coordinates in URL or persistent storage.
let current:{lat:number;lng:number}|null=null;
export function rememberLocation(point:{lat:number;lng:number}){current=point;}
export function takeLocation(){const point=current;current=null;return point;}
