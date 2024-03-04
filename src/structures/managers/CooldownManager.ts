import { MINUTE } from '#root/util/DateTime';

const CLEANUP_INTERVAL = 5 * MINUTE; // 5min

export class CooldownManager {
    private static instance: CooldownManager;

    private cooldowns!: Map<string, number>;

    public constructor() {
        if (CooldownManager.instance) {
            return CooldownManager.instance;
        }

        this.cooldowns = new Map();
        setTimeout(() => this.cleanup(), CLEANUP_INTERVAL);

        CooldownManager.instance = this;
    }

    public setCooldown(key: string, timeMs: number): void {
        const cdEnd = Date.now() + timeMs;

        this.cooldowns.set(key, cdEnd);
    }

    public isOnCooldown(key: string): boolean {
        if (!this.cooldowns.has(key)) {
            return false;
        }

        return this.cooldowns.get(key)! >= Date.now();
    }

    public getCooldownRemaining(key: string): number {
        if (!this.isOnCooldown(key)) {
            return 0;
        }

        return Math.max(0, this.cooldowns.get(key)! - Date.now());
    }

    private cleanup(): void {
        const now = Date.now();

        for (const [key, cdEnd] of this.cooldowns.entries()) {
            if (cdEnd < now) {
                this.cooldowns.delete(key);
            }
        }

        setTimeout(() => this.cleanup(), CLEANUP_INTERVAL);
    }
}
