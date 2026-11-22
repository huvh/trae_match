(() => {
  'use strict';

  const steel = '#52666a';
  const silver = '#b7c5bc';
  const safety = '#ce9058';
  const concrete = '#a4a18d';
  const dark = '#415255';

  function fieldStation(p, x, y, roof) {
    p.box(x, y, 76, 33, 5, concrete);
    p.box(x, y, 68, 28, 22, '#98a195', 5);
    p.box(x, y, 76, 37, 4, roof, 27);
    p.box(x - 10, y + 14.5, 28, 1.5, 7, '#506970', 15);
    p.box(x + 20, y + 14.5, 10, 1.5, 16, dark, 5);
  }

  function antenna(p, x, y) {
    p.post(x, y, 13, 6, concrete);
    p.post(x, y, 4, 29, steel, 6);
    // A shallow paraboloid tilted towards the canyon, with the receiver above its centre.
    const centre = [x, y, 34], rim = [];
    for (let i = 0; i < 8; ++i) {
      const angle = i * Math.PI / 4;
      rim.push([x + 23 * Math.cos(angle), y + 4 - 14 * Math.sin(angle), 41 + 18 * Math.sin(angle)]);
    }
    for (let i = 0; i < rim.length; ++i) {
      p.beam(...rim[i], ...rim[(i + 1) % 8], 2.6, silver);
      p.beam(...centre, ...rim[i], 2.1, silver);
    }
    for (const i of [0, 3, 5]) p.beam(...rim[i], x, y + 19, 56, 1.5, safety);
    p.box(x, y + 19, 3, 5, 5, safety, 54);
  }

  function trestle(p, x, y) {
    p.box(x, y, 158, 18, 5, dark, 31);
    for (const side of [-1, 1]) {
      const edge = y + side * 8;
      p.beam(x - 78, edge, 36, x + 78, edge, 36, 3, safety);
      for (const offset of [-64, 0, 64]) p.box(x + offset, edge, 5, 5, 33, steel);
      for (const offset of [-64, 0]) {
        p.beam(x + offset, edge, 3, x + offset + 64, edge, 30, 3, steel);
        p.beam(x + offset, edge, 30, x + offset + 64, edge, 3, 3, steel);
      }
    }
  }

  function quarry(p, x, y) {
    // Conveyor superstructure and discharge stockpile.
    p.rock(x + 63, y, 25, 22, '#ae9d85');
    p.box(x - 50, y, 43, 24, 20, concrete);
    p.box(x - 50, y, 46, 27, 4, '#92725e', 20);
    for (const side of [-1, 1]) {
      const edge = y + side * 6;
      p.beam(x - 48, edge, 17, x + 55, edge, 46, 5, steel);
      p.beam(x - 48, edge, 23, x + 55, edge, 52, 2, safety);
      for (const offset of [0, 38]) {
        const height = 31 + offset * .28;
        p.beam(x + offset, edge, 0, x + offset, edge, height, 3, steel);
        p.beam(x + offset, edge, 0, x + offset + 15, edge, height + 3, 2.5, steel);
      }
    }
  }

  function tank(p, x, y, radius, height) {
    p.post(x, y, radius + 2, 4, concrete);
    p.post(x, y, radius, height, '#93a5a0', 4);
    p.post(x, y, radius + .7, 3, silver, height * .5 + 4);
    p.post(x, y, radius + 1, 4, '#738b88', height + 4);
    p.post(x, y, radius * .26, 3, dark, height + 8);
  }

  function pumpworks(p, x, y) {
    tank(p, x, y, 20, 31);
    tank(p, x + 49, y - 5, 15, 40);
    p.box(x + 94, y, 32, 26, 16, steel);
    p.box(x + 94, y, 36, 29, 3, safety, 16);
    p.beam(x, y + 18, 12, x, y + 28, 12, 5, silver);
    p.beam(x, y + 28, 12, x + 93, y + 28, 12, 5, silver);
    p.beam(x + 93, y + 28, 12, x + 93, y + 9, 12, 5, silver);
  }

  function crane(p, x, y) {
    p.box(x, y, 35, 31, 6, concrete);
    for (const dx of [-6, 6]) p.box(x + dx, y, 4, 6, 77, safety, 6);
    for (let n = 0; n < 4; ++n) {
      const a = 6 + 18 * n;
      p.beam(x - 6, y, a, x + 6, y, a + 18, 2, steel);
      p.beam(x + 6, y, a, x - 6, y, a + 18, 2, steel);
    }
    p.box(x, y, 120, 9, 5, safety, 77);
    p.box(x - 49, y, 21, 13, 9, concrete, 78);
    p.box(x + 8, y + 5, 13, 9, 9, steel, 72);
    p.beam(x, y, 80, x, y, 96, 4, steel);
    p.beam(x - 48, y, 81, x, y, 96, 2, silver);
    p.beam(x, y, 96, x + 54, y, 81, 2, silver);
    p.beam(x + 43, y, 76, x + 43, y, 48, 1.5, dark);
    p.box(x + 43, y, 5, 4, 4, safety, 45);
  }

  function paint(p, region, id) {
    // North-bank silhouettes leave the playable ground and the south camera approach open.
    const stones = [[-27, 86, 17, 13], [29, -33, 21, 20], [98, -47, 28, 23],
      [482, -49, 28, 20], [787, -33, 23, 19], [827, 110, 17, 10]];
    for (const [x, y, radius, height] of stones) p.rock(x, y, radius, height, '#939486');
    for (const [x, y, size] of [[66,-30,23],[122,-29,26],[463,-33,20],[747,-36,25]]) p.tree(x,y,size);

    if (id === 'potential') {
      pumpworks(p, 197, -45);
      quarry(p, 603, -41);
    } else if (id === 'sweep' || id === 'coverage') {
      pumpworks(p, 195, -42);
      trestle(p, 630, -36);
    } else if (id === 'rrt' || id === 'rrt-star') {
      quarry(p, 226, -42);
      trestle(p, 630, -36);
    } else if (region === 'survey') {
      fieldStation(p, 200, -36, '#798f86');
      antenna(p, 262, -33);
      tank(p, 634, -35, 17, 30);
    } else if (region === 'driving') {
      fieldStation(p, 229, -35, '#9c8574');
      trestle(p, 630, -34);
    } else if (region === 'machines') {
      crane(p, 222, -44);
      tank(p, 600, -36, 22, 32);
      fieldStation(p, 665, -36, '#859a93');
    } else {
      quarry(p, 208, -45);
      fieldStation(p, 642, -35, '#99795f');
    }
  }

  globalThis.FieldLandmarks = {paint};
})();
