import Constants from 'expo-constants'
import PostHog from 'posthog-react-native'

const extra = Constants.expoConfig?.extra
const projectToken = extra?.posthogProjectToken as string | undefined
const host = extra?.posthogHost as string | undefined
const isPostHogConfigured = Boolean(projectToken && host)

if (!projectToken && __DEV__) {
  console.error(
    'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured',
  )
}

if (!host && __DEV__) {
  console.error(
    'POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured',
  )
}

export const posthog = isPostHogConfigured
  ? new PostHog(projectToken!, {
      host: host!,
      captureAppLifecycleEvents: true,
    })
  : undefined
