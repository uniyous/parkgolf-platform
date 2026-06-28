/**
 * @uniyous/saga-engine — 제네릭 saga 레지스트리 (UNI-127 ②)
 *
 * 순수 클래스(NestJS 무관). 각 saga 서비스가 자기 제품 정의로 인스턴스화·등록.
 * 구 marketplace SagaRegistry(@Injectable + 정의 하드코딩)를 대체.
 */
import type { SagaDefinition } from './index';
import type { SagaRegistryPort } from './ports';

export class SagaRegistry implements SagaRegistryPort {
  private readonly registry = new Map<string, SagaDefinition>();

  constructor(definitions: SagaDefinition[] = []) {
    for (const def of definitions) this.register(def);
  }

  register(definition: SagaDefinition): void {
    this.registry.set(definition.name, definition);
  }

  get(sagaType: string): SagaDefinition | undefined {
    return this.registry.get(sagaType);
  }

  has(sagaType: string): boolean {
    return this.registry.has(sagaType);
  }

  getAll(): SagaDefinition[] {
    return [...this.registry.values()];
  }

  get size(): number {
    return this.registry.size;
  }
}
