
export function getOmeChannelNames(ome) {
    const omeChannels = ome.images[0].pixels.channels;
    let channelNames = [];
    for (let i = 0; i < omeChannels.length; i++) {
        const channel = omeChannels[i];
        channelNames.push(channel.name);
    }
    return channelNames;
}
