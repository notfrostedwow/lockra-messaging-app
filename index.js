import 'react-native-url-polyfill/auto';
require('./lib/networkGuard');
const { installBrowserUrlGuard } = require('./lib/routingInput');
if (installBrowserUrlGuard()) require('expo-router/entry');
