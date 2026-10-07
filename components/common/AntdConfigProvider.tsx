'use client';

import React from 'react';
import { ConfigProvider, theme, App } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';

interface Props {
  children: React.ReactNode;
}

export default function AntdConfigProvider({ children }: Props) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#e11d48',
            colorInfo: '#ec4899',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorBgBase: '#0d040c',
            colorBgContainer: '#190a18',
            colorBgElevated: '#240f22',
            colorBorder: 'rgba(255, 255, 255, 0.1)',
            colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
            colorText: '#fdf2f8',
            colorTextSecondary: '#c084fc',
            colorTextTertiary: '#a38299',
            colorLink: '#f472b6',
            colorLinkHover: '#fb7185',
            borderRadius: 14,
            fontFamily: 'inherit',
          },
          components: {
            Button: {
              borderRadius: 999,
              colorPrimary: '#e11d48',
              colorPrimaryHover: '#f43f5e',
            },
            Input: {
              colorBgContainer: 'rgba(38, 14, 34, 0.7)',
              borderRadius: 999,
              colorBorder: 'rgba(255, 255, 255, 0.08)',
              activeBorderColor: '#e11d48',
              hoverBorderColor: 'rgba(225, 29, 72, 0.5)',
            },
            InputNumber: {
              colorBgContainer: 'rgba(38, 14, 34, 0.7)',
              borderRadius: 14,
              colorBorder: 'rgba(255, 255, 255, 0.08)',
              activeBorderColor: '#e11d48',
              hoverBorderColor: 'rgba(225, 29, 72, 0.5)',
            },
            Modal: {
              contentBg: '#180a17',
              headerBg: '#180a17',
              titleColor: '#ffffff',
            },
            Drawer: {
              colorBgElevated: '#160815',
            },
            Tooltip: {
              colorBgSpotlight: '#2a0e26',
            },
            Badge: {
              colorPrimary: '#e11d48',
            },
          },
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
