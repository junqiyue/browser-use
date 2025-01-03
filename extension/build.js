import { createBuilder } from '@modern-js/builder';
import { webpackProvider } from '@modern-js/builder-webpack-provider';
import lessPlugin from '@modern-js/plugin-less';

export default async () => {
  const builder = await createBuilder({
    builderConfig: {
      source: {
        entries: {
          popup: './src/pages/popup/index.jsx',
          background: './src/pages/background/index.js',
          content: './src/pages/content/index.js'
        }
      },
      output: {
        path: 'dist',
        publicPath: '',
        clean: true
      },
      html: [
        {
          template: './src/pages/popup/index.html',
          filename: 'pages/popup/index.html',
          chunks: ['popup']
        }
      ],
      copy: {
        patterns: [
          { from: 'public', to: 'dist' },
          { from: 'manifest.json', to: 'dist/manifest.json' }
        ]
      }
    },
    provider: webpackProvider,
    plugins: [lessPlugin()]
  });

  await builder.build();
};
