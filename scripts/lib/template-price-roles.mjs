// Which material roles each template family consumes.
//
// Shared by the prerenderer and the React template page so the served HTML and
// the hydrated page show the same rows. Roles are the real names stored in
// market_material_roles; template types are the catalog's own type field.
export const ROLES_BY_TYPE = Object.freeze({
  paint: Object.freeze(["interior-paint", "primer", "joint-filler", "sandpaper"]),
  screeding: Object.freeze(["sand", "concrete-mix", "skim-plaster"]),
  pop: Object.freeze(["concrete-mix", "sand"]),
  // A polystyrene board ceiling consumes no cement or aggregate: the book rows
  // that apply are the ones it really uses, the joint filler, the paint, the
  // abrasive and the sand for bedding a tray.
  polystyrene: Object.freeze([
    "joint-filler",
    "interior-paint",
    "primer",
    "sandpaper",
    "sand",
  ]),
  tile: Object.freeze([]),
});

export const ROLE_LABELS = Object.freeze({
  "interior-paint": "Interior paint",
  primer: "Primer",
  "joint-filler": "Joint filler and putty",
  sandpaper: "Abrasive",
  sand: "Sand",
  "concrete-mix": "Cement",
  "skim-plaster": "Skim plaster",
});
