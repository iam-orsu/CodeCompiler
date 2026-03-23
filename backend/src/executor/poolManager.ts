import Docker from 'dockerode';
import { LanguageId, LANGUAGES } from '../languages';
import { config } from '../config';

const docker = new Docker();

export interface PooledContainer {
  containerId: string;
  language: LanguageId;
  status: 'available' | 'busy';
  createdAt: Date;
}

const pool = new Map<LanguageId, PooledContainer[]>();
let poolInterval: NodeJS.Timeout | null = null;

export async function initPool() {
  if (!config.POOL_ENABLED) return;

  for (const lang of LANGUAGES) {
    if (lang.isWebMode || lang.isSpecial) continue;
    pool.set(lang.id, []);
    await replenishPool(lang.id);
  }

  poolInterval = setInterval(async () => {
    for (const lang of LANGUAGES) {
      if (lang.isWebMode || lang.isSpecial) continue;
      await replenishPool(lang.id);
    }
  }, 30000);
}

async function replenishPool(lang: LanguageId) {
  const current = pool.get(lang) || [];
  const available = current.filter(c => c.status === 'available').length;
  const needed = config.POOL_SIZE_PER_LANGUAGE - available;

  if (needed > 0) {
    for (let i = 0; i < needed; i++) {
      try {
        const container = await createAdhocContainer(lang);
        container.status = 'available';
        current.push(container);
      } catch (err) {
        console.error(`Failed to pre-warm container for ${lang}:`, err);
      }
    }
    pool.set(lang, current);
  }
}

async function createAdhocContainer(language: LanguageId): Promise<PooledContainer> {
  const container = await docker.createContainer({
    Image: 'runly-sandbox',
    Cmd: ['tail', '-f', '/dev/null'],
    Tty: true,
    HostConfig: {
      AutoRemove: true,
      NetworkMode: 'none',
    }
  });
  await container.start();
  return {
    containerId: container.id,
    language,
    status: 'busy',
    createdAt: new Date()
  };
}

export async function acquireContainer(language: LanguageId): Promise<PooledContainer> {
  if (!config.POOL_ENABLED) {
    return createAdhocContainer(language);
  }
  
  const current = pool.get(language) || [];
  const availableNode = current.find(c => c.status === 'available');
  
  if (availableNode) {
    availableNode.status = 'busy';
    return availableNode;
  }
  
  const fresh = await createAdhocContainer(language);
  current.push(fresh);
  pool.set(language, current);
  return fresh;
}

export async function releaseContainer(containerId: string) {
  for (const [lang, containers] of pool.entries()) {
    const idx = containers.findIndex(c => c.containerId === containerId);
    if (idx !== -1) {
      const c = containers[idx];
      containers.splice(idx, 1);
      pool.set(lang, containers);
      try {
        const dockerContainer = docker.getContainer(containerId);
        await dockerContainer.remove({ force: true });
      } catch (e) {
        // Ignored if target is already violently collected
      }
      break;
    }
  }
}

export function getPoolStatus() {
  const status: Record<string, { available: number; busy: number }> = {};
  for (const [lang, containers] of pool.entries()) {
    status[lang] = {
      available: containers.filter(c => c.status === 'available').length,
      busy: containers.filter(c => c.status === 'busy').length
    };
  }
  return status;
}
