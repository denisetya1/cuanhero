import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export const DEPLOYMENT_QUEUE_STREAM =
  process.env.DEPLOYMENT_QUEUE_STREAM || "cuanhero:deployment:jobs";

type DeploymentRedisClient = ReturnType<typeof createClient>;

const globalForDeploymentQueue = globalThis as typeof globalThis & {
  deploymentQueueRedis?: DeploymentRedisClient;
  deploymentQueueConnectPromise?: Promise<DeploymentRedisClient>;
};

const getRedisClient = async () => {
  let client = globalForDeploymentQueue.deploymentQueueRedis;

  if (!client) {
    client = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: false,
      },
    });
    client.on("error", (error: Error) => {
      console.error("DEPLOYMENT_QUEUE_REDIS_ERROR:", error);
    });
    globalForDeploymentQueue.deploymentQueueRedis = client;
  }

  if (client.isReady) return client;

  if (!globalForDeploymentQueue.deploymentQueueConnectPromise) {
    globalForDeploymentQueue.deploymentQueueConnectPromise = client
      .connect()
      .then(() => client)
      .finally(() => {
        globalForDeploymentQueue.deploymentQueueConnectPromise = undefined;
      });
  }

  return globalForDeploymentQueue.deploymentQueueConnectPromise;
};

export const enqueueDeploymentJob = async (deploymentJobId: number) => {
  const client = await getRedisClient();
  return client.xAdd(DEPLOYMENT_QUEUE_STREAM, "*", {
    deploymentJobId: String(deploymentJobId),
  });
};
