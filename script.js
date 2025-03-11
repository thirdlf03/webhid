import * as PacketParser from './parse.js';

const sleep = (time) => new Promise((r) => setTimeout(r, time));

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

    const enableIMU = [1, 0, 64, 64, 0, 1, 64, 64, 0x40, 0x01]
    leftJoycon.sendReport(0x01, new Uint8Array(enableIMU));

    await sleep(200);
    const standardFullMode = [1, 0, 64, 64, 0, 1, 64, 64, 0x03, 0x30]
    leftJoycon.sendReport(0x01, new Uint8Array(standardFullMode));

    leftJoycon.oninputreport = (event) => {
      let { data, reportId, device } = event;

      if (!data) {
        return;
      }

      data = concatTypedArrays(
        new Uint8Array([reportId]),
        new Uint8Array(data.buffer)
      );
      const hexData = data.map((byte) => byte.toString(16));

      let packet = {
        inputReportID: PacketParser.parseInputReportID(data, hexData),
      };

      switch (reportId) {
        case 0x3f: {
          packet = {
            ...packet,
            buttonStatus: PacketParser.parseButtonStatus(data, hexData),
            analogStick: PacketParser.parseAnalogStick(data, hexData),
            filter: PacketParser.parseFilter(data, hexData),
          };
          break;
        }
        case 0x21:
        case 0x30: {
          packet = {
            ...packet,
            timer: PacketParser.parseTimer(data, hexData),
            batteryLevel: PacketParser.parseBatteryLevel(data, hexData),
            connectionInfo: PacketParser.parseConnectionInfo(data, hexData),
            buttonStatus: PacketParser.parseCompleteButtonStatus(data, hexData),
            analogStickLeft: PacketParser.parseAnalogStickLeft(data, hexData),
            analogStickRight: PacketParser.parseAnalogStickRight(data, hexData),
            vibrator: PacketParser.parseVibrator(data, hexData),
          };

          if (reportId === 0x21) {
            packet = {
              ...packet,
              ack: PacketParser.parseAck(data, hexData),
              subcommandID: PacketParser.parseSubcommandID(data, hexData),
              subcommandReplyData: PacketParser.parseSubcommandReplyData(
                data,
                hexData
              ),
              deviceInfo: PacketParser.parseDeviceInfo(data, hexData),
            };
          }

          if (reportId === 0x30) {
            const accelerometers = PacketParser.parseAccelerometers(
              data,
              hexData
            );
            const gyroscopes = PacketParser.parseGyroscopes(data, hexData);
            const rps = PacketParser.calculateActualGyroscope(
              gyroscopes.map((g) => g.map((v) => v.rps))
            );
            const dps = PacketParser.calculateActualGyroscope(
              gyroscopes.map((g) => g.map((v) => v.dps))
            );
            const acc = PacketParser.calculateActualAccelerometer(
              accelerometers.map((a) => [a.x.acc, a.y.acc, a.z.acc])
            );
            const quaternion = PacketParser.toQuaternion(
              rps,
              acc,
              device.productId
            );

            packet = {
              ...packet,
              accelerometers,
              gyroscopes,
              actualAccelerometer: acc,
              actualGyroscope: {
                dps: dps,
                rps: rps,
              },
              actualOrientation: PacketParser.toEulerAngles(
                this.lastValues,
                rps,
                acc,
                device.productId
              ),
              actualOrientationQuaternion:
                PacketParser.toEulerAnglesQuaternion(quaternion),
              quaternion: quaternion,
              ringCon: PacketParser.parseRingCon(data, hexData),
            };
          }
          break;
        }
      }
    }
  }
});

function parseIMUData(dataView) {
  console.log(dataView);
}

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
  if (rightJoycon) {
    await rightJoycon.close();
    rightJoycon = null;
  }
  if (leftJoycon) {
    await leftJoycon.close();
    leftJoycon = null;
  }
});
