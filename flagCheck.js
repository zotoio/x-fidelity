const ldclient = require('launchdarkly-node-client-sdk');

(async function main(contextKey) {
  try {
    const context = { kind: 'user', key: contextKey };
    const options = {
        logger: ldclient.basicLogger({
          level: 'error',
        }),
      };
    const client = ldclient.initialize(process.env.XFI_LD_CLIENT_ID, context, options);

    await client.waitForInitialization(10);

    const flagValue = await client.variation(process.env.XFI_VERSION_FLAG_KEY, "false");
    console.log(flagValue);
    process.exit(0);

  } catch (error) {
    console.log(`*** SDK failed to initialize: ${error}`);
    process.exit(0);  // exit with 0 to avoid failing the build
    
  }

})(process.argv[2]);

