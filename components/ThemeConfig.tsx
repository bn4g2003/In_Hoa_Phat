import React from 'react';
import { ConfigProvider, theme } from 'antd';

export const themeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  components: {
    Table: {
      headerBg: '#f0f5ff',
      headerColor: '#1d39c4',
    },
    Button: {
      borderRadius: 6,
    },
  },
};

const ThemeConfig = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConfigProvider theme={themeConfig}>
      {children}
    </ConfigProvider>
  );
};

export default ThemeConfig;
