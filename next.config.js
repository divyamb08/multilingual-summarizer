/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add a rule to handle LICENSE files in node_modules
    config.module.rules.push({
      test: /LICENSE$/,
      include: /node_modules\/langdetect/,
      use: 'null-loader' // Use null-loader to ignore these files
    });
    
    // Handle Node.js modules that aren't available in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,  // Polyfill not needed for "fs"
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
      };
      
      // No special PDF configuration needed
    }
    
    return config;
  },
};

module.exports = nextConfig;
