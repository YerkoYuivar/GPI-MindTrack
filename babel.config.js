module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@components': './src/components',
            '@navigation': './src/navigation',
            '@screens': './src/screens',
            '@state': './src/state',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@theme': './src/theme',
            '@lib': './src/lib',
            '@types': './src/types',
            '@features': './src/features',
            '@contexts': './src/contexts',
          },
        },
      ],
      // IMPORTANTE: react-native-reanimated/plugin debe ser el ÚLTIMO
      'react-native-reanimated/plugin',
    ],
  };
};