module.exports.createAccessory = function (device, UUIDGen, Accessory) {
    uuid = UUIDGen.generate(device.name);
    var newAccessory = new Accessory(device.name, uuid);
    newAccessory.context.idFromConrad = device.id
    newAccessory.context.type = device.metadata.types.join('');
    return newAccessory;
}

module.exports.getOrAddCharacteristic = function(service, characteristic) {
    var result = service.getCharacteristic(characteristic);
    if (result == null) {
        result = service.addCharacteristic(characteristic);
    }
    return result;
}