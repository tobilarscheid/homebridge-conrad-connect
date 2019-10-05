var util = require('./util.js')
var request = require('request');

module.exports.builder = function (Accessory, Service, Characteristic, UUIDGen, platform) {
    return {
        createAccessory: function (device) {
            var newAccessory = util.createAccessory(device, UUIDGen, Accessory);

            newAccessory.addService(Service.Outlet, device.name)

            return newAccessory;
        },
        configureCharacteristics: function (accessory) {
            var service = accessory.getService(Service.Outlet)
            accessory.context.characteristics.forEach(c => {
                switch (c.name) {
                    case "on_off":
                        if (c.writable) {
                            util.getOrAddCharacteristic(service, Characteristic.On)
                                .on('set', module.exports.onOff.bind({ platform: platform, accessory: accessory }));
                        }
                        if (c.readable) {
                            util.getOrAddCharacteristic(service, Characteristic.On)
                                .on('get', util.getStatus.bind({ platform: platform, accessory: accessory, property: c.name }));
                        }
                        break;
                    default:
                        platform.log(`Accessory ${accessory.context.idFromConrad} has unknown characteristic ${c} - ignoring!`);
                }
            })
        }
    }
}

module.exports.onOff = function (value, callback) {
    var platform = this.platform;
    var accessory = this.accessory;

    platform.log(`setting value to ${value} for device ${accessory.context.idFromConrad}`);
    request.post(platform.config.postUrl, {
        json: {
            action: "actuate",
            device: accessory.context.idFromConrad,
            property: "on_off",
            value: value
        },
        headers: {
            'Authorization': `Bearer ${platform.config.bearerToken}`
        }
    }, (error, res, body) => {
        if (error) {
            platform.log(error)
            platform.log(`statusCode: ${res.statusCode}`)
            platform.log(body)
            return
        }
    });
    callback();
}