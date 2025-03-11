const leftFilter = [
  {
    vendorId: 0x057e,
    productId: 0x2006,
  },
];

const rightFilter = [
  {
    vendorId: 0x057e,
    productId: 0x2007,
  },
];

let leftJoycon, rightJoycon;

document.getElementById("leftButton").addEventListener('click', async () => {
  let devices = await navigator.hid.requestDevice({ filters: leftFilter });
  leftJoycon = devices[0];
  if (leftJoycon) {
    await leftJoycon.open();
    leftJoycon.addEventListener('inputreport', event => {
      console.log("Left Joy-Con Input Report:", event);
      console.log("Data:", event.data);
    });
  }
});

document.getElementById("rightButton").addEventListener('click', async () => {
  let devices = await navigator.hid.requestDevice({ filters: rightFilter });
  rightJoycon = devices[0];
  if (rightJoycon) {
    await rightJoycon.open();
    // inputreport イベントリスナーを追加
    rightJoycon.addEventListener('inputreport', event => {
      console.log("Right Joy-Con Input Report:", event);
      console.log("Data:", event.data);
    });

    const enableVibrationData = [1, 0, 1, 64, 64, 0, 1, 64, 64, 0x48, 0x01];
    await rightJoycon.sendReport(0x01, new Uint8Array(enableVibrationData));

    const rumbleData = [ /* ... */];
    await rightJoycon.sendReport(0x10, new Uint8Array(rumbleData));
  }
});

document.getElementById("check").addEventListener('click', async () => {
  console.log(leftJoycon, rightJoycon);
});

document.getElementById("disconnect").addEventListener('click', async () => {
  await rightJoycon.close();
  await leftJoycon.close();
});
