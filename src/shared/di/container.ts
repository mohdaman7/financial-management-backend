// Manual dependency injection container
// Services and repositories will be registered here as modules are added

export class Container {
  private static instances = new Map<string, unknown>();

  static register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  static resolve<T>(key: string): T {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(`Dependency not registered: ${key}`);
    }
    return instance as T;
  }

  static clear(): void {
    this.instances.clear();
  }
}
