const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    popup: "./src/pages/popup/index.jsx",
    background: "./src/pages/background/index.js",
    content: "./src/pages/content/index.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "pages/[name]/index.js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", "less-loader"],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/pages/popup/index.html",
      filename: "pages/popup/index.html",
      chunks: ["popup"],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "public", to: "public", noErrorOnMissing: true },
      ],
    }),
  ],
  resolve: {
    extensions: [".js", ".jsx"],
  },
};
