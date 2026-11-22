(() => {
  'use strict';

  // Static scenery for the canyon behind the instrumented jumping platforms.
  globalThis.MomoScenery = function MomoScenery(scene, {box, rock, post}) {
    const concrete = '#aaa995', pine = '#526e63', steel = '#52696b';
    const deck = '#ba9d72', enamel = '#b97e4e', windowGlass = '#426164';

    // A receding blue ridge and a warmer north bank bracket the survey course.
    const skyline = [
      [-12, 7, 5], [-4, 9, 6.2], [3, 7.5, 4.8], [10, 10, 6.8],
      [17, 6.8, 4.1], [22, 7.8, 5.6], [28, 10, 6.7], [36, 8.2, 5.1]
    ];
    skyline.forEach(([x, radius, height], i) => {
      rock(scene, x, -1.8, -15 - i % 3, radius, height, 4.5,
        ['#81918d', '#8b9991', '#859792'][i % 3]);
    });

    const bank = [
      [-7, 4, 2.5], [-1.1, 3.6, 3.3], [4.1, 3.2, 2.6],
      [9, 4.5, 2.1], [14.8, 3.7, 3], [20.1, 3.1, 2.4],
      [24.4, 4.2, 2.7], [30.4, 4.1, 3.5], [35, 3.3, 3]
    ];
    bank.forEach(([x, radius, height], i) => {
      const z = -4.8 - (i % 3) * .4;
      rock(scene, x, -1.45, z, radius, height, 2.4, i % 2 ? '#8a8571' : '#979079');
      rock(scene, x - .4, -.7, z - .2, radius * .86, height * .69, 2,
        i % 2 ? '#a4997d' : '#aaa183');
      rock(scene, x + .35, -2.5, z + 1.45, radius * .64, height * .4, 1.2, '#746f60');
    });

    // The blue-grey water and its broken highlights sit well below the jump surfaces.
    box(scene, 13, -4.32, 2, 55, .14, 22, '#668f90');
    for (let i = 0; i < 15; i++) {
      const x = -6 + (i * 7.03) % 42;
      const z = -1.8 + (i * 2.31) % 11;
      box(scene, x, -4.239, z, .45 + (i % 4) * .34, .012, .035, '#91b0a6');
    }

    function fir(x, y, z, h) {
      post(scene, x, y + h * .19, z, h * .047, h * .069, h * .38, '#786f57');
      post(scene, x, y + h * .51, z, .016, h * .28, h * .69, pine);
      post(scene, x, y + h * .76, z, .013, h * .2, h * .53, '#667f6b');
    }

    // Small groups sit on flat rock ledges. Their trunks meet the ledge tops.
    const copses = [[-3.9, 1.2], [1.2, .85], [7.9, .65], [13.7, 1], [17.2, .8], [31.3, 1.1]];
    copses.forEach(([x, y], i) => {
      const z = -6.25 - (i % 2) * 1.3;
      box(scene, x + .1, y - .38, z, 2.9, .75, 1.8, '#8c8972');
      fir(x - .65, y, z, 1.4 + (i % 3) * .25);
      fir(x + .45, y, z - .3, 1.1 + ((i + 1) % 3) * .2);
    });

    // North-side pump house, pressure tank, and roof-mounted relay aerial.
    const x = 23.4, z = -3.9, floor = 1.45;
    box(scene, x, floor - .38, z, 5.4, .76, 2.65, concrete);
    box(scene, x - 1.1, floor + .71, z, 2.02, 1.42, 1.54, '#8f9a86');
    box(scene, x - 1.1, floor + 1.49, z, 2.22, .16, 1.76, deck);
    box(scene, x - 1.36, floor + .95, z + .78, .83, .36, .035, windowGlass);
    box(scene, x - .61, floor + .44, z + .79, .42, .88, .035, steel);
    post(scene, x - 1.7, floor + 2.23, z, .035, .055, 1.4, steel);
    box(scene, x - 1.7, floor + 2.65, z, .7, .045, .055, deck);
    post(scene, x - 1.7, floor + 2.99, z, .055, .055, .11, '#f7ca83');
    post(scene, x + 1.2, floor + .71, z, .55, .55, 1.42, '#80958b');
    post(scene, x + 1.2, floor + 1.44, z, .58, .58, .13, steel);
    post(scene, x + 1.2, floor + 1.57, z, .11, .18, .15, deck);
    post(scene, x + 1.2, floor + .65, z, .566, .566, .09, '#b5bfaa');
    post(scene, x + 1.18, floor + .33, z + .74, .09, .09, .66, enamel);
    box(scene, x + .53, floor + .61, z + .74, 1.38, .14, .16, enamel);
    for (const offset of [-2.47, .2, 2.47]) {
      post(scene, x + offset, floor + .23, z + 1.16, .025, .03, .46, steel);
    }
    box(scene, x, floor + .47, z + 1.16, 5, .055, .065, deck);
  };
})();
