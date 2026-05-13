import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  cacheStartUrl: true,
  dynamicStartUrl: false,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "civisense-osm-tiles",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /\/api\/reports(?:\?.*)?$/i,
        handler: "StaleWhileRevalidate",
        method: "GET",
        options: {
          cacheName: "civisense-reports-api",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({});

export default nextConfig;
