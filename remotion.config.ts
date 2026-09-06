import { Config } from '@remotion/cli/config';

// Use a dedicated public folder for Remotion assets so marketing
// screenshots and video overlays don't ship with the web bundle.
Config.setPublicDir('./remotion/public');
