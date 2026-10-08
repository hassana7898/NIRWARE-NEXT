import { registerRootComponent } from 'expo';
import { App } from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// This is required for React Native to initialize and render the root component on Android and iOS.
registerRootComponent(App);
