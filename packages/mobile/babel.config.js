module.exports = function (api) {
  api.cache(true);

  // Set directly here so Metro's transform workers always inherit these,
  // regardless of whether the .env file was loaded before workers spawned.
  process.env.EXPO_ROUTER_APP_ROOT = './app';
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'transform-inline-environment-variables',
        {
          include: ['EXPO_ROUTER_APP_ROOT', 'EXPO_ROUTER_IMPORT_MODE'],
        },
      ],
    ],
  };
};
