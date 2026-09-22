// BETTER_AUTH_URL names one origin, the production one. A Vercel preview runs
// on its own hostname, so Better Auth's origin check would reject every sign-in
// there. Vercel sets VERCEL_URL (this deployment) and VERCEL_BRANCH_URL (the
// branch alias) per deployment; trusting exactly those two lets a preview
// accept itself and nothing else — no wildcard over the whole scope.
// Locally neither is set and the list is empty.

type DeploymentHosts = {
  VERCEL_URL?: string;
  VERCEL_BRANCH_URL?: string;
};

/** The https origins of the current Vercel deployment, if there is one. */
export function deploymentOrigins(hosts: DeploymentHosts): string[] {
  const origins = [hosts.VERCEL_URL, hosts.VERCEL_BRANCH_URL]
    .map((host) => host?.trim())
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
  return [...new Set(origins)];
}
