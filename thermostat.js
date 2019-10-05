var util = require('./util.js')
var request = require('request');

module.exports.builder = function (Accessory, Service, Characteristic, UUIDGen, platform) {
    return {
        createAccessory: function (device) {
            var newAccessory = util.createAccessory(device, UUIDGen, Accessory);

            newAccessory.addService(Service.Thermostat, device.name)

            return newAccessory;
        },
        configureCharacteristics: function (accessory) {
            var service = accessory.getService(Service.Thermostat)
            accessory.context.characteristics.forEach(c => {
                switch (c.name) {
                    case "target_temperature":
                        if (c.writeable) {
                            util.getOrAddCharacteristic(service, Characteristic.TargetTemperature)
                                .on('set', module.exports.targetTemperature.bind({ platform: platform, accessory: accessory }));
                        }
                    case "temperature_ignored":
                        if (c.readable) {
                            util.getOrAddCharacteristic(service, Characteristic.CurrentTemperature)
                                .on('get', util.getStatus.bind({ platform: platform, accessory: accessory, property: c.name }));
                        } else {
                            util.getOrAddCharacteristic(service, Characteristic.CurrentTemperature)
                                .on('get', (callback) => { callback(null, 0); });
                        }
                        break;
                    case "humidity_ignored":
                        if (c.readable) {
                            util.getOrAddCharacteristic(service, Characteristic.CurrentRelativeHumidity)
                                .on('get', util.getStatus.bind({ platform: platform, accessory: accessory, property: c.name }));
                        }
                        break;
                    default:
                        platform.log(`Accessory ${accessory.context.idFromConrad} has unknown characteristic ${c.name} - ignoring!`);
                }
            })
        }
    }
}

module.exports.targetTemperature = function (value, callback) {
    var platform = this.platform;
    var accessory = this.accessory;

    platform.log(`setting value to ${value} for device ${accessory.context.idFromConrad}`);
    request.post(platform.config.postUrl, {
        json: {
            action: "actuate",
            device: accessory.context.idFromConrad,
            property: "temperature",
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