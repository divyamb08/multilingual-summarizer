/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    api: {
      bodyParser: {
        sizeLimit: "10mb",
      },
    },
  },
  // Add webpack configuration to handle non-code files from packages
  webpack: (config) => {
    // More specific rule to handle langdetect LICENSE file
    config.module.rules.push({
      test: /LICENSE$/,
      include: /node_modules\/langdetect/,
      use: 'null-loader',
    });

    // Add a more general rule for other non-code files
    config.module.rules.push({
      test: /\.(md|txt)$/,
      include: /node_modules/,
      use: 'null-loader',
    });
    
    return config;
  },
};

export default nextConfig;
