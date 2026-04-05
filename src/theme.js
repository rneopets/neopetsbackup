import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  components: {
    Popover: {
      baseStyle: {
        // Default theme uses z-index 10 on the popper; Drawer/Modal use `modal`
        // (1400), so popovers would render underneath. Use the `popover` token.
        popper: {
          zIndex: 'popover',
        },
      },
    },
  },
});

export default theme;
