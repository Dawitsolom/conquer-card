// PostHog analytics - install react-native-posthog locally
// npm install posthog-react-native
let posthog: any = null;

export function initAnalytics(apiKey: string): void {
  try {
    const { PostHog } = require("posthog-react-native");
    posthog = new PostHog(apiKey, { host: "https://app.posthog.com" });
  } catch { console.log("PostHog not installed - run: npm install posthog-react-native"); }
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  posthog?.capture(event, properties);
}

export function identifyUser(userId: string, name: string, email: string): void {
  posthog?.identify(userId, { name, email });
}