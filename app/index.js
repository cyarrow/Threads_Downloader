import { registerRootComponent } from 'expo';

// EXPO_PUBLIC_PROTOTYPE=1 (see `npm run prototype:web`) builds the clickable UI
// prototype instead of the app. The value is inlined at build time, so release
// builds drop the unused branch.
const Root =
  process.env.EXPO_PUBLIC_PROTOTYPE === '1'
    ? require('./prototype/PrototypeApp').default
    : require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
