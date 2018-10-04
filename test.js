const SalusClient = require('./SalusClient');

const main = async () => {
    var client = new SalusClient();

    await client.login(process.env.USERNAME, process.env.PASSWORD);

    console.log(client.credentials);

    console.log(await client.device());

    console.log(await client.online());

    console.log('Setting temp...');

    await client.setTemperature(process.env.TARGET_TEMPERATURE);

    console.log('Done!');
};

main();