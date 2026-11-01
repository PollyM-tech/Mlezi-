export const config = {
  convexUrl:
    process.env.EXPO_PUBLIC_CONVEX_URL ||
    "https://tidy-perch-115.eu-west-1.convex.cloud",
  siteUrl:
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL ||
    "https://tidy-perch-115.eu-west-1.convex.site",
  webOrigin: process.env.EXPO_PUBLIC_APP_ORIGIN || "https://mlezicare.com",
};
export const MOBILE_REDIRECT = "mlezicare://auth";
